import dotenv from 'dotenv';
dotenv.config();

export const MONGO_CONFIG = {
  URI: (process.env.MONGODB_URI || 'mongodb://localhost:27017/') + (process.env.DB_NAME || 'faithly'),
};

export const TWILIO_CONFIG = {
  ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  FROM_PHONE: process.env.TWILIO_PHONE,
};
