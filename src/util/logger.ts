import winston from "winston";
import path from "path";
import fs from "fs";

// logs directory

const logsDir = path.join(process.cwd(), "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// colors for winston console output (errors stand out in red)
winston.addColors({
  error: "bold red",
  warn: "yellow",
  info: "cyan",
  http: "magenta",
  debug: "gray",
});

// Colorized, human-readable format for the console only.
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const text = stack || message;
    const metaStr =
      Object.keys(meta).length > 0 ? " " + JSON.stringify(meta) : "";
    return `${timestamp} [${level}]: ${text}${metaStr}`;
  }),
);

// Plain JSON format for log files (no color codes in files).
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  format: fileFormat,

  transports: [
    // combine console and file transports
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      level: "info", // Log everything: info, warn, error
      format: fileFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
    }),
  ],
});
