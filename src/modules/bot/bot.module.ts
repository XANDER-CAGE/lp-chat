import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FileModule } from '../file/file.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [PrismaModule, FileModule, SocketModule],
  providers: [BotController, BotService],
  exports: [BotService],
})
export class BotModule {}
