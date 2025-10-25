# Customer Userflow Guide - Shoe E-commerce API
## Complete Customer Journey Documentation

---

## Table of Contents
1. [Authentication & Onboarding](#authentication--onboarding)
2. [Product Discovery & Shopping](#product-discovery--shopping)
3. [Cart Management](#cart-management)
4. [Checkout & Payment](#checkout--payment)
5. [Order Tracking](#order-tracking)
6. [Reviews & Ratings](#reviews--ratings)
7. [Wishlist Management](#wishlist-management)
8. [Profile & Settings](#profile--settings)

---

## 1. Authentication & Onboarding

### 1.1 Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER REGISTRATION FLOW                    │
└─────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌──────────────────────┐
│  Visit Website       │
│  (Landing Page)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Click "Sign Up"     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Registration Form                    │
│  ├─ Email                            │
│  ├─ Password (min 6 chars)           │
│  ├─ First Name                       │
│  └─ Last Name                        │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────┐      ┌────────────────────┐
│  Submit Form         │─────▶│  Validation        │
└──────────┬───────────┘      │  - Email format    │
           │                  │  - Password length │
           │                  │  - Required fields │
           │                  └────────┬───────────┘
           │                           │
           │                  ┌────────▼───────────┐
           │                  │  Email exists?     │
           │                  └────────┬───────────┘
           │                           │
           │          ┌────────────────┴────────────────┐
           │          │                                  │
           │          ▼ YES                              ▼ NO
           │    ┌──────────────┐              ┌─────────────────┐
           │    │ Show Error   │              │ Create Account  │
           │    │ "Email exists│              │ - Hash password │
           │    │  try login"  │              │ - Save to DB    │
           │    └──────────────┘              │ - Generate JWT  │
           │                                  │ - Create token  │
           │                                  └────────┬────────┘
           │                                           │
           ▼                                           ▼
    ┌──────────────────┐                    ┌─────────────────────┐
    │  Return to       │                    │ Send Welcome Email  │
    │  Registration    │                    │ - Verification link │
    └──────────────────┘                    └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │ Return Success      │
                                            │ - User object       │
                                            │ - JWT token         │
                                            └──────────┬──────────┘
                                                       │
                                                       ▼
                                            ┌─────────────────────┐
                                            │ Redirect to         │
                                            │ Dashboard/Home      │
                                            └─────────────────────┘
```

**API Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "email": "john.doe@example.com",
  "password": "securepass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "john.doe@example.com",
      "role": "customer",
      "emailVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 1.2 Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
└─────────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌──────────────────────┐
│ Click "Login"        │
└──────────┬───────────┘
           │
           ├──────────────────┬─────────────────────┐
           ▼                  ▼                     ▼
    ┌─────────────┐    ┌─────────────┐     ┌──────────────┐
    │ Email/Pass  │    │ Google OAuth│     │ Social Login │
    │ Login       │    │             │     │ (Future)     │
    └──────┬──────┘    └──────┬──────┘     └──────────────┘
           │                  │
           │                  │
           ▼                  ▼
    ┌─────────────────────────────────┐
    │ Validate Credentials             │
    │ - Find user by email            │
    │ - Compare password hash         │
    │ - Check account status          │
    └──────────┬──────────────────────┘
               │
               ├────────────────────────┐
               ▼                        ▼
        ┌────────────┐          ┌─────────────┐
        │ Valid?     │──NO─────▶│ Show Error  │
        └────┬───────┘          │ Invalid     │
             │                  │ credentials │
             │ YES              └─────────────┘
             ▼
    ┌────────────────────┐
    │ Update last login  │
    │ Generate JWT token │
    └──────────┬─────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Return user + token │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Store token         │
    │ (localStorage)      │
    └──────────┬──────────┘
               │
               ▼
    ┌─────────────────────┐
    │ Redirect to Home    │
    └─────────────────────┘
```

**API Endpoint:** `POST /api/auth/login`

---

## 2. Product Discovery & Shopping

### 2.1 Product Browsing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT BROWSING FLOW                         │
└─────────────────────────────────────────────────────────────────┘

START (Homepage)
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│ Product Discovery Entry Points                          │
│ ├─ Browse by Category (Running, Casual, Formal, etc.)  │
│ ├─ Browse by Brand (Nike, Adidas, Puma, etc.)          │
│ ├─ Browse by Gender (Men, Women, Unisex, Kids)         │
│ ├─ Search (Text input)                                 │
│ └─ Featured Products                                   │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ Product Listing Page  │
        │ GET /api/products     │
        └───────────┬───────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────┐
│ Apply Filters & Sorting                          │
│ ┌──────────────────────────────────────────────┐ │
│ │ Filters:                                     │ │
│ │ ├─ Category                                  │ │
│ │ ├─ Brand                                     │ │
│ │ ├─ Gender                                    │ │
│ │ ├─ Price Range (min/max slider)             │ │
│ │ ├─ Size                                      │ │
│ │ ├─ Color                                     │ │
│ │ └─ Rating (4+ stars, etc.)                  │ │
│ │                                              │ │
│ │ Sorting:                                     │ │
│ │ ├─ Price: Low to High                        │ │
│ │ ├─ Price: High to Low                        │ │
│ │ ├─ Newest                                    │ │
│ │ ├─ Most Popular                              │ │
│ │ └─ Best Rating                               │ │
│ └──────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Display Products Grid  │
        │ - Product cards        │
        │ - Pagination           │
        │ - Results count        │
        └────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │ User Clicks Product    │
    └────────┬───────────────┘
             │
             ▼
    [Go to Product Details Flow]
```

**API Request Example:**
```
GET /api/products?category=running&brand=nike&minPrice=50&maxPrice=200&size=10&page=1&limit=20&sortBy=price&sortOrder=asc
```

### 2.2 Product Details Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT DETAILS PAGE                          │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │ Load Product        │
                    │ GET /api/products/id│
                    └──────────┬──────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────┐
        │ Display Product Information              │
        │ ┌──────────────────────────────────────┐ │
        │ │ Left Section: Images                 │ │
        │ │ ├─ Main image (large)                │ │
        │ │ ├─ Thumbnail gallery                 │ │
        │ │ └─ Image zoom on hover               │ │
        │ │                                      │ │
        │ │ Right Section: Details               │ │
        │ │ ├─ Product name                      │ │
        │ │ ├─ Brand                             │ │
        │ │ ├─ Price (with sale price if any)    │ │
        │ │ ├─ Rating & review count             │ │
        │ │ ├─ Description                       │ │
        │ │ ├─ Size selector (dropdown)          │ │
        │ │ ├─ Color selector (swatches)         │ │
        │ │ ├─ Quantity selector                 │ │
        │ │ ├─ Stock availability indicator      │ │
        │ │ └─ Action buttons                    │ │
        │ └──────────────────────────────────────┘ │
        └──────────────────┬───────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │ User Actions                              │
        └──────────────┬───────────────────────────┘
                       │
        ┌──────────────┴────────────────┬──────────────────┐
        ▼                               ▼                  ▼
┌───────────────┐            ┌──────────────────┐  ┌─────────────┐
│ Add to Cart   │            │ Add to Wishlist  │  │ Buy Now     │
└───────┬───────┘            └────────┬─────────┘  └──────┬──────┘
        │                             │                   │
        │                             │                   │
        ▼                             ▼                   ▼
┌───────────────┐            ┌──────────────────┐  ┌─────────────┐
│Validate size/ │            │POST /api/        │  │Skip cart &  │
│color selected │            │wishlists/:id/    │  │go to        │
└───────┬───────┘            │items             │  │checkout     │
        │                    └──────────────────┘  └─────────────┘
        ▼
┌───────────────────┐
│Check stock        │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│POST /api/cart/add │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐
│Show success       │
│notification       │
│Update cart badge  │
└───────────────────┘
```

**Product Details Response:**
```json
{
  "status": "success",
  "data": {
    "id": "prod_123",
    "name": "Nike Air Max 270",
    "brand": "Nike",
    "category": "running",
    "description": "Premium running shoes...",
    "images": [...],
    "variants": [
      {
        "size": "10",
        "color": "Black",
        "sku": "NIKE-AM270-BLK-10",
        "price": 150.00,
        "stock": 15
      }
    ],
    "ratings": {
      "average": 4.5,
      "count": 128
    }
  }
}
```

---

## 3. Cart Management

### 3.1 Shopping Cart Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHOPPING CART FLOW                            │
└─────────────────────────────────────────────────────────────────┘

User adds item to cart
        │
        ▼
┌────────────────────────┐
│ POST /api/cart/add     │
│ {                      │
│   productId,           │
│   variant: {           │
│     size, color, sku   │
│   },                   │
│   quantity             │
│ }                      │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────┐      ┌─────────────────┐
│ Backend Processing     │─────▶│ Check stock     │
└────────┬───────────────┘      └────────┬────────┘
         │                               │
         │                      ┌────────▼────────┐
         │                      │ Stock available?│
         │                      └────────┬────────┘
         │                               │
         │              ┌────────────────┴─────────────┐
         │              ▼ YES                          ▼ NO
         │       ┌──────────────┐              ┌──────────────┐
         │       │Add/Update item│              │Return error  │
         │       │in cart        │              │"Out of stock"│
         │       └──────┬────────┘              └──────────────┘
         │              │
         │              ▼
         │       ┌──────────────────────┐
         │       │ Calculate totals     │
         │       │ - Subtotal           │
         │       │ - Item count         │
         │       └──────┬───────────────┘
         │              │
         │              ▼
         │       ┌──────────────────────┐
         │       │ Emit Socket.IO event │
         │       │ (real-time sync)     │
         │       └──────┬───────────────┘
         │              │
         ▼              ▼
┌────────────────────────────────┐
│ View Cart Page                 │
│ GET /api/cart                  │
└────────┬───────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ Display Cart Items                       │
│ ┌──────────────────────────────────────┐ │
│ │ For each item:                       │ │
│ │ ├─ Product image                     │ │
│ │ ├─ Product name & brand              │ │
│ │ ├─ Size & color                      │ │
│ │ ├─ Unit price                        │ │
│ │ ├─ Quantity selector (+/-)           │ │
│ │ ├─ Subtotal                          │ │
│ │ └─ Remove button                     │ │
│ │                                      │ │
│ │ Cart Summary:                        │ │
│ │ ├─ Subtotal                          │ │
│ │ ├─ Estimated shipping                │ │
│ │ ├─ Estimated tax                     │ │
│ │ └─ Total                             │ │
│ └──────────────────────────────────────┘ │
└────────────────┬─────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ User Actions        │
        └────────┬───────────┘
                 │
    ┌────────────┼────────────┬─────────────┐
    ▼            ▼            ▼             ▼
┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐
│Update   │ │Remove    │ │Clear    │ │Proceed to    │
│quantity │ │item      │ │cart     │ │Checkout      │
└────┬────┘ └────┬─────┘ └────┬────┘ └──────┬───────┘
     │           │            │             │
     ▼           ▼            ▼             ▼
  [Update]   [Delete]    [Clear All]   [Checkout Flow]
```

**Cart Response:**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "product": {...},
        "variant": {
          "size": "10",
          "color": "Black",
          "price": 150.00
        },
        "quantity": 2,
        "subtotal": 300.00
      }
    ],
    "totalItems": 2,
    "totalAmount": 300.00
  }
}
```

---

## 4. Checkout & Payment

### 4.1 Complete Checkout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHECKOUT PROCESS                              │
└─────────────────────────────────────────────────────────────────┘

START (Click "Checkout")
  │
  ▼
┌─────────────────────────────────┐
│ STEP 1: Shipping Information   │
└─────────────────┬───────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Select or Add Shipping Address          │
│ ┌──────────────────────────────────────┐ │
│ │ Existing addresses (if any)          │ │
│ │ ○ Home: 123 Main St, NY 10001       │ │
│ │ ○ Work: 456 Oak Ave, NY 10002       │ │
│ │ ○ Add new address                    │ │
│ └──────────────────────────────────────┘ │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Enter Address Details (if new)           │
│ - First Name, Last Name                  │
│ - Street Address                         │
│ - City, State, ZIP                       │
│ - Country, Phone                         │
│ - Save as default? [✓]                   │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ STEP 2: Shipping Method        │
└─────────────────┬───────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Select Shipping Speed                    │
│ ○ Standard (5-7 days) - $5.99           │
│ ○ Express (2-3 days) - $12.99           │
│ ○ Overnight (1 day) - $24.99            │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ STEP 3: Apply Discounts        │
└─────────────────┬───────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Coupon Code Entry                        │
│ [Enter code]  [Apply]                    │
│                                          │
│ POST /api/coupons/validate               │
└────────────────┬─────────────────────────┘
                 │
                 ├─────────────────────┐
                 ▼                     ▼
        ┌────────────────┐    ┌──────────────┐
        │ Valid coupon?  │    │ Flash sale   │
        └────┬───────────┘    │ active?      │
             │                └──────┬───────┘
             ▼                       │
    ┌────────────────┐               │
    │ Apply discount │◄──────────────┘
    │ Recalculate    │
    │ totals         │
    └────────┬───────┘
             │
             ▼
┌─────────────────────────────────┐
│ STEP 4: Order Review            │
└─────────────────┬───────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Order Summary                            │
│ ┌──────────────────────────────────────┐ │
│ │ Items (2):                           │ │
│ │ - Nike Air Max 270 x2    $300.00    │ │
│ │                                      │ │
│ │ Subtotal:               $300.00     │ │
│ │ Shipping (Express):      $12.99     │ │
│ │ Tax (8%):                $24.00     │ │
│ │ Discount (SAVE20):      -$60.00     │ │
│ │ ─────────────────────────────────   │ │
│ │ TOTAL:                  $276.99     │ │
│ └──────────────────────────────────────┘ │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│ STEP 5: Payment                 │
└─────────────────┬───────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│ Create Order                             │
│ POST /api/orders                         │
│ {                                        │
│   items: [...],                          │
│   shippingAddress: {...},                │
│   shippingMethod: "express",             │
│   couponCode: "SAVE20"                   │
│ }                                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Backend Order Processing                 │
│ 1. Validate all items still available    │
│ 2. Reserve inventory                     │
│ 3. Calculate final totals                │
│ 4. Create order record                   │
│ 5. Generate order number                 │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Create Payment Intent                    │
│ POST /api/payments/create-intent         │
│                                          │
│ Backend calls Stripe API                 │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Stripe Payment Form (Client-side)        │
│ ┌──────────────────────────────────────┐ │
│ │ Card Information:                    │ │
│ │ Card Number: [____-____-____-____]   │ │
│ │ Expiry: [MM/YY]  CVV: [___]          │ │
│ │ Name on Card: [____________]         │ │
│ │                                      │ │
│ │ [✓] Save card for future purchases   │ │
│ │                                      │ │
│ │ [Complete Purchase]                  │ │
│ └──────────────────────────────────────┘ │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Process Payment                          │
│ Stripe.confirmCardPayment()              │
└────────────────┬─────────────────────────┘
                 │
                 ├────────────────────┐
                 ▼                    ▼
        ┌────────────────┐   ┌────────────────┐
        │ Payment Success│   │ Payment Failed │
        └────────┬───────┘   └────────┬───────┘
                 │                    │
                 ▼                    ▼
   ┌──────────────────────┐  ┌──────────────┐
   │ Update order status  │  │ Show error   │
   │ to "confirmed"       │  │ Keep order   │
   │ Clear cart           │  │ pending      │
   │ Send confirmation    │  │ Allow retry  │
   │ email                │  └──────────────┘
   │ Emit Socket.IO event │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ Redirect to Order    │
   │ Confirmation Page    │
   └──────────────────────┘
```

---

## 5. Order Tracking

### 5.1 Order Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER LIFECYCLE                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐
│   PENDING   │ ← Order created, payment processing
└──────┬──────┘
       │
       ▼ Payment confirmed
┌─────────────┐
│  CONFIRMED  │ ← Payment successful, preparing order
└──────┬──────┘
       │
       ▼ Staff picks and packs
┌─────────────┐
│ PROCESSING  │ ← Order being prepared for shipment
└──────┬──────┘
       │
       ▼ Handed to carrier
┌─────────────┐
│   SHIPPED   │ ← In transit with tracking number
└──────┬──────┘
       │
       ▼ Package arrives
┌─────────────┐
│  DELIVERED  │ ← Customer received order
└─────────────┘

Alternative paths:
┌─────────────┐
│  CANCELLED  │ ← User/Admin cancelled before shipping
└─────────────┘

┌─────────────┐
│  RETURNED   │ ← Customer initiated return
└─────────────┘
```

### 5.2 Order Tracking Interface

```
┌─────────────────────────────────────────────────────────────────┐
│                    MY ORDERS PAGE                                │
└─────────────────────────────────────────────────────────────────┘

GET /api/orders
  │
  ▼
┌──────────────────────────────────────────┐
│ Order History List                       │
│ ┌──────────────────────────────────────┐ │
│ │ Order #ORD-2024-001234              │ │
│ │ Status: SHIPPED                      │ │
│ │ Date: Oct 20, 2024                   │ │
│ │ Total: $276.99                       │ │
│ │ Items: 2 items                       │ │
│ │ [Track Order] [View Details]         │ │
│ ├──────────────────────────────────────┤ │
│ │ Order #ORD-2024-001200              │ │
│ │ Status: DELIVERED                    │ │
│ │ Date: Oct 15, 2024                   │ │
│ │ Total: $150.00                       │ │
│ │ Items: 1 item                        │ │
│ │ [Leave Review] [Reorder]             │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

Click "View Details"
  │
  ▼
┌──────────────────────────────────────────┐
│ ORDER DETAILS PAGE                       │
│ GET /api/orders/:id                      │
│                                          │
│ Order #ORD-2024-001234                   │
│ ┌──────────────────────────────────────┐ │
│ │ Status Timeline:                     │ │
│ │ ✓ Pending      Oct 20, 10:30 AM     │ │
│ │ ✓ Confirmed    Oct 20, 10:35 AM     │ │
│ │ ✓ Processing   Oct 20, 2:00 PM      │ │
│ │ ✓ Shipped      Oct 21, 9:00 AM      │ │
│ │ ○ Delivered    Est. Oct 23          │ │
│ │                                      │ │
│ │ Tracking: UPS 1Z999AA10123456784     │ │
│ │ [Track with Carrier]                 │ │
│ ├──────────────────────────────────────┤ │
│ │ Items Ordered:                       │ │
│ │ - Nike Air Max 270 (Black, Size 10) │ │
│ │   Qty: 2 × $150.00 = $300.00        │ │
│ ├──────────────────────────────────────┤ │
│ │ Shipping Address:                    │ │
│ │ John Doe                             │ │
│ │ 123 Main St                          │ │
│ │ New York, NY 10001                   │ │
│ ├──────────────────────────────────────┤ │
│ │ Payment Summary:                     │ │
│ │ Subtotal:        $300.00            │ │
│ │ Shipping:         $12.99            │ │
│ │ Tax:              $24.00            │ │
│ │ Discount:        -$60.00            │ │
│ │ Total:           $276.99            │ │
│ │                                      │ │
│ │ [Cancel Order] [Contact Support]     │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

## 6. Reviews & Ratings

### 6.1 Review Submission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT REVIEW FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Order delivered
  │
  ▼
┌─────────────────────────┐
│ Email: "Rate your       │
│ recent purchase"        │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ Click "Write Review"    │
│ from email or order page│
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│ Review Form                              │
│ ┌──────────────────────────────────────┐ │
│ │ Product: Nike Air Max 270            │ │
│ │                                      │ │
│ │ Overall Rating: ★★★★★ (5 stars)     │ │
│ │                                      │ │
│ │ Detailed Ratings (optional):         │ │
│ │ Comfort:  ★★★★★                      │ │
│ │ Quality:  ★★★★☆                      │ │
│ │ Sizing:   ★★★★★                      │ │
│ │ Style:    ★★★★★                      │ │
│ │ Value:    ★★★★☆                      │ │
│ │                                      │ │
│ │ Review Title:                        │ │
│ │ [Great running shoes!___________]    │ │
│ │                                      │ │
│ │ Your Review:                         │ │
│ │ [These shoes are incredibly         │ │
│ │  comfortable and perfect for        │ │
│ │  long runs...]                       │ │
│ │                                      │ │
│ │ Add Photos (optional):               │ │
│ │ [Upload Images]                      │ │
│ │                                      │ │
│ │ Would you recommend? ○ Yes ○ No     │ │
│ │                                      │ │
│ │ [Submit Review]                      │ │
│ └──────────────────────────────────────┘ │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ POST /api/reviews                        │
│ {                                        │
│   productId: "...",                      │
│   orderId: "...",                        │
│   rating: 5,                             │
│   title: "Great running shoes!",         │
│   content: "These shoes are...",         │
│   detailedRatings: {...},                │
│   wouldRecommend: true                   │
│ }                                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Backend Validation                       │
│ - Verify user purchased product          │
│ - Check order delivered                  │
│ - One review per order                   │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Save Review                              │
│ Status: "pending" (moderation)           │
│ Update product rating aggregate          │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Show Success Message                     │
│ "Thank you! Your review is pending       │
│  approval and will appear soon."         │
└──────────────────────────────────────────┘
```

---

## 7. Wishlist Management

### 7.1 Wishlist Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WISHLIST MANAGEMENT                           │
└─────────────────────────────────────────────────────────────────┘

Add to Wishlist
  │
  ▼
┌──────────────────────────────────────────┐
│ From Product Page:                       │
│ Click ♡ icon                             │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Select Wishlist                          │
│ ○ My Wishlist (default)                  │
│ ○ Birthday Wishlist                      │
│ ○ + Create New Wishlist                  │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ POST /api/wishlists/:id/items            │
│ {                                        │
│   productId: "...",                      │
│   preferredVariant: {                    │
│     size: "10",                          │
│     color: "Black"                       │
│   },                                     │
│   priceWhenAdded: 150.00,                │
│   notifications: {                       │
│     priceDropAlert: true,                │
│     stockAlert: true                     │
│   }                                      │
│ }                                        │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│ Icon changes to ♥ (filled)               │
│ Show notification: "Added to Wishlist"   │
└──────────────────────────────────────────┘

View Wishlists
  │
  ▼
┌──────────────────────────────────────────┐
│ GET /api/wishlists                       │
│                                          │
│ My Wishlists:                            │
│ ┌──────────────────────────────────────┐ │
│ │ My Wishlist (5 items)                │ │
│ │ [View] [Share] [Edit]                │ │
│ ├──────────────────────────────────────┤ │
│ │ Birthday Wishlist (3 items)          │ │
│ │ Event: Dec 15, 2024                  │ │
│ │ [View] [Share] [Edit]                │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [+ Create New Wishlist]                  │
└──────────────────────────────────────────┘

Wishlist Details
  │
  ▼
┌──────────────────────────────────────────┐
│ My Wishlist                              │
│ ┌──────────────────────────────────────┐ │
│ │ [Product Image]                      │ │
│ │ Nike Air Max 270                     │ │
│ │ Size 10, Black                       │ │
│ │ $150.00  Was: $170.00 ⬇ Price Drop! │ │
│ │ In Stock ✓                           │ │
│ │ [Add to Cart] [Remove]               │ │
│ ├──────────────────────────────────────┤ │
│ │ [Product Image]                      │ │
│ │ Adidas Ultraboost                    │ │
│ │ Size 10, White                       │ │
│ │ $180.00                              │ │
│ │ Out of Stock ✗ (Notify when back)   │ │
│ │ [Remove]                             │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Total Value: $330.00                     │
│ [Move all to Cart]                       │
└──────────────────────────────────────────┘
```

---

## 8. Profile & Settings

### 8.1 Profile Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROFILE SETTINGS                              │
└─────────────────────────────────────────────────────────────────┘

My Account Dashboard
  │
  ├─── Personal Information
  │    │
  │    ▼
  │    ┌──────────────────────────────────┐
  │    │ GET /api/auth/me                 │
  │    │                                  │
  │    │ Profile Details:                 │
  │    │ - First Name                     │
  │    │ - Last Name                      │
  │    │ - Email (verified ✓)             │
  │    │ - Phone Number                   │
  │    │ - Avatar                         │
  │    │                                  │
  │    │ [Edit Profile]                   │
  │    └──────────────────────────────────┘
  │
  ├─── Addresses
  │    │
  │    ▼
  │    ┌──────────────────────────────────┐
  │    │ Saved Addresses:                 │
  │    │                                  │
  │    │ ○ Home (Default)                 │
  │    │   123 Main St, NY 10001          │
  │    │   [Edit] [Delete]                │
  │    │                                  │
  │    │ ○ Work                            │
  │    │   456 Oak Ave, NY 10002          │
  │    │   [Set Default] [Edit] [Delete]  │
  │    │                                  │
  │    │ [+ Add New Address]              │
  │    └──────────────────────────────────┘
  │
  ├─── Security
  │    │
  │    ▼
  │    ┌──────────────────────────────────┐
  │    │ Password & Security:             │
  │    │                                  │
  │    │ Password: ••••••••               │
  │    │ [Change Password]                │
  │    │                                  │
  │    │ Connected Accounts:              │
  │    │ ✓ Google (Connected)             │
  │    │                                  │
  │    │ Last Login: Oct 25, 2024 9:00 AM │
  │    └──────────────────────────────────┘
  │
  └─── Notification Preferences
       │
       ▼
       ┌──────────────────────────────────┐
       │ PUT /api/auth/preferences        │
       │                                  │
       │ Email Notifications:             │
       │ ✓ Order updates                  │
       │ ✓ Promotions & newsletters       │
       │ ✓ Price drop alerts              │
       │ ✓ Back in stock notifications    │
       │                                  │
       │ Push Notifications:              │
       │ ✓ Order status updates           │
       │ ✓ Flash sales                    │
       │ □ Marketing messages             │
       │                                  │
       │ SMS Notifications:               │
       │ □ Order updates                  │
       │ □ Delivery notifications         │
       │                                  │
       │ [Save Preferences]               │
       └──────────────────────────────────┘
```

---

## Complete Customer Journey Map

```
┌─────────────────────────────────────────────────────────────────┐
│              END-TO-END CUSTOMER JOURNEY                         │
└─────────────────────────────────────────────────────────────────┘

1. DISCOVERY
   └─> Land on website
       └─> Browse/Search products
           └─> View product details

2. CONSIDERATION
   └─> Compare products
       └─> Read reviews
           └─> Add to wishlist
               └─> Check for discounts

3. PURCHASE
   └─> Add to cart
       └─> Review cart
           └─> Apply coupons
               └─> Checkout
                   └─> Payment
                       └─> Order confirmation

4. FULFILLMENT
   └─> Track order
       └─> Receive shipping updates
           └─> Delivery

5. POST-PURCHASE
   └─> Leave review
       └─> Reorder
           └─> Refer friends
               └─> Join loyalty program

CONTINUOUS ENGAGEMENT
└─> Wishlist monitoring
    └─> Email notifications
        └─> Flash sale alerts
            └─> Personalized recommendations
```

---

## Key API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/addresses` - Add address

### Products
- `GET /api/products` - Browse products
- `GET /api/products/:id` - Product details
- `GET /api/products/search` - Search

### Cart
- `GET /api/cart` - View cart
- `POST /api/cart/add` - Add item
- `PUT /api/cart/update` - Update quantity
- `DELETE /api/cart/remove/:itemId` - Remove item

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Order history
- `GET /api/orders/:id` - Order details
- `PUT /api/orders/:id/cancel` - Cancel order

### Reviews
- `POST /api/reviews` - Submit review
- `GET /api/reviews/my-reviews` - My reviews
- `PUT /api/reviews/:id` - Edit review

### Wishlists
- `GET /api/wishlists` - All wishlists
- `POST /api/wishlists` - Create wishlist
- `POST /api/wishlists/:id/items` - Add item

### Payments
- `POST /api/payments/create-intent` - Payment intent
- `POST /api/payments/confirm` - Confirm payment

---

**Document Version:** 1.0  
**Last Updated:** October 25, 2024  
**Maintained by:** Shoe E-commerce Team
