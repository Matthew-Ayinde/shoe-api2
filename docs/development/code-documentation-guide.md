# Code Documentation Guide

## Overview

This guide explains the comprehensive documentation standards implemented throughout the Shoe Store API codebase. Every file, function, class, and important code block is documented following industry best practices.

## Documentation Standards

### File-Level Documentation

Every file starts with a comprehensive header comment explaining:
- Purpose and functionality
- Key features and capabilities
- Dependencies and integrations
- Performance considerations
- Security measures
- Usage examples

#### Example: Model Documentation
```javascript
/**
 * User Model
 *
 * Comprehensive user management system supporting:
 * - Email/password authentication
 * - Google OAuth integration
 * - Role-based access control (customer, staff, admin)
 * - Multiple shipping addresses
 * - User preferences and notifications
 * - Push notification subscriptions
 * - Account verification and password reset
 *
 * Security Features:
 * - Password hashing with bcrypt (12 salt rounds)
 * - Email verification tokens
 * - Password reset tokens with expiration
 * - Sensitive data filtering in JSON responses
 *
 * Best Practices Implemented:
 * - Compound indexes for performance
 * - Pre-save middleware for password hashing
 * - Instance methods for common operations
 * - Proper validation and constraints
 */
```

### Function and Method Documentation

Every function includes JSDoc-style comments with:
- Purpose description
- Parameter types and descriptions
- Return value description
- Usage examples
- Error handling information

#### Example: Function Documentation
```javascript
/**
 * Instance Method: Check Stock Availability
 *
 * Checks if a specific size/color combination is in stock.
 * Used during cart operations and product display.
 *
 * @param {string} size - Shoe size
 * @param {string} color - Color name
 * @returns {boolean} - True if variant is in stock
 */
productSchema.methods.isInStock = function (size, color) {
  const variant = this.variants.find(v => 
    v.size === size && 
    v.color === color && 
    v.isActive
  )
  return variant && variant.stock > 0
}
```

### Schema Field Documentation

Database schema fields include detailed comments explaining:
- Field purpose and usage
- Validation rules and constraints
- Relationships to other collections
- Performance considerations

#### Example: Schema Documentation
```javascript
const userSchema = new mongoose.Schema({
  // Primary email - used for login and communications
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Automatically convert to lowercase
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },

  // Password for email/password authentication
  // select: false means password won't be included in queries by default
  password: {
    type: String,
    select: false,
    minlength: [6, 'Password must be at least 6 characters'],
  },

  // Role-based Access Control
  // customer: regular users who can place orders
  // staff: employees who can manage orders and products
  // admin: full system access
  role: {
    type: String,
    enum: ["customer", "staff", "admin"],
    default: "customer",
  },
})
```

### Middleware Documentation

Middleware functions include comprehensive documentation about:
- Purpose and functionality
- Security measures
- Error handling
- Usage patterns

#### Example: Middleware Documentation
```javascript
/**
 * Required Authentication Middleware
 *
 * Validates JWT tokens and ensures user is authenticated.
 * Blocks access if no valid token is provided.
 *
 * Process:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Lookup user in database
 * 4. Validate user exists and is active
 * 5. Attach user object to request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticate = async (req, res, next) => {
  // Implementation with inline comments
}
```

## Code Organization and Structure

### Directory Structure Documentation

Each major directory includes a README explaining:
- Purpose of the directory
- File organization patterns
- Naming conventions
- Dependencies between files

### Model Documentation Structure

Models follow a consistent documentation pattern:

1. **File Header** - Overall purpose and features
2. **Schema Documentation** - Field-by-field explanations
3. **Index Documentation** - Performance optimization explanations
4. **Middleware Documentation** - Pre/post hooks and their purposes
5. **Method Documentation** - Instance and static methods
6. **Virtual Documentation** - Computed properties
7. **Export Documentation** - Module export patterns

### Route Documentation Structure

Route files include:

1. **File Header** - Endpoint overview and authentication requirements
2. **Route Documentation** - Each endpoint with full API documentation
3. **Middleware Usage** - Authentication and validation explanations
4. **Error Handling** - Error response patterns
5. **Example Requests/Responses** - Usage examples

#### Example: Route Documentation
```javascript
/**
 * Product Routes
 *
 * Handles all product-related operations including:
 * - Product catalog browsing and search
 * - Product detail retrieval
 * - Admin product management (CRUD operations)
 * - Product image management
 * - Inventory tracking
 * - Product analytics
 *
 * Authentication Requirements:
 * - GET /products - Public access
 * - POST /products - Admin only
 * - PUT /products/:id - Admin only
 * - DELETE /products/:id - Admin only
 */

/**
 * GET /api/products
 * 
 * Retrieve paginated product catalog with filtering and search
 * 
 * Query Parameters:
 * - page (number): Page number (default: 1)
 * - limit (number): Items per page (default: 20, max: 100)
 * - category (string): Filter by category
 * - brand (string): Filter by brand
 * - minPrice (number): Minimum price filter
 * - maxPrice (number): Maximum price filter
 * - search (string): Text search query
 * - sort (string): Sort field (price, name, createdAt)
 * - order (string): Sort order (asc, desc)
 * 
 * Response:
 * - 200: Success with product list
 * - 400: Invalid query parameters
 * - 500: Server error
 */
router.get('/', optionalAuth, async (req, res) => {
  // Implementation
})
```

### Service Documentation Structure

Service files include:

1. **Class/Module Overview** - Purpose and capabilities
2. **Method Documentation** - Each method with full JSDoc
3. **Error Handling** - Error types and handling strategies
4. **Integration Points** - External service integrations
5. **Configuration** - Environment variables and setup

## Inline Code Comments

### Comment Types and Usage

#### 1. Explanatory Comments
Explain complex business logic or algorithms:

```javascript
// Calculate shipping cost based on weight, distance, and shipping method
const calculateShippingCost = (weight, distance, method) => {
  // Base rate varies by shipping method
  const baseRates = {
    standard: 5.99,
    express: 12.99,
    overnight: 24.99
  }
  
  // Weight-based pricing (per pound over 2 lbs)
  const weightSurcharge = Math.max(0, weight - 2) * 1.50
  
  // Distance-based pricing (per 100 miles over 500 miles)
  const distanceSurcharge = Math.max(0, (distance - 500) / 100) * 2.00
  
  return baseRates[method] + weightSurcharge + distanceSurcharge
}
```

#### 2. Warning Comments
Highlight important considerations or potential issues:

```javascript
// WARNING: This operation is expensive and should only be called during off-peak hours
const rebuildSearchIndex = async () => {
  // Implementation
}

// SECURITY: Never log sensitive user data
logger.info('User login attempt', { 
  email: user.email, 
  // password: user.password // NEVER LOG PASSWORDS
  timestamp: new Date()
})
```

#### 3. TODO Comments
Mark areas for future improvement:

```javascript
// TODO: Implement caching for frequently accessed products
// TODO: Add rate limiting for search endpoints
// TODO: Optimize database query with aggregation pipeline
```

#### 4. Performance Comments
Explain performance optimizations:

```javascript
// Performance optimization: Use lean() to skip Mongoose hydration
const products = await Product.find(query).lean()

// Batch process to avoid memory issues with large datasets
const batchSize = 100
for (let i = 0; i < totalItems; i += batchSize) {
  const batch = items.slice(i, i + batchSize)
  await processBatch(batch)
}
```

## API Documentation Standards

### Endpoint Documentation Format

Each API endpoint includes:

1. **HTTP Method and Path**
2. **Description**
3. **Authentication Requirements**
4. **Request Parameters**
5. **Request Body Schema**
6. **Response Schema**
7. **Error Responses**
8. **Example Requests/Responses**

#### Example: Complete Endpoint Documentation
```javascript
/**
 * POST /api/orders
 * 
 * Create a new order
 * 
 * Authentication: Required (Customer, Staff, Admin)
 * 
 * Request Body:
 * {
 *   "items": [
 *     {
 *       "productId": "string",
 *       "variantId": "string", 
 *       "quantity": "number"
 *     }
 *   ],
 *   "shippingAddress": {
 *     "firstName": "string",
 *     "lastName": "string",
 *     "street": "string",
 *     "city": "string",
 *     "state": "string",
 *     "zipCode": "string",
 *     "country": "string"
 *   },
 *   "paymentMethodId": "string",
 *   "couponCode": "string" // optional
 * }
 * 
 * Response 201:
 * {
 *   "status": "success",
 *   "data": {
 *     "order": {
 *       "orderNumber": "ORD-1640995200000-123",
 *       "status": "pending",
 *       "totalAmount": 99.99,
 *       "items": [...],
 *       "createdAt": "2024-01-15T10:30:00Z"
 *     }
 *   }
 * }
 * 
 * Error Responses:
 * - 400: Invalid request data
 * - 401: Authentication required
 * - 402: Payment failed
 * - 409: Insufficient inventory
 * - 500: Server error
 */
```

## Testing Documentation

### Test File Documentation

Test files include:

1. **Test Suite Overview** - What is being tested
2. **Test Setup** - Mocks, fixtures, and configuration
3. **Test Case Documentation** - Each test with clear descriptions
4. **Test Data** - Sample data and edge cases

#### Example: Test Documentation
```javascript
/**
 * User Authentication Tests
 * 
 * Comprehensive tests for user authentication including:
 * - User registration with email verification
 * - Email/password login
 * - Google OAuth integration
 * - JWT token validation
 * - Password reset functionality
 * - Account activation/deactivation
 */

describe('User Authentication', () => {
  /**
   * Test user registration with valid data
   * Verifies:
   * - User is created in database
   * - Password is properly hashed
   * - Email verification token is generated
   * - Welcome email is sent
   */
  test('should register user with valid data', async () => {
    // Test implementation
  })
})
```

## Documentation Maintenance

### Keeping Documentation Current

1. **Update with Code Changes** - Documentation must be updated with every code change
2. **Review Process** - Documentation changes are reviewed alongside code changes
3. **Automated Checks** - Linting rules enforce documentation standards
4. **Regular Audits** - Periodic reviews to ensure documentation accuracy

### Documentation Quality Checklist

- [ ] File header explains purpose and key features
- [ ] All functions have JSDoc comments
- [ ] Complex logic has explanatory comments
- [ ] Security considerations are documented
- [ ] Performance optimizations are explained
- [ ] Error handling is documented
- [ ] Examples are provided where helpful
- [ ] API endpoints have complete documentation
- [ ] Database schemas are fully documented

This comprehensive documentation approach ensures that the codebase is maintainable, understandable, and accessible to developers at all skill levels.
