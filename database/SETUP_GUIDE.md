# NotificationHub Database Setup Guide

Complete step-by-step guide to set up the NotificationHub database for local development and deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5 minutes)](#quick-start-5-minutes)
3. [Detailed Setup](#detailed-setup)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **PostgreSQL** (v12 or higher)
   - Download: https://www.postgresql.org/download/
   - Installation guide: https://www.postgresql.org/docs/current/admin.html

2. **Node.js** (v14 or higher)
   - Download: https://nodejs.org/
   - Installation: Use installer or package manager

3. **npm** or **yarn**
   - Comes with Node.js
   - Verify: `npm --version`

### Verify Installation

```bash
# Check PostgreSQL
psql --version
# Output: psql (PostgreSQL) 14.5, compiled by...

# Check Node.js
node --version
# Output: v18.12.0

# Check npm
npm --version
# Output: 9.2.0
```

### PostgreSQL Access

You need PostgreSQL superuser access to create databases:

```bash
# Test connection
psql -U postgres -c "SELECT version();"

# If prompted for password, enter your PostgreSQL password
# (default is often empty or 'postgres')
```

---

## Quick Start (5 Minutes)

### On Linux/macOS

```bash
cd database
chmod +x init.sh
./init.sh --seed
```

### On Windows

```batch
cd database
init.bat --seed
```

This will:
1. ✓ Create the database
2. ✓ Run all migrations
3. ✓ Load demo seed data
4. ✓ Verify installation

---

## Detailed Setup

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd /path/to/NotificationHub

# Install npm dependencies globally (if needed)
npm install -g pg

# Or install locally
npm install pg
```

### Step 2: Create PostgreSQL Database

**Option A: Using createdb (command line)**

```bash
# Create database with default parameters
createdb -U postgres notificationhub

# With custom user/host
createdb -h localhost -p 5432 -U postgres notificationhub
```

**Option B: Using psql (SQL command)**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database (in psql prompt)
postgres=# CREATE DATABASE notificationhub;
postgres=# \l  # List databases to verify

# Exit psql
postgres=# \q
```

**Option C: Using pgAdmin (GUI)**

1. Open pgAdmin (installed with PostgreSQL)
2. Right-click "Databases" → "Create" → "Database"
3. Name: `notificationhub`
4. Click "Save"

### Step 3: Configure Environment Variables

Create `.env` file in project root:

```bash
# Copy template
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your editor
```

Set these variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notificationhub
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### Step 4: Run Migrations

Navigate to database directory and run migrations:

```bash
cd database

# Check current status
node migrate.js status

# Run pending migrations
node migrate.js migrate

# Expected output:
# ✓ Migrations tracking table created/verified
# Running 1 pending migration(s):
# ✓ Migration executed: 001_create_tables.sql
# ✓ All migrations completed successfully
```

### Step 5: Load Seed Data (Optional)

```bash
# Load demo data
node migrate.js migrate --seed

# Or load seeds manually
node migrate.js status  # Check status first
# Then load seed data from database/seeds/*.sql
```

### Step 6: Verify Installation

**Check tables were created:**

```bash
psql -U postgres -d notificationhub -c "\dt"

# Output should show 6 tables:
# event_history
# events
# farms
# notifications
# producers
# devices
```

**Check indexes:**

```bash
psql -U postgres -d notificationhub -c "\di"

# Should show many indexes (20+) related to our tables
```

**Check migrations table:**

```bash
psql -U postgres -d notificationhub -c "SELECT * FROM schema_migrations;"

# Should show:
# id |                name                | executed_at
# ---+------------------------------------+-----------
#  1 | 001_create_tables.sql              | [timestamp]
```

**Check seed data (if loaded):**

```bash
psql -U postgres -d notificationhub -c "SELECT COUNT(*) as farms FROM farms;"
# Should output: 1 (demo farm)

psql -U postgres -d notificationhub -c "SELECT COUNT(*) as devices FROM devices;"
# Should output: 6 (demo devices)

psql -U postgres -d notificationhub -c "SELECT COUNT(*) as events FROM events;"
# Should output: 12 (demo events)
```

---

## Verification

### Complete Verification Checklist

```bash
#!/bin/bash

DB_HOST=localhost
DB_PORT=5432
DB_NAME=notificationhub
DB_USER=postgres

echo "=== NotificationHub Database Verification ==="
echo ""

# 1. Connection test
echo "1. Testing database connection..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" && echo "   ✓ Connection OK" || echo "   ✗ Connection FAILED"

# 2. Table count
echo "2. Checking tables..."
TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo "   Found $TABLE_COUNT tables (expected 6)"

# 3. Index count
echo "3. Checking indexes..."
INDEX_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'")
echo "   Found $INDEX_COUNT indexes"

# 4. Migration status
echo "4. Checking migrations..."
MIGRATION_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations")
echo "   Executed $MIGRATION_COUNT migrations"

# 5. Sample data
echo "5. Checking sample data..."
FARM_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM farms")
PRODUCER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM producers")
DEVICE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM devices")
EVENT_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM events")

echo "   Farms: $FARM_COUNT (expected 1 if seeded)"
echo "   Producers: $PRODUCER_COUNT (expected 1 if seeded)"
echo "   Devices: $DEVICE_COUNT (expected 6 if seeded)"
echo "   Events: $EVENT_COUNT (expected 12 if seeded)"

echo ""
echo "=== Verification Complete ==="
```

Run this script:

```bash
# On macOS/Linux
chmod +x verify.sh
./verify.sh

# On Windows
# Use the PowerShell equivalent or run commands manually
```

---

## Troubleshooting

### Connection Issues

**Error: "connection refused"**

```
psql: could not connect to server: Connection refused
```

**Solution:**
```bash
# 1. Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list | grep postgres  # macOS
# Windows: Services → Look for "PostgreSQL Database Server"

# 2. Start PostgreSQL if not running
sudo systemctl start postgresql  # Linux
brew services start postgresql  # macOS
# Windows: Services → Right-click PostgreSQL → Start
```

---

**Error: "FATAL: role 'postgres' does not exist"**

**Solution:**
```bash
# Use the correct superuser
psql -U <your_postgres_user>

# Or initialize PostgreSQL
initdb -D /path/to/postgres/data  # Varies by OS
```

---

### Database Creation Issues

**Error: "database notificationhub already exists"**

**Solution:**
```bash
# Drop the database first
dropdb -U postgres notificationhub

# Or specify --reset flag
./init.sh --reset  # Linux/macOS
init.bat --reset   # Windows
```

---

**Error: "permission denied for schema public"**

**Solution:**
```bash
# Grant permissions
psql -U postgres -d notificationhub -c \
  "GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;"
```

---

### Migration Issues

**Error: "relation already exists"**

**Solution:**
```bash
# Check migration status
node database/migrate.js status

# If migration is already recorded, it will skip it
# If stuck, manually check and update schema_migrations table
psql -d notificationhub -c "DELETE FROM schema_migrations WHERE name = '001_create_tables.sql';"
```

---

**Error: "column does not exist"**

**Solution:**
```bash
# Verify all migrations ran
node database/migrate.js status

# If missing, run again
node database/migrate.js migrate

# Check current schema
psql -d notificationhub -c "\d events"
```

---

### Performance Issues

**Slow queries after setup:**

```bash
# Rebuild indexes
psql -d notificationhub -c "REINDEX DATABASE notificationhub;"

# Analyze table statistics
psql -d notificationhub -c "ANALYZE;"

# Vacuum cleanup
psql -d notificationhub -c "VACUUM ANALYZE;"
```

---

### Data Issues

**Seed data not loaded:**

```bash
# Check if seed files exist
ls -la database/seeds/

# Load manually
psql -U postgres -d notificationhub -f database/seeds/001_seed_demo_data.sql

# Verify
psql -d notificationhub -c "SELECT COUNT(*) FROM events;"
```

---

### Verification Failures

**"Found X tables (expected 6)"**

```bash
# List actual tables
psql -d notificationhub -c "\dt"

# If missing tables, re-run migrations
node database/migrate.js status
node database/migrate.js migrate
```

---

## Next Steps

Once setup is complete:

1. **Start the backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Verify UI:**
   - Open http://localhost:3000
   - You should see demo farm and data

4. **Run tests:**
   ```bash
   npm test
   ```

---

## Support

### Documentation References

- **Database Schema**: See `README.md`
- **Quick Reference**: See `SCHEMA_REFERENCE.md`
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Node-postgres (pg)**: https://node-postgres.com/

### Common Commands

```bash
# Connect directly to database
psql -U postgres -d notificationhub

# Useful psql commands (in psql prompt)
\dt                           # List tables
\di                           # List indexes
\d events                     # Describe events table
SELECT * FROM events LIMIT 5; # View sample data
\q                            # Quit

# Backup database
pg_dump -U postgres notificationhub > backup.sql

# Restore database
psql -U postgres notificationhub < backup.sql
```

---

## Environment Setup

### .env File Template

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Edit with your values:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notificationhub
DB_USER=postgres
DB_PASSWORD=your_password

# Redis (for duplicate detection)
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
PORT=3000

# Features
LOAD_DEMO_DATA=true
ENABLE_EVENT_HISTORY=true
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Create DB | `createdb -U postgres notificationhub` |
| Run migrations | `node database/migrate.js migrate` |
| Load seed data | `node database/migrate.js migrate --seed` |
| Check status | `node database/migrate.js status` |
| Connect to DB | `psql -U postgres -d notificationhub` |
| Backup DB | `pg_dump -U postgres notificationhub > backup.sql` |
| Restore DB | `psql -U postgres notificationhub < backup.sql` |

---

## Summary

You now have:

✓ PostgreSQL database created  
✓ All tables and indexes created  
✓ Migrations tracked and applied  
✓ Demo data loaded (optional)  
✓ System ready for development  

Proceed to the [application setup](#next-steps) or refer to [troubleshooting](#troubleshooting) if you encounter issues.
