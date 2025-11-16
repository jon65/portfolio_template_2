/**
 * Unit tests for authentication utilities
 * Tests the auth.js module functions
 */

import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from '../../app/lib/auth'

describe('Authentication Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      expect(hash).toBeDefined()
      expect(typeof hash).toBe('string')
      expect(hash.length).toBeGreaterThan(0)
      expect(hash).not.toBe(password)
    })

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)
      
      expect(hash1).not.toBe(hash2) // bcrypt salts produce different hashes
    })
  })

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hash = await hashPassword(password)
      
      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })

    it('should handle empty password', async () => {
      const password = ''
      const hash = await hashPassword('somePassword')
      
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('generateToken', () => {
    const originalEnv = process.env.JWT_SECRET

    beforeEach(() => {
      process.env.JWT_SECRET = 'test-secret-key'
    })

    afterEach(() => {
      process.env.JWT_SECRET = originalEnv
    })

    it('should generate a JWT token', () => {
      const userId = '123'
      const email = 'test@example.com'
      
      const token = generateToken(userId, email)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('123', 'user1@example.com')
      const token2 = generateToken('456', 'user2@example.com')
      
      expect(token1).not.toBe(token2)
    })

    it('should include user data in token', () => {
      const userId = '123'
      const email = 'test@example.com'
      
      const token = generateToken(userId, email)
      const decoded = verifyToken(token)
      
      expect(decoded).toBeDefined()
      expect(decoded.userId).toBe(userId)
      expect(decoded.email).toBe(email)
      expect(decoded.type).toBe('admin')
    })
  })

  describe('verifyToken', () => {
    const originalEnv = process.env.JWT_SECRET

    beforeEach(() => {
      process.env.JWT_SECRET = 'test-secret-key'
    })

    afterEach(() => {
      process.env.JWT_SECRET = originalEnv
    })

    it('should verify a valid token', () => {
      const userId = '123'
      const email = 'test@example.com'
      const token = generateToken(userId, email)
      
      const decoded = verifyToken(token)
      
      expect(decoded).toBeDefined()
      expect(decoded.userId).toBe(userId)
      expect(decoded.email).toBe(email)
    })

    it('should return null for an invalid token', () => {
      const invalidToken = 'invalid.token.here'
      
      const decoded = verifyToken(invalidToken)
      
      expect(decoded).toBeNull()
    })

    it('should return null for an empty token', () => {
      const decoded = verifyToken('')
      
      expect(decoded).toBeNull()
    })

    it('should return null for a token with wrong secret', () => {
      const token = generateToken('123', 'test@example.com')
      
      // Change secret
      process.env.JWT_SECRET = 'different-secret'
      const decoded = verifyToken(token)
      
      expect(decoded).toBeNull()
    })

    it('should return null for a malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token'
      
      const decoded = verifyToken(malformedToken)
      
      expect(decoded).toBeNull()
    })
  })
})

