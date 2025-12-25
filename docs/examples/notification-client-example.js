/**
 * Frontend Client Example for Login Notifications
 * 
 * This file shows how to integrate login notifications in your frontend app.
 * You can adapt this code for React, Vue, Angular, or vanilla JavaScript.
 */

// ============================================================================
// 1. SOCKET.IO SETUP
// ============================================================================

import io from 'socket.io-client'

class NotificationClient {
  constructor(apiUrl, authToken) {
    this.apiUrl = apiUrl
    this.authToken = authToken
    this.socket = null
    this.initialized = false
  }

  /**
   * Initialize Socket.IO connection
   */
  initializeSocket() {
    if (this.initialized) return

    this.socket = io(this.apiUrl, {
      auth: {
        token: this.authToken
      },
      transports: ['websocket', 'polling']
    })

    this.socket.on('connect', () => {
      console.log('✅ Connected to notification service')
    })

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from notification service')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    // Listen for login notifications
    this.socket.on('login_notification', (data) => {
      this.handleLoginNotification(data)
    })

    this.initialized = true
  }

  /**
   * Handle incoming login notification
   */
  handleLoginNotification(data) {
    console.log('🔐 New login detected:', data)

    // Show notification in your UI
    this.showNotificationUI({
      title: data.title,
      message: data.message,
      type: 'warning',
      icon: '🔐',
      duration: 10000, // 10 seconds
      actions: [
        {
          label: 'View Details',
          onClick: () => {
            // Navigate to security page
            window.location.href = '/account/security'
          }
        },
        {
          label: 'Dismiss',
          onClick: () => {
            // Just close the notification
          }
        }
      ],
      data: data.loginInfo
    })

    // Optionally, update security dashboard
    this.updateSecurityDashboard(data.loginInfo)
  }

  /**
   * Show notification in UI (implement based on your UI library)
   */
  showNotificationUI(notification) {
    // Example with a custom notification component
    // Adapt this to your UI library (React, Vue, etc.)
    
    // For React with react-toastify:
    // toast.warning(notification.message, {
    //   position: 'top-right',
    //   autoClose: notification.duration,
    //   onClick: notification.actions[0]?.onClick
    // })

    // For vanilla JS, you could create a DOM element:
    const notifEl = document.createElement('div')
    notifEl.className = 'notification notification-warning'
    notifEl.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">${notification.icon}</span>
        <h4>${notification.title}</h4>
      </div>
      <p>${notification.message}</p>
      <div class="notification-actions">
        ${notification.actions.map((action, i) => 
          `<button class="btn-action" data-action="${i}">${action.label}</button>`
        ).join('')}
      </div>
    `
    
    // Add event listeners
    notification.actions.forEach((action, i) => {
      notifEl.querySelector(`[data-action="${i}"]`)?.addEventListener('click', () => {
        action.onClick()
        notifEl.remove()
      })
    })

    document.body.appendChild(notifEl)
    
    // Auto-remove after duration
    setTimeout(() => notifEl.remove(), notification.duration)
  }

  /**
   * Update security dashboard with new login
   */
  updateSecurityDashboard(loginInfo) {
    // Add login to recent activity list
    const activityList = document.getElementById('recent-logins')
    if (activityList) {
      const loginItem = document.createElement('div')
      loginItem.className = 'login-item new'
      loginItem.innerHTML = `
        <div class="login-details">
          <span class="login-time">${new Date(loginInfo.timestamp).toLocaleString()}</span>
          <span class="login-location">${loginInfo.location}</span>
          <span class="login-device">${loginInfo.device}</span>
        </div>
      `
      activityList.prepend(loginItem)
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.initialized = false
    }
  }
}

// ============================================================================
// 2. WEB PUSH SETUP
// ============================================================================

class PushNotificationService {
  constructor(apiUrl, vapidPublicKey) {
    this.apiUrl = apiUrl
    this.vapidPublicKey = vapidPublicKey
  }

  /**
   * Check if push notifications are supported
   */
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window
  }

  /**
   * Request push notification permission
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported in this browser')
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(authToken) {
    try {
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      })

      // Send subscription to backend
      const response = await fetch(`${this.apiUrl}/api/auth/push-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(subscription)
      })

      if (!response.ok) {
        throw new Error('Failed to save push subscription')
      }

      console.log('✅ Push notifications enabled')
      return true
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(authToken) {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Remove subscription from backend
      await fetch(`${this.apiUrl}/api/auth/push-subscription`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      console.log('✅ Push notifications disabled')
      return true
    } catch (error) {
      console.error('Failed to unsubscribe from push:', error)
      throw error
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// ============================================================================
// 3. USAGE EXAMPLE
// ============================================================================

// Initialize after user logs in
async function initializeNotifications(authToken) {
  const API_URL = 'http://localhost:5000'
  const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY' // From your .env

  // 1. Initialize Socket.IO for real-time notifications
  const notificationClient = new NotificationClient(API_URL, authToken)
  notificationClient.initializeSocket()

  // 2. Request push notification permission
  const pushService = new PushNotificationService(API_URL, VAPID_PUBLIC_KEY)
  
  if (pushService.isSupported()) {
    try {
      const granted = await pushService.requestPermission()
      
      if (granted) {
        await pushService.subscribe(authToken)
        console.log('✅ All notification channels enabled')
      } else {
        console.log('⚠️ Push permission denied, using Socket.IO only')
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error)
    }
  }

  // Return cleanup function
  return () => {
    notificationClient.disconnect()
  }
}

// ============================================================================
// 4. REACT INTEGRATION EXAMPLE
// ============================================================================

// Example React Hook
function useLoginNotifications(authToken) {
  const [notifications, setNotifications] = React.useState([])

  React.useEffect(() => {
    if (!authToken) return

    let cleanup

    initializeNotifications(authToken).then(cleanupFn => {
      cleanup = cleanupFn
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [authToken])

  return notifications
}

// Example React Component
function NotificationProvider({ children, authToken }) {
  const [client, setClient] = React.useState(null)

  React.useEffect(() => {
    if (!authToken) return

    const notificationClient = new NotificationClient('http://localhost:5000', authToken)
    notificationClient.initializeSocket()
    setClient(notificationClient)

    return () => {
      notificationClient.disconnect()
    }
  }, [authToken])

  return (
    <NotificationContext.Provider value={client}>
      {children}
    </NotificationContext.Provider>
  )
}

// ============================================================================
// 5. VUE.JS INTEGRATION EXAMPLE
// ============================================================================

// Vue 3 Composition API
import { ref, onMounted, onUnmounted } from 'vue'

export function useNotifications(authToken) {
  const client = ref(null)
  const notifications = ref([])

  onMounted(() => {
    if (!authToken.value) return

    client.value = new NotificationClient('http://localhost:5000', authToken.value)
    client.value.initializeSocket()
  })

  onUnmounted(() => {
    if (client.value) {
      client.value.disconnect()
    }
  })

  return {
    notifications
  }
}

// ============================================================================
// 6. SERVICE WORKER (sw.js)
// ============================================================================

/*
// Create this file as public/sw.js

self.addEventListener('push', (event) => {
  const data = event.data.json()
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    data: data.data,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Details', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard')
    )
  }
})
*/

// ============================================================================
// EXPORT
// ============================================================================

export { 
  NotificationClient, 
  PushNotificationService, 
  initializeNotifications 
}
