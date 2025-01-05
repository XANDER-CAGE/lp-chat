import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [PrismaModule, BotModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
