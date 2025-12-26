
import * as mock from "./mock.js";
import * as mongo from "./mongo.js";
import dotenv from 'dotenv';

dotenv.config();

export const data =
  process.env.USE_MOCK === "true" ? mock : mongo;
