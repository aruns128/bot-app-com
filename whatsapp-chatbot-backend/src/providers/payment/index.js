import * as mock from "./mock.js";
import * as razorpay from "./razorpay.js";
import dotenv from 'dotenv';

dotenv.config();

export const payment =
  process.env.USE_MOCK === "true" ? mock : razorpay;
