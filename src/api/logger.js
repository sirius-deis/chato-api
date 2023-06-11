const { createLogger, format, addColors, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.json(),
    format.colorize(),
    format.simple(),
    format.timestamp(),
    format.align(),
    format.prettyPrint(),
    format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
  ),
  transports: [new transports.Console()],
});

addColors({
  info: 'green',
  error: 'red',
  warn: 'orange',
  debug: 'yellow',
});

module.exports = logger;
