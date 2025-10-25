require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./src/models/User')

async function checkUser() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to database')

    // Find user
    const user = await User.findOne({ email: 'ayindematthew2003@gmail.com' }).select('+password')
    
    if (!user) {
      console.log('❌ User not found in database')
      return
    }

    console.log('\n✅ User found!')
    console.log('User details:')
    console.log('- Email:', user.email)
    console.log('- Name:', user.profile.firstName, user.profile.lastName)
    console.log('- Role:', user.role)
    console.log('- Active:', user.isActive)
    console.log('- Email Verified:', user.emailVerified)
    console.log('- Has Password:', !!user.password)
    console.log('- Password Hash:', user.password ? user.password.substring(0, 20) + '...' : 'N/A')

    // Test password
    if (user.password) {
      const isMatch = await user.comparePassword('Matthew03')
      console.log('- Password Match Test:', isMatch ? '✅ MATCH' : '❌ NO MATCH')
    }

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('\nDatabase connection closed')
  }
}

checkUser()
