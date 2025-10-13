import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { resolve, join } from "path";

config({
  path: resolve(__dirname, "../../.env"),
});

const sslValue = process.env.DATABASE_SSL?.toLowerCase();
const isSslEnabled = sslValue === "true" || sslValue === "1";

export const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "postgres",
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
  entities: [join(__dirname, "../**/*.entity{.ts,.js}")],
  migrations: [join(__dirname, "../migrations/*{.ts,.js}")],
  ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
});
