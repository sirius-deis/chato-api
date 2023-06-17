const Sequelize = require('sequelize');
const logger = require('../api/logger');

const { DB_SCHEMA, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, NODE_ENV } = process.env;

const db = {};

const sequelize = new Sequelize(DB_SCHEMA, DB_USER, DB_PASSWORD, {
  dialect: 'mysql',
  host: DB_HOST,
  port: DB_PORT,
  logging: NODE_ENV === 'development' ? (...msgs) => logger.info(msgs) : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
