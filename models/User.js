const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'User'
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  nametag_color: {
    type: DataTypes.STRING(7),
    defaultValue: '#000000'
  },
  theme: {
    type: DataTypes.ENUM('light', 'dark'),
    defaultValue: 'light'
  },
  profile_picture: {
    type: DataTypes.STRING(255),
    defaultValue: '/images/default-profile.png'
  },
  is_online: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
      if (user.role === 'admin') {
        user.profile_picture = '/images/admin-profile.png';
        user.nametag_color = '#000000';
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;