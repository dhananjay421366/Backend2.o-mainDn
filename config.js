import Pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const dbConfig = {
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
};;
const db = new Pg.Client(dbConfig)
db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch(err => console.error("Connection error", err.stack));

export default db;
