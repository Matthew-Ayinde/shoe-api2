# Admin Userflow Guide - Shoe E-commerce API
## Complete Admin Management Documentation

---

## Table of Contents
1. [Admin Authentication](#admin-authentication)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Product Management](#product-management)
5. [Order Management](#order-management)
6. [Inventory Control](#inventory-control)
7. [Marketing & Promotions](#marketing--promotions)
8. [Analytics & Reports](#analytics--reports)
9. [System Settings](#system-settings)

---

## 1. Admin Authentication

### 1.1 Admin Registration & Login

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN AUTHENTICATION                          │
└─────────────────────────────────────────────────────────────────┘

ADMIN REGISTRATION (First-time setup)
  │
  ▼
┌──────────────────────────────────────┐
│ POST /api/auth/register-admin        │
│ {                                    │
│   email: "admin@shoestore.com",      │
│   password: "SecurePass123!",        │
│   firstName: "Admin",                │
│   lastName: "User",                  │
│   adminSecret: "ADMIN_SECRET_KEY"    │
│ }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Validate Admin Secret                │
│ - Check ADMIN_CREATION_SECRET env    │
│ - Prevent unauthorized admin creation│
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Create Admin Account                 │
│ - role: "admin"                      │
│ - emailVerified: true (auto)         │
│ - isActive: true                     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Send Admin Welcome Email             │
│ Return JWT token                     │
└──────────────────────────────────────┘

ADMIN LOGIN
  │
  ▼
┌──────────────────────────────────────┐
│ POST /api/auth/login                 │
│ {                                    │
│   email: "admin@shoestore.com",      │
│   password: "SecurePass123!"         │
│ }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Authenticate & Generate Token        │
│ Update lastLogin timestamp           │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Redirect to Admin Dashboard          │
│ Initialize Socket.IO admin room      │
└──────────────────────────────────────┘
```

---

## 2. Dashboard Overview

### 2.1 Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                               │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/dashboard
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ OVERVIEW METRICS                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│ │ Total Users │ │Total Products│ │Total Orders │ │  Revenue   │ │
│ │    1,234    │ │     456      │ │    2,890    │ │  $125,450  │ │
│ │  +12% ↑     │ │   +5% ↑      │ │   +8% ↑     │ │  +15% ↑    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
│                                                                  │
│ TODAY'S STATS                                                    │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │New Orders: 23│ │Processing:15│ │Shipped: 45  │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ RECENT ORDERS (Real-time)                                        │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ORD-001234 | John Doe     | $276.99 | Pending   | 2 min ago │ │
│ │ ORD-001233 | Jane Smith   | $150.00 | Confirmed | 5 min ago │ │
│ │ ORD-001232 | Bob Johnson  | $450.00 | Processing| 8 min ago │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ TOP SELLING PRODUCTS                                             │
│ 1. Nike Air Max 270      | 156 sold | $23,400 revenue           │
│ 2. Adidas Ultraboost     | 142 sold | $25,560 revenue           │
│ 3. Puma RS-X            | 98 sold  | $9,800 revenue            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ LOW STOCK ALERTS                                                 │
│ ⚠ Nike Air Max 270 - Black, Size 10 (Stock: 3)                  │
│ ⚠ Adidas Ultraboost - White, Size 9 (Stock: 5)                  │
│ ⚠ Puma RS-X - Red, Size 11 (Stock: 2)                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. User Management

### 3.1 User Administration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER MANAGEMENT                               │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/users
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ USER LIST (Filterable)                                           │
│                                                                  │
│ Filters: [All Users ▼] [Role: All ▼] [Status: All ▼]           │
│ Search: [Search by name/email____________]                      │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Name         | Email            | Role     | Status |Actions│  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ John Doe     | john@email.com   | Customer | Active |[Edit]│  │
│ │ Jane Smith   | jane@email.com   | Customer | Active |[Edit]│  │
│ │ Bob Staff    | bob@email.com    | Staff    | Active |[Edit]│  │
│ │ Alice Admin  | alice@email.com  | Admin    | Active |[Edit]│  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [+ Create Admin] [+ Create Staff] [Export Users]                │
└──────────────────────────────────────────────────────────────────┘

Edit User Flow
  │
  ▼
┌──────────────────────────────────────────┐
│ User Details & Actions                   │
│                                          │
│ User: John Doe (#USER123)               │
│ Email: john@email.com                    │
│ Phone: +1 234-567-8900                   │
│ Member since: Jan 15, 2024               │
│ Last login: Oct 25, 2024 9:00 AM        │
│                                          │
│ Current Role: [Customer ▼]               │
│ - Customer                               │
│ - Staff                                  │
│ - Admin                                  │
│                                          │
│ Account Status: [Active ▼]               │
│ - Active                                 │
│ - Inactive                               │
│                                          │
│ [Update Role] [Change Status]            │
│                                          │
│ Recent Orders: 15 orders | $2,450 total │
│ [View All Orders]                        │
│                                          │
│ Recent Activity:                         │
│ - Placed order ORD-001234 (2 days ago)  │
│ - Left review on Nike Air Max (5 days)  │
│ - Updated profile (1 week ago)          │
└──────────────────────────────────────────┘

Role Change Flow
  │
  ▼
PATCH /api/admin/users/:id/role
  │
  ▼
┌──────────────────────────────────────────┐
│ Validate new role                        │
│ Update user.role in database             │
│ Send notification email                  │
│ Log role change audit                    │
└──────────────────────────────────────────┘

Status Change Flow
  │
  ▼
PATCH /api/admin/users/:id/status
  │
  ▼
┌──────────────────────────────────────────┐
│ Update user.isActive                     │
│ If deactivating:                         │
│ - Invalidate active sessions             │
│ - Send notification                      │
│ - Log status change                      │
└──────────────────────────────────────────┘
```

---

## 4. Product Management

### 4.1 Product CRUD Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT MANAGEMENT                            │
└─────────────────────────────────────────────────────────────────┘

CREATE NEW PRODUCT
  │
  ▼
┌──────────────────────────────────────────┐
│ POST /api/admin/products                 │
│                                          │
│ Basic Information:                       │
│ - Name: [Nike Air Max 270________]      │
│ - Brand: [Nike ▼]                        │
│ - Category: [Running ▼]                  │
│ - Gender: [Men ▼]                        │
│ - Description: [____________]            │
│                                          │
│ Variants:                                │
│ ┌──────────────────────────────────────┐ │
│ │ Size | Color  | SKU       | Price   │ │
│ ├──────────────────────────────────────┤ │
│ │ 9    | Black  | NIKE-AM-9 | $150.00 │ │
│ │ 9    | White  | NIKE-AW-9 | $150.00 │ │
│ │ 10   | Black  | NIKE-AM10 | $150.00 │ │
│ │ [Add Variant]                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Images: [Upload Images]                  │
│ [📷] [📷] [📷] [📷]                       │
│                                          │
│ SEO:                                     │
│ - Meta Title: [____________]             │
│ - Meta Description: [____________]       │
│                                          │
│ [☐ Featured] [☐ Active]                 │
│                                          │
│ [Save Product] [Save as Draft]          │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Backend Processing                       │
│ 1. Validate all fields                   │
│ 2. Generate slug from name               │
│ 3. Upload images to Cloudinary           │
│ 4. Create product in database            │
│ 5. Index for search                      │
│ 6. Clear product cache                   │
│ 7. Emit real-time update                 │
└──────────────────────────────────────────┘

EDIT PRODUCT
  │
  ▼
GET /api/admin/products
  │
  ▼
┌──────────────────────────────────────────┐
│ Product List                             │
│ [Search products____________] [Filter]   │
│                                          │
│ Products (456):                          │
│ - Nike Air Max 270  | $150 | Stock: 250 │
│   [Edit] [Delete] [View]                 │
│ - Adidas Ultraboost | $180 | Stock: 180 │
│   [Edit] [Delete] [View]                 │
└──────────────────────────────────────────┘
         │
         │ Click Edit
         ▼
PUT /api/admin/products/:id
  │
  ▼
┌──────────────────────────────────────────┐
│ Update product details                   │
│ Update variants                          │
│ Manage images (add/remove)               │
│ Update SEO settings                      │
│ Change status/featured flag              │
└──────────────────────────────────────────┘

DELETE PRODUCT
  │
  ▼
DELETE /api/admin/products/:id
  │
  ▼
┌──────────────────────────────────────────┐
│ Confirmation Dialog                      │
│ "Delete Nike Air Max 270?"               │
│                                          │
│ ⚠ This product has:                      │
│ - 45 orders (historical)                 │
│ - 12 reviews                             │
│ - 8 wishlists                            │
│                                          │
│ [Cancel] [Soft Delete] [Permanent Delete]│
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Mark as inactive (soft delete)           │
│ Remove from search index                 │
│ Keep historical data intact              │
└──────────────────────────────────────────┘
```

---

## 5. Order Management

### 5.1 Order Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER MANAGEMENT                              │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/orders
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ ORDER DASHBOARD                                                  │
│                                                                  │
│ Status Tabs:                                                     │
│ [All] [Pending(23)] [Confirmed(15)] [Processing(8)]            │
│ [Shipped(45)] [Delivered(156)] [Cancelled(3)]                   │
│                                                                  │
│ Filters:                                                         │
│ Date: [Last 30 days ▼] Customer: [All ▼] Amount: [Any ▼]       │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Order #    | Customer  | Total   | Status    | Date |Actions││
│ ├────────────────────────────────────────────────────────────┤  │
│ │ORD-001234 | John Doe  | $276.99 | Pending   |10/25|[View] │  │
│ │ORD-001233 | Jane Smith| $150.00 | Confirmed |10/24|[View] │  │
│ │ORD-001232 | Bob Smith | $450.00 | Shipped   |10/23|[View] │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

ORDER DETAILS
  │
  ▼
GET /api/admin/orders/:id
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Order #ORD-001234                                                │
│                                                                  │
│ Customer: John Doe (john@email.com)                             │
│ Status: [Pending ▼]                                              │
│ Payment: Completed ($276.99 - Stripe)                           │
│ Created: Oct 25, 2024 10:30 AM                                  │
│                                                                  │
│ Items:                                                           │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Nike Air Max 270 (Black, Size 10) | 2x $150.00 = $300.00  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Shipping Address:                                                │
│ John Doe                                                         │
│ 123 Main St                                                      │
│ New York, NY 10001                                               │
│                                                                  │
│ Order Summary:                                                   │
│ Subtotal:        $300.00                                        │
│ Shipping:         $12.99                                        │
│ Tax:              $24.00                                        │
│ Discount (SAVE20): -$60.00                                      │
│ Total:           $276.99                                        │
│                                                                  │
│ Actions:                                                         │
│ [Update Status] [Add Tracking] [Process Refund] [Cancel Order] │
└──────────────────────────────────────────────────────────────────┘

UPDATE ORDER STATUS
  │
  ▼
PATCH /api/admin/orders/:id/status
  │
  ▼
┌──────────────────────────────────────────┐
│ Update Status Dialog                     │
│                                          │
│ Current: Pending                         │
│ New Status: [Confirmed ▼]                │
│                                          │
│ If Shipped:                              │
│ Carrier: [UPS ▼]                         │
│ Tracking #: [1Z999AA10123456784]        │
│                                          │
│ Notes: [____________________]            │
│                                          │
│ ✓ Notify customer via email              │
│ ✓ Send real-time update                  │
│                                          │
│ [Update Status]                          │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Backend Processing                       │
│ 1. Update order status                   │
│ 2. Add to status history                 │
│ 3. Send email notification               │
│ 4. Emit Socket.IO event                  │
│ 5. Update analytics                      │
└──────────────────────────────────────────┘

PROCESS REFUND
  │
  ▼
POST /api/admin/orders/:id/refund
  │
  ▼
┌──────────────────────────────────────────┐
│ Refund Dialog                            │
│                                          │
│ Order Total: $276.99                     │
│ Already Refunded: $0.00                  │
│                                          │
│ Refund Amount: [Full Amount ▼]          │
│ - Full Amount ($276.99)                  │
│ - Partial Amount [____]                  │
│                                          │
│ Reason: [Customer Request ▼]             │
│                                          │
│ Notes: [____________________]            │
│                                          │
│ [Process Refund]                         │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ 1. Process Stripe refund                 │
│ 2. Update order payment status           │
│ 3. Restore inventory                     │
│ 4. Send refund confirmation email        │
│ 5. Update order status to "refunded"     │
└──────────────────────────────────────────┘
```

---

## 6. Inventory Control

### 6.1 Inventory Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVENTORY MANAGEMENT                          │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/inventory/low-stock
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ LOW STOCK ALERTS                                                 │
│                                                                  │
│ Threshold: [10 ▼] [Show All Inventory]                          │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Product      | Variant        | Current | Threshold |Action │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │Nike Air Max | Black, Size 10 |    3    |     10    |[Edit]│  │
│ │Ultraboost   | White, Size 9  |    5    |     10    |[Edit]│  │
│ │Puma RS-X    | Red, Size 11   |    2    |     10    |[Edit]│  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [Bulk Update] [Generate Restock Report] [Export]                │
└──────────────────────────────────────────────────────────────────┘

UPDATE STOCK
  │
  ▼
PATCH /api/admin/inventory/:productId/variant/:variantId/stock
  │
  ▼
┌──────────────────────────────────────────┐
│ Update Stock Level                       │
│                                          │
│ Product: Nike Air Max 270                │
│ Variant: Black, Size 10                  │
│ SKU: NIKE-AM-BLK-10                      │
│                                          │
│ Current Stock: 3                         │
│ New Stock: [50___]                       │
│                                          │
│ Reason: [Restock ▼]                      │
│ - Restock                                │
│ - Correction                             │
│ - Return                                 │
│ - Adjustment                             │
│                                          │
│ Notes: [Received shipment from supplier] │
│                                          │
│ [Update Stock]                           │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Backend Processing                       │
│ 1. Update variant stock                  │
│ 2. Log inventory transaction             │
│ 3. Emit real-time update                 │
│ 4. Check low stock threshold             │
│ 5. Notify customers on waitlist          │
└──────────────────────────────────────────┘
```

---

## 7. Marketing & Promotions

### 7.1 Coupon Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUPON MANAGEMENT                             │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/coupons
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ COUPONS LIST                                                     │
│                                                                  │
│ [+ Create Coupon]                                                │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Code    | Type | Value | Used/Limit | Valid Until  |Actions │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │SAVE20  | %    | 20%   | 45/100     | Dec 31, 2024 |[Edit] │  │
│ │FLASH50 | %    | 50%   | 23/50      | Oct 26, 2024 |[Edit] │  │
│ │FIRST10 | Fixed| $10   | 156/∞      | Dec 31, 2024 |[Edit] │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

CREATE COUPON
  │
  ▼
POST /api/admin/coupons
  │
  ▼
┌──────────────────────────────────────────┐
│ Create Coupon                            │
│                                          │
│ Code: [SUMMER2024_____] [Generate]      │
│                                          │
│ Discount Type: ○ Percentage ○ Fixed      │
│                                          │
│ Value: [20] %                            │
│                                          │
│ Conditions:                              │
│ Min Order Amount: [$50.00]               │
│ Max Discount: [$100.00]                  │
│                                          │
│ Usage Limits:                            │
│ Total Uses: [100] (blank = unlimited)    │
│ Uses Per User: [1]                       │
│                                          │
│ Validity:                                │
│ Start: [10/25/2024 00:00]                │
│ End: [12/31/2024 23:59]                  │
│                                          │
│ Applicable To:                           │
│ □ All Products                           │
│ ☑ Specific Categories: [Running, Casual] │
│ □ Specific Brands: [_______]             │
│ □ Specific Products                      │
│                                          │
│ [Create Coupon] [Save as Draft]          │
└──────────────────────────────────────────┘
```

### 7.2 Flash Sale Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLASH SALE MANAGEMENT                         │
└─────────────────────────────────────────────────────────────────┘

POST /api/admin/flash-sales
  │
  ▼
┌──────────────────────────────────────────┐
│ Create Flash Sale                        │
│                                          │
│ Name: [Black Friday Sale______]         │
│ Description: [___________________]       │
│                                          │
│ Schedule:                                │
│ Start: [11/24/2024 00:00]                │
│ End: [11/24/2024 23:59]                  │
│                                          │
│ Products & Discounts:                    │
│ ┌──────────────────────────────────────┐ │
│ │ Product         | Original | Sale %  │ │
│ ├──────────────────────────────────────┤ │
│ │ Nike Air Max    | $150     | 40% OFF │ │
│ │ Adidas Ultra    | $180     | 35% OFF │ │
│ │ [Add Product]                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Limitations:                             │
│ Max Quantity per Product: [50]           │
│ Max Orders per User: [2]                 │
│                                          │
│ Banner Image: [Upload]                   │
│                                          │
│ [☑] Auto-start at scheduled time         │
│ [☑] Send notification to all users       │
│                                          │
│ [Create Flash Sale]                      │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Backend Processing                       │
│ 1. Create flash sale record              │
│ 2. Schedule cron job for start/end       │
│ 3. Cache sale data in Redis              │
│ 4. Prepare email campaign                │
└──────────────────────────────────────────┘

AT START TIME (Automated)
  │
  ▼
┌──────────────────────────────────────────┐
│ 1. Update product prices                 │
│ 2. Emit Socket.IO flash sale start       │
│ 3. Send push notifications               │
│ 4. Send email to all users               │
│ 5. Update homepage banner                │
└──────────────────────────────────────────┘
```

---

## 8. Analytics & Reports

### 8.1 Business Analytics

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYTICS DASHBOARD                           │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/analytics/sales
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ SALES ANALYTICS                                                  │
│                                                                  │
│ Period: [Last 30 Days ▼] [Custom Range]                         │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │         Revenue Over Time (Line Chart)                     │  │
│ │  $30k ┤                                            ╭─      │  │
│ │  $25k ┤                                   ╭────────╯       │  │
│ │  $20k ┤                          ╭────────╯                │  │
│ │  $15k ┤                 ╭────────╯                         │  │
│ │  $10k ┤        ╭────────╯                                  │  │
│ │   $5k ┤────────╯                                           │  │
│ │       └────────────────────────────────────────────────    │  │
│ │       Oct 1   Oct 8   Oct 15   Oct 22   Oct 29            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ KEY METRICS:                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │Total Revenue │ │ Avg Order    │ │ Conversion   │             │
│ │  $125,450    │ │    $85.60    │ │    3.2%      │             │
│ │   +15% ↑     │ │    +2% ↑     │ │    +0.5% ↑   │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
└──────────────────────────────────────────────────────────────────┘

GET /api/admin/analytics/products
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ PRODUCT ANALYTICS                                                │
│                                                                  │
│ Top Products by:                                                 │
│ [Revenue ▼] [Units Sold] [Views] [Conversion Rate]             │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Rank | Product         | Sold | Revenue   | Avg Rating     │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ 1   | Nike Air Max    | 156  | $23,400   | 4.8 ★         │  │
│ │ 2   | Adidas Ultra    | 142  | $25,560   | 4.7 ★         │  │
│ │ 3   | Puma RS-X       | 98   | $9,800    | 4.5 ★         │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Category Performance:                                            │
│ Running:   $45,000 (36%)                                        │
│ Casual:    $38,000 (30%)                                        │
│ Formal:    $25,000 (20%)                                        │
│ Sports:    $17,450 (14%)                                        │
└──────────────────────────────────────────────────────────────────┘

CUSTOMER ANALYTICS
  │
  ▼
GET /api/admin/analytics/customers
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ CUSTOMER INSIGHTS                                                │
│                                                                  │
│ ┌────────────────────┐ ┌────────────────────┐                   │
│ │ New Customers      │ │ Returning Customers│                   │
│ │     234            │ │        890         │                   │
│ │   +12% ↑           │ │      +8% ↑         │                   │
│ └────────────────────┘ └────────────────────┘                   │
│                                                                  │
│ Customer Lifetime Value:                                         │
│ Average: $425.50                                                │
│ Top 10%: $1,250+                                                │
│                                                                  │
│ Demographics:                                                    │
│ Age 18-24: 15% | 25-34: 45% | 35-44: 25% | 45+: 15%            │
│ Male: 55% | Female: 42% | Other: 3%                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## 9. System Settings

### 9.1 Configuration Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    SYSTEM SETTINGS                               │
└─────────────────────────────────────────────────────────────────┘

GET /api/admin/settings
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ GENERAL SETTINGS                                                 │
│                                                                  │
│ Site Configuration:                                              │
│ Site Name: [Shoe Store_____________]                            │
│ Support Email: [support@shoestore.com_____]                     │
│ Currency: [USD ▼]                                                │
│ Tax Rate: [8] %                                                  │
│                                                                  │
│ Shipping Rates:                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Method    | Price  | Est. Delivery                         │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ Standard  | $5.99  | 5-7 business days  [Edit] [Delete]   │  │
│ │ Express   | $12.99 | 2-3 business days  [Edit] [Delete]   │  │
│ │ Overnight | $24.99 | 1 business day     [Edit] [Delete]   │  │
│ │ [+ Add Shipping Method]                                    │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Email Settings:                                                  │
│ From Name: [Shoe Store_____________]                            │
│ From Email: [noreply@shoestore.com_____]                        │
│                                                                  │
│ Notification Settings:                                           │
│ ☑ Enable Email Notifications                                    │
│ ☑ Enable Push Notifications                                     │
│ ☑ Enable SMS Notifications                                      │
│ Low Stock Threshold: [10] units                                 │
│                                                                  │
│ [Save Settings]                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Admin Workflow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY ADMIN WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

Morning Routine:
1. Login to admin dashboard
2. Review overnight orders (pending)
3. Check low stock alerts
4. Process pending orders → Confirm
5. Review customer support tickets

Midday Tasks:
6. Update order statuses (processing → shipped)
7. Add tracking numbers
8. Respond to customer inquiries
9. Review new product reviews
10. Monitor real-time sales metrics

Afternoon Activities:
11. Update inventory levels
12. Create/manage promotions
13. Analyze sales reports
14. Manage user accounts (if needed)
15. Process refunds/returns

End of Day:
16. Review daily revenue
17. Check system health
18. Plan next day promotions
19. Export daily reports
20. Logout
```

---

## Key Admin API Endpoints

### Dashboard
- `GET /api/admin/dashboard` - Dashboard overview

### User Management
- `GET /api/admin/users` - List users
- `PATCH /api/admin/users/:id/role` - Change user role
- `PATCH /api/admin/users/:id/status` - Activate/deactivate user

### Product Management
- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `POST /api/admin/products/:id/images` - Upload images

### Order Management
- `GET /api/admin/orders` - List orders
- `GET /api/admin/orders/:id` - Order details
- `PATCH /api/admin/orders/:id/status` - Update status
- `POST /api/admin/orders/:id/refund` - Process refund

### Inventory
- `GET /api/admin/inventory/low-stock` - Low stock alerts
- `PATCH /api/admin/inventory/:productId/variant/:variantId/stock` - Update stock

### Marketing
- `GET /api/admin/coupons` - List coupons
- `POST /api/admin/coupons` - Create coupon
- `PUT /api/admin/coupons/:id` - Update coupon
- `DELETE /api/admin/coupons/:id` - Delete coupon
- `POST /api/admin/flash-sales` - Create flash sale

### Analytics
- `GET /api/admin/analytics/sales` - Sales analytics
- `GET /api/admin/analytics/products` - Product analytics
- `GET /api/admin/analytics/customers` - Customer analytics

### Settings
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings

---

**Document Version:** 1.0  
**Last Updated:** October 25, 2024  
**Role:** Admin Only  
**Access Level:** Full System Control
