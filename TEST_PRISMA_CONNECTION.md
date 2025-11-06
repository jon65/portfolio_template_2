# How to Test Prisma Connection

## Method 1: Test Script (Quick Check)

Run the test script:
```bash
node test-prisma-connection.js
```

This will:
- ✅ Check if DATABASE_URL is set
- ✅ Try to connect to the database
- ✅ Run a test query
- ✅ Check if Order table exists

## Method 2: Prisma Studio (Visual Check)

Prisma Studio provides a visual interface to test the connection:

```bash
npm run db:studio
```

This will:
- Open a web interface at `http://localhost:5555`
- Show all tables if connection works
- Display error if connection fails

## Method 3: Prisma DB Push (Schema Check)

Try pushing the schema:

```bash
npm run db:push
```

This will:
- Connect to database
- Create tables if connection works
- Show connection error if it fails

## Method 4: Direct Database Query

Test with a simple query:

```bash
node -e "
import('dotenv/config').then(() => {
  import('./app/lib/prisma.js').then(({ prisma }) => {
    prisma.\$queryRaw\`SELECT 1\`.then(() => {
      console.log('✅ Connected!');
      prisma.\$disconnect();
    }).catch(err => {
      console.error('❌ Failed:', err.message);
      prisma.\$disconnect();
    });
  });
});
"
```

## Current Status

Based on the test:
- ✅ DATABASE_URL is set
- ❌ Cannot reach database server

## Common Issues & Solutions

### Issue 1: Database is Paused
**Check:** Go to Supabase Dashboard → Check if database shows "Paused"
**Solution:** Click "Restore" to wake up the database

### Issue 2: Wrong Connection String Format
**Check:** Compare your connection string with Supabase Dashboard
**Solution:** Use the exact connection string from:
- Supabase Dashboard → Settings → Database → Connection String → Connection pooling

### Issue 3: Network/Firewall
**Check:** Can you access Supabase Dashboard?
**Solution:** Try the connection pooling URL instead of direct connection

### Issue 4: Password Issues
**Check:** Verify password in Supabase Dashboard
**Solution:** Reset database password if needed

## Next Steps

1. **Check Supabase Dashboard:**
   - Go to https://app.supabase.com
   - Select your project
   - Check if database is active

2. **Get Correct Connection String:**
   - Settings → Database → Connection String
   - Copy the "Connection pooling" URL
   - Update `.env.local` with the exact string

3. **Test Again:**
   ```bash
   node test-prisma-connection.js
   ```

## Expected Output (Success)

```
Testing Prisma connection...
DATABASE_URL: Set ✅
✅ Connection successful!
Test query result: [ { test: 1n } ]
Order table exists: true/false
```

## Expected Output (Failure)

```
Testing Prisma connection...
DATABASE_URL: Set ✅
❌ Connection failed!
Error: Can't reach database server...
```

