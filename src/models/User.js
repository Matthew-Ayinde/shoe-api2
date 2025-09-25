const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const addressSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["home", "work", "other"],
    default: "home",
  },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: "US" },
  isDefault: { type: Boolean, default: false },
})

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      select: false,
      minlength: 6,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["customer", "staff", "admin"],
      default: "customer",
    },
    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: String,
      avatar: String,
      dateOfBirth: Date,
    },
    addresses: [addressSchema],
    preferences: {
      newsletter: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
    pushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  },
)

// Index for performance
userSchema.index({ email: 1 })
userSchema.index({ googleId: 1 })
userSchema.index({ role: 1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()

  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12)
  }
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Get full name
userSchema.virtual("fullName").get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`
})

// Transform output
userSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  delete user.emailVerificationToken
  delete user.passwordResetToken
  delete user.passwordResetExpires
  return user
}

module.exports = mongoose.models.User || mongoose.model("User", userSchema)
