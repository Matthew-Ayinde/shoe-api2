# Complete Codebase Documentation
## Shoe E-commerce API - Technical Reference

This document provides comprehensive technical documentation for every component of the shoe e-commerce API codebase. It explains how each part works, how components interact, and the complete data flow throughout the system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Application Structure](#core-application-structure)
3. [Configuration System](#configuration-system)
4. [Database Models & Schemas](#database-models--schemas)
5. [Authentication & Security](#authentication--security)
6. [API Routes & Endpoints](#api-routes--endpoints)
7. [Services & Business Logic](#services--business-logic)
8. [Middleware System](#middleware-system)
9. [Real-time Features](#real-time-features)
10. [Payment Processing](#payment-processing)
11. [Email & Notifications](#email--notifications)
12. [Caching & Performance](#caching--performance)
13. [Testing Infrastructure](#testing-infrastructure)
14. [Data Flow & Workflows](#data-flow--workflows)
15. [Deployment & Production](#deployment--production)

---

## Architecture Overview

### System Architecture

The application follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│  (Web App, Mobile App, Admin Dashboard, Third-party APIs)  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                         │
│     (Express.js, Middleware, Rate Limiting, CORS)          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  CONTROLLER LAYER                           │
│        (Route Handlers, Request Validation, Response)      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                             │
│    (Business Logic, External APIs, Background Jobs)        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                         │
│         (Mongoose Models, Database Operations)             │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER                         │
│    (MongoDB, Redis, Cloudinary, External Services)         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Technologies:**
- **Runtime**: Node.js 18+ (JavaScript runtime)
- **Framework**: Express.js 4.18+ (Web application framework)
- **Database**: MongoDB 6.0+ (NoSQL document database)
- **ODM**: Mongoose 8.0+ (Object Document Mapper)
- **Cache**: Redis 7+ (In-memory data structure store)

**Authentication & Security:**
- **JWT**: JSON Web Tokens for stateless authentication
- **Passport.js**: Authentication middleware with multiple strategies
- **bcryptjs**: Password hashing with salt rounds
- **Helmet.js**: Security headers middleware

**External Services:**
- **Stripe**: Payment processing and webhooks
- **Cloudinary**: Image storage and optimization
- **Nodemailer**: Email delivery service
- **Socket.IO**: Real-time bidirectional communication

**Development & Testing:**
- **Jest**: Testing framework with coverage reporting
- **Supertest**: HTTP assertion library for API testing
- **Nodemon**: Development server with auto-restart
- **Winston**: Logging library with multiple transports

---

## Core Application Structure

### Main Application Files

#### `src/app.js` - Application Entry Point

The main application file that orchestrates the entire system:

**Key Responsibilities:**
1. **Middleware Setup**: Security, parsing, compression, logging
2. **Database Connection**: MongoDB connection with error handling
3. **Route Mounting**: All API endpoints registration
4. **Error Handling**: Global error handling and 404 responses
5. **Socket.IO Setup**: Real-time communication initialization
6. **Graceful Shutdown**: Proper cleanup on application termination

**Middleware Stack (in order):**
```javascript
// Security Middleware
app.use(helmet()) // Security headers
app.use(mongoSanitize()) // NoSQL injection prevention
app.use(limiter) // Rate limiting

// CORS Configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}))

// Body Parsing
app.use(compression()) // Gzip compression
app.use(express.json({ limit: '10mb' })) // JSON parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' })) // URL encoding

// Logging
app.use(morgan('dev')) // Development logging
app.use(logger) // Production logging
```

**Database Connection Process:**
```javascript
const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    startCronJobs() // Start background jobs after DB connection
    return conn
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1) // Exit on connection failure
  }
}
```

**Route Registration:**
```javascript
// API Routes (all prefixed with /api)
app.use("/api/auth", authRoutes)           // Authentication
app.use("/api/products", productRoutes)    // Product catalog
app.use("/api/cart", cartRoutes)           // Shopping cart
app.use("/api/orders", orderRoutes)        // Order management
app.use("/api/payments", paymentRoutes)    // Payment processing
app.use("/api/admin", adminRoutes)         // Admin operations
app.use("/api/staff", staffRoutes)         // Staff operations
app.use("/api/reviews", reviewRoutes)      // Product reviews
app.use("/api/wishlists", wishlistRoutes)  // User wishlists
app.use("/api/analytics", analyticsRoutes) // Business analytics
```

#### `src/server.js` - Alternative Entry Point

Provides an alternative server startup mechanism:
- Imports configured app from `app.js`
- Handles server startup if not already running
- Useful for different deployment scenarios
- Maintains compatibility with various hosting platforms

---

## Configuration System

### Environment Configuration

The application uses a comprehensive environment-based configuration system that supports different deployment stages.

#### `src/config/database.js` - Database Configuration

**Purpose**: Centralized MongoDB connection management
**Features**:
- Connection string from environment variables
- Connection options for performance and reliability
- Error handling with process termination on failure
- Connection status logging

```javascript
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,    // Use new URL parser
      useUnifiedTopology: true, // Use new topology engine
    })
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error("Database connection error:", error)
    process.exit(1) // Exit process on connection failure
  }
}
```

#### `src/config/redis.js` - Redis Cache Configuration

**Purpose**: Redis connection and caching utilities
**Features**:
- Singleton pattern for single connection
- Reconnection strategy with exponential backoff
- Graceful degradation in development
- Standardized key patterns and TTL values
- Helper functions for common operations

**Connection Management:**
```javascript
const initializeRedis = async () => {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    retry_strategy: (options) => {
      // Exponential backoff with limits
      if (options.total_retry_time > 1000 * 60 * 60) return new Error('Retry time exhausted')
      if (options.attempt > 10) return undefined
      return Math.min(options.attempt * 100, 3000)
    }
  })
}
```

**Key Patterns:**
```javascript
const REDIS_KEYS = {
  PRODUCT_CACHE: (id) => `cache:product:${id}`,
  USER_SESSION: (sessionId) => `session:${sessionId}`,
  RATE_LIMIT: (ip) => `rate_limit:${ip}`,
  INVENTORY: (productId, variantId) => `inventory:${productId}:${variantId}`,
  FLASH_SALE_COUNTER: (saleId) => `flash_sale:${saleId}:counter`
}
```

#### `src/config/cloudinary.js` - Image Storage Configuration

**Purpose**: Cloudinary integration for image management
**Features**:
- Automatic image optimization and transformation
- Organized folder structure
- Upload and deletion utilities
- Error handling for failed operations

```javascript
const uploadImage = async (file, folder = "products") => {
  const result = await cloudinary.uploader.upload(file, {
    folder: `shoe-store/${folder}`,
    resource_type: "auto",
    transformation: [
      { width: 800, height: 600, crop: "limit" },
      { quality: "auto" },
      { fetch_format: "auto" }
    ],
  })
  return { public_id: result.public_id, url: result.secure_url }
}
```

#### `src/config/passport.js` - Authentication Strategies

**Purpose**: Passport.js authentication configuration
**Strategies Implemented**:
1. **Local Strategy**: Email/password authentication
2. **JWT Strategy**: Token-based authentication
3. **Google OAuth**: Social login integration

**Local Strategy Implementation:**
```javascript
passport.use(new LocalStrategy({
  usernameField: "email",
  passwordField: "password",
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email }).select("+password")
    if (!user) return done(null, false, { message: "Invalid email or password" })
    
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return done(null, false, { message: "Invalid email or password" })
    
    return done(null, user)
  } catch (error) {
    return done(error)
  }
}))
```

**JWT Strategy Implementation:**
```javascript
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.id)
    return user ? done(null, user) : done(null, false)
  } catch (error) {
    return done(error)
  }
}))
```

**Google OAuth Strategy:**
```javascript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  // Handle Google OAuth user creation/linking
  let user = await User.findOne({ googleId: profile.id })
  if (!user) {
    // Check for existing email or create new user
    user = await User.findOne({ email: profile.emails[0].value })
    if (user) {
      user.googleId = profile.id // Link existing account
    } else {
      user = new User({ /* Create new user */ })
    }
    await user.save()
  }
  return done(null, user)
}))
```

---

## Database Models & Schemas

The application uses MongoDB with Mongoose ODM for data persistence. The database design follows e-commerce best practices with proper relationships, indexing, and validation.

### Model Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ECOSYSTEM                           │
│  ┌─────────┐    ┌─────────┐    ┌──────────────┐            │
│  │  User   │────│  Cart   │────│ Notification │            │
│  └─────────┘    └─────────┘    └──────────────┘            │
│       │                                                     │
│       │         ┌─────────┐    ┌──────────────┐            │
│       └─────────│ Order   │────│   Review     │            │
│                 └─────────┘    └──────────────┘            │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────────────────┐
│                 PRODUCT ECOSYSTEM                           │
│  ┌─────────┐    ┌─────────┐    ┌──────────────┐            │
│  │Product  │────│Wishlist │────│  FlashSale   │            │
│  └─────────┘    └─────────┘    └──────────────┘            │
│       │                                                     │
│       └─────────┐                                          │
│                 │         ┌──────────────┐                 │
│                 └─────────│   Coupon     │                 │
│                           └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

### Core Models

#### 1. User Model (`src/models/User.js`)

**Purpose**: Central user management with authentication, profiles, and preferences

**Key Features**:
- Multi-strategy authentication (email/password, Google OAuth)
- Role-based access control (customer, staff, admin)
- Multiple shipping addresses
- Notification preferences
- Push notification subscriptions
- Account verification and password reset

**Schema Structure**:
```javascript
const userSchema = new mongoose.Schema({
  // Authentication
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, select: false, minlength: 6 },
  googleId: { type: String, sparse: true },

  // Authorization
  role: { type: String, enum: ["customer", "staff", "admin"], default: "customer" },

  // Profile Information
  profile: {
    firstName: { type: String, required: true, maxlength: 50 },
    lastName: { type: String, required: true, maxlength: 50 },
    phone: { type: String, match: /^\+?[\d\s\-\(\)]+$/ },
    avatar: String, // Cloudinary URL
    dateOfBirth: Date,
  },

  // Multiple Addresses Support
  addresses: [addressSchema],

  // Notification Preferences
  preferences: {
    newsletter: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
  },

  // Push Notification Subscription
  pushSubscription: {
    endpoint: String,
    keys: { p256dh: String, auth: String },
  },

  // Security & Verification
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Activity Tracking
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
}, { timestamps: true })
```

**Address Sub-Schema**:
```javascript
const addressSchema = new mongoose.Schema({
  type: { type: String, enum: ["home", "work", "other"], default: "home" },
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  zipCode: { type: String, required: true, trim: true },
  country: { type: String, default: "US", trim: true },
  isDefault: { type: Boolean, default: false },
})
```

**Key Methods**:
- `generateAuthToken()`: Creates JWT token for authentication
- `comparePassword(password)`: Validates password using bcrypt
- `generatePasswordResetToken()`: Creates secure reset token
- `addAddress(addressData)`: Adds new shipping address
- `setDefaultAddress(addressId)`: Sets default shipping address

**Indexes**:
- `email`: Unique index for fast user lookup
- `googleId`: Sparse index for OAuth users
- `role`: Index for role-based queries
- `emailVerificationToken`: Index for verification process

#### 2. Product Model (`src/models/Product.js`)

**Purpose**: Comprehensive product catalog with variants, inventory, and SEO

**Key Features**:
- Multi-variant products (size/color combinations)
- Individual SKU and pricing per variant
- Advanced inventory management
- SEO optimization with slugs
- Image management with Cloudinary
- Review aggregation and ratings
- Flash sale and promotion support

**Main Product Schema**:
```javascript
const productSchema = new mongoose.Schema({
  // Basic Information
  name: { type: String, required: true, maxlength: 100, index: 'text' },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: true, maxlength: 2000 },
  brand: { type: String, required: true, index: true },

  // Categorization
  category: { type: String, required: true, index: true },
  subcategory: String,
  tags: [{ type: String, lowercase: true, index: true }],

  // Product Variants (size/color combinations)
  variants: [variantSchema],

  // Aggregated Data
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },

  // SEO and Marketing
  metaTitle: String,
  metaDescription: String,
  featured: { type: Boolean, default: false },

  // Status and Visibility
  isActive: { type: Boolean, default: true },
  publishedAt: Date,

  // Analytics
  viewCount: { type: Number, default: 0 },
  wishlistCount: { type: Number, default: 0 },
}, { timestamps: true })
```

**Variant Sub-Schema**:
```javascript
const variantSchema = new mongoose.Schema({
  // Size and Color
  size: { type: String, required: true, enum: ["5", "5.5", "6", ...] },
  color: { type: String, required: true, maxlength: 50 },
  colorCode: { type: String, match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/ },

  // Inventory Management
  sku: { type: String, required: true, unique: true, uppercase: true },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, default: 5, min: 0 },

  // Pricing
  price: { type: Number, required: true, min: 0, max: 10000 },
  compareAtPrice: { type: Number, min: 0 }, // For sale pricing

  // Images
  images: [{
    public_id: String, // Cloudinary public ID
    url: String,       // Full image URL
    alt: String,       // Alt text for accessibility
  }],

  // Status
  isActive: { type: Boolean, default: true },
})
```

**Key Methods**:
- `updateAverageRating()`: Recalculates average rating from reviews
- `incrementViewCount()`: Tracks product views for analytics
- `checkLowStock()`: Returns variants with low inventory
- `getActiveVariants()`: Returns only active variants
- `findVariantBySku(sku)`: Finds specific variant by SKU

**Indexes**:
- Text index on `name` and `description` for search
- Compound index on `category` and `isActive`
- Index on `brand`, `tags`, and `featured`
- Unique index on variant SKUs

#### 3. Order Model (`src/models/Order.js`)

**Purpose**: Complete order lifecycle management with payment integration

**Key Features**:
- Immutable order history with product snapshots
- Payment integration with Stripe
- Order status workflow
- Shipping and tracking
- Refund management
- Analytics support

**Order Schema**:
```javascript
const orderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: { type: String, unique: true, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Order Items with Product Snapshots
  items: [orderItemSchema],

  // Pricing Information
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  shipping: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },

  // Applied Discounts
  coupon: {
    code: String,
    discount: Number,
    type: { type: String, enum: ["percentage", "fixed"] },
  },

  // Order Status Workflow
  status: {
    type: String,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
    default: "pending",
    index: true
  },

  // Payment Information
  payment: {
    method: { type: String, enum: ["stripe", "paypal", "cash"], default: "stripe" },
    stripePaymentIntentId: String,
    status: { type: String, enum: ["pending", "succeeded", "failed", "cancelled"], default: "pending" },
    paidAt: Date,
    amount: Number,
    currency: { type: String, default: "USD" },
  },

  // Shipping Information
  shipping: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    method: String,
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date,
  },

  // Order Timeline
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  }],

  // Additional Information
  notes: String,
  refundAmount: { type: Number, default: 0 },
  refundReason: String,
  refundedAt: Date,
}, { timestamps: true })
```

**Order Item Sub-Schema**:
```javascript
const orderItemSchema = new mongoose.Schema({
  // Product Reference
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

  // Product Snapshot (preserves data at time of purchase)
  productSnapshot: {
    name: { type: String, required: true },
    brand: { type: String, required: true },
    image: String,
    description: String,
    category: String,
  },

  // Variant Information
  variant: {
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String, required: true },
    image: String,
  },

  // Quantity and Pricing
  quantity: { type: Number, required: true, min: 1, max: 100 },
  price: { type: Number, required: true, min: 0 }, // Unit price at purchase
  total: { type: Number, required: true, min: 0 }, // quantity * price
})
```

**Key Methods**:
- `generateOrderNumber()`: Creates unique order identifier
- `updateStatus(status, note, updatedBy)`: Updates order status with history
- `calculateTotals()`: Recalculates order totals
- `canBeCancelled()`: Checks if order can be cancelled
- `processRefund(amount, reason)`: Handles refund processing

**Indexes**:
- Compound index on `user` and `createdAt`
- Index on `status` for status-based queries
- Index on `orderNumber` for order lookup
- Index on `payment.stripePaymentIntentId`

#### 4. Cart Model (`src/models/Cart.js`)

**Purpose**: Persistent shopping cart with real-time updates

**Key Features**:
- User-specific cart persistence
- Automatic total calculations
- Real-time synchronization
- Cart item management

**Schema Structure**:
```javascript
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  items: [cartItemSchema],
  totalItems: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  lastModified: { type: Date, default: Date.now },
}, { timestamps: true })

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variant: {
    size: { type: String, required: true },
    color: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
  },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  addedAt: { type: Date, default: Date.now },
})
```

**Key Methods**:
- `addItem(productId, variant, quantity)`: Adds or updates cart item
- `removeItem(productId, variant)`: Removes specific item
- `updateQuantity(productId, variant, quantity)`: Updates item quantity
- `clearCart()`: Removes all items
- `calculateTotals()`: Recalculates cart totals

#### 5. Review Model (`src/models/Review.js`)

**Purpose**: Product review and rating system with moderation

**Key Features**:
- Detailed rating system (1-5 stars)
- Review moderation workflow
- Helpful voting system
- Image attachments
- Verified purchase validation

**Schema Structure**:
```javascript
const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },

  // Review Content
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 2000 },

  // Detailed Ratings
  detailedRatings: {
    comfort: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    sizing: { type: Number, min: 1, max: 5 },
    style: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
  },

  // Review Images
  images: [{ public_id: String, url: String, alt: String }],

  // Moderation
  status: { type: String, enum: ["pending", "approved", "rejected", "flagged"], default: "pending" },
  moderationNote: String,
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  moderatedAt: Date,

  // Community Interaction
  helpfulVotes: { type: Number, default: 0 },
  unhelpfulVotes: { type: Number, default: 0 },
  flagCount: { type: Number, default: 0 },

  // Verification
  isVerifiedPurchase: { type: Boolean, default: true },
}, { timestamps: true })
```

#### 6. Notification Model (`src/models/Notification.js`)

**Purpose**: Multi-channel notification system

**Key Features**:
- Multiple delivery channels (email, push, SMS)
- Priority levels
- Delivery tracking
- Expiration handling

**Schema Structure**:
```javascript
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["order_confirmation", "order_shipped", "flash_sale_alert", "welcome", "system"],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Multi-channel Delivery Tracking
  channels: {
    email: { sent: Boolean, sentAt: Date, error: String },
    push: { sent: Boolean, sentAt: Date, error: String },
    sms: { sent: Boolean, sentAt: Date, error: String },
  },

  // User Interaction
  isRead: { type: Boolean, default: false },
  readAt: Date,

  // Priority and Expiration
  priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
  expiresAt: Date,
}, { timestamps: true })
```

#### 7. Wishlist Model (`src/models/Wishlist.js`)

**Purpose**: User wishlist management with sharing capabilities

**Key Features**:
- Multiple wishlists per user
- Product variant preferences
- Privacy settings
- Sharing with secure tokens
- Price tracking notifications

#### 8. Coupon Model (`src/models/Coupon.js`)

**Purpose**: Discount code and promotion management

**Key Features**:
- Percentage and fixed amount discounts
- Usage limits and tracking
- Expiration dates
- Product/category restrictions
- Minimum order requirements

#### 9. FlashSale Model (`src/models/FlashSale.js`)

**Purpose**: Time-limited promotional sales

**Key Features**:
- Time-based availability
- Product-specific discounts
- Stock limitations
- Real-time countdown
- Analytics tracking

### Model Relationships

**User-Centric Relationships**:
- User → Cart (1:1)
- User → Orders (1:many)
- User → Reviews (1:many)
- User → Wishlists (1:many)
- User → Notifications (1:many)

**Product-Centric Relationships**:
- Product → Reviews (1:many)
- Product → OrderItems (1:many)
- Product → CartItems (1:many)
- Product → WishlistItems (1:many)

**Order Processing Flow**:
- Cart → Order (conversion)
- Order → OrderItems (composition)
- Order → Payment (1:1)
- Order → Shipping (1:1)

### Database Indexes Strategy

**Performance Indexes**:
```javascript
// User indexes
User: { email: 1 }, { role: 1 }, { "addresses.isDefault": 1 }

// Product indexes
Product: { name: "text", description: "text" }, { category: 1, isActive: 1 }, { brand: 1 }

// Order indexes
Order: { user: 1, createdAt: -1 }, { status: 1 }, { orderNumber: 1 }

// Review indexes
Review: { product: 1, status: 1 }, { user: 1 }, { rating: 1 }

// Notification indexes
Notification: { recipient: 1, createdAt: -1 }, { type: 1 }, { isRead: 1 }
```

## Authentication & Security

### Authentication System

The application implements a comprehensive multi-strategy authentication system using Passport.js with JWT tokens.

#### Authentication Middleware (`src/middleware/auth.js`)

**Core Authentication Functions**:

1. **Required Authentication (`authenticate`)**:
   - Validates JWT tokens from Authorization header
   - Performs database user lookup for verification
   - Blocks access if no valid token provided
   - Attaches user object to request for route handlers

2. **Optional Authentication (`optionalAuth`)**:
   - Attempts authentication but continues regardless
   - Useful for public endpoints with user-specific features
   - Never blocks request execution

3. **Role-Based Access Control (`requireRole`)**:
   - Factory function for role-specific middleware
   - Supports hierarchical permissions
   - Provides detailed error messages

**Authentication Flow**:
```javascript
// 1. Extract token from header
const token = req.header("Authorization")?.replace("Bearer ", "")

// 2. Verify JWT signature and expiration
const decoded = jwt.verify(token, process.env.JWT_SECRET)

// 3. Database user lookup
const user = await User.findById(decoded.id)

// 4. Validate user exists and is active
if (!user || !user.isActive) {
  return res.status(401).json({ status: "error", message: "Invalid token" })
}

// 5. Attach user to request
req.user = user
```

**Role Hierarchy**:
- `customer`: Basic user access
- `staff`: Employee access (includes customer permissions)
- `admin`: Full system access (includes all permissions)

#### Passport Strategies (`src/config/passport.js`)

**1. Local Strategy (Email/Password)**:
```javascript
passport.use(new LocalStrategy({
  usernameField: "email",
  passwordField: "password",
}, async (email, password, done) => {
  const user = await User.findOne({ email }).select("+password")
  if (!user) return done(null, false, { message: "Invalid credentials" })

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) return done(null, false, { message: "Invalid credentials" })

  return done(null, user)
}))
```

**2. JWT Strategy (Token Validation)**:
```javascript
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
}, async (payload, done) => {
  const user = await User.findById(payload.id)
  return user ? done(null, user) : done(null, false)
}))
```

**3. Google OAuth Strategy**:
```javascript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
}, async (accessToken, refreshToken, profile, done) => {
  // Handle user creation/linking logic
  let user = await User.findOne({ googleId: profile.id })
  if (!user) {
    // Check for existing email or create new user
    user = await User.findOne({ email: profile.emails[0].value })
    if (user) {
      user.googleId = profile.id // Link existing account
    } else {
      user = new User({ /* Create new Google user */ })
    }
    await user.save()
  }
  return done(null, user)
}))
```

### Security Middleware

#### Error Handling (`src/middleware/errorHandler.js`)

**Global Error Handler**:
- Catches all unhandled errors
- Provides consistent error response format
- Logs errors for monitoring
- Handles specific error types (validation, 404, etc.)

```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack)

  // Validation errors
  if (err.name === "ValidationError") {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors || [],
    })
  }

  // Default error response
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  })
}
```

#### Input Validation (`src/middleware/validation.js`)

**Comprehensive Validation Rules**:
- User registration and login validation
- Product creation and update validation
- Order processing validation
- Coupon and promotion validation
- Query parameter validation

**Example Validation Rules**:
```javascript
const validateRegister = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("firstName").trim().isLength({ min: 1 }).withMessage("First name is required"),
  body("lastName").trim().isLength({ min: 1 }).withMessage("Last name is required"),
  handleValidationErrors,
]

const validateProduct = [
  body("name").trim().isLength({ min: 1 }).withMessage("Product name is required"),
  body("description").trim().isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
  body("variants").isArray({ min: 1 }).withMessage("At least one variant is required"),
  body("variants.*.size").isIn(["5", "5.5", "6", /* ... */]).withMessage("Invalid size"),
  body("variants.*.price").isFloat({ min: 0 }).withMessage("Price must be positive"),
  handleValidationErrors,
]
```

### Security Headers and Protection

**Helmet.js Configuration**:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))
```

**Rate Limiting**:
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: { status: "error", message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
})
```

**CORS Configuration**:
```javascript
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:3001", // Admin dashboard
      "http://localhost:3002", // Staff dashboard
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}))
```

## Services & Business Logic

The application follows a service-oriented architecture where business logic is encapsulated in dedicated service classes. This promotes code reusability, testability, and separation of concerns.

### Core Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Payment   │  │    Email    │  │   Socket    │        │
│  │   Service   │  │   Service   │  │   Service   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Notification│  │  Analytics  │  │    Cache    │        │
│  │   Service   │  │   Service   │  │   Service   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Inventory  │  │   Discount  │  │    Cron     │        │
│  │   Service   │  │   Service   │  │   Service   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 1. Payment Service (`src/services/paymentService.js`)

**Purpose**: Comprehensive payment processing with Stripe integration

**Key Features**:
- Payment intent creation and management
- Customer management and payment methods
- Subscription and recurring payments
- Refund processing and dispute handling
- Multi-currency support
- Fraud detection and risk management
- Payment retry logic
- Webhook event processing

**Core Methods**:

```javascript
class PaymentService {
  // Customer Management
  static async ensureStripeCustomer(user) {
    if (user.stripeCustomerId) {
      try {
        return await stripe.customers.retrieve(user.stripeCustomerId)
      } catch (error) {
        if (error.code === 'resource_missing') {
          user.stripeCustomerId = null // Customer deleted, create new
        }
      }
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.profile.firstName} ${user.profile.lastName}`,
      metadata: { userId: user._id.toString() }
    })

    await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id })
    return customer
  }

  // Payment Intent Creation
  static async createPaymentIntent(order, options = {}) {
    const customer = await this.ensureStripeCustomer(order.user)
    const amount = Math.round(order.pricing.total * 100) // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: options.currency || 'usd',
      customer: customer.id,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: order.user._id.toString(),
      },
      automatic_payment_methods: { enabled: true },
    })

    return paymentIntent
  }

  // Refund Processing
  static async processRefund(paymentIntentId, amount, reason) {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100),
      reason: reason || 'requested_by_customer',
      metadata: { processedAt: new Date().toISOString() }
    })

    return refund
  }
}
```

**Webhook Handling**:
```javascript
static async handleWebhook(event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await this.handlePaymentSuccess(event.data.object)
      break
    case 'payment_intent.payment_failed':
      await this.handlePaymentFailure(event.data.object)
      break
    case 'invoice.payment_succeeded':
      await this.handleSubscriptionPayment(event.data.object)
      break
  }
}
```

### 2. Email Service (`src/services/emailService.js`)

**Purpose**: Multi-provider email service with template management

**Key Features**:
- Multiple transport providers (Gmail, SendGrid, AWS SES, SMTP)
- Professional HTML email templates with Handlebars
- Template engine with variable substitution
- Bulk email processing with rate limiting
- Email tracking and analytics
- Retry logic and error handling
- Email queue management
- Attachment support

**Template System**:
```javascript
class EmailService {
  async loadTemplates() {
    const templateDir = path.join(__dirname, '../templates/emails')
    const templateFiles = await fs.readdir(templateDir)

    for (const file of templateFiles) {
      if (file.endsWith('.hbs')) {
        const templateName = path.basename(file, '.hbs')
        const templateContent = await fs.readFile(path.join(templateDir, file), 'utf8')
        this.templates.set(templateName, handlebars.compile(templateContent))
      }
    }
  }

  async sendTemplateEmail(to, templateName, data, options = {}) {
    const template = this.templates.get(templateName)
    if (!template) {
      throw new Error(`Template ${templateName} not found`)
    }

    const html = template(data)

    return await this.sendEmail({
      to,
      subject: data.subject || options.subject,
      html,
      ...options
    })
  }
}
```

**Available Email Templates**:
- `welcome.hbs`: User registration welcome
- `order-confirmation.hbs`: Order confirmation
- `shipping-notification.hbs`: Shipping updates
- `password-reset.hbs`: Password reset
- `flash-sale.hbs`: Flash sale notifications
- `abandoned-cart.hbs`: Cart abandonment recovery

### 3. Socket Service (`src/services/socketService.js`)

**Purpose**: Real-time communication and live updates

**Key Features**:
- User authentication and room management
- Real-time cart synchronization
- Live inventory tracking
- Order status notifications
- Admin dashboard updates
- Flash sale notifications
- Chat support system
- Product view tracking

**Connection Management**:
```javascript
const initializeSocketIO = (socketIO) => {
  io = socketIO

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId)
        if (user) {
          socket.userId = user._id.toString()
          socket.userRole = user.role
          socket.user = user
        }
      }
      next()
    } catch (error) {
      next() // Allow anonymous connections
    }
  })

  io.on("connection", (socket) => {
    // Auto-join user-specific rooms
    if (socket.userId) {
      socket.join(`user_${socket.userId}`)

      if (socket.userRole === 'admin' || socket.userRole === 'staff') {
        socket.join('admin')
        emitAdminDashboardUpdate(socket.id)
      }
    }

    // Handle real-time events
    socket.on('cart_update', handleCartUpdate)
    socket.on('product_view', handleProductView)
    socket.on('join_flash_sale', handleFlashSaleJoin)
  })
}
```

**Real-time Event Handlers**:
```javascript
// Cart Updates
const emitCartUpdate = (userId, cartData) => {
  io.to(`user_${userId}`).emit('cart_updated', cartData)
}

// Order Status Updates
const emitOrderStatusUpdate = (userId, orderData) => {
  io.to(`user_${userId}`).emit('order_status_updated', orderData)
}

// Inventory Updates
const emitInventoryUpdate = (productId, variantId, stock) => {
  io.emit('inventory_updated', { productId, variantId, stock })
}

// Admin Notifications
const sendToAdmins = (event, data) => {
  io.to('admin').emit(event, data)
}
```

### 4. Notification Service (`src/services/notificationService.js`)

**Purpose**: Multi-channel notification delivery system

**Key Features**:
- Email, push, SMS, in-app notifications
- User preference management
- Delivery tracking per channel
- Priority levels and scheduling
- Template system for different notification types
- Retry logic and error handling

**Notification Delivery**:
```javascript
class NotificationService {
  static async sendNotification(userId, type, data, options = {}) {
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    const notification = new Notification({
      recipient: userId,
      type,
      title: data.title,
      message: data.message,
      data: data.metadata || {},
      priority: options.priority || 'normal'
    })

    // Determine delivery channels based on user preferences
    const channels = this.getDeliveryChannels(user, type, options)

    // Send via each channel
    for (const channel of channels) {
      try {
        await this.sendViaChannel(channel, user, notification, data)
        notification.channels[channel].sent = true
        notification.channels[channel].sentAt = new Date()
      } catch (error) {
        notification.channels[channel].error = error.message
      }
    }

    await notification.save()
    return notification
  }

  static async sendViaChannel(channel, user, notification, data) {
    switch (channel) {
      case 'email':
        return await emailService.sendTemplateEmail(
          user.email,
          notification.type,
          data
        )
      case 'push':
        return await this.sendPushNotification(user, notification, data)
      case 'sms':
        return await this.sendSMSNotification(user, notification, data)
      case 'socket':
        return emitNotification(user._id, notification)
    }
  }
}
```

## API Routes & Endpoints

The API follows RESTful conventions with consistent response formats and comprehensive error handling. All routes are prefixed with `/api` and organized by resource type.

### Route Architecture

```
/api
├── /auth              # Authentication & user management
├── /products          # Product catalog & search
├── /cart              # Shopping cart operations
├── /orders            # Order processing & management
├── /payments          # Payment processing & webhooks
├── /reviews           # Product reviews & ratings
├── /wishlists         # User wishlists & favorites
├── /notifications     # User notifications
├── /coupons           # Discount codes & promotions
├── /flash-sales       # Time-limited sales
├── /admin             # Admin dashboard & management
├── /staff             # Staff operations
├── /analytics         # Business analytics & reporting
└── /health            # System health checks
```

### Response Format

All API responses follow a consistent format:

```javascript
// Success Response
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {  // For paginated responses
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}

// Error Response
{
  "status": "error",
  "message": "Error description",
  "errors": [  // For validation errors
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### 1. Authentication Routes (`/api/auth`)

**Purpose**: User authentication, registration, and account management

#### Core Authentication Endpoints

**POST `/api/auth/register`**
- **Purpose**: Register new customer account
- **Access**: Public
- **Validation**: `validateRegister`
- **Body**: `{ email, password, firstName, lastName }`
- **Response**: User object with JWT token

**POST `/api/auth/register-admin`**
- **Purpose**: Register admin account (requires admin secret)
- **Access**: Public (with admin secret)
- **Validation**: `validateRegister`
- **Body**: `{ email, password, firstName, lastName, adminSecret }`
- **Response**: Admin user object with JWT token

**POST `/api/auth/register-staff`**
- **Purpose**: Register staff account (admin only)
- **Access**: Admin only
- **Validation**: `validateRegister`
- **Body**: `{ email, password, firstName, lastName, permissions }`
- **Response**: Staff user object with JWT token

**POST `/api/auth/login`**
- **Purpose**: User login with email/password
- **Access**: Public
- **Validation**: `validateLogin`
- **Body**: `{ email, password }`
- **Response**: User object with JWT token

**POST `/api/auth/logout`**
- **Purpose**: User logout (client-side token removal)
- **Access**: Private
- **Response**: Success message

#### OAuth Integration

**GET `/api/auth/google`**
- **Purpose**: Initiate Google OAuth flow
- **Access**: Public
- **Response**: Redirect to Google OAuth

**GET `/api/auth/google/callback`**
- **Purpose**: Handle Google OAuth callback
- **Access**: Public
- **Response**: User object with JWT token or redirect

#### Password Management

**POST `/api/auth/forgot-password`**
- **Purpose**: Request password reset
- **Access**: Public
- **Body**: `{ email }`
- **Response**: Success message (email sent)

**POST `/api/auth/reset-password`**
- **Purpose**: Reset password with token
- **Access**: Public
- **Body**: `{ token, password }`
- **Response**: Success message

**PUT `/api/auth/change-password`**
- **Purpose**: Change password (authenticated user)
- **Access**: Private
- **Body**: `{ currentPassword, newPassword }`
- **Response**: Success message

#### Profile Management

**GET `/api/auth/profile`**
- **Purpose**: Get current user profile
- **Access**: Private
- **Response**: User profile object

**PUT `/api/auth/profile`**
- **Purpose**: Update user profile
- **Access**: Private
- **Body**: `{ firstName, lastName, phone, dateOfBirth }`
- **Response**: Updated user profile

**POST `/api/auth/upload-avatar`**
- **Purpose**: Upload profile avatar
- **Access**: Private
- **Body**: Multipart form with image file
- **Response**: Updated user with avatar URL

### 2. Product Routes (`/api/products`)

**Purpose**: Product catalog management and search functionality

#### Product Browsing

**GET `/api/products`**
- **Purpose**: Get products with filtering and pagination
- **Access**: Public (optional auth for personalization)
- **Query Parameters**:
  - `page`, `limit`: Pagination
  - `category`, `brand`, `gender`: Filtering
  - `minPrice`, `maxPrice`: Price range
  - `size`, `color`: Variant filtering
  - `search`: Text search
  - `sortBy`, `sortOrder`: Sorting
  - `featured`: Featured products only

**Example Request**:
```javascript
GET /api/products?category=running&brand=nike&minPrice=50&maxPrice=200&page=1&limit=20&sortBy=price&sortOrder=asc
```

**GET `/api/products/:id`**
- **Purpose**: Get single product details
- **Access**: Public (optional auth for personalization)
- **Response**: Complete product object with variants, reviews, ratings

**GET `/api/products/slug/:slug`**
- **Purpose**: Get product by SEO-friendly slug
- **Access**: Public
- **Response**: Complete product object

#### Product Search

**GET `/api/products/search`**
- **Purpose**: Advanced product search with filters
- **Access**: Public
- **Query Parameters**: Same as product listing plus advanced filters
- **Features**: Text search, faceted search, autocomplete suggestions

**GET `/api/products/suggestions`**
- **Purpose**: Get search suggestions/autocomplete
- **Access**: Public
- **Query**: `{ q: "search term" }`
- **Response**: Array of search suggestions

#### Product Management (Staff/Admin)

**POST `/api/products`**
- **Purpose**: Create new product
- **Access**: Staff/Admin
- **Validation**: `validateProduct`
- **Body**: Complete product object with variants
- **Response**: Created product object

**PUT `/api/products/:id`**
- **Purpose**: Update existing product
- **Access**: Staff/Admin
- **Validation**: `validateProduct`
- **Body**: Updated product fields
- **Response**: Updated product object

**DELETE `/api/products/:id`**
- **Purpose**: Delete product (soft delete)
- **Access**: Admin only
- **Response**: Success message

**POST `/api/products/:id/images`**
- **Purpose**: Upload product images
- **Access**: Staff/Admin
- **Body**: Multipart form with image files
- **Response**: Updated product with image URLs

### 3. Order Routes (`/api/orders`)

**Purpose**: Complete order lifecycle management

#### Order Creation

**POST `/api/orders`**
- **Purpose**: Create new order from cart or items
- **Access**: Private
- **Validation**: `validateOrder`
- **Body**:
```javascript
{
  "items": [/* order items */],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "shippingMethod": "standard",
  "customerNotes": "Leave at door",
  "isGift": false
}
```

**Order Processing Flow**:
1. Validate items and availability
2. Reserve inventory
3. Calculate pricing (subtotal, tax, shipping)
4. Create order record
5. Clear cart
6. Send confirmation email
7. Emit real-time notifications

#### Order Management

**GET `/api/orders`**
- **Purpose**: Get user's orders with pagination
- **Access**: Private
- **Query**: `page`, `limit`, `status`
- **Response**: Paginated order list

**GET `/api/orders/:id`**
- **Purpose**: Get single order details
- **Access**: Private (own orders) / Staff/Admin (all orders)
- **Response**: Complete order object with items, payment, shipping

**PUT `/api/orders/:id/cancel`**
- **Purpose**: Cancel order (if cancellable)
- **Access**: Private (own orders) / Staff/Admin
- **Body**: `{ reason: "Changed mind" }`
- **Response**: Updated order with cancelled status

#### Order Status Updates (Staff/Admin)

**PUT `/api/orders/:id/status`**
- **Purpose**: Update order status
- **Access**: Staff/Admin
- **Body**: `{ status: "shipped", note: "Tracking: 123456", trackingNumber: "123456" }`
- **Response**: Updated order object

**POST `/api/orders/:id/refund`**
- **Purpose**: Process order refund
- **Access**: Staff/Admin
- **Body**: `{ amount: 99.99, reason: "Defective item" }`
- **Response**: Refund confirmation

### 4. Cart Routes (`/api/cart`)

**Purpose**: Shopping cart management with real-time synchronization

#### Cart Operations

**GET `/api/cart`**
- **Purpose**: Get user's current cart
- **Access**: Private
- **Response**: Cart object with items, totals

**POST `/api/cart/add`**
- **Purpose**: Add item to cart
- **Access**: Private
- **Body**: `{ productId, variant: { size, color }, quantity }`
- **Response**: Updated cart object
- **Real-time**: Emits cart update via Socket.IO

**PUT `/api/cart/update`**
- **Purpose**: Update cart item quantity
- **Access**: Private
- **Body**: `{ productId, variant: { size, color }, quantity }`
- **Response**: Updated cart object

**DELETE `/api/cart/remove`**
- **Purpose**: Remove item from cart
- **Access**: Private
- **Body**: `{ productId, variant: { size, color } }`
- **Response**: Updated cart object

**DELETE `/api/cart/clear`**
- **Purpose**: Clear entire cart
- **Access**: Private
- **Response**: Empty cart object

## Data Flow & Process Workflows

This section documents the complete data flow for key business processes, showing how different components interact to deliver functionality.

### 1. User Registration & Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as MongoDB
    participant Email as Email Service
    participant Cache as Redis

    C->>API: POST /api/auth/register
    API->>API: Validate input (middleware)
    API->>DB: Check if user exists
    DB-->>API: User not found
    API->>API: Hash password (bcrypt)
    API->>DB: Create user record
    DB-->>API: User created
    API->>API: Generate JWT token
    API->>Email: Send welcome email (async)
    API->>Cache: Cache user session
    API-->>C: Return user + token
    Email-->>C: Welcome email delivered
```

**Detailed Process**:

1. **Input Validation**: `validateRegister` middleware checks email format, password strength, required fields
2. **Duplicate Check**: Query database for existing user with same email
3. **Password Security**: Hash password using bcrypt with 12 salt rounds
4. **User Creation**: Save user to MongoDB with default role and preferences
5. **Token Generation**: Create JWT token with user ID and expiration
6. **Email Notification**: Send welcome email asynchronously (non-blocking)
7. **Session Caching**: Store user session in Redis for fast lookup
8. **Response**: Return user object (without password) and JWT token

### 2. Product Search & Filtering Flow

```mermaid
graph TD
    A[Client Request] --> B[Parse Query Parameters]
    B --> C[Build MongoDB Filter]
    C --> D[Apply Text Search Index]
    D --> E[Execute Aggregation Pipeline]
    E --> F[Check Redis Cache]
    F --> G{Cache Hit?}
    G -->|Yes| H[Return Cached Results]
    G -->|No| I[Query Database]
    I --> J[Process Results]
    J --> K[Cache Results]
    K --> L[Return to Client]

    M[Real-time Updates] --> N[Invalidate Cache]
    N --> O[Update Search Index]
```

**Search Process**:

1. **Query Parsing**: Extract filters (category, brand, price range, size, color)
2. **Filter Building**: Construct MongoDB query with compound conditions
3. **Text Search**: Apply full-text search on name and description fields
4. **Cache Check**: Look for cached results in Redis using query hash
5. **Database Query**: Execute aggregation pipeline with sorting and pagination
6. **Result Processing**: Format results, calculate facets, add user-specific data
7. **Cache Storage**: Store results in Redis with appropriate TTL
8. **Real-time Updates**: Invalidate cache when products are modified

### 3. Order Processing Workflow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as MongoDB
    participant Inventory as Inventory Service
    participant Payment as Payment Service
    participant Email as Email Service
    participant Socket as Socket.IO

    C->>API: POST /api/orders
    API->>API: Validate order data
    API->>DB: Get cart items
    API->>Inventory: Reserve stock
    Inventory-->>API: Stock reserved
    API->>API: Calculate totals
    API->>DB: Create order record
    API->>Payment: Create payment intent
    Payment-->>API: Payment intent created
    API->>DB: Clear user cart
    API->>Email: Send confirmation email
    API->>Socket: Emit order notification
    API-->>C: Return order + payment intent

    Note over C,Socket: Real-time updates to admin dashboard
```

**Order Processing Steps**:

1. **Validation**: Validate order items, shipping address, payment method
2. **Inventory Check**: Verify product availability and reserve stock
3. **Price Calculation**: Calculate subtotal, tax, shipping, discounts
4. **Order Creation**: Create order record with product snapshots
5. **Payment Setup**: Create Stripe payment intent
6. **Cart Cleanup**: Clear user's cart after successful order creation
7. **Notifications**: Send confirmation email and real-time updates
8. **Status Tracking**: Initialize order status history

### 4. Payment Processing Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant Stripe as Stripe API
    participant DB as MongoDB
    participant Email as Email Service
    participant Socket as Socket.IO

    C->>API: Confirm payment
    API->>Stripe: Confirm payment intent
    Stripe-->>API: Payment succeeded
    API->>DB: Update order status
    API->>DB: Update payment record
    API->>Email: Send payment confirmation
    API->>Socket: Emit status update

    Note over Stripe,API: Webhook for payment events
    Stripe->>API: POST /api/payments/webhook
    API->>API: Verify webhook signature
    API->>DB: Process payment event
    API->>Socket: Emit real-time updates
```

**Payment Process**:

1. **Payment Confirmation**: Client confirms payment with Stripe
2. **Webhook Processing**: Stripe sends webhook for payment events
3. **Signature Verification**: Validate webhook authenticity
4. **Order Update**: Update order status and payment information
5. **Inventory Confirmation**: Confirm stock reservation
6. **Notifications**: Send payment confirmation and status updates
7. **Real-time Updates**: Notify admin dashboard of new orders

### 5. Real-time Inventory Management

```mermaid
graph TD
    A[Product Update] --> B[Update Database]
    B --> C[Calculate Stock Levels]
    C --> D[Check Low Stock Threshold]
    D --> E{Below Threshold?}
    E -->|Yes| F[Send Low Stock Alert]
    E -->|No| G[Update Cache]
    F --> G
    G --> H[Emit Socket Event]
    H --> I[Update Admin Dashboard]
    H --> J[Update Product Pages]

    K[Order Placed] --> L[Reserve Stock]
    L --> M[Update Inventory]
    M --> N[Emit Inventory Update]
    N --> O[Update Real-time UI]
```

**Inventory Management Process**:

1. **Stock Updates**: Track inventory changes from orders, returns, restocking
2. **Threshold Monitoring**: Check for low stock conditions
3. **Alert System**: Notify staff of inventory issues
4. **Cache Updates**: Update Redis cache with current stock levels
5. **Real-time Sync**: Emit Socket.IO events for live inventory updates
6. **UI Updates**: Update product availability in real-time

### 6. Notification Delivery Workflow

```mermaid
sequenceDiagram
    participant Trigger as Event Trigger
    participant NS as Notification Service
    participant DB as MongoDB
    participant Email as Email Service
    participant Push as Push Service
    participant SMS as SMS Service
    participant Socket as Socket.IO

    Trigger->>NS: Create notification
    NS->>DB: Save notification record
    NS->>NS: Check user preferences

    par Email Channel
        NS->>Email: Send email
        Email-->>NS: Delivery status
    and Push Channel
        NS->>Push: Send push notification
        Push-->>NS: Delivery status
    and SMS Channel
        NS->>SMS: Send SMS
        SMS-->>NS: Delivery status
    and Real-time Channel
        NS->>Socket: Emit notification
        Socket-->>NS: Delivery confirmed
    end

    NS->>DB: Update delivery status
```

**Notification Process**:

1. **Event Trigger**: Order status change, flash sale, low stock, etc.
2. **Notification Creation**: Create notification record in database
3. **Preference Check**: Verify user's notification preferences
4. **Multi-channel Delivery**: Send via email, push, SMS, Socket.IO
5. **Delivery Tracking**: Track success/failure for each channel
6. **Status Updates**: Update notification record with delivery status

### 7. Flash Sale Management

```mermaid
graph TD
    A[Flash Sale Created] --> B[Schedule Start/End]
    B --> C[Cache Sale Data]
    C --> D[Set Redis Counters]
    D --> E[Emit Sale Notification]

    F[Sale Starts] --> G[Update Product Prices]
    G --> H[Enable Sale UI]
    H --> I[Start Real-time Updates]

    J[User Purchases] --> K[Decrement Counter]
    K --> L[Check Remaining Stock]
    L --> M{Stock Available?}
    M -->|Yes| N[Continue Sale]
    M -->|No| O[End Sale Early]

    P[Sale Ends] --> Q[Restore Original Prices]
    Q --> R[Clear Sale Cache]
    R --> S[Send Sale Summary]
```

**Flash Sale Process**:

1. **Sale Setup**: Configure products, discounts, time limits, stock limits
2. **Scheduling**: Use cron jobs to start/end sales automatically
3. **Cache Management**: Store sale data in Redis for fast access
4. **Real-time Updates**: Emit countdown timers and stock updates
5. **Purchase Handling**: Atomic counter decrements for stock tracking
6. **Sale Completion**: Restore prices and generate analytics

## Testing Infrastructure

The application includes a comprehensive testing suite with unit tests, integration tests, and end-to-end testing capabilities.

### Testing Architecture

```
src/tests/
├── setup.js              # Global test configuration
├── models/               # Model unit tests
│   ├── User.test.js
│   ├── Product.test.js
│   ├── Order.test.js
│   └── Review.test.js
├── routes/               # API integration tests
│   ├── auth.test.js
│   ├── products.test.js
│   ├── orders.test.js
│   └── cart.test.js
├── services/             # Service unit tests
│   ├── paymentService.test.js
│   ├── emailService.test.js
│   └── notificationService.test.js
└── utils/                # Utility function tests
    └── helpers.test.js
```

### Test Configuration (`src/tests/setup.js`)

**Global Test Setup**:
- Test database configuration
- Mock external services (Stripe, Cloudinary, email)
- Authentication helpers
- Data cleanup utilities
- Test data factories

```javascript
// Test database setup
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_TEST_URI)
})

afterAll(async () => {
  await mongoose.connection.close()
})

// Mock external services
jest.mock('../services/emailService')
jest.mock('../config/cloudinary')
jest.mock('stripe')

// Test helpers
const createTestUser = async (role = 'customer') => {
  const user = new User({
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    profile: { firstName: 'Test', lastName: 'User' },
    role,
    emailVerified: true
  })
  return await user.save()
}
```

### Testing Strategies

**1. Model Testing**:
- Schema validation
- Instance methods
- Static methods
- Middleware hooks
- Virtual properties

**2. Route Testing**:
- Authentication requirements
- Input validation
- Business logic
- Error handling
- Response formats

**3. Service Testing**:
- External API integration
- Error handling
- Retry logic
- Data transformation

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=auth.test.js
```

---

## Caching & Performance

### Redis Caching Strategy

The application implements a multi-layer caching strategy using Redis for optimal performance.

**Cache Layers**:

1. **API Response Cache**: Cache frequently requested data
2. **Database Query Cache**: Cache expensive database operations
3. **Session Cache**: Store user sessions and authentication data
4. **Real-time Data Cache**: Cache inventory, flash sale counters
5. **Analytics Cache**: Cache dashboard and reporting data

**Cache Key Patterns**:
```javascript
const REDIS_KEYS = {
  // Product caching
  PRODUCT_CACHE: (id) => `cache:product:${id}`,
  PRODUCTS_LIST_CACHE: (params) => `cache:products:${hash(params)}`,

  // User caching
  USER_CACHE: (id) => `cache:user:${id}`,
  USER_SESSION: (sessionId) => `session:${sessionId}`,

  // Real-time data
  INVENTORY: (productId, variantId) => `inventory:${productId}:${variantId}`,
  FLASH_SALE_COUNTER: (saleId) => `flash_sale:${saleId}:counter`,

  // Analytics
  DAILY_STATS: (date) => `stats:daily:${date}`,
  PRODUCT_VIEWS: (productId) => `views:product:${productId}`,
}
```

**TTL Strategy**:
```javascript
const DEFAULT_TTL = {
  PRODUCT_CACHE: 3600,        // 1 hour
  PRODUCTS_LIST: 1800,        // 30 minutes
  USER_CACHE: 1800,           // 30 minutes
  SESSION: 86400,             // 24 hours
  INVENTORY: 300,             // 5 minutes
  FLASH_SALE: 60,             // 1 minute
  DAILY_STATS: 86400,         // 24 hours
}
```

### Performance Optimizations

**Database Optimizations**:
- Compound indexes for complex queries
- Text search indexes for product search
- Aggregation pipelines for analytics
- Connection pooling and query optimization

**API Optimizations**:
- Response compression with gzip
- Request rate limiting
- Pagination for large datasets
- Field selection to reduce payload size

**Real-time Optimizations**:
- Socket.IO room management
- Event batching and throttling
- Connection pooling
- Memory-efficient data structures

---

## Deployment & Production

### Docker Configuration

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY docs/ ./docs/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 5000

CMD ["node", "src/app.js"]
```

**Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/shoe-ecommerce
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongo_data:
  redis_data:
```

### Environment Configuration

**Production Environment Variables**:
```env
# Server Configuration
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourstore.com

# Database
MONGODB_URI=mongodb://username:password@host:port/database
REDIS_URL=redis://username:password@host:port

# Security
JWT_SECRET=your-super-secure-jwt-secret-key
ADMIN_CREATION_SECRET=your-admin-creation-secret

# External Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email Configuration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@yourstore.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Production Checklist

**Security**:
- [ ] Strong JWT secret (256-bit random string)
- [ ] HTTPS/TLS certificates configured
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured appropriately
- [ ] Input validation on all endpoints
- [ ] Security headers with Helmet.js
- [ ] Database connection encryption
- [ ] API keys stored securely

**Performance**:
- [ ] Redis caching enabled and configured
- [ ] Database indexes optimized
- [ ] CDN configured for static assets
- [ ] Response compression enabled
- [ ] Connection pooling configured
- [ ] Memory limits set appropriately

**Monitoring**:
- [ ] Error tracking with Sentry
- [ ] Application logging configured
- [ ] Health check endpoints working
- [ ] Performance monitoring setup
- [ ] Database monitoring enabled
- [ ] Alert notifications configured

**Backup & Recovery**:
- [ ] Database backup strategy implemented
- [ ] File storage backup configured
- [ ] Disaster recovery plan documented
- [ ] Data retention policies defined

### Scaling Considerations

**Horizontal Scaling**:
- Load balancer configuration
- Session storage in Redis
- Stateless application design
- Database read replicas

**Vertical Scaling**:
- Memory optimization
- CPU usage monitoring
- Database connection limits
- Cache memory allocation

---

## Conclusion

This comprehensive documentation covers every aspect of the shoe e-commerce API codebase, from architecture and data models to deployment and scaling. The system is designed with production-ready features including:

- **Robust Authentication**: Multi-strategy auth with JWT and OAuth
- **Scalable Architecture**: Service-oriented design with clear separation of concerns
- **Real-time Features**: Socket.IO integration for live updates
- **Payment Processing**: Complete Stripe integration with webhooks
- **Performance Optimization**: Multi-layer caching and database optimization
- **Comprehensive Testing**: Unit, integration, and end-to-end tests
- **Production Ready**: Docker containerization and deployment guides

The codebase serves as both a fully functional e-commerce backend and an educational resource demonstrating modern Node.js development best practices.
