-- ========================================
-- Forum Chat Database Schema
-- Database: MySQL
-- Generated: 2026-04-11
-- ========================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `forum_chat_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `forum_chat_db`;

-- ========================================
-- Table: users
-- Description: Stores user account information
-- ========================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `nickname` VARCHAR(50) NOT NULL DEFAULT 'User',
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  `nametag_color` VARCHAR(7) NOT NULL DEFAULT '#000000',
  `theme` ENUM('light', 'dark') NOT NULL DEFAULT 'light',
  `profile_picture` VARCHAR(255) NOT NULL DEFAULT '/images/default-profile.png',
  `is_online` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`)
) ENGINE=InnoDB 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Table: forums
-- Description: Stores forum threads
-- ========================================
CREATE TABLE IF NOT EXISTS `forums` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `creator_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_creator_id` (`creator_id`),
  CONSTRAINT `fk_forums_creator` 
    FOREIGN KEY (`creator_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Table: chats
-- Description: Stores chat messages within forums
-- ========================================
CREATE TABLE IF NOT EXISTS `chats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `forum_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `parent_chat_id` INT DEFAULT NULL,
  `message` TEXT NOT NULL,
  `read_by` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_forum_id` (`forum_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_parent_chat_id` (`parent_chat_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_chats_forum` 
    FOREIGN KEY (`forum_id`) 
    REFERENCES `forums` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_chats_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_chats_parent` 
    FOREIGN KEY (`parent_chat_id`) 
    REFERENCES `chats` (`id`) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Table: forum_reads
-- Description: Tracks user's last read time for each forum
-- ========================================
CREATE TABLE IF NOT EXISTS `forum_reads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `forum_id` INT NOT NULL,
  `last_read_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_forum` (`user_id`, `forum_id`),
  INDEX `idx_forum_id` (`forum_id`),
  CONSTRAINT `fk_forum_reads_user` 
    FOREIGN KEY (`user_id`) 
    REFERENCES `users` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT `fk_forum_reads_forum` 
    FOREIGN KEY (`forum_id`) 
    REFERENCES `forums` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- ========================================
-- Sample Data (Optional)
-- ========================================

-- Insert admin user (password: admin123)
INSERT INTO `users` (`username`, `password`, `phone`, `nickname`, `role`, `nametag_color`, `profile_picture`) VALUES
('admin', '$2b$10$YourHashedPasswordHere', '081234567890', 'Admin', 'admin', '#000000', '/images/admin-profile.png');

-- Insert sample regular user (password: user123)
INSERT INTO `users` (`username`, `password`, `phone`, `nickname`, `role`, `nametag_color`) VALUES
('user1', '$2b$10$YourHashedPasswordHere', '081234567891', 'User One', 'user', '#3b82f6');

-- Insert sample forum
INSERT INTO `forums` (`title`, `creator_id`) VALUES
('General Discussion', 1);

-- Insert sample chat message
INSERT INTO `chats` (`forum_id`, `user_id`, `message`, `read_by`) VALUES
(1, 1, 'Welcome to the forum! Feel free to discuss here.', '[1]');

-- ========================================
-- Useful Queries (Reference)
-- ========================================

-- Get all users with their message count
-- SELECT u.*, COUNT(c.id) as message_count 
-- FROM users u 
-- LEFT JOIN chats c ON u.id = c.user_id 
-- GROUP BY u.id;

-- Get all forums with creator info
-- SELECT f.*, u.username, u.nickname 
-- FROM forums f 
-- JOIN users u ON f.creator_id = u.id 
-- ORDER BY f.created_at DESC;

-- Get chat messages with user details
-- SELECT c.*, u.nickname, u.role, u.nametag_color, u.profile_picture 
-- FROM chats c 
-- JOIN users u ON c.user_id = u.id 
-- WHERE c.forum_id = ? 
-- ORDER BY c.created_at ASC;

-- Get unread forums for a user
-- SELECT f.* 
-- FROM forums f 
-- LEFT JOIN forum_reads fr ON f.id = fr.forum_id AND fr.user_id = ?
-- WHERE fr.last_read_at IS NULL OR fr.last_read_at < (
--   SELECT MAX(c.created_at) FROM chats c WHERE c.forum_id = f.id
-- );

-- ========================================
-- Indexes for Performance (Already included in CREATE TABLE)
-- ========================================
-- users: idx_username (UNIQUE)
-- forums: idx_creator_id
-- chats: idx_forum_id, idx_user_id, idx_parent_chat_id, idx_created_at
-- forum_reads: idx_user_forum (UNIQUE), idx_forum_id

-- ========================================
-- Notes:
-- ========================================
-- 1. All tables use InnoDB engine for foreign key support
-- 2. Foreign keys have CASCADE DELETE for automatic cleanup
-- 3. UTF8MB4 charset for full Unicode support (including emojis)
-- 4. JSON column `read_by` in chats table stores array of user IDs
-- 5. `is_online` field is boolean (TINYINT) for tracking online status
-- 6. Timestamps auto-managed with CURRENT_TIMESTAMP and ON UPDATE
