const nodemailer = require('nodemailer');

const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;

const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
    },
});

const sendMail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: EMAIL_USER,
            to,
            subject,
            text,
        });
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = sendMail;
