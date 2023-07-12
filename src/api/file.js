const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Provided file type is not allowed', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadFile = (name) => upload.single(name);

exports.uploadFiles = (name, max) => upload.array(name, max);

exports.resizeAndSave = async (buffer, { width, height }, format, path) => {
  // eslint-disable-next-line newline-per-chained-call
  await sharp(buffer).resize(width, height).toFormat(format)[format]({ quality: 50 }).toFile(path);
};
