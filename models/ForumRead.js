const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ForumRead = sequelize.define('ForumRead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  forum_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  last_read_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'forum_reads',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'forum_id']
    }
  ]
});

module.exports = ForumRead;
