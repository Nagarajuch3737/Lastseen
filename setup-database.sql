-- Create Database
CREATE DATABASE IF NOT EXISTS lastseen DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lastseen;

-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  notes TEXT,
  createdAt VARCHAR(255) NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (createdAt DESC),
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add some test data
-- INSERT INTO items (id, name, notes, createdAt) VALUES 
-- ('test-1', 'Sample Item', 'This is a test', NOW());

-- Show table structure
DESCRIBE items;
