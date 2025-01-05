import { Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
export class BotExceptionFilter implements ExceptionFilter {
  async catch(exception: Error): Promise<void> {
    console.log('Bot exception: ' + exception.message);
  }
}
