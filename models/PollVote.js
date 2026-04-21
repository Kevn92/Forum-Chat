const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PollVote = sequelize.define('PollVote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  poll_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  option_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID of the selected option'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'poll_votes',
  indexes: [
    {
      unique: true,
      fields: ['poll_id', 'user_id'],
      name: 'idx_unique_user_poll_vote'
    }
  ]
});

module.exports = PollVote;
