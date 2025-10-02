# Testing Documentation

## Overview

This document provides comprehensive information about the testing strategy, setup, and execution for the Shoe Store API. Our testing approach follows industry best practices and ensures high code quality, reliability, and maintainability.

## Testing Strategy

### 1. Test Pyramid Structure

We follow the test pyramid approach with three main levels:

```
    /\
   /  \    E2E Tests (Few)
  /____\   
 /      \   Integration Tests (Some)
/________\  Unit Tests (Many)
```

- **Unit Tests (70%)**: Test individual functions, methods, and components in isolation
- **Integration Tests (25%)**: Test interactions between different components
- **End-to-End Tests (5%)**: Test complete user workflows

### 2. Test Categories

#### Unit Tests
- **Model Tests**: Validate data models, schemas, validation rules, and methods
- **Service Tests**: Test business logic, external API integrations, and utility functions
- **Middleware Tests**: Validate authentication, authorization, and request processing
- **Utility Tests**: Test helper functions and shared utilities

#### Integration Tests
- **Route Tests**: Test API endpoints with real database interactions
- **Database Tests**: Test complex queries and data relationships
- **External Service Tests**: Test integrations with third-party services

#### End-to-End Tests
- **User Journey Tests**: Complete workflows from user registration to order completion
- **Admin Workflow Tests**: Administrative tasks and management operations

## Test Environment Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (v5.0 or higher) - Running locally or via Docker
3. **Redis** (v6.0 or higher) - Optional, tests work without Redis
4. **Jest** - Testing framework (installed via npm)

### Environment Configuration

Tests use a separate test database to ensure isolation:

```bash
# Test environment variables (automatically set in setup.js)
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/shoe-store-test
JWT_SECRET=test-jwt-secret-for-testing-only
```

### Database Setup

The test suite automatically:
- Connects to the test database before running tests
- Cleans up data between test suites
- Closes connections after tests complete

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Individual Test Files
```bash
# Run specific test file
npm test -- src/tests/models/User.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should create user"

# Run tests for specific directory
npm test -- src/tests/models/
```

## Test Structure and Organization

### Directory Structure
```
src/tests/
├── setup.js                 # Global test configuration
├── models/                  # Model unit tests
│   ├── User.test.js
│   ├── Product.test.js
│   ├── Order.test.js
│   ├── Review.test.js
│   └── Wishlist.test.js
├── services/                # Service unit tests
│   ├── NotificationService.test.js
│   ├── AnalyticsService.test.js
│   ├── EmailService.test.js
│   └── PaymentService.test.js
├── routes/                  # Integration tests
│   ├── auth.test.js
│   ├── products.test.js
│   ├── orders.test.js
│   ├── reviews.test.js
│   └── wishlists.test.js
├── middleware/              # Middleware tests
│   ├── auth.test.js
│   └── validation.test.js
└── utils/                   # Utility tests
    └── helpers.test.js
```

### Test File Naming Convention

- **Unit Tests**: `ComponentName.test.js`
- **Integration Tests**: `routeName.test.js`
- **Utility Tests**: `utilityName.test.js`

## Test Utilities and Helpers

### Global Test Utilities

The `setup.js` file provides global utilities available in all tests:

#### Mock Data
```javascript
// Available in all test files
global.mockUsers.customer    // Mock customer user data
global.mockUsers.staff       // Mock staff user data
global.mockUsers.admin       // Mock admin user data
global.mockProduct           // Mock product data
global.mockOrder             // Mock order data
```

#### Database Utilities
```javascript
// Clean up database between tests
await global.cleanupDatabase()

// Create authenticated user with token
const { user, token } = await global.createAuthenticatedUser(userData)
```

### Mocked External Services

External services are automatically mocked to prevent actual API calls:

- **Cloudinary**: Image upload/delete operations
- **Email Service**: Email sending operations
- **Push Notifications**: Browser push notifications
- **Stripe**: Payment processing
- **SMS Service**: SMS notifications

## Writing Tests

### Test Structure Template

```javascript
describe("Component/Feature Name", () => {
  // Setup and teardown
  beforeAll(async () => {
    // One-time setup (database connection, etc.)
  })

  beforeEach(async () => {
    // Setup before each test (clean database, create test data)
  })

  afterEach(async () => {
    // Cleanup after each test (optional)
  })

  afterAll(async () => {
    // One-time cleanup (close connections, etc.)
  })

  describe("Specific functionality", () => {
    it("should perform expected behavior", async () => {
      // Arrange: Set up test data and conditions
      const testData = { /* test data */ }

      // Act: Execute the functionality being tested
      const result = await functionUnderTest(testData)

      // Assert: Verify the expected outcomes
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })

    it("should handle error conditions", async () => {
      // Test error scenarios
      await expect(functionUnderTest(invalidData))
        .rejects.toThrow("Expected error message")
    })
  })
})
```

### Best Practices

#### 1. Test Naming
- Use descriptive test names that explain the expected behavior
- Follow the pattern: "should [expected behavior] when [condition]"
- Group related tests using `describe` blocks

#### 2. Test Independence
- Each test should be independent and not rely on other tests
- Use `beforeEach` to set up fresh test data
- Clean up after tests to prevent side effects

#### 3. Assertions
- Use specific assertions that clearly indicate what's being tested
- Test both success and failure scenarios
- Verify all important aspects of the result

#### 4. Mock Usage
- Mock external dependencies to isolate the code under test
- Use real database operations for integration tests
- Mock time-dependent operations for consistent results

## Test Coverage

### Coverage Goals
- **Overall Coverage**: > 90%
- **Critical Paths**: 100% (authentication, payments, data validation)
- **Business Logic**: > 95%
- **Error Handling**: > 85%

### Viewing Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Analysis

The coverage report shows:
- **Line Coverage**: Percentage of code lines executed
- **Function Coverage**: Percentage of functions called
- **Branch Coverage**: Percentage of code branches taken
- **Statement Coverage**: Percentage of statements executed

## Continuous Integration

### GitHub Actions Integration

Tests run automatically on:
- Pull requests to main branch
- Pushes to main branch
- Scheduled runs (daily)

### Test Pipeline
1. **Setup**: Install dependencies, start test database
2. **Lint**: Code quality checks
3. **Unit Tests**: Run all unit tests
4. **Integration Tests**: Run integration tests
5. **Coverage**: Generate and upload coverage reports
6. **Cleanup**: Stop services, cleanup resources

## Debugging Tests

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Ensure MongoDB is running
mongod --dbpath /path/to/test/db

# Check connection string in setup.js
```

#### 2. Test Timeouts
```bash
# Increase timeout for slow tests
jest.setTimeout(30000)

# Or in individual tests
it("slow test", async () => {
  // test code
}, 60000) // 60 second timeout
```

#### 3. Memory Leaks
```bash
# Run tests with memory monitoring
node --max-old-space-size=4096 node_modules/.bin/jest

# Use --detectOpenHandles to find unclosed resources
npm test -- --detectOpenHandles
```

### Debug Mode
```bash
# Run tests in debug mode
npm test -- --verbose

# Run specific test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand src/tests/models/User.test.js
```

## Performance Testing

### Load Testing
- Use tools like Artillery or k6 for API load testing
- Test critical endpoints under various load conditions
- Monitor response times and error rates

### Database Performance
- Test query performance with large datasets
- Verify index effectiveness
- Monitor connection pool usage

## Security Testing

### Authentication Tests
- Test JWT token validation
- Verify role-based access control
- Test session management

### Input Validation Tests
- Test SQL injection prevention
- Verify XSS protection
- Test input sanitization

### Data Protection Tests
- Verify sensitive data filtering
- Test password hashing
- Verify data encryption

## Maintenance

### Regular Tasks
1. **Update Test Data**: Keep mock data current with schema changes
2. **Review Coverage**: Identify and test uncovered code paths
3. **Performance Review**: Monitor test execution times
4. **Dependency Updates**: Keep testing libraries up to date

### Test Refactoring
- Remove duplicate test code
- Extract common test utilities
- Update tests when refactoring application code
- Maintain test documentation

## Conclusion

This comprehensive testing strategy ensures:
- **High Code Quality**: Catch bugs early in development
- **Reliable Deployments**: Confidence in production releases
- **Maintainable Code**: Easy to modify and extend
- **Documentation**: Tests serve as living documentation
- **Team Productivity**: Faster development with fewer bugs

For questions or improvements to the testing strategy, please refer to the development team or create an issue in the project repository.
