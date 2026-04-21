const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Poll = sequelize.define('Poll', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  forum_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  creator_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  question: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  options: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of poll options: [{id, text, votes}]'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'polls'
});

module.exports = Poll;
