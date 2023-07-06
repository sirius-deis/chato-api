const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../db/db.config');

const User = sequelize.define(
  'users',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(16),
      unique: true,
    },
    email: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      field: 'password_changed_at',
    },
    firstName: {
      type: DataTypes.STRING(20),
    },
    lastName: {
      type: DataTypes.STRING(20),
    },
    bio: {
      type: DataTypes.TEXT,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isReported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isBlocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'moderator', 'admin'),
      defaultValue: 'user',
    },
    lastSeen: {
      type: DataTypes.DATE,
    },
  },
  {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 10);
          user.passwordChangedAt = new Date();
        }
      },
    },
    defaultScope: {
      attributes: {
        exclude: [
          'lastSeen',
          'isOnline',
          'isActive',
          'isReported',
          'isBlocked',
          'passwordChangedAt',
          'createdAt',
          'updatedAt',
          'password',
        ],
      },
    },
  },
);

User.prototype.validatePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

User.addScope('withPassword', {
  attributes: {
    include: ['password'],
  },
});

User.addScope('withIsActive', {
  attributes: {
    include: ['isActive'],
  },
});

module.exports = User;
