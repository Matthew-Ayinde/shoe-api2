/**
 * Login Information Helper
 * Extracts and formats login details from request
 */

const geoip = require('geoip-lite')
const parser = require('ua-parser-js')

/**
 * Extract login information from request
 * @param {Object} req - Express request object
 * @returns {Object} Login information
 */
const getLoginInfo = (req) => {
  try {
    // Get IP address
    const ipAddress = req.ip || 
                     req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.headers['x-real-ip'] || 
                     req.connection?.remoteAddress || 
                     'Unknown'

    // Clean IPv6 localhost
    const cleanIp = ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1' ? '127.0.0.1' : ipAddress

    // Get location from IP
    let location = 'Unknown Location'
    if (cleanIp !== '127.0.0.1' && cleanIp !== 'Unknown') {
      const geo = geoip.lookup(cleanIp)
      if (geo) {
        location = `${geo.city || 'Unknown City'}, ${geo.country || 'Unknown Country'}`
      }
    } else {
      location = 'Local/Development'
    }

    // Parse user agent
    const ua = parser(req.headers['user-agent'])
    
    const device = ua.device.type 
      ? `${ua.device.vendor || ''} ${ua.device.model || ''} (${ua.device.type})`
      : `${ua.os.name || 'Unknown OS'} ${ua.os.version || ''}`

    const browser = ua.browser.name 
      ? `${ua.browser.name} ${ua.browser.version || ''}`
      : 'Unknown Browser'

    return {
      ipAddress: cleanIp,
      location,
      device: device.trim() || 'Unknown Device',
      browser: browser.trim(),
      timestamp: new Date(),
      userAgent: req.headers['user-agent'] || 'Unknown'
    }
  } catch (error) {
    console.error('Error extracting login info:', error)
    return {
      ipAddress: 'Unknown',
      location: 'Unknown',
      device: 'Unknown',
      browser: 'Unknown',
      timestamp: new Date(),
      userAgent: req.headers['user-agent'] || 'Unknown'
    }
  }
}

module.exports = {
  getLoginInfo
}
