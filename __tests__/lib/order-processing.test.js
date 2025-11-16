/**
 * Unit tests for order processing utilities
 * Tests the order-processing.js module functions
 */

import {
  processSuccessfulOrder,
  processFailedPayment,
  sendOrderToAdminPanel,
} from '../../app/lib/order-processing'

// Mock the order-storage module
jest.mock('../../app/lib/order-storage', () => ({
  storeOrderInMemory: jest.fn(() => ({ success: true })),
}))

// Mock fetch for external API calls
global.fetch = jest.fn()

describe('Order Processing Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.ADMIN_PANEL_API_URL = ''
    process.env.ADMIN_PANEL_API_KEY = ''
  })

  describe('processSuccessfulOrder', () => {
    const mockPaymentIntent = {
      id: 'pi_test123',
      amount: 10000, // $100.00 in cents
      currency: 'usd',
      metadata: {
        shipping: JSON.stringify({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          address: '123 Main St',
        }),
        items: JSON.stringify([
          { id: '1', name: 'Product 1', price: '$50.00', quantity: 2 },
        ]),
        test_mode: 'true',
      },
      receipt_email: 'john@example.com',
      created: Math.floor(Date.now() / 1000),
    }

    it('should process a successful order', async () => {
      const result = await processSuccessfulOrder(mockPaymentIntent)

      expect(result.success).toBe(true)
      expect(result.orderId).toBe('pi_test123')
      expect(result.orderData).toBeDefined()
      expect(result.orderData.orderId).toBe('pi_test123')
      expect(result.orderData.total).toBe(100) // Converted from cents
      expect(result.orderData.isTestMode).toBe(true)
    })

    it('should calculate subtotal correctly', async () => {
      const result = await processSuccessfulOrder(mockPaymentIntent)

      expect(result.orderData.subtotal).toBe(100) // $50.00 * 2 = $100.00
      expect(result.orderData.shippingCost).toBe(10.00)
    })

    it('should parse shipping metadata correctly', async () => {
      const result = await processSuccessfulOrder(mockPaymentIntent)

      expect(result.orderData.shipping).toBeDefined()
      expect(result.orderData.shipping.firstName).toBe('John')
      expect(result.orderData.shipping.lastName).toBe('Doe')
      expect(result.orderData.customerEmail).toBe('john@example.com')
    })

    it('should parse items metadata correctly', async () => {
      const result = await processSuccessfulOrder(mockPaymentIntent)

      expect(result.orderData.items).toBeDefined()
      expect(Array.isArray(result.orderData.items)).toBe(true)
      expect(result.orderData.items).toHaveLength(1)
      expect(result.orderData.items[0].name).toBe('Product 1')
    })

    it('should handle missing metadata gracefully', async () => {
      const paymentIntentNoMetadata = {
        ...mockPaymentIntent,
        metadata: {},
      }

      const result = await processSuccessfulOrder(paymentIntentNoMetadata)

      expect(result.success).toBe(true)
      expect(result.orderData.shipping).toBeNull()
      expect(result.orderData.items).toEqual([])
    })

    it('should handle errors gracefully', async () => {
      const invalidPaymentIntent = null

      const result = await processSuccessfulOrder(invalidPaymentIntent)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should set correct order status', async () => {
      const result = await processSuccessfulOrder(mockPaymentIntent)

      expect(result.orderData.status).toBe('completed')
      expect(result.orderData.paymentStatus).toBe('succeeded')
      expect(result.orderData.orderStatus).toBe('ordered')
    })
  })

  describe('processFailedPayment', () => {
    const mockPaymentIntent = {
      id: 'pi_failed123',
      amount: 10000,
      currency: 'usd',
    }

    it('should process a failed payment', async () => {
      const result = await processFailedPayment(mockPaymentIntent)

      expect(result.success).toBe(true)
      expect(result.orderId).toBe('pi_failed123')
    })

    it('should handle errors gracefully', async () => {
      const invalidPaymentIntent = null

      const result = await processFailedPayment(invalidPaymentIntent)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('sendOrderToAdminPanel', () => {
    const mockOrderData = {
      orderId: 'pi_test123',
      customerEmail: 'test@example.com',
      total: 100,
    }

    it('should store order internally when no external URL is configured', async () => {
      const result = await sendOrderToAdminPanel(mockOrderData)

      expect(result.success).toBe(true)
      expect(result.orderId).toBe('pi_test123')
    })

    it('should send to external admin panel when URL is configured', async () => {
      process.env.ADMIN_PANEL_API_URL = 'https://admin.example.com/api/orders'
      process.env.ADMIN_PANEL_API_KEY = 'test-api-key'

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await sendOrderToAdminPanel(mockOrderData)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://admin.example.com/api/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      )
    })

    it('should handle external API errors gracefully', async () => {
      process.env.ADMIN_PANEL_API_URL = 'https://admin.example.com/api/orders'

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      })

      const result = await sendOrderToAdminPanel(mockOrderData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle fetch errors gracefully', async () => {
      process.env.ADMIN_PANEL_API_URL = 'https://admin.example.com/api/orders'

      global.fetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await sendOrderToAdminPanel(mockOrderData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})

