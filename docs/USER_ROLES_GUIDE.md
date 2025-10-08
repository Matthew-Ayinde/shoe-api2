# User Roles & Navigation Guide
## Shoe E-commerce API - Complete User Experience Documentation

This document provides a comprehensive guide on how different user roles interact with the shoe e-commerce platform, including detailed navigation flows, functionality explanations, and complete route listings.

---

## 🛍️ **CUSTOMER/CLIENT USER GUIDE**

### **Getting Started as a Customer**

#### **1. Account Creation & Authentication**
**Registration Process:**
1. Visit the registration page
2. Provide email, password, first name, last name
3. Verify email address through confirmation link
4. Complete profile setup (optional: phone, address)

**Login Options:**
- Email/Password login
- Google OAuth login
- Remember me functionality
- Password reset via email

#### **2. Profile Management**
**Personal Information:**
- Update profile details (name, phone, preferences)
- Manage multiple shipping addresses
- Set default billing/shipping addresses
- Configure notification preferences (email, push, SMS)

**Account Security:**
- Change password
- View login history
- Manage connected social accounts
- Two-factor authentication setup

#### **3. Product Discovery & Shopping**

**Browse Products:**
1. **Category Navigation**: Browse by categories (Running, Casual, Formal, Sports, Boots, Sandals, Sneakers)
2. **Gender Filtering**: Filter by Men, Women, Unisex, Kids
3. **Advanced Filters**: 
   - Price range slider
   - Brand selection
   - Size availability
   - Color options
   - Customer ratings
   - Discount availability

**Search Functionality:**
- Text search across product names and descriptions
- Auto-suggestions and search history
- Filter search results
- Sort by: Price (low/high), Rating, Newest, Popularity

**Product Details:**
- View high-resolution product images
- Check size availability and stock levels
- Read product descriptions and specifications
- View customer reviews and ratings
- See related/recommended products
- Check shipping estimates

#### **4. Shopping Cart Management**

**Adding Items:**
1. Select desired size and color variant
2. Choose quantity
3. Add to cart with real-time stock validation
4. View cart summary with running totals

**Cart Operations:**
- Update item quantities
- Remove items
- Save items for later
- Apply coupon codes
- View shipping estimates
- Calculate taxes

#### **5. Wishlist Management**

**Creating Wishlists:**
- Create multiple named wishlists (e.g., "Birthday Wishlist", "Favorites")
- Set wishlist privacy (public/private)
- Share wishlists with friends/family

**Wishlist Features:**
- Add products with preferred size/color
- Price drop notifications
- Stock availability alerts
- Move items between wishlists
- Convert wishlist items to cart

#### **6. Checkout Process**

**Order Creation:**
1. Review cart items and totals
2. Select/add shipping address
3. Choose shipping method (Standard, Express, Overnight)
4. Apply coupon codes or discounts
5. Review order summary with all costs

**Payment Processing:**
1. Enter payment information (Stripe integration)
2. Save payment methods for future use
3. Apply stored payment methods
4. Complete secure payment processing
5. Receive order confirmation

#### **7. Order Management**

**Order Tracking:**
- View order history with detailed information
- Track order status (Pending → Confirmed → Processing → Shipped → Delivered)
- Access shipping tracking numbers
- View estimated delivery dates
- Download order receipts/invoices

**Order Actions:**
- Cancel orders (if not yet processed)
- Request returns/refunds
- Leave product reviews after delivery
- Reorder previous purchases

#### **8. Reviews & Ratings**

**Writing Reviews:**
1. Rate products (1-5 stars)
2. Write detailed review text
3. Upload review images
4. Tag review categories (fit, comfort, quality)

**Review Management:**
- Edit/update existing reviews
- View review history
- See review helpfulness votes
- Respond to review comments

#### **9. Notifications & Alerts**

**Notification Types:**
- Order confirmations and updates
- Shipping notifications
- Flash sale alerts
- Price drop notifications
- Stock availability alerts
- Promotional offers

**Notification Preferences:**
- Choose delivery channels (email, push, SMS, in-app)
- Set notification frequency
- Customize alert types
- Manage subscription preferences

#### **10. Flash Sales & Promotions**

**Flash Sale Participation:**
- Receive flash sale notifications
- View countdown timers
- See limited stock quantities
- Quick purchase during sales
- Access exclusive member discounts

---

## 👨‍💼 **ADMIN USER GUIDE**

### **Getting Started as an Admin**

#### **1. Admin Dashboard Access**
**Login Process:**
1. Use admin credentials to access admin panel
2. Two-factor authentication required
3. Access comprehensive dashboard with key metrics
4. View real-time system status

#### **2. Dashboard Overview**

**Key Metrics Display:**
- Total revenue (daily, weekly, monthly)
- Order statistics and trends
- Customer acquisition metrics
- Product performance analytics
- Inventory alerts and low stock warnings
- System health indicators

**Real-time Monitoring:**
- Active user sessions
- Current orders being processed
- Live inventory updates
- Flash sale performance
- Customer support tickets

#### **3. User Management**

**Customer Management:**
- View all customer accounts
- Search and filter customers
- View customer order history
- Manage customer account status (active/inactive)
- Handle customer support requests
- View customer analytics and behavior

**Staff Management:**
- Create new staff accounts
- Assign roles and permissions
- Manage staff access levels
- View staff activity logs
- Handle staff account modifications

#### **4. Product Management**

**Product Catalog:**
- Add new products with complete details
- Manage product categories and subcategories
- Upload and organize product images
- Set pricing and discount strategies
- Configure product variants (size, color, SKU)
- Manage product visibility and status

**Inventory Control:**
- Monitor stock levels across all variants
- Set low stock thresholds and alerts
- Manage inventory adjustments
- Track inventory movement history
- Generate inventory reports
- Handle stock transfers

#### **5. Order Management**

**Order Processing:**
- View all orders with filtering options
- Process order status changes
- Handle order cancellations and refunds
- Manage shipping and tracking information
- Generate shipping labels
- Handle customer service issues

**Order Analytics:**
- View order trends and patterns
- Analyze order value distributions
- Monitor conversion rates
- Track abandoned cart recovery
- Generate order reports

#### **6. Financial Management**

**Revenue Tracking:**
- Monitor daily/weekly/monthly revenue
- Track payment processing status
- Handle refund processing
- View financial reports and analytics
- Manage tax calculations
- Monitor payment gateway performance

**Discount Management:**
- Create and manage coupon codes
- Set up promotional campaigns
- Configure flash sales
- Monitor discount usage and effectiveness
- Analyze promotional ROI

#### **7. Content Management**

**Website Content:**
- Manage homepage content and banners
- Update product descriptions and details
- Handle customer reviews moderation
- Manage email templates
- Configure notification messages
- Update terms of service and policies

#### **8. Analytics & Reporting**

**Business Intelligence:**
- Generate comprehensive sales reports
- Analyze customer behavior patterns
- Monitor product performance metrics
- Track marketing campaign effectiveness
- View conversion funnel analytics
- Export data for external analysis

#### **9. System Administration**

**Technical Management:**
- Monitor system performance and health
- Manage database backups
- Configure system settings
- Handle security configurations
- Monitor API usage and performance
- Manage integrations (Stripe, Cloudinary, etc.)

#### **10. Customer Support**

**Support Tools:**
- Access customer support dashboard
- Handle customer inquiries and complaints
- Process returns and refunds
- Manage customer feedback
- Monitor review moderation queue
- Handle escalated issues

---

## 👨‍💻 **STAFF USER GUIDE**

### **Getting Started as Staff**

#### **1. Staff Dashboard Access**
**Login Process:**
1. Use staff credentials provided by admin
2. Access staff-specific dashboard
3. View assigned tasks and responsibilities
4. Check daily/weekly targets

#### **2. Staff Dashboard Overview**

**Daily Operations:**
- View assigned orders to process
- Check inventory tasks
- Monitor customer service queue
- Track daily performance metrics
- Access quick action tools

#### **3. Order Processing**

**Order Management:**
- Process new orders (confirm, prepare for shipping)
- Update order statuses
- Handle order modifications
- Process cancellations and refunds
- Generate shipping labels
- Update tracking information

**Quality Control:**
- Verify order accuracy before shipping
- Handle damaged or defective items
- Process returns and exchanges
- Update inventory based on returns

#### **4. Inventory Management**

**Stock Operations:**
- Update inventory levels
- Process stock receipts
- Handle inventory adjustments
- Monitor low stock alerts
- Conduct inventory counts
- Report inventory discrepancies

#### **5. Customer Service**

**Customer Support:**
- Respond to customer inquiries
- Handle product questions
- Process return requests
- Resolve shipping issues
- Escalate complex issues to admin
- Update customer information

#### **6. Product Support**

**Product Management:**
- Update product information
- Upload product images
- Manage product descriptions
- Handle product categorization
- Monitor product reviews
- Report product issues

#### **7. Reporting**

**Performance Tracking:**
- View personal performance metrics
- Generate daily/weekly reports
- Track order processing times
- Monitor customer satisfaction scores
- Report operational issues

---

## 📋 **ROUTE LISTINGS BY ROLE**

### **CUSTOMER/CLIENT ROUTES**

#### **Authentication Routes**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email/:token` - Verify email address
- `POST /api/auth/resend-verification` - Resend verification email
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

#### **Product Routes**
- `GET /api/products` - Get all products (with filters)
- `GET /api/products/search` - Search products
- `GET /api/products/categories` - Get product categories
- `GET /api/products/brands` - Get product brands
- `GET /api/products/:id` - Get single product details
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/views` - Track product view

#### **Cart Routes**
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update cart item quantity
- `DELETE /api/cart/remove/:itemId` - Remove item from cart
- `DELETE /api/cart/clear` - Clear entire cart

#### **Wishlist Routes**
- `GET /api/wishlists` - Get user's wishlists
- `POST /api/wishlists` - Create new wishlist
- `GET /api/wishlists/:id` - Get specific wishlist
- `PUT /api/wishlists/:id` - Update wishlist
- `DELETE /api/wishlists/:id` - Delete wishlist
- `POST /api/wishlists/:id/items` - Add item to wishlist
- `DELETE /api/wishlists/:wishlistId/items/:itemId` - Remove item from wishlist

#### **Order Routes**
- `GET /api/orders` - Get user's orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get specific order details
- `PUT /api/orders/:id/cancel` - Cancel order
- `GET /api/orders/:id/track` - Track order status

#### **Review Routes**
- `GET /api/reviews/my-reviews` - Get user's reviews
- `POST /api/reviews` - Create product review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review
- `POST /api/reviews/:id/helpful` - Mark review as helpful

#### **Payment Routes**
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/methods` - Get saved payment methods
- `POST /api/payments/methods` - Save payment method
- `DELETE /api/payments/methods/:id` - Delete payment method

#### **Notification Routes**
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `PUT /api/notifications/preferences` - Update notification preferences

#### **Coupon Routes**
- `POST /api/coupons/validate` - Validate coupon code
- `GET /api/coupons/my-coupons` - Get user's available coupons

#### **Flash Sale Routes**
- `GET /api/flash-sales/active` - Get active flash sales
- `GET /api/flash-sales/:id` - Get flash sale details

#### **Health Route**
- `GET /api/health` - API health check

---

### **ADMIN ROUTES**

#### **Authentication Routes (Admin)**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/profile` - Get admin profile
- `PUT /api/auth/profile` - Update admin profile

#### **Admin Management Routes**
- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/analytics` - Get business analytics
- `POST /api/admin/users` - Create new admin user
- `GET /api/admin/users` - Get all admin users
- `PUT /api/admin/users/:id` - Update admin user
- `DELETE /api/admin/users/:id` - Delete admin user
- `PUT /api/admin/users/:id/status` - Change user status

#### **User Management Routes (Admin)**
- `GET /api/admin/customers` - Get all customers
- `GET /api/admin/customers/:id` - Get customer details
- `PUT /api/admin/customers/:id` - Update customer
- `DELETE /api/admin/customers/:id` - Delete customer
- `PUT /api/admin/customers/:id/status` - Change customer status
- `GET /api/admin/customers/:id/orders` - Get customer orders
- `GET /api/admin/customers/:id/analytics` - Get customer analytics

#### **Product Management Routes (Admin)**
- `GET /api/admin/products` - Get all products (admin view)
- `POST /api/admin/products` - Create new product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `PUT /api/admin/products/:id/status` - Change product status
- `POST /api/admin/products/:id/images` - Upload product images
- `DELETE /api/admin/products/:id/images/:imageId` - Delete product image
- `PUT /api/admin/products/:id/inventory` - Update inventory
- `GET /api/admin/products/low-stock` - Get low stock products
- `POST /api/admin/products/bulk-update` - Bulk update products
- `GET /api/admin/products/analytics` - Get product analytics

#### **Order Management Routes (Admin)**
- `GET /api/admin/orders` - Get all orders
- `GET /api/admin/orders/:id` - Get order details
- `PUT /api/admin/orders/:id/status` - Update order status
- `PUT /api/admin/orders/:id/shipping` - Update shipping info
- `POST /api/admin/orders/:id/refund` - Process refund
- `GET /api/admin/orders/analytics` - Get order analytics
- `GET /api/admin/orders/export` - Export orders data

#### **Financial Management Routes (Admin)**
- `GET /api/admin/revenue` - Get revenue data
- `GET /api/admin/revenue/daily` - Get daily revenue
- `GET /api/admin/revenue/monthly` - Get monthly revenue
- `GET /api/admin/payments` - Get payment transactions
- `GET /api/admin/payments/:id` - Get payment details
- `POST /api/admin/payments/:id/refund` - Process payment refund
- `GET /api/admin/financial-reports` - Get financial reports

#### **Coupon Management Routes (Admin)**
- `GET /api/admin/coupons` - Get all coupons
- `POST /api/admin/coupons` - Create new coupon
- `PUT /api/admin/coupons/:id` - Update coupon
- `DELETE /api/admin/coupons/:id` - Delete coupon
- `PUT /api/admin/coupons/:id/status` - Change coupon status
- `GET /api/admin/coupons/:id/usage` - Get coupon usage stats

#### **Flash Sale Management Routes (Admin)**
- `GET /api/admin/flash-sales` - Get all flash sales
- `POST /api/admin/flash-sales` - Create new flash sale
- `PUT /api/admin/flash-sales/:id` - Update flash sale
- `DELETE /api/admin/flash-sales/:id` - Delete flash sale
- `PUT /api/admin/flash-sales/:id/status` - Change flash sale status
- `GET /api/admin/flash-sales/:id/analytics` - Get flash sale analytics

#### **Review Management Routes (Admin)**
- `GET /api/admin/reviews` - Get all reviews
- `PUT /api/admin/reviews/:id/moderate` - Moderate review
- `DELETE /api/admin/reviews/:id` - Delete review
- `GET /api/admin/reviews/flagged` - Get flagged reviews
- `PUT /api/admin/reviews/:id/feature` - Feature review

#### **Notification Management Routes (Admin)**
- `GET /api/admin/notifications` - Get all notifications
- `POST /api/admin/notifications/broadcast` - Send broadcast notification
- `GET /api/admin/notifications/templates` - Get notification templates
- `PUT /api/admin/notifications/templates/:id` - Update notification template

#### **Analytics Routes (Admin)**
- `GET /api/admin/analytics/overview` - Get analytics overview
- `GET /api/admin/analytics/customers` - Get customer analytics
- `GET /api/admin/analytics/products` - Get product analytics
- `GET /api/admin/analytics/sales` - Get sales analytics
- `GET /api/admin/analytics/traffic` - Get traffic analytics
- `GET /api/admin/analytics/conversion` - Get conversion analytics

#### **System Management Routes (Admin)**
- `GET /api/admin/system/health` - Get system health
- `GET /api/admin/system/logs` - Get system logs
- `POST /api/admin/system/backup` - Create system backup
- `GET /api/admin/system/settings` - Get system settings
- `PUT /api/admin/system/settings` - Update system settings

---

### **STAFF ROUTES**

#### **Authentication Routes (Staff)**
- `POST /api/auth/login` - Staff login
- `POST /api/auth/logout` - Staff logout
- `GET /api/auth/profile` - Get staff profile
- `PUT /api/auth/profile` - Update staff profile

#### **Staff Dashboard Routes**
- `GET /api/staff/dashboard` - Get staff dashboard data
- `GET /api/staff/tasks` - Get assigned tasks
- `PUT /api/staff/tasks/:id/complete` - Mark task as complete
- `GET /api/staff/performance` - Get performance metrics

#### **Order Processing Routes (Staff)**
- `GET /api/staff/orders` - Get orders assigned to staff
- `GET /api/staff/orders/pending` - Get pending orders
- `PUT /api/staff/orders/:id/process` - Process order
- `PUT /api/staff/orders/:id/status` - Update order status
- `PUT /api/staff/orders/:id/shipping` - Update shipping information
- `POST /api/staff/orders/:id/notes` - Add order notes
- `GET /api/staff/orders/:id/history` - Get order history

#### **Inventory Management Routes (Staff)**
- `GET /api/staff/inventory` - Get inventory items
- `PUT /api/staff/inventory/:id/update` - Update inventory levels
- `POST /api/staff/inventory/adjustment` - Create inventory adjustment
- `GET /api/staff/inventory/low-stock` - Get low stock items
- `POST /api/staff/inventory/restock` - Process restock
- `GET /api/staff/inventory/movements` - Get inventory movements

#### **Product Management Routes (Staff)**
- `GET /api/staff/products` - Get products (staff view)
- `PUT /api/staff/products/:id` - Update product information
- `POST /api/staff/products/:id/images` - Upload product images
- `PUT /api/staff/products/:id/description` - Update product description
- `PUT /api/staff/products/:id/pricing` - Update product pricing

#### **Customer Service Routes (Staff)**
- `GET /api/staff/customers` - Get customer list (limited view)
- `GET /api/staff/customers/:id` - Get customer details
- `PUT /api/staff/customers/:id/notes` - Add customer notes
- `GET /api/staff/support-tickets` - Get support tickets
- `PUT /api/staff/support-tickets/:id/respond` - Respond to ticket
- `PUT /api/staff/support-tickets/:id/status` - Update ticket status

#### **Returns & Refunds Routes (Staff)**
- `GET /api/staff/returns` - Get return requests
- `PUT /api/staff/returns/:id/process` - Process return
- `POST /api/staff/returns/:id/refund` - Process refund
- `PUT /api/staff/returns/:id/status` - Update return status

#### **Review Management Routes (Staff)**
- `GET /api/staff/reviews/pending` - Get pending reviews
- `PUT /api/staff/reviews/:id/moderate` - Moderate review
- `POST /api/staff/reviews/:id/respond` - Respond to review

#### **Reporting Routes (Staff)**
- `GET /api/staff/reports/daily` - Get daily reports
- `GET /api/staff/reports/weekly` - Get weekly reports
- `POST /api/staff/reports/issue` - Report an issue
- `GET /api/staff/reports/performance` - Get performance reports

---

## 🔄 **DETAILED NAVIGATION FLOWS**

### **Customer Journey Flow**

#### **New Customer Registration Flow**
1. **Landing Page** → Click "Sign Up"
2. **Registration Form** → Fill details → Submit
3. **Email Verification** → Check email → Click verification link
4. **Welcome Page** → Complete profile setup
5. **Dashboard** → Start shopping

#### **Shopping Flow**
1. **Browse Products** → Use filters/search
2. **Product Details** → Select variant → Add to cart
3. **Shopping Cart** → Review items → Apply coupons
4. **Checkout** → Enter shipping → Select payment
5. **Order Confirmation** → Receive confirmation email

#### **Order Tracking Flow**
1. **My Account** → Order History
2. **Select Order** → View details
3. **Track Shipment** → Real-time updates
4. **Delivery Confirmation** → Leave review

### **Admin Management Flow**

#### **Daily Admin Routine**
1. **Login** → Admin Dashboard
2. **Review Metrics** → Check key performance indicators
3. **Order Management** → Process pending orders
4. **Inventory Check** → Review low stock alerts
5. **Customer Support** → Handle escalated issues
6. **Analytics Review** → Generate reports

#### **Product Management Flow**
1. **Product Catalog** → View all products
2. **Add New Product** → Fill details → Upload images
3. **Set Variants** → Configure sizes/colors/pricing
4. **Inventory Setup** → Set stock levels
5. **Publish Product** → Make live on site

### **Staff Operations Flow**

#### **Daily Staff Routine**
1. **Login** → Staff Dashboard
2. **Check Tasks** → View assigned orders
3. **Process Orders** → Update statuses
4. **Inventory Updates** → Adjust stock levels
5. **Customer Service** → Handle inquiries
6. **End of Day** → Submit reports

#### **Order Processing Flow**
1. **Pending Orders** → Select order to process
2. **Verify Details** → Check product availability
3. **Prepare Shipment** → Generate shipping label
4. **Update Status** → Mark as shipped
5. **Customer Notification** → Send tracking info

---

## 📱 **MOBILE vs DESKTOP EXPERIENCE**

### **Mobile-Optimized Features**
- Touch-friendly product browsing
- Swipe gestures for image galleries
- Mobile payment integration (Apple Pay, Google Pay)
- Push notifications for order updates
- Location-based shipping estimates
- Quick reorder functionality

### **Desktop-Enhanced Features**
- Advanced filtering and sorting options
- Bulk operations for admin/staff
- Detailed analytics dashboards
- Multi-tab order processing
- Keyboard shortcuts for power users
- Advanced reporting and export features

---

## 🔐 **SECURITY & PERMISSIONS**

### **Role-Based Access Control**

#### **Customer Permissions**
- ✅ View public products and content
- ✅ Manage own profile and orders
- ✅ Create reviews and wishlists
- ❌ Access admin or staff functions
- ❌ View other customers' data

#### **Staff Permissions**
- ✅ Process orders and inventory
- ✅ Handle customer service
- ✅ Update product information
- ✅ Generate operational reports
- ❌ Access financial data
- ❌ Manage other staff accounts
- ❌ System administration

#### **Admin Permissions**
- ✅ Full system access
- ✅ User and staff management
- ✅ Financial and analytics data
- ✅ System configuration
- ✅ All customer and order data
- ✅ Content and policy management

---

## 📊 **PERFORMANCE & ANALYTICS**

### **Customer Analytics Tracking**
- Page views and session duration
- Product interaction patterns
- Cart abandonment rates
- Purchase conversion funnels
- Search query analysis
- Review and rating patterns

### **Admin Analytics Dashboard**
- Real-time sales metrics
- Customer acquisition costs
- Product performance rankings
- Inventory turnover rates
- Revenue forecasting
- Operational efficiency metrics

### **Staff Performance Metrics**
- Order processing times
- Customer satisfaction scores
- Inventory accuracy rates
- Task completion rates
- Response time to inquiries
- Quality control metrics

This comprehensive guide provides complete navigation flows and functionality for all user roles in the shoe e-commerce platform, ensuring optimal user experience and efficient operations across all levels of access.
