# Admin Panel Authentication Setup

This guide explains how to set up and use the industry-standard authentication system for the admin panel.

## Features

- ✅ Secure password hashing with bcrypt (12 salt rounds)
- ✅ JWT token-based authentication
- ✅ HTTP-only cookies for secure token storage
- ✅ Protected routes with middleware
- ✅ Session management
- ✅ Login/logout functionality
- ✅ User management in database

## Setup Instructions

### 1. Update Database Schema

The authentication system requires an `AdminUser` model in your Prisma schema. This has already been added. Run:

```bash
npm run db:push
```

This will create the `AdminUser` table in your database.

### 2. Set Environment Variables

Add the following to your `.env.local` file:

```env
# JWT Secret Key (REQUIRED - Change this to a random string in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Optional: JWT expiration time (default: 7d)
JWT_EXPIRES_IN=7d
```

**⚠️ IMPORTANT:** Generate a strong random secret for `JWT_SECRET` in production. You can generate one using:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create Admin User

Create your first admin user using the seed script:

```bash
# Using default credentials
npm run seed:admin

# Or with custom credentials
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=your-secure-password npm run seed:admin

# With custom name
ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD=your-secure-password ADMIN_NAME="Admin Name" npm run seed:admin
```

**Default credentials (if not specified):**
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ SECURITY:** Change the default password immediately after first login!

### 4. Start the Application

```bash
npm run dev
```

## Usage

### Accessing the Admin Panel

1. Navigate to `/admin` in your browser
2. You will be redirected to `/admin/login` if not authenticated
3. Enter your admin email and password
4. After successful login, you'll be redirected to the admin panel

### Logging Out

Click the "Logout" button in the top right corner of the admin panel.

### Protected Routes

All routes under `/admin` (except `/admin/login`) are automatically protected by middleware. Unauthenticated users will be redirected to the login page.

### API Endpoints

The following API endpoints are available:

- `POST /api/auth/login` - Authenticate and create session
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current authenticated user

All admin API endpoints (`/api/admin/*`) require authentication.

## Security Features

### Password Security
- Passwords are hashed using bcrypt with 12 salt rounds
- Passwords are never stored in plain text
- Passwords are never sent in API responses

### Token Security
- JWT tokens are stored in HTTP-only cookies (not accessible via JavaScript)
- Cookies are secure in production (HTTPS only)
- Tokens expire after 7 days (configurable)
- Tokens include user ID, email, and type verification

### Route Protection
- Middleware automatically protects all `/admin/*` routes
- API routes verify authentication on each request
- Invalid or expired tokens automatically redirect to login

## Database Schema

The `AdminUser` model includes:

```prisma
model AdminUser {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String   // bcrypt hashed password
  name          String?
  isActive      Boolean  @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## Managing Admin Users

### Create Additional Admin Users

Use the seed script with different credentials:

```bash
ADMIN_EMAIL=newadmin@example.com ADMIN_PASSWORD=securepassword123 npm run seed:admin
```

### Deactivate Admin Users

You can deactivate users by setting `isActive` to `false` in the database:

```javascript
// Using Prisma Studio
npm run db:studio

// Or programmatically
await prisma.adminUser.update({
  where: { email: 'admin@example.com' },
  data: { isActive: false }
})
```

### Change Password

To change a password, you'll need to:

1. Hash the new password using bcrypt
2. Update the `passwordHash` field in the database

Example script:

```javascript
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function changePassword(email, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.adminUser.update({
    where: { email },
    data: { passwordHash }
  })
  console.log('Password updated successfully')
}

changePassword('admin@example.com', 'new-secure-password')
```

## Troubleshooting

### "Unauthorized" Error

- Check that you're logged in
- Verify your JWT_SECRET is set correctly
- Clear cookies and try logging in again
- Check that the admin user exists and `isActive` is `true`

### Can't Login

- Verify the admin user exists in the database
- Check that the password is correct
- Ensure `isActive` is `true` for the user
- Check server logs for errors

### Middleware Not Working

- Ensure `middleware.js` is in the `app/` directory
- Restart the Next.js dev server
- Check that the matcher pattern is correct

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Run `npm run db:push` to ensure schema is up to date
- Check Prisma connection: `npm run db:studio`

## Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `JWT_SECRET` as an environment variable (not in code)
- [ ] Ensure HTTPS is enabled (cookies require secure flag)
- [ ] Change default admin password
- [ ] Review and limit admin user access
- [ ] Set up proper error logging
- [ ] Consider adding rate limiting to login endpoint
- [ ] Consider adding 2FA for additional security
- [ ] Regularly audit admin user accounts

## Additional Security Recommendations

1. **Rate Limiting**: Add rate limiting to the login endpoint to prevent brute force attacks
2. **Password Requirements**: Enforce strong password requirements
3. **Account Lockout**: Implement account lockout after failed login attempts
4. **2FA**: Consider adding two-factor authentication
5. **Audit Logging**: Log all admin actions for security auditing
6. **Session Management**: Add ability to view and revoke active sessions

## Support

For issues or questions, check:
- Server logs for error messages
- Browser console for client-side errors
- Database connection status
- Environment variables configuration

