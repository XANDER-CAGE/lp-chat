import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  BadRequestException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { UserService } from '../user/user.service';
import { ChatService } from './chat.service';
import { UpdateMessageDto } from './dto/message.dto';

@Injectable()
@WebSocketGateway({
  cors: '*',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  @WebSocketServer() server: Server = new Server();

  test() {
    return this.server.emit('test', 'test');
  }

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
        // status: { in: ['active', 'init'] },
        clientId: result.data.id,
      },
    });

    if (!chat) {
      const error = new NotFoundException('Chat not found or already closed');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(socket.id).emit('error', data);
      return socket.disconnect();
    }

    socket['user'] = result.data;
    socket['chatId'] = chatId;
    socket['consultationId'] = chat.consultationId;
    this.server.in(socket.id).socketsJoin(chat.id.toString());
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    console.log(`Socket disconnected: ${socket.id}`);
  }

  sendMessageViaSocket(chatId: string, message: any) {
    this.server.to(chatId).emit('chat', CoreApiResponse.success(message));
  }

  sendMessageToAcceptOperator(chatId: string, message: any) {
    this.server.to(chatId).emit('accepted', CoreApiResponse.success(message));
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

  @SubscribeMessage('message')
  async sendMessageHandle(@MessageBody() data: any, @ConnectedSocket() client: any) {
    if (!client?.chatId) {
      const error = new NotFoundException('Chat not found or already closed');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(client.id).emit('error', data);
      return client.disconnect();
    }

    if (!client?.consultationId) {
      const error = new NotFoundException('Consultation not found or already closed');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(client.id).emit('error', data);
      return client.disconnect();
    }

    const response = await this.chatService.message(data, client.user);

    if (!response.success) {
      throw new BadRequestException(response.message);
    }

    return this.server.to(client.chatId).emit('chat', CoreApiResponse.success(response.data));
  }

  @SubscribeMessage('message:update')
  async updateMessageHandle(@MessageBody() data: UpdateMessageDto, @ConnectedSocket() client: any) {
    const response = await this.chatService.updateMessage(data, client.user);
    return this.server.to(client.chatId).emit('chat', CoreApiResponse.success(response));
  }
}
