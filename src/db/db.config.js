const Sequelize = require('sequelize');
const logger = require('../api/logger');

const { DB_SCHEMA, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

const db = {};

const sequelize = new Sequelize(DB_SCHEMA, DB_USER, DB_PASSWORD, {
  dialect: 'mysql',
  host: DB_HOST,
  port: DB_PORT,
  logging: (...msgs) => logger.info(msgs),
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
