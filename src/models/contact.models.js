const { DataTypes } = require('sequelize');
const { sequelize } = require('../db/db.config');

const Contact = sequelize.define('contacts', {});
