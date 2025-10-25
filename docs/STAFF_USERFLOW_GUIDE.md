# Staff Userflow Guide - Shoe E-commerce API
## Complete Staff Operations Documentation

---

## Table of Contents
1. [Staff Authentication](#staff-authentication)
2. [Staff Dashboard](#staff-dashboard)
3. [Order Processing](#order-processing)
4. [Inventory Management](#inventory-management)
5. [Customer Support](#customer-support)
6. [Product Management](#product-management)
7. [Returns & Refunds](#returns--refunds)
8. [Daily Operations](#daily-operations)

---

## 1. Staff Authentication

### 1.1 Staff Login & Access

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAFF AUTHENTICATION                          │
└─────────────────────────────────────────────────────────────────┘

STAFF REGISTRATION (Admin creates staff account)
  │
  ▼
┌──────────────────────────────────────────┐
│ Admin Creates Staff Account              │
│ POST /api/auth/register-staff            │
│ {                                        │
│   email: "staff@shoestore.com",          │
│   password: "SecurePass123!",            │
│   firstName: "Staff",                    │
│   lastName: "Member"                     │
│ }                                        │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Backend Processing                       │
│ - role: "staff"                          │
│ - emailVerified: true                    │
│ - isActive: true                         │
│ - Send welcome email                     │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Staff receives welcome email             │
│ with login credentials                   │
└──────────────────────────────────────────┘

STAFF LOGIN
  │
  ▼
┌──────────────────────────────────────────┐
│ POST /api/auth/login                     │
│ {                                        │
│   email: "staff@shoestore.com",          │
│   password: "SecurePass123!"             │
│ }                                        │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Authenticate & Verify Role               │
│ - Check credentials                      │
│ - Verify role = "staff"                  │
│ - Generate JWT token                     │
│ - Update lastLogin                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Redirect to Staff Dashboard              │
│ Join Socket.IO "admin" room              │
│ (Staff has limited admin access)         │
└──────────────────────────────────────────┘
```

---

## 2. Staff Dashboard

### 2.1 Staff Dashboard Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAFF DASHBOARD                               │
└─────────────────────────────────────────────────────────────────┘

GET /api/staff/dashboard
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ STAFF WORK OVERVIEW                                              │
│                                                                  │
│ Quick Stats:                                                     │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │Pending Orders│ │Processing    │ │Today's Orders│             │
│ │     23       │ │      8       │ │      45      │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│ My Tasks:                                                        │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Priority Tasks:                                            │  │
│ │ • Process 23 pending orders                                │  │
│ │ • Update 8 orders with tracking numbers                    │  │
│ │ • Respond to 5 customer inquiries                          │  │
│ │ • Check 12 low stock items                                 │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ RECENT ORDERS TO PROCESS                                         │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Order #    | Customer   | Total   | Status    | Time       │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ORD-001234 | John Doe   | $276.99 | Pending   | 2 min ago  │  │
│ │ORD-001233 | Jane Smith | $150.00 | Confirmed | 5 min ago  │  │
│ │ORD-001232 | Bob Smith  | $450.00 | Processing| 8 min ago  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [View All Orders]                                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ LOW STOCK ALERTS                                                 │
│ ⚠ Nike Air Max 270 - Black, Size 10 (Stock: 3)                  │
│ ⚠ Adidas Ultraboost - White, Size 9 (Stock: 5)                  │
│ ⚠ Puma RS-X - Red, Size 11 (Stock: 2)                           │
│                                                                  │
│ [View All Alerts]                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Order Processing

### 3.1 Complete Order Processing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER PROCESSING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

GET /api/staff/orders
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ ORDERS DASHBOARD                                                 │
│                                                                  │
│ Filter by Status:                                                │
│ [All] [Pending] [Confirmed] [Processing] [Ready to Ship]       │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Order #    | Customer  | Items | Total   | Status  |Actions │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ORD-001234 | John Doe  |   2   | $276.99 | Pending |[View] │  │
│ │ORD-001233 | Jane Smith|   1   | $150.00 |Confirmed|[View] │  │
│ │ORD-001232 | Bob Smith |   3   | $450.00 |Processing[View] │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

PROCESS SINGLE ORDER
  │
  ▼
GET /api/staff/orders/:id
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ ORDER DETAILS - ORD-001234                                       │
│                                                                  │
│ Customer Information:                                            │
│ Name: John Doe                                                   │
│ Email: john@email.com                                            │
│ Phone: +1 234-567-8900                                           │
│                                                                  │
│ Order Items:                                                     │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Product              | Variant        | Qty | Price       │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ Nike Air Max 270     | Black, Size 10 |  2  | $300.00     │  │
│ │                                                            │  │
│ │ Instructions: "Leave at front door"                        │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Shipping Address:                                                │
│ John Doe                                                         │
│ 123 Main St                                                      │
│ New York, NY 10001                                               │
│ United States                                                    │
│                                                                  │
│ Order Summary:                                                   │
│ Subtotal:        $300.00                                        │
│ Shipping:         $12.99                                        │
│ Tax:              $24.00                                        │
│ Discount:        -$60.00                                        │
│ Total:           $276.99                                        │
│                                                                  │
│ Current Status: PENDING                                          │
│                                                                  │
│ Actions:                                                         │
│ [Confirm Order] [Add Note] [Contact Customer] [View History]   │
└──────────────────────────────────────────────────────────────────┘

CONFIRM ORDER (Pending → Confirmed)
  │
  ▼
┌──────────────────────────────────────────┐
│ Verify Items Available in Stock          │
│                                          │
│ ✓ Nike Air Max 270 (Black, 10) - OK     │
│                                          │
│ All items available                      │
│                                          │
│ [Confirm Order]                          │
└──────────────┬───────────────────────────┘
               │
               ▼
PATCH /api/staff/orders/:id/status
{ status: "confirmed" }
  │
  ▼
┌──────────────────────────────────────────┐
│ Backend Updates                          │
│ 1. Update order status                   │
│ 2. Reserve inventory                     │
│ 3. Send confirmation email to customer   │
│ 4. Emit Socket.IO event                  │
│ 5. Add to processing queue               │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Order Status: CONFIRMED                  │
│ Next Step: Pack & Prepare for Shipping   │
└──────────────────────────────────────────┘

PROCESS ORDER (Confirmed → Processing)
  │
  ▼
┌──────────────────────────────────────────┐
│ Physical Order Processing                │
│                                          │
│ Checklist:                               │
│ □ Verify items picked from inventory     │
│ □ Check product condition                │
│ □ Add gift message (if applicable)       │
│ □ Pack items securely                    │
│ □ Include invoice/receipt                │
│ □ Quality check packaging                │
│                                          │
│ [Mark as Processing]                     │
└──────────────┬───────────────────────────┘
               │
               ▼
PATCH /api/staff/orders/:id/status
{ status: "processing" }
  │
  ▼
┌──────────────────────────────────────────┐
│ Order Status: PROCESSING                 │
│ Next Step: Ship Order                    │
└──────────────────────────────────────────┘

SHIP ORDER (Processing → Shipped)
  │
  ▼
┌──────────────────────────────────────────┐
│ Shipping Information                     │
│                                          │
│ Carrier: [UPS ▼]                         │
│ - UPS                                    │
│ - FedEx                                  │
│ - USPS                                   │
│ - DHL                                    │
│                                          │
│ Tracking Number:                         │
│ [1Z999AA10123456784____________]        │
│                                          │
│ Estimated Delivery:                      │
│ [10/28/2024]                             │
│                                          │
│ Staff Notes:                             │
│ [Package handed to carrier at 2:00 PM]  │
│                                          │
│ [Mark as Shipped]                        │
└──────────────┬───────────────────────────┘
               │
               ▼
PATCH /api/staff/orders/:id/status
{
  status: "shipped",
  trackingNumber: "1Z999AA10123456784",
  notes: "Package handed to carrier"
}
  │
  ▼
┌──────────────────────────────────────────┐
│ Backend Updates                          │
│ 1. Update order status to "shipped"      │
│ 2. Add tracking information              │
│ 3. Set shippedAt timestamp               │
│ 4. Send shipping email to customer       │
│ 5. Emit real-time notification           │
│ 6. Update inventory (finalize)           │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Order Status: SHIPPED                    │
│ Order Processing Complete                │
└──────────────────────────────────────────┘
```

---

## 4. Inventory Management

### 4.1 Stock Management Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVENTORY MANAGEMENT                          │
└─────────────────────────────────────────────────────────────────┘

GET /api/staff/inventory/alerts
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ LOW STOCK ALERTS                                                 │
│                                                                  │
│ Critical (Stock ≤ 5):                                            │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Product         | Variant        | Current | Threshold    │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ Nike Air Max    | Black, Size 10 |    3    |     10       │  │
│ │ Puma RS-X       | Red, Size 11   |    2    |     10       │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Warning (Stock ≤ 10):                                            │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Adidas Ultra    | White, Size 9  |    5    |     10       │  │
│ │ New Balance 990 | Gray, Size 11  |    8    |     10       │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [Notify Admin] [Generate Report]                                │
└──────────────────────────────────────────────────────────────────┘

STOCK COUNT UPDATE
  │
  ▼
┌──────────────────────────────────────────┐
│ Physical Stock Count                     │
│                                          │
│ Product: Nike Air Max 270                │
│ Variant: Black, Size 10                  │
│ SKU: NIKE-AM-BLK-10                      │
│                                          │
│ System Stock: 3                          │
│ Physical Count: [5___]                   │
│                                          │
│ Reason: [Restock ▼]                      │
│ - Restock received                       │
│ - Count correction                       │
│ - Return processed                       │
│ - Damaged items removed                  │
│                                          │
│ Notes: [Shipment received from supplier] │
│                                          │
│ [Update Stock] [Cancel]                  │
└──────────────┬───────────────────────────┘
               │
               ▼
Staff notifies admin for approval
(Staff can view but admin updates stock)
```

---

## 5. Customer Support

### 5.1 Customer Service Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER SUPPORT                              │
└─────────────────────────────────────────────────────────────────┘

GET /api/staff/customers
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ CUSTOMER LOOKUP                                                  │
│                                                                  │
│ Search: [john@email.com________________] [Search]               │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Name         | Email            | Orders | Last Order     │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ John Doe     | john@email.com   |   15   | Oct 20, 2024   │  │
│ │ Jane Smith   | jane@email.com   |    8   | Oct 15, 2024   │  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

CUSTOMER DETAILS
  │
  ▼
GET /api/staff/customers/:id
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ CUSTOMER PROFILE - John Doe                                      │
│                                                                  │
│ Contact Information:                                             │
│ Email: john@email.com                                            │
│ Phone: +1 234-567-8900                                           │
│ Member Since: Jan 15, 2024                                       │
│ Last Login: Oct 25, 2024                                         │
│                                                                  │
│ Order History Summary:                                           │
│ Total Orders: 15                                                 │
│ Total Spent: $2,450.00                                          │
│ Average Order: $163.33                                          │
│                                                                  │
│ Recent Orders:                                                   │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ORD-001234 | Oct 20 | $276.99 | Shipped  | [View Details] │  │
│ │ ORD-001180 | Oct 10 | $150.00 | Delivered| [View Details] │  │
│ │ ORD-001120 | Sep 25 | $325.00 | Delivered| [View Details] │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [View All Orders] [Send Email] [Add Note]                       │
└──────────────────────────────────────────────────────────────────┘

VIEW CUSTOMER ORDER HISTORY
  │
  ▼
GET /api/staff/customers/:id/orders
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Complete Order History - John Doe                                │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Order #    | Date      | Items | Total   | Status  |Actions │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ORD-001234 | Oct 20, 24|   2   | $276.99 | Shipped |[View] │  │
│ │ORD-001180 | Oct 10, 24|   1   | $150.00 |Delivered|[View] │  │
│ │ORD-001120 | Sep 25, 24|   3   | $325.00 |Delivered|[View] │  │
│ │ORD-001080 | Sep 10, 24|   1   | $180.00 |Delivered|[View] │  │
│ │ORD-001045 | Aug 28, 24|   2   | $290.00 |Delivered|[View] │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ [Export History] [Send Summary Email]                           │
└──────────────────────────────────────────────────────────────────┘

HANDLE CUSTOMER INQUIRY
  │
  ▼
┌──────────────────────────────────────────┐
│ Customer Inquiry Form                    │
│                                          │
│ Customer: John Doe                       │
│ Email: john@email.com                    │
│                                          │
│ Inquiry Type: [Order Status ▼]          │
│ - Order Status                           │
│ - Product Question                       │
│ - Shipping Issue                         │
│ - Return/Refund                          │
│ - General Inquiry                        │
│                                          │
│ Related Order (if any):                  │
│ [ORD-001234_______________] [Search]     │
│                                          │
│ Response:                                │
│ [Your order has been shipped and is     │
│  expected to arrive by Oct 28. The      │
│  tracking number is 1Z999AA10123456784.] │
│                                          │
│ [Send Response] [Save as Note] [Escalate│
└──────────────────────────────────────────┘
```

---

## 6. Product Management

### 6.1 Limited Product Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT MANAGEMENT (Limited)                  │
└─────────────────────────────────────────────────────────────────┘

GET /api/staff/products
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ PRODUCT LIST (Read-Only for Most)                               │
│                                                                  │
│ [Search products____________] [Filter]                          │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Product         | Brand | Stock | Status  | Actions        │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │ Nike Air Max    | Nike  |  250  | Active  | [View] [Edit*] │  │
│ │ Adidas Ultra    | Adidas|  180  | Active  | [View] [Edit*] │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ * Limited editing capabilities                                   │
└──────────────────────────────────────────────────────────────────┘

EDIT PRODUCT (Limited)
  │
  ▼
PUT /api/staff/products/:id
  │
  ▼
┌──────────────────────────────────────────┐
│ Edit Product - Nike Air Max 270         │
│                                          │
│ Basic Info (Read-Only):                  │
│ Name: Nike Air Max 270                   │
│ Brand: Nike                              │
│ Category: Running                        │
│                                          │
│ Staff Can Edit:                          │
│ Description: [Updated description_____]  │
│                                          │
│ Images: [Upload Additional Images]       │
│ [📷] [📷] [📷] [+ Add]                   │
│                                          │
│ Pricing (Limited):                       │
│ Can view but cannot change base prices   │
│                                          │
│ [Save Changes] [Request Admin Approval]  │
└──────────────────────────────────────────┘

Note: Major changes require admin approval
Staff primarily manages descriptions and images
```

---

## 7. Returns & Refunds

### 7.1 Return Processing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    RETURNS & REFUNDS                             │
└─────────────────────────────────────────────────────────────────┘

GET /api/staff/returns
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ RETURN REQUESTS                                                  │
│                                                                  │
│ Status: [Pending ▼] [All] [Approved] [Completed] [Rejected]    │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │Return #  | Order #   | Customer  | Amount  | Reason |Status │  │
│ ├────────────────────────────────────────────────────────────┤  │
│ │RET-00123 | ORD-01180 | John Doe  | $150.00 | Size   |Pending│  │
│ │RET-00122 | ORD-01120 | Jane Smith| $325.00 |Defect  |Pending│  │
│ └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

PROCESS RETURN REQUEST
  │
  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Return Request #RET-00123                                        │
│                                                                  │
│ Order: ORD-001180                                                │
│ Customer: John Doe (john@email.com)                             │
│ Date Requested: Oct 23, 2024                                     │
│                                                                  │
│ Items to Return:                                                 │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Nike Air Max 270 (Black, Size 10) | 1x $150.00            │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│ Return Reason: Wrong size ordered                                │
│ Customer Notes: "Need size 11 instead"                          │
│                                                                  │
│ Condition Assessment:                                            │
│ ○ New/Unworn                                                     │
│ ○ Worn but good condition                                        │
│ ○ Damaged/Defective                                              │
│                                                                  │
│ Return Authorization:                                            │
│ ○ Approve Full Refund ($150.00)                                 │
│ ○ Approve Partial Refund [$____]                                │
│ ○ Approve Exchange Only                                          │
│ ○ Reject Return                                                  │
│                                                                  │
│ Staff Notes:                                                     │
│ [Item received in perfect condition, approve full refund]       │
│                                                                  │
│ [Process Return] [Contact Customer] [Escalate to Admin]         │
└──────────────────────────────────────────────────────────────────┘

APPROVE RETURN
  │
  ▼
PUT /api/staff/returns/:id/process
  │
  ▼
┌──────────────────────────────────────────┐
│ Return Approval                          │
│                                          │
│ Action: Approve Full Refund              │
│ Amount: $150.00                          │
│                                          │
│ Next Steps:                              │
│ ✓ Update inventory (add back to stock)  │
│ ✓ Initiate refund (requires admin)      │
│ ✓ Send confirmation to customer          │
│ ✓ Update return status                   │
│                                          │
│ [Confirm Approval]                       │
└──────────────┬───────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│ Notify admin for refund processing       │
│ Staff approves, Admin processes payment  │
└──────────────────────────────────────────┘
```

---

## 8. Daily Operations

### 8.1 Typical Staff Daily Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DAILY STAFF WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

MORNING SHIFT (9:00 AM - 1:00 PM)
  │
  ├─ 1. Login to staff dashboard
  │    └─ Review pending tasks
  │
  ├─ 2. Check overnight orders
  │    └─ GET /api/staff/orders?status=pending
  │    └─ Priority: Process time-sensitive orders
  │
  ├─ 3. Confirm pending orders
  │    └─ Verify stock availability
  │    └─ Update status: Pending → Confirmed
  │    └─ Reserve inventory
  │
  ├─ 4. Physical order preparation
  │    └─ Pick items from inventory
  │    └─ Quality check products
  │    └─ Pack orders securely
  │    └─ Update status: Confirmed → Processing
  │
  └─ 5. Morning inventory check
       └─ Check low stock alerts
       └─ Report to admin if critical

AFTERNOON SHIFT (1:00 PM - 5:00 PM)
  │
  ├─ 6. Process shipments
  │    └─ Generate shipping labels
  │    └─ Add tracking numbers
  │    └─ Update status: Processing → Shipped
  │    └─ Hand packages to carrier
  │
  ├─ 7. Customer support
  │    └─ Respond to customer inquiries
  │    └─ Check order status for customers
  │    └─ Handle simple issues
  │    └─ Escalate complex issues to admin
  │
  ├─ 8. Process returns
  │    └─ Review return requests
  │    └─ Inspect returned items
  │    └─ Approve/reject returns
  │    └─ Update inventory
  │
  ├─ 9. Update product information
  │    └─ Add product images
  │    └─ Update descriptions
  │    └─ Flag issues for admin
  │
  └─ 10. End-of-day tasks
        └─ Complete pending tasks
        └─ Add notes for next shift
        └─ Review performance metrics
        └─ Logout

REAL-TIME NOTIFICATIONS (Throughout Day)
  │
  ├─ New order alert → Process immediately
  ├─ Customer inquiry → Respond within 1 hour
  ├─ Low stock warning → Report to admin
  ├─ Return request → Review and process
  └─ Admin message → Read and acknowledge
```

---

## Staff Responsibilities Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAFF CAPABILITIES                            │
└─────────────────────────────────────────────────────────────────┘

✓ CAN DO:
├─ View and process orders (pending → shipped)
├─ Update order statuses with tracking
├─ View customer information and order history
├─ Respond to customer inquiries
├─ Process return requests (approval only)
├─ Update product descriptions and images
├─ View inventory levels and alerts
├─ Report low stock to admin
├─ Add notes to orders and customers
└─ Generate basic reports

✗ CANNOT DO:
├─ Create or delete products
├─ Change product pricing
├─ Update inventory stock levels (view only)
├─ Process refunds (requires admin)
├─ Manage other staff accounts
├─ Access financial analytics
├─ Change system settings
├─ Delete orders
└─ Modify user roles
```

---

## Key Staff API Endpoints

### Dashboard & Overview
- `GET /api/staff/dashboard` - Staff dashboard

### Order Management
- `GET /api/staff/orders` - List orders
- `GET /api/staff/orders/:id` - Order details
- `PATCH /api/staff/orders/:id/status` - Update order status
- `POST /api/staff/orders/:id/notes` - Add order notes

### Customer Service
- `GET /api/staff/customers` - Search customers
- `GET /api/staff/customers/:id` - Customer details
- `GET /api/staff/customers/:id/orders` - Customer order history

### Product Management (Limited)
- `GET /api/staff/products` - View products
- `PUT /api/staff/products/:id` - Update product (limited)
- `POST /api/staff/products/:id/images` - Upload images
- `PUT /api/staff/products/:id/description` - Update description

### Inventory
- `GET /api/staff/inventory/alerts` - View low stock alerts

### Returns
- `GET /api/staff/returns` - View return requests
- `PUT /api/staff/returns/:id/process` - Process return
- `PUT /api/staff/returns/:id/status` - Update return status

### Reporting
- `GET /api/staff/reports/daily` - Daily reports
- `GET /api/staff/reports/weekly` - Weekly reports
- `POST /api/staff/reports/issue` - Report issue

---

**Document Version:** 1.0  
**Last Updated:** October 25, 2024  
**Role:** Staff Only  
**Access Level:** Order Processing & Customer Support
