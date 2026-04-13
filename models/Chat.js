const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chat = sequelize.define('Chat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  forum_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  parent_chat_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  read_by: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of user IDs who have read this message'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'chats'
});

module.exports = Chat;