const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    phone: {
        type: DataTypes.STRING(16),
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    password: {
        type: DataTypes.STRING(40),
        allowNull: false,
    },
    passwordChangedAt: {
        type: DataTypes.DATE,
    },
    firstName: {
        type: DataTypes.STRING(20),
        allowNull: false,
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
    },
    lastSeen: {
        type: DataTypes.DATE,
    },
});

module.exports = User;
