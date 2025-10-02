# Stripe Payment Integration Guide

## Overview

The Shoe Store API provides comprehensive Stripe payment integration with advanced features including payment intents, saved payment methods, webhooks, refunds, and analytics. This guide covers the complete payment flow and implementation details.

## Features

### Core Payment Features
- **Payment Intents** - Secure payment processing with 3D Secure support
- **Saved Payment Methods** - Store customer cards for future use
- **Multi-currency Support** - Accept payments in multiple currencies
- **Real-time Updates** - WebSocket notifications for payment status
- **Comprehensive Webhooks** - Handle all Stripe events
- **Advanced Refunds** - Full and partial refund processing
- **Payment Analytics** - Detailed reporting and insights
- **Fraud Protection** - Built-in Stripe Radar integration

### Security Features
- **PCI Compliance** - Stripe handles sensitive card data
- **3D Secure** - Automatic strong customer authentication
- **Webhook Verification** - Cryptographic signature validation
- **Customer Isolation** - Strict access controls
- **Audit Logging** - Comprehensive payment tracking

## Payment Flow

### 1. Create Payment Intent

```javascript
// Frontend - Create payment intent
const response = await fetch('/api/payments/create-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    orderId: 'order_123',
    currency: 'usd',
    savePaymentMethod: true
  })
})

const { clientSecret, paymentIntentId } = await response.json()
```

### 2. Collect Payment Method

```javascript
// Frontend - Using Stripe Elements
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripe = await loadStripe('pk_test_...')

const PaymentForm = () => {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!stripe || !elements) return

    const cardElement = elements.getElement(CardElement)

    // Confirm payment
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Customer Name',
          email: 'customer@example.com'
        }
      }
    })

    if (error) {
      console.error('Payment failed:', error)
    } else {
      console.log('Payment succeeded:', paymentIntent)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe}>
        Pay Now
      </button>
    </form>
  )
}
```

### 3. Handle Payment Result

```javascript
// Frontend - Handle payment completion
if (paymentIntent.status === 'succeeded') {
  // Payment successful
  window.location.href = `/orders/${orderId}/confirmation`
} else if (paymentIntent.status === 'requires_action') {
  // Additional authentication required (3D Secure)
  const { error } = await stripe.handleCardAction(clientSecret)
  if (!error) {
    // Authentication successful, payment will complete via webhook
  }
}
```

## API Endpoints

### Create Payment Intent

**POST** `/api/payments/create-intent`

Creates a new payment intent for an order.

```json
{
  "orderId": "64a1b2c3d4e5f6789012345",
  "paymentMethodId": "pm_1234567890", // Optional
  "savePaymentMethod": true, // Optional
  "currency": "usd", // Optional, defaults to USD
  "setupFutureUsage": "off_session" // Optional
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "clientSecret": "pi_1234567890_secret_abcdef",
    "paymentIntentId": "pi_1234567890",
    "status": "requires_payment_method",
    "amount": 11799,
    "currency": "usd"
  }
}
```

### Confirm Payment Intent

**POST** `/api/payments/confirm-intent`

Manually confirm a payment intent with a payment method.

```json
{
  "paymentIntentId": "pi_1234567890",
  "paymentMethodId": "pm_1234567890"
}
```

### Get Payment Methods

**GET** `/api/payments/payment-methods`

Retrieve saved payment methods for the authenticated user.

**Response:**
```json
{
  "status": "success",
  "data": {
    "paymentMethods": [
      {
        "id": "pm_1234567890",
        "type": "card",
        "card": {
          "brand": "visa",
          "last4": "4242",
          "expMonth": 12,
          "expYear": 2025,
          "funding": "credit"
        },
        "created": 1234567890
      }
    ]
  }
}
```

### Delete Payment Method

**DELETE** `/api/payments/payment-methods/:paymentMethodId`

Remove a saved payment method.

### Process Refund (Admin)

**POST** `/api/payments/:orderId/refund`

Process a full or partial refund for an order.

```json
{
  "amount": 50.00, // Optional, defaults to full refund
  "reason": "Customer request"
}
```

### Get Payment Analytics (Admin)

**GET** `/api/payments/analytics`

Retrieve payment analytics and reporting data.

**Query Parameters:**
- `startDate` - Filter from date (ISO string)
- `endDate` - Filter to date (ISO string)
- `currency` - Currency filter (default: USD)

### Get Payment History

**GET** `/api/payments/history`

Get payment history for the authenticated user.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `status` - Filter by payment status

### Retry Failed Payment

**POST** `/api/payments/:orderId/retry`

Retry a failed payment with a new payment method.

```json
{
  "paymentMethodId": "pm_1234567890"
}
```

## Webhook Integration

### Webhook Endpoint

**POST** `/api/payments/webhook`

Stripe webhook endpoint for handling payment events.

### Supported Events

The webhook handler processes the following Stripe events:

#### Payment Intent Events
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `payment_intent.canceled` - Payment canceled
- `payment_intent.requires_action` - Additional authentication required
- `payment_intent.processing` - Payment is being processed

#### Charge Events
- `charge.succeeded` - Charge completed
- `charge.failed` - Charge failed
- `charge.refunded` - Charge refunded
- `charge.dispute.created` - Dispute created

#### Payment Method Events
- `payment_method.attached` - Payment method saved
- `payment_method.detached` - Payment method removed

#### Customer Events
- `customer.created` - Customer created
- `customer.updated` - Customer updated

#### Fraud Events
- `radar.early_fraud_warning.created` - Fraud warning

### Webhook Configuration

1. **Set up webhook endpoint in Stripe Dashboard:**
   ```
   https://your-domain.com/api/payments/webhook
   ```

2. **Configure webhook secret in environment variables:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
   ```

3. **Select events to send:**
   - All payment_intent.* events
   - All charge.* events
   - All customer.* events
   - radar.early_fraud_warning.created

## Error Handling

### Common Error Types

#### Card Errors
```json
{
  "status": "error",
  "message": "Your card was declined.",
  "code": "card_declined",
  "type": "card_error"
}
```

#### Invalid Request Errors
```json
{
  "status": "error",
  "message": "Invalid payment request",
  "type": "invalid_request"
}
```

#### Server Errors
```json
{
  "status": "error",
  "message": "Failed to create payment intent",
  "type": "server_error"
}
```

### Error Handling Best Practices

1. **Always handle card errors gracefully**
2. **Provide clear error messages to users**
3. **Log errors for debugging**
4. **Implement retry logic for transient errors**
5. **Use webhooks for authoritative payment status**

## Testing

### Test Cards

Stripe provides test cards for different scenarios:

```javascript
// Successful payment
const successCard = '4242424242424242'

// Declined payment
const declinedCard = '4000000000000002'

// 3D Secure required
const threeDSecureCard = '4000002500003155'

// Insufficient funds
const insufficientFundsCard = '4000000000009995'
```

### Test Environment Setup

```env
# Test environment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### Running Tests

```bash
# Run payment tests
npm test -- --testPathPattern=payments

# Run specific test file
npm test src/tests/routes/payments.test.js

# Run with coverage
npm test -- --coverage --testPathPattern=payments
```

## Security Considerations

### PCI Compliance
- Never store card data on your servers
- Use Stripe Elements for card collection
- Validate webhook signatures
- Use HTTPS for all payment endpoints

### Access Control
- Authenticate all payment requests
- Validate user ownership of orders
- Restrict admin operations
- Log all payment activities

### Data Protection
- Encrypt sensitive data at rest
- Use secure communication channels
- Implement proper session management
- Regular security audits

## Monitoring and Alerts

### Key Metrics to Monitor
- Payment success rate
- Average processing time
- Failed payment reasons
- Refund rates
- Dispute rates

### Alerting Setup
- Failed payment spikes
- Webhook delivery failures
- High refund rates
- Fraud warnings
- System errors

### Logging
- All payment attempts
- Webhook events
- Error conditions
- Performance metrics
- Security events

## Production Deployment

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://your-domain.com
```

### Webhook Configuration
1. Update webhook URL to production endpoint
2. Verify webhook secret is set correctly
3. Test webhook delivery
4. Monitor webhook logs

### Go-Live Checklist
- [ ] Test all payment flows
- [ ] Verify webhook handling
- [ ] Check error handling
- [ ] Validate refund process
- [ ] Test 3D Secure flows
- [ ] Monitor payment analytics
- [ ] Set up alerting
- [ ] Document incident procedures

This comprehensive Stripe integration provides a robust, secure, and scalable payment solution for the shoe store e-commerce platform.
