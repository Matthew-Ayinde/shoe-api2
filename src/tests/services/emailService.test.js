/**
 * Email Service Tests
 * 
 * Comprehensive tests for the enhanced email service including:
 * - Email service initialization and configuration
 * - Template loading and compilation
 * - Email sending with various options
 * - Bulk email processing
 * - Queue management
 * - Error handling and retry logic
 * - Template rendering with Handlebars
 * - Multiple transport providers
 */

const { EmailService, emailService, sendEmail } = require('../../services/emailService')
const fs = require('fs').promises
const path = require('path')

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      response: 'Email sent successfully'
    }),
    verify: jest.fn((callback) => callback(null, true))
  }))
}))

// Mock handlebars
jest.mock('handlebars', () => ({
  compile: jest.fn((template) => (data) => template.replace(/{{(\w+)}}/g, (match, key) => data[key] || match)),
  registerHelper: jest.fn()
}))

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}))

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn()
  }
}))

describe('EmailService', () => {
  let testEmailService
  let mockTransporter

  beforeAll(() => {
    // Set test environment variables
    process.env.EMAIL_PROVIDER = 'gmail'
    process.env.EMAIL_USER = 'test@example.com'
    process.env.EMAIL_PASS = 'testpassword'
    process.env.EMAIL_FROM = 'noreply@shoestore.com'
    process.env.EMAIL_FROM_NAME = 'Shoe Store'
    process.env.CLIENT_URL = 'http://localhost:3000'
    process.env.COMPANY_NAME = 'Test Shoe Store'
    process.env.SUPPORT_EMAIL = 'support@shoestore.com'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock nodemailer transporter
    const nodemailer = require('nodemailer')
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id-' + Date.now(),
        response: 'Email sent successfully'
      }),
      verify: jest.fn((callback) => callback(null, true))
    }
    nodemailer.createTransport.mockReturnValue(mockTransporter)
    
    // Create new email service instance for testing
    testEmailService = new EmailService()
  })

  describe('Initialization', () => {
    test('should initialize with Gmail provider by default', () => {
      const nodemailer = require('nodemailer')
      
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@example.com',
          pass: 'testpassword'
        }
      })
    })

    test('should initialize with SendGrid provider', () => {
      process.env.EMAIL_PROVIDER = 'sendgrid'
      process.env.SENDGRID_API_KEY = 'test-sendgrid-key'
      
      const testService = new EmailService()
      const nodemailer = require('nodemailer')
      
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: 'test-sendgrid-key'
        }
      })
      
      // Reset to gmail
      process.env.EMAIL_PROVIDER = 'gmail'
    })

    test('should initialize with SMTP provider', () => {
      process.env.EMAIL_PROVIDER = 'smtp'
      process.env.SMTP_HOST = 'smtp.example.com'
      process.env.SMTP_PORT = '587'
      process.env.SMTP_USER = 'smtp-user'
      process.env.SMTP_PASS = 'smtp-pass'
      
      const testService = new EmailService()
      const nodemailer = require('nodemailer')
      
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: '587',
        secure: false,
        auth: {
          user: 'smtp-user',
          pass: 'smtp-pass'
        }
      })
      
      // Reset to gmail
      process.env.EMAIL_PROVIDER = 'gmail'
    })

    test('should verify transporter configuration', () => {
      expect(mockTransporter.verify).toHaveBeenCalled()
    })
  })

  describe('Template Loading', () => {
    test('should load templates from directory', async () => {
      const fs = require('fs').promises
      
      // Mock directory exists
      fs.access.mockResolvedValue()
      
      // Mock template files
      fs.readdir.mockResolvedValue(['welcome.hbs', 'order-confirmation.hbs', 'password-reset.html'])
      
      // Mock template content
      fs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('welcome.hbs')) {
          return Promise.resolve('<h1>Welcome {{firstName}}!</h1>')
        }
        if (filePath.includes('order-confirmation.hbs')) {
          return Promise.resolve('<h1>Order {{orderNumber}} confirmed</h1>')
        }
        if (filePath.includes('password-reset.html')) {
          return Promise.resolve('<h1>Reset password for {{firstName}}</h1>')
        }
        return Promise.resolve('')
      })

      await testEmailService.loadTemplates()

      expect(fs.readdir).toHaveBeenCalled()
      expect(fs.readFile).toHaveBeenCalledTimes(3)
      expect(testEmailService.templates.size).toBe(3)
      expect(testEmailService.templates.has('welcome')).toBe(true)
      expect(testEmailService.templates.has('order-confirmation')).toBe(true)
      expect(testEmailService.templates.has('password-reset')).toBe(true)
    })

    test('should create templates directory if it does not exist', async () => {
      const fs = require('fs').promises
      
      // Mock directory does not exist
      fs.access.mockRejectedValue(new Error('Directory not found'))
      fs.mkdir.mockResolvedValue()

      await testEmailService.loadTemplates()

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('templates/emails'),
        { recursive: true }
      )
    })

    test('should handle template loading errors gracefully', async () => {
      const fs = require('fs').promises
      const logger = require('../../utils/logger')
      
      fs.access.mockRejectedValue(new Error('Permission denied'))

      await testEmailService.loadTemplates()

      expect(logger.error).toHaveBeenCalledWith('Error loading email templates:', expect.any(Error))
    })
  })

  describe('Email Sending', () => {
    test('should send email with template', async () => {
      // Mock template
      testEmailService.templates.set('test-template', (data) => `<h1>Hello ${data.firstName}!</h1>`)

      const result = await testEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'test-template',
        data: { firstName: 'John' }
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBeDefined()
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: {
          name: 'Shoe Store',
          address: 'noreply@shoestore.com'
        },
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Hello John!</h1>',
        text: 'Hello John!',
        attachments: [],
        priority: 'normal',
        headers: {
          'X-Email-Template': 'test-template',
          'X-Email-Tags': ''
        }
      })
    })

    test('should send email with HTML content', async () => {
      const result = await testEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test HTML Content</h1>'
      })

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<h1>Test HTML Content</h1>',
          text: 'Test HTML Content'
        })
      )
    })

    test('should send email to multiple recipients', async () => {
      const result = await testEmailService.sendEmail({
        to: ['test1@example.com', 'test2@example.com'],
        subject: 'Test Email',
        html: '<h1>Test Content</h1>'
      })

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test1@example.com, test2@example.com'
        })
      )
    })

    test('should include attachments', async () => {
      const attachments = [
        {
          filename: 'test.pdf',
          path: '/path/to/test.pdf'
        }
      ]

      const result = await testEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>',
        attachments
      })

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments
        })
      )
    })

    test('should handle email sending errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'))

      await expect(testEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<h1>Test Content</h1>'
      })).rejects.toThrow('SMTP Error')
    })

    test('should validate required fields', async () => {
      await expect(testEmailService.sendEmail({
        subject: 'Test Email'
      })).rejects.toThrow('Email recipient and subject are required')

      await expect(testEmailService.sendEmail({
        to: 'test@example.com'
      })).rejects.toThrow('Email recipient and subject are required')
    })

    test('should throw error for missing template', async () => {
      await expect(testEmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'non-existent-template'
      })).rejects.toThrow("Email template 'non-existent-template' not found")
    })
  })

  describe('Bulk Email Processing', () => {
    test('should send bulk emails with rate limiting', async () => {
      testEmailService.rateLimitDelay = 10 // Reduce delay for testing

      const emails = [
        {
          to: 'test1@example.com',
          subject: 'Test Email 1',
          html: '<h1>Test 1</h1>'
        },
        {
          to: 'test2@example.com',
          subject: 'Test Email 2',
          html: '<h1>Test 2</h1>'
        }
      ]

      const results = await testEmailService.sendBulkEmails(emails)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2)
    })

    test('should handle bulk email errors gracefully', async () => {
      mockTransporter.sendMail
        .mockResolvedValueOnce({ messageId: 'success-1' })
        .mockRejectedValueOnce(new Error('SMTP Error'))

      const emails = [
        {
          to: 'test1@example.com',
          subject: 'Test Email 1',
          html: '<h1>Test 1</h1>'
        },
        {
          to: 'test2@example.com',
          subject: 'Test Email 2',
          html: '<h1>Test 2</h1>'
        }
      ]

      const results = await testEmailService.sendBulkEmails(emails)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('SMTP Error')
    })
  })

  describe('Email Queue Management', () => {
    test('should queue emails for processing', () => {
      const emailOptions = {
        to: 'test@example.com',
        subject: 'Queued Email',
        html: '<h1>Queued Content</h1>'
      }

      testEmailService.queueEmail(emailOptions)

      expect(testEmailService.emailQueue).toHaveLength(1)
      expect(testEmailService.emailQueue[0]).toMatchObject({
        ...emailOptions,
        attempts: 0,
        queuedAt: expect.any(Date)
      })
    })

    test('should process email queue', async () => {
      testEmailService.rateLimitDelay = 10 // Reduce delay for testing

      // Queue multiple emails
      testEmailService.queueEmail({
        to: 'test1@example.com',
        subject: 'Queued Email 1',
        html: '<h1>Queued 1</h1>'
      })

      testEmailService.queueEmail({
        to: 'test2@example.com',
        subject: 'Queued Email 2',
        html: '<h1>Queued 2</h1>'
      })

      await testEmailService.processQueue()

      expect(testEmailService.emailQueue).toHaveLength(0)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2)
    })

    test('should retry failed emails in queue', async () => {
      testEmailService.maxRetries = 2
      testEmailService.rateLimitDelay = 10

      // Mock first call to fail, second to succeed
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'retry-success' })

      testEmailService.queueEmail({
        to: 'test@example.com',
        subject: 'Retry Email',
        html: '<h1>Retry Content</h1>'
      })

      await testEmailService.processQueue()

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2)
      expect(testEmailService.emailQueue).toHaveLength(0)
    })
  })

  describe('Utility Functions', () => {
    test('should convert HTML to text', () => {
      const html = '<h1>Hello World</h1><p>This is a <strong>test</strong> email.</p>'
      const text = testEmailService.htmlToText(html)

      expect(text).toBe('Hello World This is a test email.')
    })

    test('should validate email addresses', () => {
      expect(testEmailService.validateEmail('test@example.com')).toBe(true)
      expect(testEmailService.validateEmail('invalid-email')).toBe(false)
      expect(testEmailService.validateEmail('test@')).toBe(false)
      expect(testEmailService.validateEmail('@example.com')).toBe(false)
    })

    test('should get template by name', () => {
      const mockTemplate = jest.fn()
      testEmailService.templates.set('test-template', mockTemplate)

      const template = testEmailService.getTemplate('test-template')
      expect(template).toBe(mockTemplate)

      const nonExistent = testEmailService.getTemplate('non-existent')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Legacy Functions', () => {
    test('should maintain backward compatibility with sendEmail function', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        subject: 'Legacy Test',
        html: '<h1>Legacy Content</h1>'
      })

      expect(result.success).toBe(true)
      expect(mockTransporter.sendMail).toHaveBeenCalled()
    })
  })

  describe('Handlebars Helpers', () => {
    test('should register currency helper', () => {
      const handlebars = require('handlebars')
      
      expect(handlebars.registerHelper).toHaveBeenCalledWith('currency', expect.any(Function))
    })

    test('should register date formatting helper', () => {
      const handlebars = require('handlebars')
      
      expect(handlebars.registerHelper).toHaveBeenCalledWith('formatDate', expect.any(Function))
    })

    test('should register conditional helpers', () => {
      const handlebars = require('handlebars')
      
      expect(handlebars.registerHelper).toHaveBeenCalledWith('if_eq', expect.any(Function))
      expect(handlebars.registerHelper).toHaveBeenCalledWith('each_with_index', expect.any(Function))
    })
  })
})
