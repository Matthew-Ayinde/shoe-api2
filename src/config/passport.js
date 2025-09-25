const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy
const JwtStrategy = require("passport-jwt").Strategy
const ExtractJwt = require("passport-jwt").ExtractJwt
const bcrypt = require("bcryptjs")
const User = require("../models/User")

// Local Strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email }).select("+password")

        if (!user) {
          return done(null, false, { message: "Invalid email or password" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
          return done(null, false, { message: "Invalid email or password" })
        }

        return done(null, user)
      } catch (error) {
        return done(error)
      }
    },
  ),
)

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.id)

        if (user) {
          return done(null, user)
        }

        return done(null, false)
      } catch (error) {
        return done(error)
      }
    },
  ),
)

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id })

        if (user) {
          return done(null, user)
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value })

        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id
          await user.save()
          return done(null, user)
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          profile: {
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            avatar: profile.photos[0].value,
          },
          emailVerified: true,
          role: "customer",
        })

        await user.save()
        return done(null, user)
      } catch (error) {
        return done(error)
      }
    },
  ),
)

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id)
    done(null, user)
  } catch (error) {
    done(error)
  }
})

module.exports = passport
