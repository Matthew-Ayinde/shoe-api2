# Login Notifications - Quick Reference

## 🎯 What Was Implemented

When a user logs in, they automatically receive:
- ✉️ **Email notification** with login details
- 📱 **Web push notification** (browser notification)
- 🔴 **Real-time Socket.IO notification** (in-app)

## 📁 Files Modified/Created

### Created Files:
1. `src/templates/emails/login-notification.hbs` - Email template
2. `src/utils/loginHelper.js` - Extract login info (IP, location, device)
3. `docs/LOGIN_NOTIFICATION_SETUP.md` - Complete setup guide

### Modified Files:
1. `src/routes/auth.js` - Added notification logic to login endpoint
2. `src/services/emailService.js` - Added `sendLoginNotificationEmail()`
3. `src/services/notificationService.js` - Added `LOGIN_NOTIFICATION` type
4. `src/models/Notification.js` - Added `login_notification` to enum

## 🚀 Quick Start

### 1. Set Environment Variables
```env
# .env file
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=6Z...
CLIENT_URL=http://localhost:3000
```

### 2. Generate VAPID Keys (if needed)
```bash
npx web-push generate-vapid-keys
```

### 3. Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### 4. Check Console
Look for:
```
✅ Login email notification sent to test@example.com
✅ Web push notification sent to user 507f...
✅ Socket notification sent to user 507f...
```

## 📱 Frontend Integration

### Socket.IO Setup
```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:5000', {
  auth: { token: yourAuthToken }
})

socket.on('login_notification', (data) => {
  // Show notification in your UI
  showAlert({
    title: data.title,
    message: data.message,
    type: 'warning'
  })
})
```

### Enable Web Push
```javascript
// Request permission and save subscription
async function enablePush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
  })
  
  // Save to backend
  await fetch('/api/auth/push-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(subscription)
  })
}
```

## 🔧 API Endpoints Added

### Save Push Subscription
```http
POST /api/auth/push-subscription
Authorization: Bearer {token}
Content-Type: application/json

{
  "endpoint": "https://...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### Remove Push Subscription
```http
DELETE /api/auth/push-subscription
Authorization: Bearer {token}
```

## 📊 Login Info Captured

Every login captures:
- **IP Address**: User's IP (proxy-aware)
- **Location**: City, Country (from IP)
- **Device**: OS and device type
- **Browser**: Browser name and version
- **Timestamp**: Exact login time

## ⚙️ How It Works

```
User Login
    ↓
1. Validate credentials ✓
2. Extract login info (IP, location, device)
3. Update last login
4. Generate JWT token
5. Send response (FAST!)
    ↓
[Background - Non-blocking]
    ├─→ Send email notification
    ├─→ Send web push notification
    └─→ Send socket notification
```

**Key Feature**: Notifications are sent asynchronously, so login is **never delayed**!

## 🎨 Customization

### Disable Specific Channels
```javascript
// In src/routes/auth.js, comment out unwanted notifications:

// await sendLoginNotificationEmail(...)  // Disable email
// await sendPushNotification(...)        // Disable push
// io.to(...).emit(...)                   // Disable socket
```

### Change Email Template
Edit `src/templates/emails/login-notification.hbs`

### User Preferences
Users can control via `preferences` object:
```javascript
{
  newsletter: true,          // Email notifications
  pushNotifications: true,   // Web push
  smsNotifications: false    // SMS (future)
}
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Email not sending | Check `.env` email config, verify credentials |
| Push not working | Verify VAPID keys, check push subscription |
| Socket not working | Verify connection, check authentication |
| Missing dependencies | Run `npm install geoip-lite ua-parser-js` |

## 📚 Full Documentation

For complete setup guide, see: `docs/LOGIN_NOTIFICATION_SETUP.md`

## ✅ Testing Checklist

- [ ] Email configuration set in `.env`
- [ ] VAPID keys generated and added to `.env`
- [ ] Dependencies installed (`geoip-lite`, `ua-parser-js`)
- [ ] Login endpoint tested
- [ ] Email received in inbox
- [ ] Socket.IO client connected (frontend)
- [ ] Push subscription saved (frontend)
- [ ] Service worker registered (frontend)

---

**Need Help?** Check the full documentation or logs for detailed error messages.
