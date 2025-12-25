#!/usr/bin/env node

/**
 * VAPID Key Generator
 * 
 * This script generates VAPID keys for web push notifications.
 * Run: node generate-vapid-keys.js
 */

const webpush = require('web-push')

console.log('\n🔐 Generating VAPID Keys for Web Push Notifications...\n')

try {
  const vapidKeys = webpush.generateVAPIDKeys()

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('✅ VAPID Keys Generated Successfully!')
  console.log('═══════════════════════════════════════════════════════════════\n')

  console.log('📋 Copy these keys to your .env file:\n')
  
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)
  console.log('VAPID_EMAIL=mailto:your-email@example.com')

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('\n📝 Example .env configuration:\n')
  console.log('# Web Push Notifications')
  console.log('VAPID_EMAIL=mailto:' + (process.env.EMAIL_USER || 'your-email@example.com'))
  console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
  console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('\n✅ Next Steps:')
  console.log('   1. Add the keys above to your .env file')
  console.log('   2. Restart your server: npm run dev')
  console.log('   3. Test push notifications!')
  console.log('\n═══════════════════════════════════════════════════════════════\n')

} catch (error) {
  console.error('❌ Error generating VAPID keys:', error.message)
  process.exit(1)
}
