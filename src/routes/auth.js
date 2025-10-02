const express = require("express")
const passport = require("passport")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const { authenticate } = require("../middleware/auth")
const { validateRegister, validateLogin } = require("../middleware/validation")
const { sendWelcomeEmail, sendPasswordResetEmail, sendAdminWelcomeEmail, sendStaffWelcomeEmail } = require("../services/emailService")

const router = express.Router()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  })
}

router.post("/register-admin", validateRegister, async (req, res) => {
  try {
    const { email, password, firstName, lastName, adminSecret } = req.body

    // Optional: require an admin creation secret for security
    if (process.env.ADMIN_CREATION_SECRET) {
      if (!adminSecret || adminSecret !== process.env.ADMIN_CREATION_SECRET) {
        return res.status(403).json({
          status: "error",
          message: "Invalid or missing admin creation secret",
        })
      }
    }

    // Basic required fields check (validateRegister should already cover this)
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists with this email",
      })
    }

    // Create user (admin) - password will be hashed by the pre-save middleware
    const user = new User({
      email,
      password,
      profile: {
        firstName,
        lastName,
      },
      role: "admin",
      isActive: true,
      emailVerified: true, // usually admins are auto-verified
    })

    await user.save()

    // Send welcome email (non-blocking if it fails)
    try {
      await sendAdminWelcomeEmail(user.email, user.profile.firstName)
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      status: "success",
      message: "Admin user registered successfully.",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      status: "error",
      message: "Registration failed",
    })
  }
})


router.post("/register-staff", validateRegister, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body

    
    // Basic required fields check (validateRegister should already cover this)
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists with this email",
      })
    }

    // Create user (staff) - password will be hashed by the pre-save middleware
    const user = new User({
      email,
      password,
      profile: {
        firstName,
        lastName,
      },
      role: "staff",
      isActive: true,
      emailVerified: true, // 
    })

    await user.save()

    // Send welcome email (non-blocking if it fails)
    try {
      await sendStaffWelcomeEmail(user.email, user.profile.firstName)
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      status: "success",
      message: "Staff user registered successfully.",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      status: "error",
      message: "Registration failed",
    })
  }
})

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        status: "error",
        message: "User already exists with this email",
      })
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex")

    // Create user
    const user = new User({
      email,
      password,
      profile: {
        firstName,
        lastName,
      },
      emailVerificationToken,
      role: "customer",
    })

    await user.save()

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.profile.firstName, emailVerificationToken)
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
    }

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      status: "success",
      message: "User registered successfully. Please check your email to verify your account.",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      status: "error",
      message: "Registration failed",
    })
  }
})

router.all("/register", (req, res, next) => {
  const error = new Error(`Method ${req.method} not allowed on ${req.originalUrl}`)
  error.statusCode = 405
  next(error)
})


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password")

    if (!user || !user.password) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      })
    }

    // Check password
    const isMatch = await user.comparePassword(password)

    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Account is deactivated. Please contact support.",
      })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      status: "success",
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      status: "error",
      message: "Login failed",
    })
  }
})

// @desc    Google OAuth
// @route   GET /api/auth/google
// @access  Public
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
)

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
router.get("/google/callback", passport.authenticate("google", { session: false }), async (req, res) => {
  try {
    // Update last login
    req.user.lastLogin = new Date()
    await req.user.save()

    // Generate token
    const token = generateToken(req.user._id)

    // Redirect to frontend with token
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000"
    res.redirect(`${clientUrl}/auth/callback?token=${token}`)
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000"
    res.redirect(`${clientUrl}/auth/error`)
  }
})

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params

    const user = await User.findOne({ emailVerificationToken: token })

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired verification token",
      })
    }

    user.emailVerified = true
    user.emailVerificationToken = undefined
    await user.save()

    res.json({
      status: "success",
      message: "Email verified successfully",
    })
  } catch (error) {
    console.error("Email verification error:", error)
    res.status(500).json({
      status: "error",
      message: "Email verification failed",
    })
  }
})

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "No user found with this email address",
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    user.passwordResetToken = resetToken
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000 // 10 minutes

    await user.save()

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.profile.firstName, resetToken)
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError)
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined
      await user.save()

      return res.status(500).json({
        status: "error",
        message: "Failed to send password reset email",
      })
    }

    res.json({
      status: "success",
      message: "Password reset email sent",
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to process password reset request",
    })
  }
})

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long",
      })
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    })

    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired reset token",
      })
    }

    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    await user.save()

    res.json({
      status: "success",
      message: "Password reset successfully",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    res.status(500).json({
      status: "error",
      message: "Password reset failed",
    })
  }
})

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("addresses")

    res.json({
      status: "success",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role,
          addresses: user.addresses,
          preferences: user.preferences,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    })
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to get user information",
    })
  }
})

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth } = req.body

    const user = await User.findById(req.user._id)

    if (firstName) user.profile.firstName = firstName
    if (lastName) user.profile.lastName = lastName
    if (phone) user.profile.phone = phone
    if (dateOfBirth) user.profile.dateOfBirth = dateOfBirth

    await user.save()

    res.json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          role: user.role,
        },
      },
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update profile",
    })
  }
})

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Current password and new password are required",
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "New password must be at least 6 characters long",
      })
    }

    const user = await User.findById(req.user._id).select("+password")

    if (!user.password) {
      return res.status(400).json({
        status: "error",
        message: "Cannot change password for social login accounts",
      })
    }

    const isMatch = await user.comparePassword(currentPassword)

    if (!isMatch) {
      return res.status(400).json({
        status: "error",
        message: "Current password is incorrect",
      })
    }

    user.password = newPassword
    await user.save()

    res.json({
      status: "success",
      message: "Password changed successfully",
    })
  } catch (error) {
    console.error("Change password error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to change password",
    })
  }
})

// @desc    Add address
// @route   POST /api/auth/addresses
// @access  Private
router.post("/addresses", authenticate, async (req, res) => {
  try {
    const { type, street, city, state, zipCode, country, isDefault } = req.body

    if (!street || !city || !state || !zipCode) {
      return res.status(400).json({
        status: "error",
        message: "Street, city, state, and zip code are required",
      })
    }

    const user = await User.findById(req.user._id)

    // If this is set as default, unset other default addresses
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false
      })
    }

    user.addresses.push({
      type: type || "home",
      street,
      city,
      state,
      zipCode,
      country: country || "US",
      isDefault: isDefault || user.addresses.length === 0, // First address is default
    })

    await user.save()

    res.status(201).json({
      status: "success",
      message: "Address added successfully",
      data: {
        addresses: user.addresses,
      },
    })
  } catch (error) {
    console.error("Add address error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to add address",
    })
  }
})

// @desc    Update address
// @route   PUT /api/auth/addresses/:addressId
// @access  Private
router.put("/addresses/:addressId", authenticate, async (req, res) => {
  try {
    const { addressId } = req.params
    const { type, street, city, state, zipCode, country, isDefault } = req.body

    const user = await User.findById(req.user._id)
    const address = user.addresses.id(addressId)

    if (!address) {
      return res.status(404).json({
        status: "error",
        message: "Address not found",
      })
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false
      })
    }

    if (type) address.type = type
    if (street) address.street = street
    if (city) address.city = city
    if (state) address.state = state
    if (zipCode) address.zipCode = zipCode
    if (country) address.country = country
    if (isDefault !== undefined) address.isDefault = isDefault

    await user.save()

    res.json({
      status: "success",
      message: "Address updated successfully",
      data: {
        addresses: user.addresses,
      },
    })
  } catch (error) {
    console.error("Update address error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update address",
    })
  }
})

// @desc    Delete address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
router.delete("/addresses/:addressId", authenticate, async (req, res) => {
  try {
    const { addressId } = req.params

    const user = await User.findById(req.user._id)
    const address = user.addresses.id(addressId)

    if (!address) {
      return res.status(404).json({
        status: "error",
        message: "Address not found",
      })
    }

    const wasDefault = address.isDefault
    user.addresses.pull(addressId)

    // If deleted address was default, make first remaining address default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true
    }

    await user.save()

    res.json({
      status: "success",
      message: "Address deleted successfully",
      data: {
        addresses: user.addresses,
      },
    })
  } catch (error) {
    console.error("Delete address error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to delete address",
    })
  }
})

// @desc    Update preferences
// @route   PUT /api/auth/preferences
// @access  Private
router.put("/preferences", authenticate, async (req, res) => {
  try {
    const { newsletter, pushNotifications, smsNotifications } = req.body

    const user = await User.findById(req.user._id)

    if (newsletter !== undefined) user.preferences.newsletter = newsletter
    if (pushNotifications !== undefined) user.preferences.pushNotifications = pushNotifications
    if (smsNotifications !== undefined) user.preferences.smsNotifications = smsNotifications

    await user.save()

    res.json({
      status: "success",
      message: "Preferences updated successfully",
      data: {
        preferences: user.preferences,
      },
    })
  } catch (error) {
    console.error("Update preferences error:", error)
    res.status(500).json({
      status: "error",
      message: "Failed to update preferences",
    })
  }
})

// @desc    Logout (client-side token invalidation)
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", authenticate, (req, res) => {
  res.json({
    status: "success",
    message: "Logged out successfully",
  })
})

module.exports = router
