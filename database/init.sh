#!/bin/bash

# NotificationHub Database Initialization Script
# 
# This script sets up a fresh PostgreSQL database for NotificationHub
# including creating the database, running migrations, and loading seed data.
#
# Usage: ./init.sh [options]
# 
# Options:
#   --seed          Load demo seed data after migrations
#   --reset         Drop and recreate database (WARNING: destructive)
#   --help          Show this help message
#
# Environment Variables:
#   DB_HOST         PostgreSQL host (default: localhost)
#   DB_PORT         PostgreSQL port (default: 5432)
#   DB_NAME         Database name (default: notificationhub)
#   DB_USER         Database user (default: postgres)
#   DB_PASSWORD     Database password (default: empty)
#   PGPASSWORD      Password for psql (if set)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-notificationhub}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
LOAD_SEED=false
RESET=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --seed)
      LOAD_SEED=true
      shift
      ;;
    --reset)
      RESET=true
      shift
      ;;
    --help)
      grep '^#' "$0" | cut -c 3-
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check if PostgreSQL is running
check_postgres() {
  log_info "Checking PostgreSQL connection..."
  
  if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "SELECT 1" > /dev/null 2>&1; then
    log_error "Cannot connect to PostgreSQL at $DB_HOST:$DB_PORT"
    echo "Make sure PostgreSQL is running and credentials are correct."
    echo ""
    echo "Connection details:"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  User: $DB_USER"
    echo ""
    exit 1
  fi
  
  log_success "PostgreSQL is running"
}

# Check if database exists
check_database() {
  log_info "Checking if database '$DB_NAME' exists..."
  
  if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    log_success "Database '$DB_NAME' exists"
    return 0
  else
    log_warning "Database '$DB_NAME' does not exist"
    return 1
  fi
}

# Create database
create_database() {
  log_info "Creating database '$DB_NAME'..."
  
  if PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
    log_success "Database '$DB_NAME' created"
  else
    log_error "Failed to create database"
    exit 1
  fi
}

# Drop database
drop_database() {
  log_warning "Dropping database '$DB_NAME'..."
  
  if PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" 2>/dev/null; then
    log_success "Database '$DB_NAME' dropped"
  else
    log_error "Failed to drop database"
    exit 1
  fi
}

# Run migrations
run_migrations() {
  log_info "Running database migrations..."
  
  export DB_HOST
  export DB_PORT
  export DB_NAME
  export DB_USER
  export DB_PASSWORD
  export PGPASSWORD="$DB_PASSWORD"
  
  if node migrate.js migrate; then
    log_success "Migrations completed successfully"
  else
    log_error "Migrations failed"
    exit 1
  fi
}

# Load seed data
load_seed_data() {
  log_info "Loading seed data..."
  
  export PGPASSWORD="$DB_PASSWORD"
  
  # Find all seed files and execute them
  seed_count=0
  if [ -d "seeds" ]; then
    for seed_file in seeds/*.sql; do
      if [ -f "$seed_file" ]; then
        log_info "Loading seed file: $(basename "$seed_file")"
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$seed_file" > /dev/null 2>&1; then
          log_success "Loaded: $(basename "$seed_file")"
          ((seed_count++))
        else
          log_error "Failed to load: $(basename "$seed_file")"
        fi
      fi
    done
  fi
  
  if [ $seed_count -gt 0 ]; then
    log_success "Loaded $seed_count seed file(s)"
  else
    log_warning "No seed files found"
  fi
}

# Verify installation
verify_installation() {
  log_info "Verifying installation..."
  
  export PGPASSWORD="$DB_PASSWORD"
  
  # Check tables exist
  table_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
  
  if [ "$table_count" -ge 6 ]; then
    log_success "Database has $table_count tables"
  else
    log_error "Expected at least 6 tables, found $table_count"
    exit 1
  fi
  
  # Check indexes exist
  index_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'")
  
  log_success "Database has $index_count indexes"
  
  # Check seed data (if loaded)
  if [ "$LOAD_SEED" = true ]; then
    event_count=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
      "SELECT COUNT(*) FROM events")
    
    if [ "$event_count" -gt 0 ]; then
      log_success "Seed data loaded: $event_count events"
    else
      log_warning "No events found in database"
    fi
  fi
}

# Main script
main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║ NotificationHub Database Initialization${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  
  log_info "Configuration:"
  echo "  Host: $DB_HOST"
  echo "  Port: $DB_PORT"
  echo "  Database: $DB_NAME"
  echo "  User: $DB_USER"
  echo "  Load seed data: $LOAD_SEED"
  echo "  Reset database: $RESET"
  echo ""
  
  # Confirmation for reset
  if [ "$RESET" = true ]; then
    log_warning "WARNING: This will DROP the database '$DB_NAME'"
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    if [ "$confirm" != "yes" ]; then
      log_info "Cancelled"
      exit 0
    fi
  fi
  
  echo ""
  
  # Steps
  check_postgres
  
  if [ "$RESET" = true ]; then
    check_database && drop_database
  fi
  
  if ! check_database; then
    create_database
  fi
  
  run_migrations
  
  if [ "$LOAD_SEED" = true ]; then
    load_seed_data
  fi
  
  verify_installation
  
  echo ""
  echo -e "${GREEN}✓ Database initialization completed successfully!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Set environment variables in your .env file:"
  echo "     export DB_HOST='$DB_HOST'"
  echo "     export DB_PORT='$DB_PORT'"
  echo "     export DB_NAME='$DB_NAME'"
  echo "     export DB_USER='$DB_USER'"
  echo ""
  echo "  2. Start your application"
  echo ""
  echo "  3. Verify data: psql -d $DB_NAME -c 'SELECT * FROM farms;'"
  echo ""
}

# Run main function
main
