require('dotenv').config();
const mysql = require('mysql2');

const { ACTION, DB_HOST, DB_USER, DB_PASSWORD } = process.env;

const connection = mysql
  .createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
  })
  .promise();

const createDB = () => {
  connection.query('DROP DATABASE IF EXISTS test_db').then((_) => {
    connection.query('CREATE DATABASE IF NOT EXISTS test_db').then((_2) => {
      connection.destroy();
    });
  });
};

const dropDB = () => {
  connection.query('DROP DATABASE IF EXISTS test_db').then((_) => {
    connection.destroy();
  });
};

if (ACTION === 'create') {
  createDB();
}

if (ACTION === 'drop') {
  dropDB();
}
