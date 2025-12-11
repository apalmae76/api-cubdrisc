import * as Joi from 'joi';

export type IEnv = {
  PORT: number;
  NODE_ENV: 'test' | 'local' | 'development' | 'staging' | 'production';

  LIST_OF_AUTHORIZED_ADDRESSES: string;
  API_URL_CALLBACK: string;

  BASE_URL_WEB: string;

  // LOG_LEVEL values: trace, debug, info, warn, error
  LOG_LEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error';

  SEQ_SERVICE_NAME: string;
  SEQ_SERVER_URL: string;
  SEQ_API_KEY: string;

  OTP_EMAIL_EXPIRATION_TIME: number;
  OTP_BLOCKING_TIME: number;
  LINK_EMAIL_EXPIRATION_TIME: number;

  JWT_TOKEN_SECRET: string;
  JWT_TOKEN_EXPIRATION_TIME: number;
  JWT_REFRESH_TOKEN_SECRET: string;
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: number;

  DATABASE_URL: string; //postgres:postgres@localhost:5432/api

  DATABASE_SSL_CERT: string;
  DATABASE_SCHEMA: string;
  DATABASE_SYNCHRONIZE: boolean;
  DATABASE_LOGS: boolean;

  DATABASE_SLOW_QUERY_MAX_TIME: number;

  REDIS_HOST: string;
  REDIS_PORT: number;

  REDIS_PASS: string;

  SMTP_AUTHENTICATION: string;
  SMTP_ENABLE_STARTTLS_AUTO: boolean;
  SMTP_DEBUG: boolean;
  SMTP_LOGGER: boolean;
  SMTP_PORT: number;

  SMTP_ADDRESS: string;
  SMTP_USER_NAME: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_ADDRESS: string;
  SMTP_FROM_USER: string;

  JOB_LIDER: boolean;
};

export const validationSchema = Joi.object({
  PORT: Joi.string().pattern(/^\d+$/).empty('').default('3000'),
  NODE_ENV: Joi.string()
    .valid('test', 'local', 'development', 'staging', 'production')
    .default('development'),
  BASE_URL_WEB: Joi.string().domain().required(),
  LIST_OF_AUTHORIZED_ADDRESSES: Joi.string().required(),
  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error')
    .default('development'),
  API_KEY_FOR_PHONE_CALL_SERVICE: Joi.string().default('NONE'),

  SEQ_SERVER_URL: Joi.string().required(),
  SEQ_API_KEY: Joi.string().required(),

  OTP_EMAIL_EXPIRATION_TIME: Joi.number().default(350),
  OTP_BLOCKING_TIME: Joi.number().default(30),
  OTP_MAX_ALLOWED_COUNT: Joi.number().default(3),

  JWT_TOKEN_SECRET: Joi.string().required(),
  JWT_TOKEN_EXPIRATION_TIME: Joi.string().required(),
  JWT_REFRESH_TOKEN_SECRET: Joi.string().required(),
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: Joi.string().required(),
  // DATABASE
  DATABASE_URL: Joi.string().required(),
  DATABASE_SSL_CERT: Joi.string().required(),
  DATABASE_SCHEMA: Joi.string().default('public'),
  DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  DATABASE_LOGS: Joi.boolean().default(false),
  DATABASE_SLOW_QUERY_MAX_TIME: Joi.string()
    .pattern(/^\d+$/)
    .empty('')
    .default('2000'),
  // REDIS
  REDIS_HOST: Joi.string().hostname().required(),
  REDIS_PORT: Joi.string().pattern(/^\d+$/).empty('').default('6379'),
  REDIS_PASS: Joi.string().empty('').default(''),
  // MAIL
  SMTP_ADDRESS: Joi.string().hostname().required(),
  SMTP_PORT: Joi.string().pattern(/^\d+$/).required(),
  SMTP_AUTHENTICATION: Joi.string().required(),
  SMTP_ENABLE_STARTTLS_AUTO: Joi.string()
    .valid('true', 'false')
    .empty('')
    .default('true'),
  SMTP_USER_NAME: Joi.string().required(),
  SMTP_PASSWORD: Joi.string().required(),
  SMTP_FROM_ADDRESS: Joi.string().email().required(),
  SMTP_FROM_USER: Joi.string().required(),
  SMTP_DEBUG: Joi.boolean().default(false),
  SMTP_LOGGER: Joi.boolean().default(false),
  // SENTRY
  SENTRY_DSN: Joi.string().default('NONE'),
  // SET JOB LIDER POD (Optional)
  JOB_LIDER: Joi.boolean().default(false),
});
