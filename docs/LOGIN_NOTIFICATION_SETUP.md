# Login Notification Setup Guide

## Overview
This guide explains how login notifications work in the codebase. When a user logs in, the system automatically sends notifications through three channels:
1. **Email** - Professional HTML email with login details
2. **Web Push** - Browser push notification
3. **Socket.IO** - Real-time in-app notification

## Architecture

### Components Created/Modified

#### 1. **Email Template** (`src/templates/emails/login-notification.hbs`)
- Professional HTML email template
- Shows login details (time, IP, location, device, browser)
- Security warnings and action buttons
- Responsive design

#### 2. **Login Helper** (`src/utils/loginHelper.js`)
- Extracts IP address from request
- Performs geo-location lookup using `geoip-lite`
- Parses user agent for device and browser info
- Returns structured login information

#### 3. **Email Service** (`src/services/emailService.js`)
- Added `sendLoginNotificationEmail()` function
- Uses Handlebars template or fallback HTML
- Non-blocking email sending

#### 4. **Notification Service** (`src/services/notificationService.js`)
- Added `LOGIN_NOTIFICATION` type
- Configured notification template with channels

#### 5. **Notification Model** (`src/models/Notification.js`)
- Added `login_notification` to enum types

#### 6. **Auth Routes** (`src/routes/auth.js`)
- Modified `/login` endpoint
- Extracts login info using helper
- Sends notifications asynchronously (non-blocking)
- Three notification channels triggered

## How It Works

### Login Flow

```
User Logs In
     ↓
Validate Credentials
     ↓
Extract Login Info (IP, Location, Device, Browser)
     ↓
Update Last Login & Generate Token
     ↓
Send Response to Client (Fast!)
     ↓
[Async] Send Notifications in Background:
   ├─→ Email Notification
   ├─→ Web Push Notification
   └─→ Socket.IO Real-time Notification
```

### Login Information Extracted

The system automatically collects:
- **IP Address**: User's IP (handles proxies and IPv6)
- **Location**: City and country from IP geolocation
- **Device**: OS and device type
- **Browser**: Browser name and version
- **Timestamp**: Exact login time

### Notification Channels

#### 1. Email Notification
```javascript
await sendLoginNotificationEmail(user.email, user.profile.firstName, loginInfo)
```
- Sends professional HTML email
- Includes security warnings
- Provides action buttons (View Account, Change Password)

#### 2. Web Push Notification
```javascript
await sendPushNotification(user._id, {
  title: '🔐 New Login Detected',
  body: `Login from ${loginInfo.location}`,
  data: { type: 'login_notification', loginInfo }
})
```
- Requires user to have push subscription
- Respects user preferences (`pushNotifications`)
- Browser notification with clickable action

#### 3. Socket.IO Real-time Notification
```javascript
io.to(`user_${user._id}`).emit('login_notification', {
  type: 'login_notification',
  title: '🔐 New Login Detected',
  message: `Login from ${loginInfo.location}`,
  loginInfo
})
```
- Instant notification if user is connected
- Appears in real-time in the app

## Setup Requirements

### 1. Environment Variables

Add to `.env` file:
```env
# Email Settings (Already configured)
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourstore.com

# Web Push (VAPID Keys)
VAPID_EMAIL=mailto:your-email@example.com
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# Client URL for email links
CLIENT_URL=http://localhost:3000

# JWT Secret (Already configured)
JWT_SECRET=your-jwt-secret
```

### 2. Generate VAPID Keys (for Web Push)

If you don't have VAPID keys yet:

```bash
# Install web-push globally (optional)
npm install -g web-push

# Generate VAPID keys
npx web-push generate-vapid-keys
```

This will output:
```
=======================================
Public Key: BK...
Private Key: 6Z...
=======================================
```

Add these to your `.env` file.

### 3. Frontend Setup (Client Side)

#### A. Request Push Permission

```javascript
// In your frontend app
async function requestPushPermission() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY' // From .env
      })
      
      // Send subscription to backend
      await fetch('/api/auth/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourToken}`
        },
        body: JSON.stringify(subscription)
      })
      
      console.log('Push notification enabled!')
    } catch (error) {
      console.error('Failed to enable push:', error)
    }
  }
}
```

#### B. Setup Socket.IO Client

```javascript
import io from 'socket.io-client'

// Connect to Socket.IO server
const socket = io('http://localhost:5000', {
  auth: {
    token: yourAuthToken // JWT token
  }
})

// Listen for login notifications
socket.on('login_notification', (data) => {
  console.log('New login detected:', data)
  
  // Show notification in your app
  showNotification({
    title: data.title,
    message: data.message,
    type: 'warning',
    action: () => {
      // Navigate to security settings
      window.location.href = '/account/security'
    }
  })
})

// Handle connection
socket.on('connect', () => {
  console.log('Connected to Socket.IO')
})
```

#### C. Service Worker (for Push Notifications)

Create `public/sw.js`:

```javascript
// Service Worker for Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    data: data.data,
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    )
  }
})
```

Register in your main app:

```javascript
// In your main app file
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('Service Worker registered'))
    .catch(err => console.error('SW registration failed:', err))
}
```

### 4. Add Push Subscription Route

You need to add a route to save push subscriptions:

```javascript
// In src/routes/auth.js (add this route)
router.post("/push-subscription", authenticate, async (req, res) => {
  try {
    const { endpoint, keys } = req.body
    
    const user = await User.findById(req.user._id)
    user.pushSubscription = { endpoint, keys }
    await user.save()
    
    res.json({
      status: "success",
      message: "Push subscription saved"
    })
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to save push subscription"
    })
  }
})
```

## Testing

### 1. Test Login Notification

```bash
# Test the login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Expected Behavior:**
- ✅ Login successful response
- ✅ Email sent to user's email
- ✅ Push notification sent (if subscribed)
- ✅ Socket event emitted (if connected)
- ✅ Console logs showing notification sending

### 2. Check Logs

Look for these console messages:
```
✅ Login email notification sent to test@example.com
✅ Web push notification sent to user 507f1f77bcf86cd799439011
✅ Socket notification sent to user 507f1f77bcf86cd799439011
```

### 3. Test Email

Check the user's email inbox for:
- Subject: "🔐 New Login Detected - Shoe Store"
- Professional HTML email with login details
- Action buttons for security

### 4. Test Socket.IO

Connect a Socket.IO client and listen for `login_notification` event:
```javascript
socket.on('login_notification', (data) => {
  console.log('Received:', data)
})
```

## Customization

### Change Notification Channels

In `src/routes/auth.js`, you can enable/disable channels:

```javascript
// Only send email (disable push and socket)
await sendLoginNotificationEmail(user.email, user.profile.firstName, loginInfo)

// Only send push notification
await sendPushNotification(user._id, {...})

// Only send socket notification
io.to(`user_${user._id}`).emit('login_notification', {...})
```

### Customize Email Template

Edit `src/templates/emails/login-notification.hbs`:
- Change colors and styling
- Add/remove sections
- Modify content

### User Preferences

Users can control notifications via their preferences:
```javascript
// In User model
preferences: {
  newsletter: Boolean,           // Controls email notifications
  pushNotifications: Boolean,    // Controls web push
  smsNotifications: Boolean      // Controls SMS (if implemented)
}
```

## Troubleshooting

### Email Not Sending
1. Check `.env` email configuration
2. Verify email credentials
3. Check console for error messages
4. Test with a simple email first

### Push Not Working
1. Verify VAPID keys are set
2. Check if user has push subscription
3. Verify user preferences allow push
4. Check browser console for errors

### Socket Not Working
1. Verify Socket.IO is initialized
2. Check if user is authenticated
3. Verify socket connection on client
4. Check room joining logic

## Security Considerations

1. **Rate Limiting**: Consider adding rate limiting to prevent spam
2. **Suspicious Activity**: Add logic to detect unusual login patterns
3. **User Control**: Allow users to disable login notifications
4. **Data Privacy**: Consider GDPR compliance for storing login history

## Performance

- All notifications are sent **asynchronously** using `setImmediate()`
- Login response is **not blocked** by notification sending
- Failed notifications **don't affect** login success
- Errors are **logged** but don't throw exceptions

## Next Steps

1. ✅ Setup email configuration
2. ✅ Generate VAPID keys
3. ✅ Test login endpoint
4. 🔄 Implement frontend Socket.IO client
5. 🔄 Setup service worker for push
6. 🔄 Create UI for managing notifications
7. 🔄 Add login history dashboard

## Support

For issues or questions, check:
- Email service logs
- Push service logs  
- Socket.IO connection logs
- User preferences in database

---

**Created**: December 25, 2025
**Last Updated**: December 25, 2025
