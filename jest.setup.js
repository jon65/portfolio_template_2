// Jest setup file for backend unit tests

// Mock Next.js modules that aren't available in Node.js test environment
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Mock environment variables for testing
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
process.env.NODE_ENV = 'test'

// Global test utilities
global.console = {
  ...console,
  // Uncomment to silence console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

