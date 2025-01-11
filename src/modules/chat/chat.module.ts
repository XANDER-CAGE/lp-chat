import { forwardRef, Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SocketGateway } from './socket.gateway';
import { UserModule } from '../user/user.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [PrismaModule, UserModule, forwardRef(() => BotModule)],
  controllers: [ChatController],
  providers: [SocketGateway, ChatService],
  exports: [ChatService, SocketGateway],
})
export class ChatModule {}
