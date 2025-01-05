import { config } from 'dotenv';
import { cleanEnv, num, str } from 'envalid';

config();

export const env = cleanEnv(process.env, {
  PORT: num({ default: 3000, example: '3000' }),
  NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
  API_HOST: str({ default: 'localhost' }),
  MINIO_ACCESS_KEY: str(),
  MINIO_ENDPOINT: str(),
  MINIO_PORT: str(),
  MINIO_SECRET_KEY: str(),
  MINIO_BUCKET: str(),
  BOT_TOKEN: str(),
  KEYCLOAK_HOST: str(),
  KEYCLOAK_CLIENT_ID: str(),
  KEYCLOAK_REALM: str(),
  KEYCLOAK_CLIENT_SECRET: str(),
  REJECTED_MESSAGE_TIMEOUT_IN_MINUTES: num({ default: 30 }),
  FIND_FREE_OPERATORS_CRON_PATTERN: str({ default: '*/1 * * * *' }),

  JWT_SECRET: str(),
  JWT_SECRET_DOCTOR: str(),
});
