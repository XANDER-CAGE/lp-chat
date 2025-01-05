import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.server';
import { PrismaModule } from '../prisma/prisma.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [PrismaModule, UserModule],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}
