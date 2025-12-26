
import * as mock from "./mock.js";
import * as real from "./real.js";
import dotenv from 'dotenv';

dotenv.config();


export const whatsapp =
  process.env.USE_MOCK === "true" ? mock : real;
