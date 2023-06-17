require('dotenv').config();
const Sequelize = require('sequelize');

const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT } = process.env;

const sequelize = new Sequelize('test_db', DB_USER, DB_PASSWORD, {
  dialect: 'mysql',
  host: DB_HOST,
  port: DB_PORT,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
