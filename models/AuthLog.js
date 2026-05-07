const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuthLog = sequelize.define('AuthLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true // Bisa null jika ada skenario tidak diketahui, tapi umumnya diset untuk track login gagal
  },
  activity: {
    type: DataTypes.ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'REGISTER_SUCCESS'),
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'auth_logs',
  timestamps: true, // Akan otomatis membuat createdAt dan updatedAt
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AuthLog;
