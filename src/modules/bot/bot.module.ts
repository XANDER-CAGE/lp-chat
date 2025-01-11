import { forwardRef, Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FileModule } from '../file/file.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, FileModule, forwardRef(() => ChatModule)],
  providers: [BotController, BotService],
  exports: [BotService],
})
export class BotModule {}
