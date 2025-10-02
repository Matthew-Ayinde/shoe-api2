/**
 * Enhanced Email Service
 *
 * Comprehensive email service with:
 * - Multiple transport providers (Gmail, SendGrid, AWS SES, SMTP)
 * - Professional HTML email templates
 * - Template engine with variable substitution
 * - Bulk email processing with rate limiting
 * - Email tracking and analytics
 * - Retry logic and error handling
 * - Email queue management
 * - Attachment support
 * - Email validation and sanitization
 */

const nodemailer = require("nodemailer")
const fs = require('fs').promises
const path = require('path')
const handlebars = require('handlebars')
const logger = require('../utils/logger')

class EmailService {
  constructor() {
    this.transporter = null
    this.templates = new Map()
    this.emailQueue = []
    this.isProcessingQueue = false
    this.rateLimitDelay = 100 // ms between emails
    this.maxRetries = 3

    this.initializeTransporter()
    this.loadTemplates()
    this.registerHelpers()
  }

  /**
   * Initialize email transporter based on configuration
   */
  initializeTransporter() {
    const emailProvider = process.env.EMAIL_PROVIDER || 'gmail'

    switch (emailProvider.toLowerCase()) {
      case 'sendgrid':
        this.transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          }
        })
        break

      case 'ses':
        this.transporter = nodemailer.createTransport({
          SES: {
            aws: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION || 'us-east-1'
            }
          }
        })
        break

      case 'smtp':
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        })
        break

      default: // Gmail
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        })
    }

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email transporter verification failed:', error)
      } else {
        logger.info('Email transporter is ready to send emails')
      }
    })
  }

  /**
   * Load email templates from files
   */
  async loadTemplates() {
    try {
      const templatesDir = path.join(__dirname, '../templates/emails')

      // Create templates directory if it doesn't exist
      try {
        await fs.access(templatesDir)
      } catch {
        await fs.mkdir(templatesDir, { recursive: true })
        logger.info('Created email templates directory')
        return
      }

      const templateFiles = await fs.readdir(templatesDir)

      for (const file of templateFiles) {
        if (file.endsWith('.hbs') || file.endsWith('.html')) {
          const templateName = path.basename(file, path.extname(file))
          const templatePath = path.join(templatesDir, file)
          const templateContent = await fs.readFile(templatePath, 'utf8')

          // Compile Handlebars template
          const compiledTemplate = handlebars.compile(templateContent)
          this.templates.set(templateName, compiledTemplate)

          logger.info(`Loaded email template: ${templateName}`)
        }
      }
    } catch (error) {
      logger.error('Error loading email templates:', error)
    }
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    // Format currency helper
    handlebars.registerHelper('currency', function(amount, currency = 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount)
    })

    // Format date helper
    handlebars.registerHelper('formatDate', function(date, format = 'long') {
      const options = {
        short: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        full: {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      }

      return new Date(date).toLocaleDateString('en-US', options[format] || options.long)
    })

    // Conditional helper
    handlebars.registerHelper('if_eq', function(a, b, options) {
      if (a === b) {
        return options.fn(this)
      }
      return options.inverse(this)
    })

    // Loop with index helper
    handlebars.registerHelper('each_with_index', function(array, options) {
      let result = ''
      for (let i = 0; i < array.length; i++) {
        result += options.fn({ ...array[i], index: i })
      }
      return result
    })
  }

  /**
   * Send email with comprehensive options
   */
  async sendEmail(options) {
    try {
      const {
        to,
        subject,
        template,
        data = {},
        attachments = [],
        priority = 'normal',
        trackOpens = false,
        trackClicks = false,
        tags = [],
        metadata = {}
      } = options

      // Validate required fields
      if (!to || !subject) {
        throw new Error('Email recipient and subject are required')
      }

      // Get email content
      let html, text

      if (template) {
        const compiledTemplate = this.getTemplate(template)
        if (!compiledTemplate) {
          throw new Error(`Email template '${template}' not found`)
        }

        // Render template with data
        html = compiledTemplate({
          ...data,
          baseUrl: process.env.CLIENT_URL || 'http://localhost:3000',
          companyName: process.env.COMPANY_NAME || 'Shoe Store',
          supportEmail: process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM,
          currentYear: new Date().getFullYear()
        })
      } else if (options.html) {
        html = options.html
      } else {
        throw new Error('Either template or html content is required')
      }

      // Generate text version if not provided
      if (!text && !options.text) {
        text = this.htmlToText(html)
      } else {
        text = options.text
      }

      // Build email options
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Shoe Store',
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER
        },
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html,
        text,
        attachments,
        priority,
        headers: {
          'X-Email-Template': template || 'custom',
          'X-Email-Tags': tags.join(','),
          ...metadata
        }
      }

      // Add tracking pixels if enabled
      if (trackOpens) {
        const trackingPixel = `<img src="${process.env.API_URL}/api/emails/track/open/${Date.now()}" width="1" height="1" style="display:none;" />`
        mailOptions.html += trackingPixel
      }

      // Send email
      const result = await this.transporter.sendMail(mailOptions)

      logger.info('Email sent successfully', {
        to: mailOptions.to,
        subject,
        template,
        messageId: result.messageId
      })

      return {
        success: true,
        messageId: result.messageId,
        response: result.response
      }

    } catch (error) {
      logger.error('Failed to send email:', error)
      throw error
    }
  }

  /**
   * Send bulk emails with rate limiting
   */
  async sendBulkEmails(emails) {
    const results = []

    for (const emailOptions of emails) {
      try {
        const result = await this.sendEmail(emailOptions)
        results.push({ ...result, email: emailOptions.to })

        // Rate limiting delay
        if (this.rateLimitDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay))
        }
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          email: emailOptions.to
        })
      }
    }

    return results
  }

  /**
   * Add email to queue for batch processing
   */
  queueEmail(emailOptions) {
    this.emailQueue.push({
      ...emailOptions,
      attempts: 0,
      queuedAt: new Date()
    })

    // Start processing queue if not already running
    if (!this.isProcessingQueue) {
      this.processQueue()
    }
  }

  /**
   * Process email queue
   */
  async processQueue() {
    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    while (this.emailQueue.length > 0) {
      const emailOptions = this.emailQueue.shift()

      try {
        await this.sendEmail(emailOptions)
        logger.info(`Queued email sent successfully to ${emailOptions.to}`)
      } catch (error) {
        emailOptions.attempts++

        if (emailOptions.attempts < this.maxRetries) {
          // Re-queue for retry
          this.emailQueue.push(emailOptions)
          logger.warn(`Email failed, retrying (${emailOptions.attempts}/${this.maxRetries}):`, error.message)
        } else {
          logger.error(`Email failed after ${this.maxRetries} attempts:`, error)
        }
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay))
    }

    this.isProcessingQueue = false
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Get template by name
   */
  getTemplate(templateName) {
    return this.templates.get(templateName)
  }

  /**
   * Validate email address
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

// Create singleton instance
const emailService = new EmailService()

// Legacy template functions for backward compatibility
// Email templates
const getWelcomeEmailTemplate = (firstName, verificationToken) => {
  const verificationUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/verify-email/${verificationToken}`

  return {
    subject: "Welcome to Our Shoe Store!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to Our Shoe Store!</h1>
        
        <p>Hi ${firstName},</p>
        
        <p>Thank you for joining our shoe store! We're excited to have you as part of our community.</p>
        
        <p>To complete your registration, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p>This verification link will expire in 24 hours.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account with us, please ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Shoe Store Team
        </p>
      </div>
    `,
  }
}

const getAdminWelcomeEmailTemplate = (firstName) => {
  
  return {
    subject: "Welcome to Our Shoe Store!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to Our Shoe Store!</h1>
        
        <p>Hi ${firstName},</p>
        
        <p>Thank you for joining our shoe store! We're excited to have you as part of our community.</p>
        <p>you have been registered as an admin.</p>
        
        
      
        
        <p>Please log in to explore our shoe store</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account with us, please ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Shoe Store Team
        </p>
      </div>
    `,
  }
}

const getStaffWelcomeEmailTemplate = (firstName) => {
  
  return {
    subject: "Welcome to Our Shoe Store!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to Our Shoe Store!</h1>
        
        <p>Hi ${firstName},</p>
        
        <p>Thank you for joining our shoe store! We're excited to have you as part of our community.</p>
        <p>you have been registered as a staff.</p>
        
      
        
        <p>Please log in to explore our shoe store</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account with us, please ignore this email.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Shoe Store Team
        </p>
      </div>
    `,
  }
}

const getPasswordResetEmailTemplate = (firstName, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`

  return {
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Password Reset Request</h1>
        
        <p>Hi ${firstName},</p>
        
        <p>We received a request to reset your password for your Shoe Store account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p><strong>This link will expire in 10 minutes for security reasons.</strong></p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Shoe Store Team
        </p>
      </div>
    `,
  }
}

const getOrderConfirmationTemplate = (order, user) => {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.productSnapshot.name} - ${item.variant.color} (Size ${item.variant.size})
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        $${item.totalPrice.toFixed(2)}
      </td>
    </tr>
  `,
    )
    .join("")

  return {
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Order Confirmation</h1>
        
        <p>Hi ${user.profile.firstName},</p>
        
        <p>Thank you for your order! We've received your order and are processing it now.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${order.createdAt.toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
        </div>
        
        <h3>Items Ordered</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <p><strong>Subtotal: $${order.subtotal.toFixed(2)}</strong></p>
          ${order.discountAmount > 0 ? `<p style="color: #28a745;">Discount: -$${order.discountAmount.toFixed(2)}</p>` : ""}
          <p>Shipping: $${order.shippingCost.toFixed(2)}</p>
          <p>Tax: $${order.tax.toFixed(2)}</p>
          <h3 style="color: #333;">Total: $${order.totalAmount.toFixed(2)}</h3>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Shipping Address</h3>
          <p>
            ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
          </p>
        </div>
        
        <p>We'll send you another email when your order ships with tracking information.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
          Questions about your order? Contact our customer service team.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Shoe Store Team
        </p>
      </div>
    `,
  }
}

const getFlashSaleEmailTemplate = (flashSaleData) => {
  const productsHtml = flashSaleData.products
    .map(
      (product) => `
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 10px 0; text-align: center;">
      <img src="${product.image}" alt="${product.name}" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px;">
      <h3 style="margin: 15px 0 10px 0; color: #333;">${product.name}</h3>
      <p style="color: #666; margin: 5px 0;">${product.brand}</p>
      <div style="margin: 15px 0;">
        <span style="text-decoration: line-through; color: #999; font-size: 18px;">$${product.originalPrice}</span>
        <span style="color: #e74c3c; font-size: 24px; font-weight: bold; margin-left: 10px;">$${product.salePrice}</span>
        <span style="background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 14px; margin-left: 10px;">
          ${product.discountPercentage}% OFF
        </span>
      </div>
    </div>
  `,
    )
    .join("")

  return {
    subject: `🔥 Flash Sale: ${flashSaleData.name} - Up to ${flashSaleData.maxDiscount}% Off!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 32px;">🔥 FLASH SALE</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 24px;">${flashSaleData.name}</h2>
        </div>
        
        <div style="padding: 30px; background-color: #f8f9fa;">
          <p style="font-size: 18px; text-align: center; margin-bottom: 30px;">
            ${flashSaleData.description}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #fff; border: 2px solid #e74c3c; border-radius: 8px; padding: 20px; display: inline-block;">
              <p style="margin: 0; font-size: 16px; color: #666;">Sale ends in:</p>
              <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #e74c3c;">
                ${new Date(flashSaleData.endTime).toLocaleString()}
              </p>
            </div>
          </div>
          
          <h3 style="text-align: center; color: #333; margin: 30px 0 20px 0;">Featured Products</h3>
          
          ${productsHtml}
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/flash-sales/${flashSaleData.id}" 
               style="background-color: #e74c3c; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold;">
              Shop Flash Sale Now
            </a>
          </div>
        </div>
        
        <div style="background-color: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; font-size: 14px;">
            Don't miss out on these amazing deals! Sale ends soon.
          </p>
        </div>
      </div>
    `,
  }
}

const getNewsletterEmailTemplate = (newsletterData) => {
  return {
    subject: newsletterData.subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #333; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Our Shoe Store Newsletter</h1>
        </div>
        
        <div style="padding: 30px; background-color: #fff;">
          <p>Hi {{firstName}},</p>
          
          ${newsletterData.content}
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 14px;">
            You're receiving this email because you subscribed to our newsletter.
            <a href="${process.env.CLIENT_URL || "http://localhost:3000"}/unsubscribe?email={{email}}">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  }
}

const getShippingNotificationTemplate = (order, user) => {
  return {
    subject: `Your Order ${order.orderNumber} Has Shipped!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Order Shipped!</h1>
        
        <p>Hi ${user.profile.firstName},</p>
        
        <p>Great news! Your order <strong>${order.orderNumber}</strong> has been shipped and is on its way to you.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Tracking Information</h3>
          ${
            order.tracking?.trackingNumber
              ? `
            <p><strong>Tracking Number:</strong> ${order.tracking.trackingNumber}</p>
            <p><strong>Carrier:</strong> ${order.tracking.carrier || "Standard Shipping"}</p>
            ${
              order.tracking.trackingUrl
                ? `<p><a href="${order.tracking.trackingUrl}" style="color: #007bff;">Track Your Package</a></p>`
                : ""
            }
          `
              : "<p>Tracking information will be available soon.</p>"
          }
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Shipping Address</h3>
          <p>
            ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
            ${order.shippingAddress.street}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
          </p>
        </div>
        
        <p>Your order should arrive within the estimated delivery time. If you have any questions, please don't hesitate to contact our customer service team.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="color: #666; font-size: 14px;">
          Best regards,<br>
          The Shoe Store Team
        </p>
      </div>
    `,
  }
}

// Send welcome email
const sendWelcomeEmail = async (email, firstName, verificationToken) => {
  try {
    const transporter = createTransporter()
    const template = getWelcomeEmailTemplate(firstName, verificationToken)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html,
    })

    console.log(`Welcome email sent to ${email}`)
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    throw error
  }
}

// Send admin welcome email
const sendAdminWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter()
    const template = getAdminWelcomeEmailTemplate(firstName)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html,
    })

    console.log(`Welcome email sent to ${email}`)
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    throw error
  }
}

// Send staff welcome email
const sendStaffWelcomeEmail = async (email, firstName) => {
  try {
    const transporter = createTransporter()
    const template = getStaffWelcomeEmailTemplate(firstName)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html,
    })

    console.log(`Welcome email sent to ${email}`)
  } catch (error) {
    console.error("Failed to send welcome email:", error)
    throw error
  }
}

// Send password reset email
const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  try {
    const transporter = createTransporter()
    const template = getPasswordResetEmailTemplate(firstName, resetToken)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: template.subject,
      html: template.html,
    })

    console.log(`Password reset email sent to ${email}`)
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    throw error
  }
}

// Send order confirmation email
const sendOrderConfirmationEmail = async (order, user) => {
  try {
    const transporter = createTransporter()
    const template = getOrderConfirmationTemplate(order, user)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: template.subject,
      html: template.html,
    })

    console.log(`Order confirmation email sent to ${user.email}`)
  } catch (error) {
    console.error("Failed to send order confirmation email:", error)
    throw error
  }
}

// Send bulk email
const sendBulkEmail = async (emailData) => {
  try {
    const transporter = createTransporter()
    const { subject, htmlContent, textContent, templateType, recipients } = emailData

    const promises = recipients.map(async (recipient) => {
      try {
        let finalHtmlContent = htmlContent
        let finalTextContent = textContent

        // Replace placeholders with recipient data
        if (finalHtmlContent) {
          finalHtmlContent = finalHtmlContent
            .replace(/{{firstName}}/g, recipient.firstName || "")
            .replace(/{{lastName}}/g, recipient.lastName || "")
            .replace(/{{email}}/g, recipient.email || "")
        }

        if (finalTextContent) {
          finalTextContent = finalTextContent
            .replace(/{{firstName}}/g, recipient.firstName || "")
            .replace(/{{lastName}}/g, recipient.lastName || "")
            .replace(/{{email}}/g, recipient.email || "")
        }

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: recipient.email,
          subject,
          html: finalHtmlContent,
          text: finalTextContent,
        })

        console.log(`Bulk email sent to ${recipient.email}`)
        return { email: recipient.email, success: true }
      } catch (error) {
        console.error(`Failed to send bulk email to ${recipient.email}:`, error)
        return { email: recipient.email, success: false, error: error.message }
      }
    })

    const results = await Promise.allSettled(promises)
    const successful = results.filter((result) => result.status === "fulfilled" && result.value.success).length
    const failed = results.length - successful

    return {
      success: true,
      totalSent: successful,
      totalFailed: failed,
      results: results.map((result) => (result.status === "fulfilled" ? result.value : result.reason)),
    }
  } catch (error) {
    console.error("Send bulk email error:", error)
    throw error
  }
}

// Send flash sale email notification
const sendFlashSaleEmail = async (recipients, flashSaleData) => {
  try {
    const template = getFlashSaleEmailTemplate(flashSaleData)

    const emailData = {
      subject: template.subject,
      htmlContent: template.html,
      templateType: "flash_sale",
      recipients,
    }

    return await sendBulkEmail(emailData)
  } catch (error) {
    console.error("Send flash sale email error:", error)
    throw error
  }
}

// Send newsletter email
const sendNewsletterEmail = async (recipients, newsletterData) => {
  try {
    const template = getNewsletterEmailTemplate(newsletterData)

    const emailData = {
      subject: template.subject,
      htmlContent: template.html,
      templateType: "newsletter",
      recipients,
    }

    return await sendBulkEmail(emailData)
  } catch (error) {
    console.error("Send newsletter email error:", error)
    throw error
  }
}

// Send shipping notification email
const sendShippingNotificationEmail = async (order, user) => {
  try {
    const transporter = createTransporter()
    const template = getShippingNotificationTemplate(order, user)

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject: template.subject,
      html: template.html,
    })

    console.log(`Shipping notification email sent to ${user.email}`)
  } catch (error) {
    console.error("Failed to send shipping notification email:", error)
    throw error
  }
}

// Enhanced email functions using the new service
const sendEmail = async (options) => {
  return await emailService.sendEmail(options)
}

const sendBulkEmail = async (emailData) => {
  const { recipients, subject, htmlContent, textContent } = emailData

  const emails = recipients.map(recipient => ({
    to: recipient.email,
    subject,
    html: htmlContent
      .replace(/{{firstName}}/g, recipient.firstName || '')
      .replace(/{{lastName}}/g, recipient.lastName || '')
      .replace(/{{email}}/g, recipient.email || ''),
    text: textContent
      ?.replace(/{{firstName}}/g, recipient.firstName || '')
      ?.replace(/{{lastName}}/g, recipient.lastName || '')
      ?.replace(/{{email}}/g, recipient.email || '')
  }))

  const results = await emailService.sendBulkEmails(emails)

  const successful = results.filter(r => r.success).length
  const failed = results.length - successful

  return {
    success: true,
    totalSent: successful,
    totalFailed: failed,
    results
  }
}

// Legacy wrapper functions for backward compatibility
const sendWelcomeEmail = async (email, firstName, verificationToken) => {
  return await emailService.sendEmail({
    to: email,
    template: 'welcome',
    data: {
      firstName,
      verificationToken,
      verificationUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/verify-email/${verificationToken}`
    }
  })
}

const sendAdminWelcomeEmail = async (email, firstName) => {
  return await emailService.sendEmail({
    to: email,
    template: 'admin-welcome',
    data: { firstName }
  })
}

const sendStaffWelcomeEmail = async (email, firstName) => {
  return await emailService.sendEmail({
    to: email,
    template: 'staff-welcome',
    data: { firstName }
  })
}

const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  return await emailService.sendEmail({
    to: email,
    template: 'password-reset',
    data: {
      firstName,
      resetToken,
      resetUrl: `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password/${resetToken}`
    }
  })
}

const sendOrderConfirmationEmail = async (order, user) => {
  return await emailService.sendEmail({
    to: user.email,
    template: 'order-confirmation',
    data: { order, user }
  })
}

const sendFlashSaleEmail = async (recipients, flashSaleData) => {
  const emails = recipients.map(recipient => ({
    to: recipient.email,
    template: 'flash-sale',
    data: {
      firstName: recipient.firstName,
      flashSale: flashSaleData
    }
  }))

  return await emailService.sendBulkEmails(emails)
}

const sendNewsletterEmail = async (recipients, newsletterData) => {
  const emails = recipients.map(recipient => ({
    to: recipient.email,
    template: 'newsletter',
    data: {
      firstName: recipient.firstName,
      newsletter: newsletterData
    }
  }))

  return await emailService.sendBulkEmails(emails)
}

const sendShippingNotificationEmail = async (order, user) => {
  return await emailService.sendEmail({
    to: user.email,
    template: 'shipping-notification',
    data: { order, user }
  })
}

module.exports = {
  // New enhanced service
  EmailService,
  emailService,
  sendEmail,

  // Legacy functions for backward compatibility
  sendWelcomeEmail,
  sendAdminWelcomeEmail,
  sendStaffWelcomeEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendBulkEmail,
  sendFlashSaleEmail,
  sendNewsletterEmail,
  sendShippingNotificationEmail,
}
