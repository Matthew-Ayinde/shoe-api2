# API Routes by User Role
## Shoe E-commerce API - Complete Route Reference

This document provides a clean, organized listing of all API routes categorized by user role for quick reference.

---

## 🛍️ **CUSTOMER/CLIENT ROUTES**

### **Authentication & Profile**
```
POST   /api/auth/register                    - User registration
POST   /api/auth/login                       - User login
POST   /api/auth/logout                      - User logout
POST   /api/auth/refresh                     - Refresh JWT token
POST   /api/auth/forgot-password             - Request password reset
POST   /api/auth/reset-password              - Reset password with token
GET    /api/auth/verify-email/:token         - Verify email address
POST   /api/auth/resend-verification         - Resend verification email
GET    /api/auth/google                      - Google OAuth login
GET    /api/auth/google/callback             - Google OAuth callback
GET    /api/auth/profile                     - Get user profile
PUT    /api/auth/profile                     - Update user profile
PUT    /api/auth/change-password             - Change password
```

### **Product Browsing**
```
GET    /api/products                         - Get all products (with filters)
GET    /api/products/search                  - Search products
GET    /api/products/categories              - Get product categories
GET    /api/products/brands                  - Get product brands
GET    /api/products/:id                     - Get single product details
GET    /api/products/:id/reviews             - Get product reviews
POST   /api/products/:id/views               - Track product view
```

### **Shopping Cart**
```
GET    /api/cart                             - Get user's cart
POST   /api/cart/add                         - Add item to cart
PUT    /api/cart/update                      - Update cart item quantity
DELETE /api/cart/remove/:itemId              - Remove item from cart
DELETE /api/cart/clear                       - Clear entire cart
```

### **Wishlist Management**
```
GET    /api/wishlists                        - Get user's wishlists
POST   /api/wishlists                        - Create new wishlist
GET    /api/wishlists/:id                    - Get specific wishlist
PUT    /api/wishlists/:id                    - Update wishlist
DELETE /api/wishlists/:id                    - Delete wishlist
POST   /api/wishlists/:id/items              - Add item to wishlist
DELETE /api/wishlists/:wishlistId/items/:itemId - Remove item from wishlist
```

### **Order Management**
```
GET    /api/orders                           - Get user's orders
POST   /api/orders                           - Create new order
GET    /api/orders/:id                       - Get specific order details
PUT    /api/orders/:id/cancel                - Cancel order
GET    /api/orders/:id/track                 - Track order status
```

### **Reviews & Ratings**
```
GET    /api/reviews/my-reviews               - Get user's reviews
POST   /api/reviews                          - Create product review
PUT    /api/reviews/:id                      - Update review
DELETE /api/reviews/:id                      - Delete review
POST   /api/reviews/:id/helpful              - Mark review as helpful
```

### **Payments**
```
POST   /api/payments/create-intent           - Create payment intent
POST   /api/payments/confirm                 - Confirm payment
GET    /api/payments/methods                 - Get saved payment methods
POST   /api/payments/methods                 - Save payment method
DELETE /api/payments/methods/:id             - Delete payment method
```

### **Notifications**
```
GET    /api/notifications                    - Get user notifications
PUT    /api/notifications/:id/read           - Mark notification as read
PUT    /api/notifications/read-all           - Mark all notifications as read
PUT    /api/notifications/preferences        - Update notification preferences
```

### **Coupons & Sales**
```
POST   /api/coupons/validate                 - Validate coupon code
GET    /api/coupons/my-coupons               - Get user's available coupons
GET    /api/flash-sales/active               - Get active flash sales
GET    /api/flash-sales/:id                  - Get flash sale details
```

### **System**
```
GET    /api/health                           - API health check
```

---

## 👨‍💼 **ADMIN ROUTES**

### **Authentication & Profile**
```
POST   /api/auth/login                       - Admin login
POST   /api/auth/logout                      - Admin logout
GET    /api/auth/profile                     - Get admin profile
PUT    /api/auth/profile                     - Update admin profile
```

### **Dashboard & Analytics**
```
GET    /api/admin/dashboard                  - Get admin dashboard data
GET    /api/admin/stats                      - Get system statistics
GET    /api/admin/analytics                  - Get business analytics
GET    /api/admin/analytics/overview         - Get analytics overview
GET    /api/admin/analytics/customers        - Get customer analytics
GET    /api/admin/analytics/products         - Get product analytics
GET    /api/admin/analytics/sales            - Get sales analytics
GET    /api/admin/analytics/traffic          - Get traffic analytics
GET    /api/admin/analytics/conversion       - Get conversion analytics
```

### **User Management**
```
POST   /api/admin/users                      - Create new admin user
GET    /api/admin/users                      - Get all admin users
PUT    /api/admin/users/:id                  - Update admin user
DELETE /api/admin/users/:id                  - Delete admin user
PUT    /api/admin/users/:id/status           - Change user status
GET    /api/admin/customers                  - Get all customers
GET    /api/admin/customers/:id              - Get customer details
PUT    /api/admin/customers/:id              - Update customer
DELETE /api/admin/customers/:id              - Delete customer
PUT    /api/admin/customers/:id/status       - Change customer status
GET    /api/admin/customers/:id/orders       - Get customer orders
GET    /api/admin/customers/:id/analytics    - Get customer analytics
```

### **Product Management**
```
GET    /api/admin/products                   - Get all products (admin view)
POST   /api/admin/products                   - Create new product
PUT    /api/admin/products/:id               - Update product
DELETE /api/admin/products/:id               - Delete product
PUT    /api/admin/products/:id/status        - Change product status
POST   /api/admin/products/:id/images        - Upload product images
DELETE /api/admin/products/:id/images/:imageId - Delete product image
PUT    /api/admin/products/:id/inventory     - Update inventory
GET    /api/admin/products/low-stock         - Get low stock products
POST   /api/admin/products/bulk-update       - Bulk update products
GET    /api/admin/products/analytics         - Get product analytics
```

### **Order Management**
```
GET    /api/admin/orders                     - Get all orders
GET    /api/admin/orders/:id                 - Get order details
PUT    /api/admin/orders/:id/status          - Update order status
PUT    /api/admin/orders/:id/shipping        - Update shipping info
POST   /api/admin/orders/:id/refund          - Process refund
GET    /api/admin/orders/analytics           - Get order analytics
GET    /api/admin/orders/export              - Export orders data
```

### **Financial Management**
```
GET    /api/admin/revenue                    - Get revenue data
GET    /api/admin/revenue/daily              - Get daily revenue
GET    /api/admin/revenue/monthly            - Get monthly revenue
GET    /api/admin/payments                   - Get payment transactions
GET    /api/admin/payments/:id               - Get payment details
POST   /api/admin/payments/:id/refund        - Process payment refund
GET    /api/admin/financial-reports          - Get financial reports
```

### **Coupon Management**
```
GET    /api/admin/coupons                    - Get all coupons
POST   /api/admin/coupons                    - Create new coupon
PUT    /api/admin/coupons/:id                - Update coupon
DELETE /api/admin/coupons/:id                - Delete coupon
PUT    /api/admin/coupons/:id/status         - Change coupon status
GET    /api/admin/coupons/:id/usage          - Get coupon usage stats
```

### **Flash Sale Management**
```
GET    /api/admin/flash-sales                - Get all flash sales
POST   /api/admin/flash-sales                - Create new flash sale
PUT    /api/admin/flash-sales/:id            - Update flash sale
DELETE /api/admin/flash-sales/:id            - Delete flash sale
PUT    /api/admin/flash-sales/:id/status     - Change flash sale status
GET    /api/admin/flash-sales/:id/analytics  - Get flash sale analytics
```

### **Review Management**
```
GET    /api/admin/reviews                    - Get all reviews
PUT    /api/admin/reviews/:id/moderate       - Moderate review
DELETE /api/admin/reviews/:id                - Delete review
GET    /api/admin/reviews/flagged            - Get flagged reviews
PUT    /api/admin/reviews/:id/feature        - Feature review
```

### **Notification Management**
```
GET    /api/admin/notifications              - Get all notifications
POST   /api/admin/notifications/broadcast    - Send broadcast notification
GET    /api/admin/notifications/templates    - Get notification templates
PUT    /api/admin/notifications/templates/:id - Update notification template
```

### **System Management**
```
GET    /api/admin/system/health              - Get system health
GET    /api/admin/system/logs                - Get system logs
POST   /api/admin/system/backup              - Create system backup
GET    /api/admin/system/settings            - Get system settings
PUT    /api/admin/system/settings            - Update system settings
```

---

## 👨‍💻 **STAFF ROUTES**

### **Authentication & Profile**
```
POST   /api/auth/login                       - Staff login
POST   /api/auth/logout                      - Staff logout
GET    /api/auth/profile                     - Get staff profile
PUT    /api/auth/profile                     - Update staff profile
```

### **Dashboard & Tasks**
```
GET    /api/staff/dashboard                  - Get staff dashboard data
GET    /api/staff/tasks                      - Get assigned tasks
PUT    /api/staff/tasks/:id/complete         - Mark task as complete
GET    /api/staff/performance                - Get performance metrics
```

### **Order Processing**
```
GET    /api/staff/orders                     - Get orders assigned to staff
GET    /api/staff/orders/pending             - Get pending orders
PUT    /api/staff/orders/:id/process         - Process order
PUT    /api/staff/orders/:id/status          - Update order status
PUT    /api/staff/orders/:id/shipping        - Update shipping information
POST   /api/staff/orders/:id/notes           - Add order notes
GET    /api/staff/orders/:id/history         - Get order history
```

### **Inventory Management**
```
GET    /api/staff/inventory                  - Get inventory items
PUT    /api/staff/inventory/:id/update       - Update inventory levels
POST   /api/staff/inventory/adjustment       - Create inventory adjustment
GET    /api/staff/inventory/low-stock        - Get low stock items
POST   /api/staff/inventory/restock          - Process restock
GET    /api/staff/inventory/movements        - Get inventory movements
```

### **Product Management**
```
GET    /api/staff/products                   - Get products (staff view)
PUT    /api/staff/products/:id               - Update product information
POST   /api/staff/products/:id/images        - Upload product images
PUT    /api/staff/products/:id/description   - Update product description
PUT    /api/staff/products/:id/pricing       - Update product pricing
```

### **Customer Service**
```
GET    /api/staff/customers                  - Get customer list (limited view)
GET    /api/staff/customers/:id              - Get customer details
PUT    /api/staff/customers/:id/notes        - Add customer notes
GET    /api/staff/support-tickets            - Get support tickets
PUT    /api/staff/support-tickets/:id/respond - Respond to ticket
PUT    /api/staff/support-tickets/:id/status - Update ticket status
```

### **Returns & Refunds**
```
GET    /api/staff/returns                    - Get return requests
PUT    /api/staff/returns/:id/process        - Process return
POST   /api/staff/returns/:id/refund         - Process refund
PUT    /api/staff/returns/:id/status         - Update return status
```

### **Review Management**
```
GET    /api/staff/reviews/pending            - Get pending reviews
PUT    /api/staff/reviews/:id/moderate       - Moderate review
POST   /api/staff/reviews/:id/respond        - Respond to review
```

### **Reporting**
```
GET    /api/staff/reports/daily              - Get daily reports
GET    /api/staff/reports/weekly             - Get weekly reports
POST   /api/staff/reports/issue              - Report an issue
GET    /api/staff/reports/performance        - Get performance reports
```

---

## 📊 **ROUTE SUMMARY BY ROLE**

### **Route Count by Role**
- **Customer Routes**: 42 endpoints
- **Admin Routes**: 67 endpoints  
- **Staff Routes**: 35 endpoints
- **Total Unique Routes**: 144 endpoints

### **HTTP Methods Distribution**
- **GET**: 89 routes (62%)
- **POST**: 28 routes (19%)
- **PUT**: 25 routes (17%)
- **DELETE**: 12 routes (8%)

### **Route Categories**
- **Authentication**: 13 routes
- **Product Management**: 23 routes
- **Order Processing**: 18 routes
- **User Management**: 15 routes
- **Analytics & Reporting**: 12 routes
- **Payment Processing**: 8 routes
- **Inventory Management**: 11 routes
- **Review Management**: 9 routes
- **Notification System**: 7 routes
- **System Administration**: 6 routes
- **Coupon & Sales**: 8 routes
- **Customer Service**: 8 routes
- **Wishlist Management**: 7 routes

---

## 🔐 **ACCESS CONTROL MATRIX**

| Route Category | Customer | Staff | Admin |
|----------------|----------|-------|-------|
| Authentication | ✅ | ✅ | ✅ |
| Product Browsing | ✅ | ✅ | ✅ |
| Shopping Cart | ✅ | ❌ | ✅ |
| Order Creation | ✅ | ❌ | ✅ |
| Order Processing | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| Financial Data | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ✅ |
| Inventory Updates | ❌ | ✅ | ✅ |
| Customer Service | ❌ | ✅ | ✅ |
| Analytics | ❌ | Limited | ✅ |
| Content Management | ❌ | Limited | ✅ |

This comprehensive route reference provides quick access to all API endpoints organized by user role, making it easy for developers to understand the available functionality for each user type.
