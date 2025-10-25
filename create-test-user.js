require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./src/models/User')

async function createOrUpdateUser() {
  try {
    // Use the test database URI
    const dbUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI
    await mongoose.connect(dbUri)
    console.log('✅ Connected to database:', dbUri.includes('@') ? dbUri.split('@')[1].split('/')[0] : 'localhost')

    const email = 'ayindematthew2003@gmail.com'
    const password = 'Matthew03'

    // Check if user exists
    let user = await User.findOne({ email })

    if (user) {
      console.log('\n📝 User already exists. Updating password...')
      user.password = password
      user.isActive = true
      user.emailVerified = true
      await user.save()
      console.log('✅ User updated successfully!')
    } else {
      console.log('\n📝 Creating new user...')
      user = new User({
        email,
        password,
        profile: {
          firstName: 'Matthew',
          lastName: 'Ayinde'
        },
        role: 'customer',
        isActive: true,
        emailVerified: true
      })
      await user.save()
      console.log('✅ User created successfully!')
    }

    // Verify the user
    const verifyUser = await User.findOne({ email }).select('+password')
    console.log('\n🔍 User verification:')
    console.log('- Email:', verifyUser.email)
    console.log('- Name:', verifyUser.profile.firstName, verifyUser.profile.lastName)
    console.log('- Role:', verifyUser.role)
    console.log('- Active:', verifyUser.isActive)
    console.log('- Email Verified:', verifyUser.emailVerified)
    console.log('- Has Password:', !!verifyUser.password)

    // Test password
    const isMatch = await verifyUser.comparePassword(password)
    console.log('- Password Test:', isMatch ? '✅ CORRECT' : '❌ INCORRECT')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await mongoose.connection.close()
    console.log('\n✅ Database connection closed')
  }
}

createOrUpdateUser()
