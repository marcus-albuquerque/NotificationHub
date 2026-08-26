-- NotificationHub Database Schema
-- Migration: 001_create_tables.sql
-- Description: Creates core tables for farms, producers, devices, events, event_history, and notifications

-- Create Farms table
CREATE TABLE IF NOT EXISTS farms (
  farm_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  producer_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Producers table
CREATE TABLE IF NOT EXISTS producers (
  producer_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notification_preferences JSONB DEFAULT '{"channels": ["WhatsApp"], "quietHours": "22:00-06:00"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Devices table
CREATE TABLE IF NOT EXISTS devices (
  device_id VARCHAR(50) NOT NULL,
  farm_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sensor_type VARCHAR(50) NOT NULL CHECK (sensor_type IN (
    'AIR_TEMPERATURE',
    'AIR_HUMIDITY',
    'SOIL_MOISTURE',
    'WATER_RESERVOIR_LEVEL',
    'SILO_LEVEL',
    'EQUIPMENT_STATUS'
  )),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_reading_at TIMESTAMP WITH TIME ZONE,
  last_value VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id, farm_id),
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
);

-- Create Events table
CREATE TABLE IF NOT EXISTS events (
  event_id VARCHAR(100) PRIMARY KEY,
  farm_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  sensor_type VARCHAR(50) NOT NULL CHECK (sensor_type IN (
    'AIR_TEMPERATURE',
    'AIR_HUMIDITY',
    'SOIL_MOISTURE',
    'WATER_RESERVOIR_LEVEL',
    'SILO_LEVEL',
    'EQUIPMENT_STATUS'
  )),
  value VARCHAR(255) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
  FOREIGN KEY (device_id, farm_id) REFERENCES devices(device_id, farm_id) ON DELETE CASCADE
);

-- Create Event History table
CREATE TABLE IF NOT EXISTS event_history (
  history_id VARCHAR(100) PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  farm_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  
  -- Reception stage
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Validation stage
  validation_status VARCHAR(20) DEFAULT 'valid' CHECK (validation_status IN ('valid', 'rejected')),
  validation_error VARCHAR(500),
  
  -- Duplicate detection stage
  is_duplicate BOOLEAN DEFAULT FALSE,
  previous_event_id VARCHAR(100),
  
  -- Rule application stage
  fired_rules JSONB DEFAULT '[]'::jsonb,
  
  -- Notifications and dispatch
  notifications JSONB DEFAULT '[]'::jsonb,
  
  -- Pipeline completion
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  processing_duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
);

-- Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id VARCHAR(100) PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  farm_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  producer_id VARCHAR(50) NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  event_value VARCHAR(255),
  event_timestamp TIMESTAMP WITH TIME ZONE,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  dispatch_status VARCHAR(20) DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'sent', 'failed', 'retrying')),
  dispatch_error VARCHAR(500),
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
  FOREIGN KEY (producer_id) REFERENCES producers(producer_id) ON DELETE CASCADE
);

-- Create indexes for query performance
CREATE INDEX IF NOT EXISTS idx_events_event_id ON events(event_id);
CREATE INDEX IF NOT EXISTS idx_events_farm_id ON events(farm_id);
CREATE INDEX IF NOT EXISTS idx_events_device_id ON events(device_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_farm_timestamp ON events(farm_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_device_timestamp ON events(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_sensor_type ON events(sensor_type);

CREATE INDEX IF NOT EXISTS idx_event_history_event_id ON event_history(event_id);
CREATE INDEX IF NOT EXISTS idx_event_history_farm_id ON event_history(farm_id);
CREATE INDEX IF NOT EXISTS idx_event_history_device_id ON event_history(device_id);
CREATE INDEX IF NOT EXISTS idx_event_history_processed_at ON event_history(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_history_validation_status ON event_history(validation_status);
CREATE INDEX IF NOT EXISTS idx_event_history_is_duplicate ON event_history(is_duplicate);

CREATE INDEX IF NOT EXISTS idx_notifications_notification_id ON notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_farm_id ON notifications(farm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_producer_id ON notifications(producer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dispatch_status ON notifications(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_notifications_generated_at ON notifications(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_rule_id ON notifications(rule_id);

CREATE INDEX IF NOT EXISTS idx_devices_farm_id ON devices(farm_id);
CREATE INDEX IF NOT EXISTS idx_devices_sensor_type ON devices(sensor_type);

CREATE INDEX IF NOT EXISTS idx_farms_producer_id ON farms(producer_id);

-- Add foreign key constraint between producers and farms
ALTER TABLE farms 
ADD CONSTRAINT fk_farms_producer_id 
FOREIGN KEY (producer_id) REFERENCES producers(producer_id) ON DELETE RESTRICT;
