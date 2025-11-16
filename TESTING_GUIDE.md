# Backend Unit Testing Guide

This guide explains how to run and write unit tests for the backend codebase.

## Setup

The project uses [Jest](https://jestjs.io/) as the testing framework, configured for Next.js.

### Install Dependencies

```bash
npm install
```

This will install Jest and all testing dependencies.

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Only Backend Tests

```bash
npm run test:backend
```

This command specifically targets tests in `app/api/`, `app/lib/`, and `__tests__/` directories.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

This will watch for file changes and re-run tests automatically.

### Run Tests with Coverage

```bash
npm run test:coverage
```

This generates a coverage report showing which parts of your code are tested.

## Test Structure

Tests are located in:
- `__tests__/` - Dedicated test directory
- Co-located with source files (e.g., `auth.test.js` next to `auth.js`)

### Test File Naming

- `*.test.js` - Test files
- `*.test.ts` - TypeScript test files
- `*.spec.js` - Alternative test file naming

## Writing Tests

### Example Test Structure

```javascript
import { functionToTest } from '../../app/lib/module'

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should do something correctly', () => {
      const result = functionToTest(input)
      expect(result).toBe(expectedOutput)
    })

    it('should handle errors gracefully', () => {
      expect(() => functionToTest(invalidInput)).toThrow()
    })
  })
})
```

### Testing Backend Modules

#### Testing `app/lib/` Modules

These are pure utility functions that can be tested directly:

```javascript
import { hashPassword, verifyPassword } from '../../app/lib/auth'

describe('hashPassword', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('password123')
    expect(hash).toBeDefined()
  })
})
```

#### Testing API Routes

API routes in `app/api/` are Next.js route handlers. For unit testing:

1. Test the business logic separately (extract to `app/lib/`)
2. Mock Next.js dependencies (`NextResponse`, `cookies`, etc.)
3. Use integration tests for full route testing

### Mocking

#### Mock Next.js Modules

```javascript
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}))
```

#### Mock External APIs

```javascript
global.fetch = jest.fn()

// In your test
global.fetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: 'test' }),
})
```

#### Mock Environment Variables

```javascript
beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret'
})

afterEach(() => {
  delete process.env.JWT_SECRET
})
```

## CI/CD Integration

Tests run automatically on:
- Push to `main`, `master`, `develop`, or `prod` branches
- Pull requests to these branches
- Manual trigger via GitHub Actions

The CI pipeline:
1. Checks out code
2. Sets up Node.js (tests on Node 18.x and 20.x)
3. Installs dependencies
4. Generates Prisma Client
5. Runs linter
6. Runs backend unit tests
7. Generates coverage reports
8. Uploads coverage to Codecov (optional)

## Coverage Thresholds

Current coverage thresholds (in `jest.config.js`):
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

Adjust these in `jest.config.js` as your test suite grows.

## Best Practices

1. **Test Pure Functions**: Focus on testing business logic in `app/lib/`
2. **Mock External Dependencies**: Mock database calls, API calls, and Next.js modules
3. **Test Edge Cases**: Include tests for error handling and edge cases
4. **Keep Tests Fast**: Unit tests should run quickly (< 10 seconds total)
5. **Descriptive Names**: Use clear test descriptions that explain what is being tested
6. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and assertions

## Troubleshooting

### Tests Not Found

Make sure test files match the patterns in `jest.config.js`:
- `**/__tests__/**/*.test.js`
- `**/*.test.js`

### Import Errors

If you get import errors, check:
1. File paths are correct (relative to test file)
2. ES module syntax is supported (handled by `next/jest`)
3. Dependencies are installed

### Environment Variables

Set test environment variables in:
- `jest.setup.js` for global setup
- Individual test files for specific tests

## Example Test Files

See `__tests__/lib/` for example test files:
- `auth.test.js` - Authentication utilities
- `order-processing.test.js` - Order processing logic

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

