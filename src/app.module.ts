import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ChatModule } from './modules/chat/chat.module';
import { BotModule } from './modules/bot/bot.module';
import { NestjsGrammyModule } from '@grammyjs/nestjs';
import { env } from './common/config/env.config';
import { FileModule } from './modules/file/file.module';
import { UserModule } from './modules/user/user.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TopicModule } from './modules/topic/topic.module';
import { APP_GUARD } from '@nestjs/core';
import { SocketModule } from './modules/socket/socket.module';
import { AuthGuard } from './common/guard/auth.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ChatModule,
    BotModule,
    FileModule,
    NestjsGrammyModule.forRoot({
      token: env.BOT_TOKEN,
    }),

    JwtModule.register({
      global: true,
      secret: env.JWT_SECRET,
    }),
    UserModule,
    TopicModule,
    SocketModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
