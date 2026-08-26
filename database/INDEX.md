# NotificationHub Database - File Index

Complete guide to all database-related files and their purposes.

## Directory Structure

```
database/
├── migrations/                 # SQL migration files (versioned)
│   └── 001_create_tables.sql  # Initial schema creation
├── seeds/                      # Demo data seed scripts
│   └── 001_seed_demo_data.sql # Demo farm, producers, and events
├── migrate.js                  # Migration runner tool
├── init.sh                     # Database setup script (Linux/macOS)
├── init.bat                    # Database setup script (Windows)
├── README.md                   # Detailed database documentation
├── SCHEMA_REFERENCE.md         # Quick schema reference
├── SETUP_GUIDE.md              # Step-by-step setup instructions
└── INDEX.md                    # This file
```

---

## File Descriptions

### Migration Files

#### `migrations/001_create_tables.sql`

**Purpose:** Creates the complete database schema for NotificationHub

**Contents:**
- `producers` table - Producer/farmer information
- `farms` table - Farm configurations
- `devices` table - IoT sensor devices
- `events` table - Sensor readings/events
- `event_history` table - Complete audit trail
- `notifications` table - Generated alerts
- All required indexes for performance

**When to run:** On initial database setup and for version control

**Related:** See `README.md` for detailed schema documentation

---

### Seed Files

#### `seeds/001_seed_demo_data.sql`

**Purpose:** Loads demonstration data for development and testing

**Contents:**
- Demo producer: "João Silva" (producer-001)
- Demo farm: "Boa Esperança" (farm-001)
- 6 demo devices (one for each sensor type)
- 6 events that trigger rules (critical scenarios)
- 6 events that don't trigger rules (normal scenarios)

**When to run:** After migrations, for development/demo purposes

**Note:** Uses `ON CONFLICT DO NOTHING/UPDATE` for idempotency - safe to run multiple times

**Related:** See `SCHEMA_REFERENCE.md` for data structure details

---

### Migration Tool

#### `migrate.js`

**Purpose:** Command-line tool to manage database migrations

**Features:**
- Track executed migrations in `schema_migrations` table
- Run pending migrations automatically
- Transactional rollback on failure
- Load seed data with `--seed` flag
- Show migration status

**Usage:**

```bash
# Run pending migrations
node migrate.js migrate

# Run migrations and load seeds
node migrate.js migrate --seed

# Show status
node migrate.js status

# Help
node migrate.js --help
```

**Configuration:** Uses environment variables:
- `DATABASE_URL` - Full connection string (overrides individual params)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Individual params

**Related:** See `README.md` for detailed usage instructions

---

### Setup Scripts

#### `init.sh` (Linux/macOS)

**Purpose:** Automated database setup script for Unix-like systems

**Features:**
- Checks PostgreSQL availability
- Creates database if needed
- Runs migrations
- Optionally loads seed data
- Verifies installation
- Interactive confirmation for destructive operations

**Usage:**

```bash
chmod +x database/init.sh
./database/init.sh [--seed] [--reset]

# Options:
#   --seed   Load demo data after migrations
#   --reset  Drop and recreate database (WARNING)
#   --help   Show help message
```

**Environment Variables:** Same as `migrate.js`

---

#### `init.bat` (Windows)

**Purpose:** Automated database setup script for Windows

**Features:** Same as `init.sh` but using Windows batch syntax

**Usage:**

```batch
cd database
init.bat [--seed] [--reset]

# Options:
#   --seed   Load demo data after migrations
#   --reset  Drop and recreate database (WARNING)
#   --help   Show help message
```

**Environment Variables:** Same as `migrate.js`

---

### Documentation Files

#### `README.md`

**Purpose:** Comprehensive database documentation

**Contents:**
- Schema overview with all 6 tables
- Table descriptions with column details
- Index reference and naming conventions
- Migration system explained
- Database connection instructions
- Entity relationship diagram
- Data integrity constraints
- Query examples
- Backup and recovery procedures
- Performance considerations
- Troubleshooting guide

**Audience:** Developers, DevOps engineers, database administrators

**Read this for:** Understanding the complete database design

---

#### `SCHEMA_REFERENCE.md`

**Purpose:** Quick reference guide for the database schema

**Contents:**
- Table structure overview
- Sensor types and rule thresholds
- Data lifecycle and status transitions
- Common SQL queries
- Quick connection info
- Index reference
- Backup strategy
- Common issues and solutions

**Audience:** Developers doing quick lookups

**Read this for:** Quick answers about schema, sensor types, or rules

---

#### `SETUP_GUIDE.md`

**Purpose:** Step-by-step guide to set up the database

**Contents:**
- Prerequisites and verification
- Quick start (5 minutes)
- Detailed setup procedure
- Environment configuration
- Verification checklist
- Troubleshooting section
- Next steps after setup
- Quick reference table

**Audience:** New developers, DevOps engineers

**Read this for:** Getting the database running for the first time

---

#### `INDEX.md` (This File)

**Purpose:** Navigation guide for all database-related files

**Contents:**
- Directory structure
- File descriptions and purposes
- Quick reference table
- Usage recommendations

**Audience:** Anyone working with NotificationHub database

**Read this for:** Understanding what each file does

---

## Quick Reference Table

| File | Type | Purpose | Run When |
|------|------|---------|----------|
| `001_create_tables.sql` | SQL | Create schema | Initial setup |
| `001_seed_demo_data.sql` | SQL | Load demo data | Development/demo |
| `migrate.js` | Node.js | Run migrations | Part of setup |
| `init.sh` | Bash | Auto setup (Unix) | First-time setup |
| `init.bat` | Batch | Auto setup (Windows) | First-time setup |
| `README.md` | Docs | Full reference | Deep dive |
| `SCHEMA_REFERENCE.md` | Docs | Quick lookup | Daily use |
| `SETUP_GUIDE.md` | Docs | Step-by-step | First setup |
| `INDEX.md` | Docs | Navigation | Getting oriented |

---

## How to Use These Files

### Scenario 1: First-Time Setup (Development)

1. Read: `SETUP_GUIDE.md` - understand prerequisites
2. Run: `./init.sh --seed` (Unix) or `init.bat --seed` (Windows)
3. Verify: Follow verification section in `SETUP_GUIDE.md`
4. Reference: Keep `SCHEMA_REFERENCE.md` handy

### Scenario 2: Understanding the Schema

1. Quick overview: `SCHEMA_REFERENCE.md` (2 minutes)
2. Detailed study: `README.md` (10 minutes)
3. Entity relationships: See diagrams in `README.md`
4. Query examples: See "Query Examples" section in `README.md`

### Scenario 3: Writing SQL Queries

1. Reference: `SCHEMA_REFERENCE.md` for quick table lookup
2. Indexes: Check "Index Reference" section for performance tips
3. Examples: Use query examples from `README.md`
4. Details: Read full column docs in `README.md`

### Scenario 4: Troubleshooting Issues

1. Quick fixes: Check "Common Issues" in `SCHEMA_REFERENCE.md`
2. Detailed help: Read "Troubleshooting" section in `SETUP_GUIDE.md` or `README.md`
3. Connection issues: See "Database Connection" in `README.md`
4. Migration problems: Check `migrate.js` source code for error messages

### Scenario 5: Creating New Migrations

1. Understand: Read "Creating New Migrations" in `README.md`
2. Create: Add new `.sql` file to `migrations/` directory
3. Run: `node migrate.js migrate`
4. Verify: `node migrate.js status`

---

## File Relationships

```
SETUP → (uses) → migrate.js → (executes) → 001_create_tables.sql
  ↓
init.sh or init.bat
  ↓
  └→ (optionally runs) → 001_seed_demo_data.sql

Documentation:
  README.md (detailed)
    ↑
    └── Sections referenced by:
        - SETUP_GUIDE.md (for troubleshooting)
        - SCHEMA_REFERENCE.md (for details)
```

---

## Common Tasks

### I want to...

**...set up the database**
→ Follow `SETUP_GUIDE.md` or run `./init.sh --seed`

**...understand the schema**
→ Start with `SCHEMA_REFERENCE.md`, then read `README.md`

**...query the database**
→ Check "Query Examples" in `README.md`

**...write a migration**
→ Read "Creating New Migrations" in `README.md`

**...troubleshoot an issue**
→ Check `SETUP_GUIDE.md` → Troubleshooting section

**...back up the database**
→ See "Backup and Recovery" in `README.md`

**...understand how migrations work**
→ Read `migrate.js` source code and "Migration System" in `README.md`

**...load demo data**
→ Run `node migrate.js migrate --seed` or `./init.sh --seed`

**...check migration status**
→ Run `node migrate.js status`

**...connect to PostgreSQL directly**
→ See "Database Connection" in `README.md`

---

## Environment Variables

Used by migration tools and setup scripts:

```
DATABASE_URL              # Full connection string
DB_HOST                   # Database host (default: localhost)
DB_PORT                   # Database port (default: 5432)
DB_NAME                   # Database name (default: notificationhub)
DB_USER                   # Database user (default: postgres)
DB_PASSWORD               # Database password (default: empty)
```

Set these before running `migrate.js` or setup scripts.

---

## Dependencies

- **PostgreSQL** 12+ - Database server
- **Node.js** 14+ - Runtime for `migrate.js`
- **pg** npm package - PostgreSQL driver

Install Node.js dependencies:

```bash
npm install pg
```

---

## Related Project Files

Outside the database directory:

- `.env.example` - Environment variable template (set DB_* variables)
- `.env` - Local environment (created from .env.example)
- `package.json` - Project dependencies (includes pg)
- Backend code - Uses database via connection pool
- Frontend code - Queries via backend API

---

## Support and Resources

### PostgreSQL

- Official Docs: https://www.postgresql.org/docs/
- Installation: https://www.postgresql.org/download/
- Community: https://www.postgresql.org/community/

### Node.js pg Library

- Documentation: https://node-postgres.com/
- GitHub: https://github.com/brianc/node-postgres

### NotificationHub

- Main README: `/README.md` (at project root)
- API Documentation: `/API.md` (if exists)
- Architecture: `/ARCHITECTURE.md` (if exists)

---

## File Maintenance

### Adding New Tables

1. Create migration file: `migrations/002_add_new_table.sql`
2. Run migrations: `node migrate.js migrate`
3. Update `README.md` with new table documentation
4. Update `SCHEMA_REFERENCE.md` with quick reference

### Updating Documentation

- `README.md` - After schema changes
- `SCHEMA_REFERENCE.md` - Quick reference updates
- `SETUP_GUIDE.md` - If setup procedure changes

### Version Control

- ✓ Commit: `migrations/*.sql`, `seeds/*.sql`, all `*.md` files
- ✗ Don't commit: `.env` file, database backups

---

## Checklist for New Contributors

- [ ] Read `SETUP_GUIDE.md`
- [ ] Run `./init.sh --seed` (or `init.bat --seed`)
- [ ] Verify setup following checklist
- [ ] Bookmark `SCHEMA_REFERENCE.md` for quick lookups
- [ ] Review `README.md` sections relevant to your work
- [ ] Ask questions in team chat if confused

---

## Summary

This directory contains everything needed to:

✓ Set up the database (via `init.sh` or `init.bat`)  
✓ Manage schema changes (via `migrations/*.sql`)  
✓ Load demo data (via `seeds/*.sql`)  
✓ Understand the schema (via documentation)  
✓ Troubleshoot issues (via guides and examples)  

Start with `SETUP_GUIDE.md` for first-time setup, then refer to `SCHEMA_REFERENCE.md` for daily development.
