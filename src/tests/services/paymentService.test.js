/**
 * Payment Service Tests
 * 
 * Comprehensive tests for the payment service including:
 * - Payment intent creation and management
 * - Payment method validation
 * - Refund processing
 * - Fee calculations
 * - Error handling
 * - Stripe integration
 * - Customer management
 */

const { PaymentService } = require('../../services/paymentService')
const User = require('../../models/User')
const Order = require('../../models/Order')
const Product = require('../../models/Product')

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
    }
  }))
})

// Mock services
jest.mock('../../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}))

jest.mock('../../services/socketService', () => ({
  emitOrderStatusUpdate: jest.fn(),
  sendToAdmins: jest.fn()
}))

describe('PaymentService', () => {
  let testUser
  let testProduct
  let testOrder
  let mockStripe

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      email: 'payment@test.com',
      password: 'password123',
      profile: {
        firstName: 'Payment',
        lastName: 'Test'
      },
      role: 'user'
    })

    // Create test product
    testProduct = await Product.create({
      name: 'Test Payment Shoe',
      brand: 'TestBrand',
      description: 'Test shoe for payment testing',
      category: 'running',
      variants: [{
        size: '9',
        color: 'black',
        price: 99.99,
        stock: 10,
        sku: 'TEST-PAYMENT-001',
        isActive: true
      }],
      images: ['test-image.jpg'],
      isActive: true
    })

    // Create test order
    testOrder = await Order.create({
      user: testUser._id,
      orderNumber: 'TEST-PAY-001',
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
    await User.findByIdAndDelete(testUser._id)
    await Product.findByIdAndDelete(testProduct._id)
    await Order.findByIdAndDelete(testOrder._id)
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ensureStripeCustomer', () => {
    test('should create new Stripe customer for user without customer ID', async () => {
      const mockCustomer = {
        id: 'cus_test123',
        email: testUser.email,
        name: `${testUser.profile.firstName} ${testUser.profile.lastName}`
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)

      const customer = await PaymentService.ensureStripeCustomer(testUser)

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: testUser.email,
        name: `${testUser.profile.firstName} ${testUser.profile.lastName}`,
        metadata: {
          userId: testUser._id.toString(),
          createdAt: expect.any(String)
        }
      })

      expect(customer).toEqual(mockCustomer)

      // Verify user was updated with customer ID
      const updatedUser = await User.findById(testUser._id)
      expect(updatedUser.stripeCustomerId).toBe(mockCustomer.id)
    })

    test('should retrieve existing Stripe customer', async () => {
      const mockCustomer = {
        id: 'cus_existing123',
        email: testUser.email
      }

      // Set existing customer ID
      await User.findByIdAndUpdate(testUser._id, { stripeCustomerId: mockCustomer.id })

      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer)

      const customer = await PaymentService.ensureStripeCustomer(testUser)

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(mockCustomer.id)
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
      expect(customer).toEqual(mockCustomer)
    })

    test('should create new customer if existing one is missing', async () => {
      const oldCustomerId = 'cus_deleted123'
      const newMockCustomer = {
        id: 'cus_new123',
        email: testUser.email
      }

      // Set existing customer ID
      await User.findByIdAndUpdate(testUser._id, { stripeCustomerId: oldCustomerId })

      // Mock customer not found
      mockStripe.customers.retrieve.mockRejectedValue({ code: 'resource_missing' })
      mockStripe.customers.create.mockResolvedValue(newMockCustomer)

      const customer = await PaymentService.ensureStripeCustomer(testUser)

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(oldCustomerId)
      expect(mockStripe.customers.create).toHaveBeenCalled()
      expect(customer).toEqual(newMockCustomer)
    })
  })

  describe('createPaymentIntent', () => {
    test('should create payment intent successfully', async () => {
      const mockCustomer = { id: 'cus_test123' }
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        amount: 11799, // $117.99 in cents
        currency: 'usd',
        status: 'requires_payment_method'
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

      const result = await PaymentService.createPaymentIntent(testOrder)

      expect(result.success).toBe(true)
      expect(result.paymentIntent).toEqual(mockPaymentIntent)
      expect(result.clientSecret).toBe(mockPaymentIntent.client_secret)

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 11799,
        currency: 'usd',
        customer: mockCustomer.id,
        metadata: {
          orderId: testOrder._id.toString(),
          orderNumber: testOrder.orderNumber,
          userId: testUser._id.toString(),
          itemCount: '1'
        },
        description: `Order ${testOrder.orderNumber}`,
        statement_descriptor: 'SHOE STORE',
        receipt_email: testUser.email,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        shipping: {
          name: `${testUser.profile.firstName} ${testUser.profile.lastName}`,
          address: {
            line1: testOrder.shippingAddress.street,
            city: testOrder.shippingAddress.city,
            state: testOrder.shippingAddress.state,
            postal_code: testOrder.shippingAddress.zipCode,
            country: 'US'
          }
        }
      })

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id)
      expect(updatedOrder.payment.stripePaymentIntentId).toBe(mockPaymentIntent.id)
      expect(updatedOrder.payment.method).toBe('stripe')
      expect(updatedOrder.payment.attempts).toHaveLength(1)
    })

    test('should handle payment intent creation error', async () => {
      const mockCustomer = { id: 'cus_test123' }
      const error = new Error('Payment intent creation failed')

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.paymentIntents.create.mockRejectedValue(error)

      const result = await PaymentService.createPaymentIntent(testOrder)

      expect(result.success).toBe(false)
      expect(result.error).toBe(error.message)
    })

    test('should create payment intent with payment method', async () => {
      const mockCustomer = { id: 'cus_test123' }
      const mockPaymentIntent = {
        id: 'pi_test123',
        client_secret: 'pi_test123_secret',
        status: 'requires_confirmation'
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

      const options = {
        paymentMethodId: 'pm_test123',
        confirmImmediately: true,
        savePaymentMethod: true
      }

      const result = await PaymentService.createPaymentIntent(testOrder, options)

      expect(result.success).toBe(true)
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'pm_test123',
          confirmation_method: 'manual',
          confirm: true,
          setup_future_usage: 'off_session'
        })
      )
    })
  })

  describe('processRefund', () => {
    beforeEach(async () => {
      // Set order as paid
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.status': 'completed',
        'payment.stripePaymentIntentId': 'pi_test123'
      })
    })

    test('should process full refund successfully', async () => {
      const mockRefund = {
        id: 'ref_test123',
        amount: 11799, // Full amount in cents
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripe.refunds.create.mockResolvedValue(mockRefund)

      const result = await PaymentService.processRefund(testOrder, {
        reason: 'requested_by_customer'
      })

      expect(result.success).toBe(true)
      expect(result.refund).toEqual(mockRefund)

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test123',
        amount: 11799,
        reason: 'requested_by_customer',
        metadata: {
          orderId: testOrder._id.toString(),
          orderNumber: testOrder.orderNumber
        }
      })

      // Verify order was updated
      const updatedOrder = await Order.findById(testOrder._id)
      expect(updatedOrder.payment.status).toBe('refunded')
      expect(updatedOrder.payment.refunds).toHaveLength(1)
      expect(updatedOrder.payment.refunds[0].refundId).toBe(mockRefund.id)
    })

    test('should process partial refund successfully', async () => {
      const mockRefund = {
        id: 'ref_partial123',
        amount: 5000, // $50.00 in cents
        status: 'succeeded',
        created: Math.floor(Date.now() / 1000)
      }

      mockStripe.refunds.create.mockResolvedValue(mockRefund)

      const result = await PaymentService.processRefund(testOrder, {
        amount: 50.00,
        reason: 'requested_by_customer'
      })

      expect(result.success).toBe(true)
      expect(mockStripe.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000
        })
      )

      // Verify order status is partially refunded
      const updatedOrder = await Order.findById(testOrder._id)
      expect(updatedOrder.payment.status).toBe('partially_refunded')
    })

    test('should reject refund for unpaid order', async () => {
      // Set order as pending
      await Order.findByIdAndUpdate(testOrder._id, {
        'payment.status': 'pending'
      })

      const result = await PaymentService.processRefund(testOrder)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot refund order that is not paid')
      expect(mockStripe.refunds.create).not.toHaveBeenCalled()
    })

    test('should reject refund amount exceeding order total', async () => {
      const result = await PaymentService.processRefund(testOrder, {
        amount: 200.00 // More than order total
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Refund amount cannot exceed order total')
      expect(mockStripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  describe('calculateFees', () => {
    test('should calculate USD card fees correctly', () => {
      const fees = PaymentService.calculateFees(100, 'usd', 'card')

      expect(fees.percentageFee).toBe(2.90) // 2.9% of $100
      expect(fees.fixedFee).toBe(0.30)
      expect(fees.totalFee).toBe(3.20)
      expect(fees.netAmount).toBe(96.80)
    })

    test('should calculate EUR card fees correctly', () => {
      const fees = PaymentService.calculateFees(100, 'eur', 'card')

      expect(fees.percentageFee).toBe(1.40) // 1.4% of €100
      expect(fees.fixedFee).toBe(0.25)
      expect(fees.totalFee).toBe(1.65)
      expect(fees.netAmount).toBe(98.35)
    })

    test('should default to USD card fees for unknown currency/method', () => {
      const fees = PaymentService.calculateFees(100, 'unknown', 'unknown')

      expect(fees.percentageFee).toBe(2.90)
      expect(fees.fixedFee).toBe(0.30)
      expect(fees.totalFee).toBe(3.20)
    })
  })

  describe('validatePaymentMethod', () => {
    test('should validate payment method successfully', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_test123',
        type: 'card'
      }

      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockPaymentMethod)

      const result = await PaymentService.validatePaymentMethod('pm_test123', 'cus_test123')

      expect(result.success).toBe(true)
      expect(result.paymentMethod).toEqual(mockPaymentMethod)
    })

    test('should reject payment method for wrong customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_other123',
        type: 'card'
      }

      mockStripe.paymentMethods.retrieve.mockResolvedValue(mockPaymentMethod)

      const result = await PaymentService.validatePaymentMethod('pm_test123', 'cus_test123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Payment method does not belong to customer')
    })

    test('should handle payment method retrieval error', async () => {
      const error = new Error('Payment method not found')
      mockStripe.paymentMethods.retrieve.mockRejectedValue(error)

      const result = await PaymentService.validatePaymentMethod('pm_invalid', 'cus_test123')

      expect(result.success).toBe(false)
      expect(result.error).toBe(error.message)
    })
  })
})
