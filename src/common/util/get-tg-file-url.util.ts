import { env } from '../config/env.config';

export function getFileUrl(filePath: string): string {
  return `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${filePath}`;
}
