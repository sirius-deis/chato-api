require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./db/db.config');
const { redisConnect } = require('./db/redis.config');
const logger = require('./api/logger');
require('./associations');

const { PORT = 3000 } = process.env;

let server;

const connect = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Connection has been established successfully.');
  } catch (error) {
    logger.error(`${error}`);
  }
};

const sync = async () => {
  await sequelize.sync({ force: false });
  logger.info('All models were synchronized successfully.');
};

const start = async () => {
  await connect();
  await sync();
  await redisConnect();
  server = app.listen(PORT, () => {
    global.serverStartedAt = new Date();
    logger.info(`Server is running on port: ${PORT}`);
  });
};

['unhandledRejection', 'uncaughtException'].forEach((event) => {
  const index = event.search(/[A-Z]/);
  process.on(event, (err) => {
    logger.error(
      `Server is running on port: ${event.slice(0, index).toUpperCase()} ${event.slice(index).toUpperCase()}. \n ${
        err.message
      }`,
    );
    server.close(() => {
      process.exit(1);
    });
  });
});

['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((event) => {
  process.on(event, () => {
    logger.error(`${event} RECEIVED!`);
    server.close(() => {
      logger.error('Process terminated');
    });
  });
});

start();
