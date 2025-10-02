/**
 * Payment Routes Integration Tests
 * 
 * Comprehensive tests for payment API endpoints including:
 * - Payment intent creation
 * - Payment confirmation
 * - Payment method management
 * - Webhook handling
 * - Refund processing
 * - Payment analytics
 * - Error handling and edge cases
 */

const request = require('supertest')
const app = require('../../app')
const User = require('../../models/User')
const Order = require('../../models/Order')
const Product = require('../../models/Product')
const { createAuthenticatedUser } = require('../setup')

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn()
    },
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
      retrieve: jest.fn()
    },
    paymentMethods: {
      retrieve: jest.fn(),
      list: jest.fn(),
      detach: jest.fn()
    },
    refunds: {
      create: jest.fn()
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }))
})

describe('Payment Routes', () => {
  let user
  let adminUser
  let userToken
  let adminToken
  let testProduct
  let testOrder
  let mockStripe

  beforeAll(async () => {
    // Create test users
    const userData = await createAuthenticatedUser()
    user = userData.user
    userToken = userData.token

    adminUser = await User.create({
      email: 'admin@payments.com',
      password: 'password123',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      role: 'admin'
    })

    adminToken = adminUser.generateAuthToken()

    // Create test product
    testProduct = await Product.create({
      name: 'Payment Test Shoe',
      brand: 'TestBrand',
      description: 'Test shoe for payment testing',
      category: 'running',
      variants: [{
        size: '9',
        color: 'black',
        price: 99.99,
        stock: 10,
        sku: 'PAY-TEST-001',
        isActive: true
      }],
      images: ['test-image.jpg'],
      isActive: true
    })

    // Create test order
    testOrder = await Order.create({
      user: user._id,
      orderNumber: 'PAY-TEST-001',
      items: [{
        product: testProduct._id,
        variant: {
          size: '9',
          color: 'black',
          price: 99.99
        },
        quantity: 1
      }],
      pricing: {
        subtotal: 99.99,
        tax: 8.00,
        shipping: 10.00,
        total: 117.99
      },
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      payment: {
        status: 'pending',
        method: 'stripe'
      }
    })

    // Setup Stripe mock
    const stripe = require('stripe')
    mockStripe = stripe()
  })

  afterAll(async () => {
    // Clean up test data
    await User.findByIdAndDelete(user._id)
    await User.findByIdAndDelete(adminUser._id)
    await Product.findByIdAndDelete(testProduct._id)
    await Order.findByIdAndDelete(testOrder._id)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/payments/create-intent', () => {
    test('should create payment intent successfully', async () => {
      const mockCustomer = { id: 'cus_test123' }
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 11799,
        currency: 'usd',
        status: 'requires_payment_method'
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString()
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.clientSecret).toBe(mockPaymentIntent.client_secret)
      expect(response.body.data.paymentIntentId).toBe(mockPaymentIntent.id)
    })

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .send({
          orderId: testOrder._id.toString()
        })

      expect(response.status).toBe(401)
    })

    test('should require order ID', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Order ID is required')
    })

    test('should reject non-existent order', async () => {
      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: '507f1f77bcf86cd799439011'
        })

      expect(response.status).toBe(404)
      expect(response.body.message).toBe('Order not found')
    })

    test('should reject order from different user', async () => {
      const otherUser = await User.create({
        email: 'other@test.com',
        password: 'password123',
        profile: { firstName: 'Other', lastName: 'User' }
      })

      const otherToken = otherUser.generateAuthToken()

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderId: testOrder._id.toString()
        })

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('Access denied')

      await User.findByIdAndDelete(otherUser._id)
    })

    test('should handle Stripe card errors', async () => {
      const mockCustomer = { id: 'cus_test123' }
      const stripeError = new Error('Your card was declined.')
      stripeError.type = 'StripeCardError'
      stripeError.code = 'card_declined'

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError)

      const response = await request(app)
        .post('/api/payments/create-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          orderId: testOrder._id.toString()
        })

      expect(response.status).toBe(400)
      expect(response.body.type).toBe('card_error')
      expect(response.body.code).toBe('card_declined')
    })
  })

  describe('POST /api/payments/confirm-intent', () => {
    test('should confirm payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 11799
      }

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent)

      // Update order with payment intent ID
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.stripePaymentIntentId': 'pi_test123'
      })

      const response = await request(app)
        .post('/api/payments/confirm-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentIntentId: 'pi_test123',
          paymentMethodId: 'pm_test123'
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.status).toBe('succeeded')
      expect(response.body.data.success).toBe(true)
    })

    test('should handle payment requiring action', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'requires_action',
        next_action: {
          type: 'use_stripe_sdk'
        }
      }

      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent)

      const response = await request(app)
        .post('/api/payments/confirm-intent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentIntentId: 'pi_test123',
          paymentMethodId: 'pm_test123'
        })

      expect(response.status).toBe(200)
      expect(response.body.data.requiresAction).toBe(true)
      expect(response.body.data.nextAction).toBeDefined()
    })
  })

  describe('GET /api/payments/payment-methods', () => {
    test('should get user payment methods', async () => {
      const mockPaymentMethods = {
        data: [
          {
            id: 'pm_test123',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025,
              funding: 'credit'
            },
            created: 1234567890
          }
        ]
      }

      // Set user with Stripe customer ID
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: 'cus_test123'
      })

      mockStripe.paymentMethods.list.mockResolvedValue(mockPaymentMethods)

      const response = await request(app)
        .get('/api/payments/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.paymentMethods).toHaveLength(1)
      expect(response.body.data.paymentMethods[0].card.last4).toBe('4242')
    })

    test('should return empty array for user without Stripe customer', async () => {
      // Remove Stripe customer ID
      await User.findByIdAndUpdate(user._id, {
        $unset: { stripeCustomerId: 1 }
      })

      const response = await request(app)
        .get('/api/payments/payment-methods')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.paymentMethods).toHaveLength(0)
    })
  })

  describe('DELETE /api/payments/payment-methods/:paymentMethodId', () => {
    test('should delete payment method successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_test123',
        card: { last4: '4242' }
      }

      // Set user with Stripe customer ID
      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: 'cus_test123'
      })

      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockPaymentMethod)
      mockStripe.paymentMethods.detach.mockResolvedValue(mockPaymentMethod)

      const response = await request(app)
        .delete('/api/payments/payment-methods/pm_test123')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.message).toBe('Payment method removed successfully')
    })

    test('should reject deleting payment method from different customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_other123',
        card: { last4: '4242' }
      }

      await User.findByIdAndUpdate(user._id, {
        stripeCustomerId: 'cus_test123'
      })

      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockPaymentMethod)

      const response = await request(app)
        .delete('/api/payments/payment-methods/pm_test123')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('Access denied')
    })
  })

  describe('GET /api/payments/methods', () => {
    test('should get available payment methods', async () => {
      const response = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.methods).toBeInstanceOf(Array)
      expect(response.body.data.methods.length).toBeGreaterThan(0)

      const stripeMethod = response.body.data.methods.find(m => m.id === 'stripe')
      expect(stripeMethod).toBeDefined()
      expect(stripeMethod.supportedCards).toContain('visa')
    })
  })

  describe('POST /api/payments/:orderId/refund', () => {
    beforeEach(async () => {
      // Set order as completed
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.status': 'completed',
        'payment.stripePaymentIntentId': 'pi_test123'
      })
    })

    test('should process refund successfully (admin)', async () => {
      const mockRefund = {
        id: 'ref_test123',
        amount: 11799,
        status: 'succeeded'
      }

      mockStripe.refunds.create.mockResolvedValue(mockRefund)

      const response = await request(app)
        .post(`/api/payments/${testOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 117.99,
          reason: 'Customer request'
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.message).toBe('Refund processed successfully')
    })

    test('should reject refund from non-admin user', async () => {
      const response = await request(app)
        .post(`/api/payments/${testOrder._id}/refund`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 117.99,
          reason: 'Customer request'
        })

      expect(response.status).toBe(403)
      expect(response.body.message).toBe('Access denied')
    })

    test('should reject refund for unpaid order', async () => {
      // Set order as pending
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.status': 'pending'
      })

      const response = await request(app)
        .post(`/api/payments/${testOrder._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 117.99,
          reason: 'Customer request'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Cannot refund order that is not paid')
    })
  })

  describe('GET /api/payments/analytics', () => {
    test('should get payment analytics (admin)', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.analytics).toBeDefined()
      expect(response.body.data.analytics.totalRevenue).toBeDefined()
      expect(response.body.data.analytics.totalOrders).toBeDefined()
    })

    test('should reject analytics request from non-admin', async () => {
      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/payments/history', () => {
    test('should get user payment history', async () => {
      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.payments).toBeInstanceOf(Array)
      expect(response.body.data.pagination).toBeDefined()
    })

    test('should filter payment history by status', async () => {
      const response = await request(app)
        .get('/api/payments/history?status=completed')
        .set('Authorization', `Bearer ${userToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.payments).toBeInstanceOf(Array)
    })
  })

  describe('POST /api/payments/:orderId/retry', () => {
    beforeEach(async () => {
      // Set order as failed
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.status': 'failed'
      })
    })

    test('should retry failed payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_retry123',
        client_secret: 'pi_retry123_secret',
        status: 'succeeded'
      }

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

      const response = await request(app)
        .post(`/api/payments/${testOrder._id}/retry`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: 'pm_test123'
        })

      expect(response.status).toBe(200)
      expect(response.body.status).toBe('success')
      expect(response.body.data.success).toBe(true)
    })

    test('should reject retry for non-failed order', async () => {
      // Set order as completed
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.status': 'completed'
      })

      const response = await request(app)
        .post(`/api/payments/${testOrder._id}/retry`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethodId: 'pm_test123'
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe('Order payment cannot be retried')
    })
  })
})
