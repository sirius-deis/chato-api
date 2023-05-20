const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

const { MODE = 'production' } = process.env;
const corsOptions = {
    origin: true,
    credentials: true,
};
const limiter = rateLimit({
    max: 1000,
    windowsMs: 60 * 60 * 1000,
    message: 'Too many request from this IP, please try again later',
});

if (MODE === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('tiny'));
}
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(limiter);
app.use(helmet());

module.exports = app;
