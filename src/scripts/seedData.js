const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const User = require("../models/User")
const Product = require("../models/Product")
const Coupon = require("../models/Coupon")
require("dotenv").config()

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log("MongoDB connected for seeding")
  } catch (error) {
    console.error("Database connection error:", error)
    process.exit(1)
  }
}

const seedUsers = async () => {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 12)
    const admin = new User({
      email: "matthewayinde713@gmail.com",
      password: adminPassword,
      role: "admin",
      profile: {
        firstName: "Admin",
        lastName: "User",
      },
      emailVerified: true,
      isActive: true,
    })

    // Create staff user
    const staffPassword = await bcrypt.hash("staff123", 12)
    const staff = new User({
      email: "staff@shoestore.com",
      password: staffPassword,
      role: "staff",
      profile: {
        firstName: "Staff",
        lastName: "Member",
      },
      emailVerified: true,
      isActive: true,
    })

    // Create customer user
    const customerPassword = await bcrypt.hash("customer123", 12)
    const customer = new User({
      email: "customer@example.com",
      password: customerPassword,
      role: "customer",
      profile: {
        firstName: "John",
        lastName: "Doe",
        phone: "+1234567890",
      },
      addresses: [
        {
          type: "shipping",
          firstName: "John",
          lastName: "Doe",
          street: "123 Main St",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "USA",
          isDefault: true,
        },
      ],
      emailVerified: true,
      isActive: true,
    })

    await User.deleteMany({})
    await User.insertMany([admin])
    // await User.insertMany([admin, staff, customer])
    console.log("Users seeded successfully")
  } catch (error) {
    console.error("Error seeding users:", error)
  }
}

const seedProducts = async () => {
  try {
    const products = [
      {
        name: "Nike Air Max 270",
        description:
          "The Nike Air Max 270 delivers visible cushioning under every step. The design draws inspiration from the Air Max 93 and Air Max 180, featuring Nike's largest heel Air unit yet for a super-soft ride that feels as impossible as it looks.",
        brand: "Nike",
        category: "Running",
        variants: [
          { size: "8", color: "Black", sku: "NAM270-BK-8", price: 150.0, stock: 25 },
          { size: "8.5", color: "Black", sku: "NAM270-BK-8.5", price: 150.0, stock: 20 },
          { size: "9", color: "Black", sku: "NAM270-BK-9", price: 150.0, stock: 30 },
          { size: "9.5", color: "Black", sku: "NAM270-BK-9.5", price: 150.0, stock: 15 },
          { size: "10", color: "Black", sku: "NAM270-BK-10", price: 150.0, stock: 22 },
          { size: "8", color: "White", sku: "NAM270-WH-8", price: 150.0, stock: 18 },
          { size: "8.5", color: "White", sku: "NAM270-WH-8.5", price: 150.0, stock: 25 },
          { size: "9", color: "White", sku: "NAM270-WH-9", price: 150.0, stock: 20 },
          { size: "9.5", color: "White", sku: "NAM270-WH-9.5", price: 150.0, stock: 12 },
          { size: "10", color: "White", sku: "NAM270-WH-10", price: 150.0, stock: 28 },
        ],
        images: ["/car.jpeg", "/car.jpeg"],
        tags: ["running", "casual", "air max", "cushioning"],
        isActive: true,
        seo: {
          title: "Nike Air Max 270 - Premium Running Shoes",
          description:
            "Experience ultimate comfort with Nike Air Max 270 featuring the largest heel Air unit for superior cushioning.",
          keywords: ["nike", "air max", "running shoes", "athletic footwear"],
        },
      },
      {
        name: "Adidas Ultraboost 22",
        description:
          "The Adidas Ultraboost 22 features responsive BOOST midsole cushioning and a Primeknit upper for a comfortable, adaptive fit. Perfect for running and everyday wear.",
        brand: "Adidas",
        category: "Running",
        variants: [
          { size: "8", color: "Core Black", sku: "AUB22-CB-8", price: 180.0, stock: 20 },
          { size: "8.5", color: "Core Black", sku: "AUB22-CB-8.5", price: 180.0, stock: 15 },
          { size: "9", color: "Core Black", sku: "AUB22-CB-9", price: 180.0, stock: 25 },
          { size: "9.5", color: "Core Black", sku: "AUB22-CB-9.5", price: 180.0, stock: 18 },
          { size: "10", color: "Core Black", sku: "AUB22-CB-10", price: 180.0, stock: 22 },
          { size: "8", color: "Cloud White", sku: "AUB22-CW-8", price: 180.0, stock: 16 },
          { size: "8.5", color: "Cloud White", sku: "AUB22-CW-8.5", price: 180.0, stock: 20 },
          { size: "9", color: "Cloud White", sku: "AUB22-CW-9", price: 180.0, stock: 14 },
          { size: "9.5", color: "Cloud White", sku: "AUB22-CW-9.5", price: 180.0, stock: 19 },
          { size: "10", color: "Cloud White", sku: "AUB22-CW-10", price: 180.0, stock: 23 },
        ],
        images: ["/car.jpeg", "/car.jpeg"],
        tags: ["running", "boost", "primeknit", "performance"],
        isActive: true,
        seo: {
          title: "Adidas Ultraboost 22 - Performance Running Shoes",
          description:
            "Experience energy return with every step in the Adidas Ultraboost 22 featuring BOOST technology.",
          keywords: ["adidas", "ultraboost", "running", "boost technology"],
        },
      },
      {
        name: "Jordan 1 Retro High",
        description:
          "The Air Jordan 1 Retro High brings back the classic basketball shoe that started it all. With premium leather and iconic colorways, it's a timeless addition to any collection.",
        brand: "Jordan",
        category: "Basketball",
        variants: [
          { size: "8", color: "Bred", sku: "AJ1RH-BR-8", price: 170.0, stock: 12 },
          { size: "8.5", color: "Bred", sku: "AJ1RH-BR-8.5", price: 170.0, stock: 8 },
          { size: "9", color: "Bred", sku: "AJ1RH-BR-9", price: 170.0, stock: 15 },
          { size: "9.5", color: "Bred", sku: "AJ1RH-BR-9.5", price: 170.0, stock: 10 },
          { size: "10", color: "Bred", sku: "AJ1RH-BR-10", price: 170.0, stock: 18 },
          { size: "8", color: "Royal", sku: "AJ1RH-RY-8", price: 170.0, stock: 14 },
          { size: "8.5", color: "Royal", sku: "AJ1RH-RY-8.5", price: 170.0, stock: 11 },
          { size: "9", color: "Royal", sku: "AJ1RH-RY-9", price: 170.0, stock: 16 },
          { size: "9.5", color: "Royal", sku: "AJ1RH-RY-9.5", price: 170.0, stock: 9 },
          { size: "10", color: "Royal", sku: "AJ1RH-RY-10", price: 170.0, stock: 20 },
        ],
        images: ["/car.jpeg", "/car.jpeg"],
        tags: ["basketball", "retro", "classic", "jordan"],
        isActive: true,
        seo: {
          title: "Air Jordan 1 Retro High - Classic Basketball Shoes",
          description:
            "Own a piece of basketball history with the iconic Air Jordan 1 Retro High in classic colorways.",
          keywords: ["jordan", "basketball", "retro", "classic sneakers"],
        },
      },
      {
        name: "Converse Chuck Taylor All Star",
        description:
          "The original basketball shoe that became a cultural icon. The Chuck Taylor All Star features a timeless silhouette with canvas upper and rubber toe cap.",
        brand: "Converse",
        category: "Casual",
        variants: [
          { size: "8", color: "Black", sku: "CTAS-BK-8", price: 55.0, stock: 35 },
          { size: "8.5", color: "Black", sku: "CTAS-BK-8.5", price: 55.0, stock: 40 },
          { size: "9", color: "Black", sku: "CTAS-BK-9", price: 55.0, stock: 45 },
          { size: "9.5", color: "Black", sku: "CTAS-BK-9.5", price: 55.0, stock: 30 },
          { size: "10", color: "Black", sku: "CTAS-BK-10", price: 55.0, stock: 38 },
          { size: "8", color: "White", sku: "CTAS-WH-8", price: 55.0, stock: 32 },
          { size: "8.5", color: "White", sku: "CTAS-WH-8.5", price: 55.0, stock: 28 },
          { size: "9", color: "White", sku: "CTAS-WH-9", price: 55.0, stock: 42 },
          { size: "9.5", color: "White", sku: "CTAS-WH-9.5", price: 55.0, stock: 25 },
          { size: "10", color: "White", sku: "CTAS-WH-10", price: 55.0, stock: 36 },
        ],
        images: ["/car.jpeg", "/car.jpeg"],
        tags: ["casual", "classic", "canvas", "lifestyle"],
        isActive: true,
        seo: {
          title: "Converse Chuck Taylor All Star - Classic Canvas Shoes",
          description: "The timeless Converse Chuck Taylor All Star - a cultural icon and wardrobe essential.",
          keywords: ["converse", "chuck taylor", "canvas shoes", "classic sneakers"],
        },
      },
      {
        name: "Vans Old Skool",
        description:
          "The Vans Old Skool is the original skate shoe and still the most popular. Built with a durable suede and canvas upper, it features the iconic side stripe and waffle outsole.",
        brand: "Vans",
        category: "Skate",
        variants: [
          { size: "8", color: "Black/White", sku: "VOS-BW-8", price: 65.0, stock: 28 },
          { size: "8.5", color: "Black/White", sku: "VOS-BW-8.5", price: 65.0, stock: 32 },
          { size: "9", color: "Black/White", sku: "VOS-BW-9", price: 65.0, stock: 25 },
          { size: "9.5", color: "Black/White", sku: "VOS-BW-9.5", price: 65.0, stock: 30 },
          { size: "10", color: "Black/White", sku: "VOS-BW-10", price: 65.0, stock: 22 },
          { size: "8", color: "Navy", sku: "VOS-NV-8", price: 65.0, stock: 20 },
          { size: "8.5", color: "Navy", sku: "VOS-NV-8.5", price: 65.0, stock: 24 },
          { size: "9", color: "Navy", sku: "VOS-NV-9", price: 65.0, stock: 18 },
          { size: "9.5", color: "Navy", sku: "VOS-NV-9.5", price: 65.0, stock: 26 },
          { size: "10", color: "Navy", sku: "VOS-NV-10", price: 65.0, stock: 21 },
        ],
        images: ["/car.jpeg", "/car.jpeg"],
        tags: ["skate", "classic", "suede", "waffle sole"],
        isActive: true,
        seo: {
          title: "Vans Old Skool - Classic Skate Shoes",
          description:
            "The original skate shoe with iconic side stripe and durable construction for skating and style.",
          keywords: ["vans", "old skool", "skate shoes", "street style"],
        },
      },
    ]

    await Product.deleteMany({})
    await Product.insertMany(products)
    console.log("Products seeded successfully")
  } catch (error) {
    console.error("Error seeding products:", error)
  }
}

const seedCoupons = async () => {
  try {
    const coupons = [
      {
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        description: "Welcome discount for new customers",
        minOrderAmount: 50,
        maxDiscount: 25,
        usageLimit: 1000,
        usedCount: 0,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        isActive: true,
      },
      {
        code: "SAVE20",
        type: "percentage",
        value: 20,
        description: "20% off on orders over $100",
        minOrderAmount: 100,
        maxDiscount: 50,
        usageLimit: 500,
        usedCount: 0,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        isActive: true,
      },
      {
        code: "FREESHIP",
        type: "percentage",
        value: 100,
        description: "Free shipping on orders over $75",
        minOrderAmount: 75,
        maxDiscount: 15,
        usageLimit: 2000,
        usedCount: 0,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        isActive: true,
        applicableProducts: [], // Empty means all products
      },
    ]

    await Coupon.deleteMany({})
    await Coupon.insertMany(coupons)
    console.log("Coupons seeded successfully")
  } catch (error) {
    console.error("Error seeding coupons:", error)
  }
}

const seedDatabase = async () => {
  await connectDB()

  console.log("Starting database seeding...")
  await seedUsers()
  // await seedProducts()
  // await seedCoupons()
  console.log("Database seeding completed!")

  mongoose.connection.close()
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
}

module.exports = { seedDatabase }
