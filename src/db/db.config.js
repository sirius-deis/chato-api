const Sequelize = require('sequelize');
const chalk = require('chalk');

const { DB_SCHEMA, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env;

const db = {};

const sequelize = new Sequelize(DB_SCHEMA, DB_USER, DB_PASSWORD, {
    dialect: 'mysql',
    host: DB_HOST,
    port: DB_PORT,
    logging: (...msg) =>
        console.log(
            chalk.bgMagentaBright.bold('DB STATUS'),
            chalk.magentaBright(msg)
        ),
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
