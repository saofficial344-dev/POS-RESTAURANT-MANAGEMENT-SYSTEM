import { createLogger, format, transports } from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logDir    = join(__dirname, '../../logs');

if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors, json } = format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${stack || message}${extra}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const isProd = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level:  process.env.LOG_LEVEL || 'info',
  format: isProd ? prodFormat : devFormat,
  transports: [
    new transports.Console(),
    ...(isProd
      ? [
          new transports.File({ filename: join(logDir, 'error.log'),    level: 'error', maxsize: 10_485_760, maxFiles: 5 }),
          new transports.File({ filename: join(logDir, 'combined.log'),               maxsize: 10_485_760, maxFiles: 5 }),
        ]
      : []),
  ],
});

export default logger;
