import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { message } from '@prisma/client';
import { UserService } from '../user/user.service';

@Injectable()
@WebSocketGateway()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  @WebSocketServer() server: Server = new Server();

  // @SubscribeMessage('chat')
  // async handleChatEvent(@MessageBody() payload: any) {
  //   console.log(payload);

  //   this.server.to(payload.roomName).emit('chat', payload); // broadcast messages
  //   return payload;
  // }

  async handleConnection(socket: Socket) {
    const chatId = socket?.handshake?.query?.chatId?.toString();
    if (!chatId) {
      const error: HttpException = new BadRequestException('"chatId" in params not found');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(socket.id).emit('error', data);
      return socket.disconnect();
    }
    const jwt = socket?.handshake?.headers?.authorization;
    if (!jwt) {
      const error: HttpException = new BadRequestException(
        'Authorization token should be provided',
      );
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(socket.id).emit('error', data);
      return socket.disconnect();
    }
    const result = await this.userService.validate(jwt);
    if (!result.success) {
      const error: HttpException = new UnauthorizedException();
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(socket.id).emit('error', data);
      return socket.disconnect();
    }
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        status: { in: ['active', 'init'] },
        clientId: result.data.id,
      },
    });
    if (!chat) {
      const error = new NotFoundException('Chat not found or already closed');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(socket.id).emit('error', data);
      return socket.disconnect();
    }
    this.server.in(socket.id).socketsJoin(chat.id.toString());
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    console.log(`Socket disconnected: ${socket.id}`);
  }

  sendMessageViaSocket(chatId: string, message: message) {
    this.server.to(chatId).emit('chat', CoreApiResponse.success(message));
  }

  sendMessageToAcceptOperator(consultationId: string, message: any) {
    this.server.to(consultationId).emit('accepted', CoreApiResponse.success(message));
  }

  disconnectChatMembers(chatId: string) {
    try {
      const room = this.server.sockets.adapter.rooms.get(chatId.toString());
      if (!room) throw 'Room not found';
      room.forEach((socketId) => {
        const client = this.server.sockets.sockets.get(socketId);
        if (!client) throw 'There is no client';
        client.disconnect();
        console.log(`members of chat ${chatId} disconnected`);
      });
    } catch (error) {
      console.log(error);
    }
  }
}
