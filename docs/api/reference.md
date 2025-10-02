# API Reference

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Products](#products)
4. [Cart](#cart)
5. [Orders](#orders)
6. [Reviews](#reviews)
7. [Wishlists](#wishlists)
8. [Payments](#payments)
9. [Notifications](#notifications)
10. [Analytics](#analytics)
11. [Admin](#admin)

## Authentication

### Register User
Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789012345",
      "email": "user@example.com",
      "profile": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890"
      },
      "role": "customer",
      "emailVerified": false,
      "createdAt": "2023-07-01T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login User
Authenticate user and receive access token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64a1b2c3d4e5f6789012345",
      "email": "user@example.com",
      "profile": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "role": "customer"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Google OAuth
Authenticate using Google OAuth.

**Endpoint:** `GET /api/auth/google`

Redirects to Google OAuth consent screen.

**Callback:** `GET /api/auth/google/callback`

Returns JWT token on successful authentication.

### Forgot Password
Request password reset email.

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset email sent"
}
```

### Reset Password
Reset password using token from email.

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "newSecurePassword123"
}
```

## Products

### Get Products
Retrieve products with filtering and pagination.

**Endpoint:** `GET /api/products`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `brand` (string): Filter by brand
- `gender` (string): Filter by gender (men, women, unisex, kids)
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `size` (string): Filter by size
- `color` (string): Filter by color
- `search` (string): Search in name and description
- `sortBy` (string): Sort field (name, price, createdAt, rating)
- `sortOrder` (string): Sort order (asc, desc)
- `featured` (boolean): Filter featured products

**Example Request:**
```bash
GET /api/products?category=running&gender=men&minPrice=50&maxPrice=200&page=1&limit=10
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "products": [
      {
        "_id": "64a1b2c3d4e5f6789012345",
        "name": "Nike Air Max 270",
        "brand": "Nike",
        "description": "Comfortable running shoes with air cushioning",
        "category": "running",
        "gender": "men",
        "variants": [
          {
            "size": "9",
            "color": "black",
            "sku": "NIKE-AM270-BLK-9",
            "price": 129.99,
            "stock": 15,
            "isActive": true
          }
        ],
        "images": [
          {
            "url": "https://cloudinary.com/image1.jpg",
            "alt": "Nike Air Max 270 - Black"
          }
        ],
        "ratings": {
          "average": 4.5,
          "count": 128
        },
        "priceRange": {
          "min": 129.99,
          "max": 149.99
        },
        "totalStock": 45,
        "isActive": true,
        "isFeatured": true,
        "createdAt": "2023-07-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 156,
      "pages": 16
    }
  }
}
```

### Get Product by ID
Retrieve a specific product by ID.

**Endpoint:** `GET /api/products/:id`

**Response:**
```json
{
  "status": "success",
  "data": {
    "product": {
      "_id": "64a1b2c3d4e5f6789012345",
      "name": "Nike Air Max 270",
      "brand": "Nike",
      "description": "Comfortable running shoes with air cushioning technology...",
      "category": "running",
      "gender": "men",
      "variants": [
        {
          "size": "8",
          "color": "black",
          "sku": "NIKE-AM270-BLK-8",
          "price": 129.99,
          "stock": 12,
          "lowStockThreshold": 5,
          "isActive": true
        },
        {
          "size": "9",
          "color": "black",
          "sku": "NIKE-AM270-BLK-9",
          "price": 129.99,
          "stock": 15,
          "lowStockThreshold": 5,
          "isActive": true
        }
      ],
      "images": [
        {
          "public_id": "shoes/nike-am270-black",
          "url": "https://res.cloudinary.com/demo/image/upload/shoes/nike-am270-black.jpg",
          "alt": "Nike Air Max 270 - Black"
        }
      ],
      "materials": ["synthetic", "rubber", "mesh"],
      "tags": ["running", "comfortable", "air-cushioning"],
      "ratings": {
        "average": 4.5,
        "count": 128,
        "distribution": {
          "1": 2,
          "2": 5,
          "3": 15,
          "4": 48,
          "5": 58
        }
      },
      "seo": {
        "metaTitle": "Nike Air Max 270 - Comfortable Running Shoes",
        "metaDescription": "Shop Nike Air Max 270 running shoes with air cushioning...",
        "keywords": ["nike", "air max", "running shoes", "comfortable"]
      },
      "priceRange": {
        "min": 129.99,
        "max": 149.99
      },
      "totalStock": 45,
      "isActive": true,
      "isFeatured": true,
      "createdAt": "2023-07-01T10:00:00.000Z",
      "updatedAt": "2023-07-15T14:30:00.000Z"
    }
  }
}
```

### Create Product (Admin/Staff)
Create a new product.

**Endpoint:** `POST /api/products`
**Authentication:** Required (Admin/Staff)

**Request Body:**
```json
{
  "name": "Adidas Ultraboost 22",
  "brand": "Adidas",
  "description": "Premium running shoes with boost technology",
  "category": "running",
  "gender": "unisex",
  "variants": [
    {
      "size": "8",
      "color": "white",
      "sku": "ADIDAS-UB22-WHT-8",
      "price": 179.99,
      "stock": 20,
      "lowStockThreshold": 5
    }
  ],
  "materials": ["primeknit", "boost", "rubber"],
  "tags": ["running", "premium", "boost-technology"],
  "isFeatured": false
}
```

## Cart

### Get Cart
Retrieve user's shopping cart.

**Endpoint:** `GET /api/cart`
**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "data": {
    "cart": {
      "_id": "64a1b2c3d4e5f6789012345",
      "user": "64a1b2c3d4e5f6789012346",
      "items": [
        {
          "product": {
            "_id": "64a1b2c3d4e5f6789012347",
            "name": "Nike Air Max 270",
            "brand": "Nike",
            "images": [
              {
                "url": "https://cloudinary.com/image1.jpg",
                "alt": "Nike Air Max 270"
              }
            ]
          },
          "variant": {
            "size": "9",
            "color": "black",
            "sku": "NIKE-AM270-BLK-9",
            "price": 129.99
          },
          "quantity": 2,
          "totalPrice": 259.98,
          "addedAt": "2023-07-01T10:00:00.000Z"
        }
      ],
      "totalAmount": 259.98,
      "totalItems": 2,
      "updatedAt": "2023-07-01T10:00:00.000Z"
    }
  }
}
```

### Add to Cart
Add item to shopping cart.

**Endpoint:** `POST /api/cart/add`
**Authentication:** Required

**Request Body:**
```json
{
  "productId": "64a1b2c3d4e5f6789012347",
  "variant": {
    "size": "9",
    "color": "black",
    "sku": "NIKE-AM270-BLK-9"
  },
  "quantity": 1
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Item added to cart",
  "data": {
    "cart": {
      // Updated cart object
    }
  }
}
```

### Update Cart Item
Update quantity of item in cart.

**Endpoint:** `PUT /api/cart/update`
**Authentication:** Required

**Request Body:**
```json
{
  "productId": "64a1b2c3d4e5f6789012347",
  "variant": {
    "size": "9",
    "color": "black"
  },
  "quantity": 3
}
```

### Remove from Cart
Remove item from cart.

**Endpoint:** `DELETE /api/cart/remove`
**Authentication:** Required

**Request Body:**
```json
{
  "productId": "64a1b2c3d4e5f6789012347",
  "variant": {
    "size": "9",
    "color": "black"
  }
}
```

### Clear Cart
Remove all items from cart.

**Endpoint:** `DELETE /api/cart/clear`
**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "message": "Cart cleared successfully"
}
```

## Orders

### Create Order
Create a new order from cart items.

**Endpoint:** `POST /api/orders`
**Authentication:** Required

**Request Body:**
```json
{
  "items": [
    {
      "product": "64a1b2c3d4e5f6789012347",
      "variant": {
        "size": "9",
        "color": "black",
        "sku": "NIKE-AM270-BLK-9"
      },
      "quantity": 2,
      "price": 129.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "shippingMethod": "standard",
  "paymentMethod": "stripe",
  "couponCode": "SUMMER20",
  "customerNotes": "Please handle with care"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Order created successfully",
  "data": {
    "order": {
      "_id": "64a1b2c3d4e5f6789012348",
      "orderNumber": "ORD-2023-001234",
      "user": "64a1b2c3d4e5f6789012346",
      "items": [
        {
          "product": {
            "_id": "64a1b2c3d4e5f6789012347",
            "name": "Nike Air Max 270",
            "brand": "Nike"
          },
          "variant": {
            "size": "9",
            "color": "black",
            "sku": "NIKE-AM270-BLK-9"
          },
          "quantity": 2,
          "price": 129.99,
          "totalPrice": 259.98
        }
      ],
      "pricing": {
        "subtotal": 259.98,
        "tax": 20.80,
        "shipping": 9.99,
        "discount": 51.99,
        "total": 238.78
      },
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "US"
      },
      "status": "pending",
      "payment": {
        "method": "stripe",
        "status": "pending"
      },
      "createdAt": "2023-07-01T10:00:00.000Z"
    }
  }
}
```

### Get Orders
Retrieve user's orders with pagination.

**Endpoint:** `GET /api/orders`
**Authentication:** Required

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by order status
- `sortBy` (string): Sort field
- `sortOrder` (string): Sort order

**Response:**
```json
{
  "status": "success",
  "data": {
    "orders": [
      {
        "_id": "64a1b2c3d4e5f6789012348",
        "orderNumber": "ORD-2023-001234",
        "status": "shipped",
        "totalAmount": 238.78,
        "itemCount": 2,
        "createdAt": "2023-07-01T10:00:00.000Z",
        "estimatedDelivery": "2023-07-05T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Get Order by ID
Retrieve specific order details.

**Endpoint:** `GET /api/orders/:id`
**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "data": {
    "order": {
      "_id": "64a1b2c3d4e5f6789012348",
      "orderNumber": "ORD-2023-001234",
      "user": {
        "_id": "64a1b2c3d4e5f6789012346",
        "profile": {
          "firstName": "John",
          "lastName": "Doe"
        }
      },
      "items": [
        // Detailed item information
      ],
      "pricing": {
        "subtotal": 259.98,
        "tax": 20.80,
        "shipping": 9.99,
        "discount": 51.99,
        "total": 238.78
      },
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "US"
      },
      "status": "shipped",
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2023-07-01T10:00:00.000Z"
        },
        {
          "status": "confirmed",
          "timestamp": "2023-07-01T11:00:00.000Z"
        },
        {
          "status": "processing",
          "timestamp": "2023-07-02T09:00:00.000Z"
        },
        {
          "status": "shipped",
          "timestamp": "2023-07-03T14:00:00.000Z"
        }
      ],
      "tracking": {
        "carrier": "UPS",
        "trackingNumber": "1Z999AA1234567890",
        "trackingUrl": "https://www.ups.com/track?tracknum=1Z999AA1234567890"
      },
      "payment": {
        "method": "stripe",
        "status": "completed",
        "transactionId": "pi_1234567890abcdef"
      },
      "createdAt": "2023-07-01T10:00:00.000Z",
      "updatedAt": "2023-07-03T14:00:00.000Z"
    }
  }
}
```

## Reviews

### Get Product Reviews
Retrieve reviews for a specific product.

**Endpoint:** `GET /api/reviews/product/:productId`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `rating` (number): Filter by rating (1-5)
- `verified` (boolean): Filter by verified purchases
- `sortBy` (string): Sort field (createdAt, rating, helpful)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "status": "success",
  "data": {
    "reviews": [
      {
        "_id": "64a1b2c3d4e5f6789012349",
        "user": {
          "profile": {
            "firstName": "Jane",
            "lastName": "Smith"
          }
        },
        "rating": 5,
        "title": "Excellent shoes!",
        "content": "These shoes are amazing. Very comfortable and stylish.",
        "variant": {
          "size": "8",
          "color": "black"
        },
        "detailedRatings": {
          "comfort": 5,
          "quality": 5,
          "sizing": 4,
          "style": 5,
          "value": 4
        },
        "pros": ["Very comfortable", "Great style", "Good quality"],
        "cons": ["A bit expensive"],
        "wouldRecommend": true,
        "isVerifiedPurchase": true,
        "helpfulVotes": [
          {
            "user": "64a1b2c3d4e5f678901234a",
            "helpful": true
          }
        ],
        "helpfulCount": 8,
        "notHelpfulCount": 1,
        "images": [
          {
            "url": "https://cloudinary.com/review-image.jpg",
            "alt": "User review image"
          }
        ],
        "moderationStatus": "approved",
        "createdAt": "2023-07-01T10:00:00.000Z"
      }
    ],
    "stats": {
      "averageRating": 4.5,
      "totalReviews": 128,
      "distribution": {
        "1": 2,
        "2": 5,
        "3": 15,
        "4": 48,
        "5": 58
      }
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 128,
      "pages": 13
    }
  }
}
```

### Create Review
Create a new product review.

**Endpoint:** `POST /api/reviews`
**Authentication:** Required

**Request Body:**
```json
{
  "product": "64a1b2c3d4e5f6789012347",
  "order": "64a1b2c3d4e5f6789012348",
  "rating": 5,
  "title": "Amazing shoes!",
  "content": "These shoes exceeded my expectations. Great quality and comfort.",
  "variant": {
    "size": "9",
    "color": "black",
    "sku": "NIKE-AM270-BLK-9"
  },
  "detailedRatings": {
    "comfort": 5,
    "quality": 5,
    "sizing": 4,
    "style": 5,
    "value": 4
  },
  "pros": ["Very comfortable", "Great style"],
  "cons": ["Slightly expensive"],
  "wouldRecommend": true
}
```

### Add Helpful Vote
Vote on review helpfulness.

**Endpoint:** `POST /api/reviews/:id/helpful`
**Authentication:** Required

**Request Body:**
```json
{
  "helpful": true
}
```

### Flag Review
Report inappropriate review.

**Endpoint:** `POST /api/reviews/:id/flag`
**Authentication:** Required

**Request Body:**
```json
{
  "reason": "inappropriate",
  "details": "This review contains inappropriate content"
}
```

## Wishlists

### Get User Wishlists
Retrieve user's wishlists.

**Endpoint:** `GET /api/wishlists`
**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "data": {
    "wishlists": [
      {
        "_id": "64a1b2c3d4e5f678901234b",
        "name": "My Favorites",
        "description": "My favorite running shoes",
        "category": "general",
        "isPublic": false,
        "totalItems": 3,
        "totalValue": 389.97,
        "items": [
          {
            "product": {
              "_id": "64a1b2c3d4e5f6789012347",
              "name": "Nike Air Max 270",
              "brand": "Nike",
              "images": [
                {
                  "url": "https://cloudinary.com/image1.jpg"
                }
              ],
              "priceRange": {
                "min": 129.99,
                "max": 149.99
              }
            },
            "preferredVariant": {
              "size": "9",
              "color": "black"
            },
            "priceWhenAdded": 129.99,
            "priority": 5,
            "notes": "Need these for running",
            "addedAt": "2023-07-01T10:00:00.000Z"
          }
        ],
        "createdAt": "2023-07-01T10:00:00.000Z",
        "lastActivityAt": "2023-07-01T10:00:00.000Z"
      }
    ]
  }
}
```

### Create Wishlist
Create a new wishlist.

**Endpoint:** `POST /api/wishlists`
**Authentication:** Required

**Request Body:**
```json
{
  "name": "Birthday Wishlist",
  "description": "Shoes I want for my birthday",
  "category": "birthday",
  "isPublic": true,
  "eventDate": "2023-12-25T00:00:00.000Z"
}
```

### Add Item to Wishlist
Add product to wishlist.

**Endpoint:** `POST /api/wishlists/:id/items`
**Authentication:** Required

**Request Body:**
```json
{
  "productId": "64a1b2c3d4e5f6789012347",
  "preferredVariant": {
    "size": "9",
    "color": "black"
  },
  "priority": 4,
  "notes": "Perfect for running",
  "notifications": {
    "priceDropAlert": true,
    "stockAlert": true,
    "targetPrice": 100.00
  }
}
```

### Share Wishlist
Share wishlist with others.

**Endpoint:** `POST /api/wishlists/:id/share`
**Authentication:** Required

**Request Body:**
```json
{
  "email": "friend@example.com",
  "canEdit": false
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Wishlist shared successfully",
  "data": {
    "shareToken": "abc123def456ghi789",
    "shareUrl": "https://yourstore.com/wishlists/shared/abc123def456ghi789"
  }
}
```

## Payments

### Create Payment Intent
Create Stripe payment intent for order.

**Endpoint:** `POST /api/payments/create-intent`
**Authentication:** Required

**Request Body:**
```json
{
  "orderId": "64a1b2c3d4e5f6789012348",
  "paymentMethod": "stripe"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "clientSecret": "pi_1234567890abcdef_secret_xyz",
    "paymentIntentId": "pi_1234567890abcdef"
  }
}
```

### Confirm Payment
Confirm payment completion.

**Endpoint:** `POST /api/payments/confirm`
**Authentication:** Required

**Request Body:**
```json
{
  "paymentIntentId": "pi_1234567890abcdef",
  "orderId": "64a1b2c3d4e5f6789012348"
}
```

### Stripe Webhook
Handle Stripe webhook events.

**Endpoint:** `POST /api/payments/webhook`
**Authentication:** Stripe signature verification

This endpoint handles various Stripe events:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`

## Analytics

### Get Sales Analytics
Retrieve sales analytics data.

**Endpoint:** `GET /api/analytics/sales`
**Authentication:** Required (Admin/Staff)

**Query Parameters:**
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `groupBy` (string): Group by period (day, week, month)

**Response:**
```json
{
  "status": "success",
  "data": {
    "period": {
      "startDate": "2023-07-01T00:00:00.000Z",
      "endDate": "2023-07-31T23:59:59.999Z",
      "groupBy": "day"
    },
    "totals": {
      "orders": 156,
      "revenue": 12450.75,
      "discount": 1245.08,
      "items": 312,
      "customers": 89,
      "averageOrderValue": 79.81
    },
    "timeline": [
      {
        "_id": "2023-07-01",
        "totalOrders": 8,
        "totalRevenue": 642.50,
        "totalDiscount": 64.25,
        "averageOrderValue": 80.31,
        "totalItems": 16,
        "uniqueCustomerCount": 7
      }
    ],
    "generatedAt": "2023-08-01T10:00:00.000Z"
  }
}
```

### Get Dashboard Data
Retrieve real-time dashboard metrics.

**Endpoint:** `GET /api/analytics/dashboard`
**Authentication:** Required (Admin/Staff)

**Response:**
```json
{
  "status": "success",
  "data": {
    "today": {
      "orders": 12,
      "revenue": 956.75,
      "pendingOrders": 3,
      "orderGrowth": 15.2,
      "revenueGrowth": 8.7
    },
    "recentOrders": [
      {
        "_id": "64a1b2c3d4e5f6789012348",
        "orderNumber": "ORD-2023-001234",
        "user": {
          "profile": {
            "firstName": "John",
            "lastName": "Doe"
          },
          "email": "john@example.com"
        },
        "totalAmount": 238.78,
        "status": "pending",
        "createdAt": "2023-07-01T10:00:00.000Z"
      }
    ],
    "generatedAt": "2023-07-01T15:30:00.000Z"
  }
}
```

## Error Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

### Custom Error Codes
- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Account not verified
- `PROD_001` - Product not found
- `PROD_002` - Insufficient stock
- `ORD_001` - Order not found
- `ORD_002` - Order cannot be modified
- `PAY_001` - Payment failed
- `PAY_002` - Invalid payment method

## Rate Limiting

### Limits by Endpoint Type
- **Authentication**: 5 requests per 15 minutes
- **General API**: 100 requests per 15 minutes
- **File Upload**: 10 requests per hour
- **Admin Operations**: 200 requests per 15 minutes

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1625097600
```

## Webhooks

### Stripe Webhooks
Configure webhook endpoint in Stripe dashboard:
- **URL**: `https://yourapi.com/api/payments/webhook`
- **Events**: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Custom Webhooks
For integrating with external systems:
- **Order Events**: Order status changes
- **Inventory Events**: Stock level changes
- **User Events**: Registration, profile updates
```
