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
import { ConsultationStatus } from './enum';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
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
    const consultationId = socket?.handshake?.query?.consultationId?.toString();

    if (!consultationId) {
      const error: HttpException = new BadRequestException('"consultationId" in params not found');
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

    const exitConsultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
      },
    });

    if (!exitConsultation?.id) {
      const error = new NotFoundException('Consultation not found or already closed');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(socket.id).emit('error', data);
      return socket.disconnect();
    }

    socket['user'] = result.data;
    socket['chatId'] = exitConsultation?.chatId;
    socket['consultationId'] = consultationId;
    this.server.in(socket.id).socketsJoin(consultationId.toString());
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    console.log(`Socket disconnected: ${socket.id}`);
  }

  sendMessageViaSocket(consultationId: string, message: any) {
    this.server.to(consultationId).emit('chat', CoreApiResponse.success(message));
  }

  sendMessageToAcceptOperator(consultationId: string, message: any) {
    this.server.to(consultationId).emit('accepted', CoreApiResponse.success(message));
  }

  disconnectChatMembers(consultationId: string) {
    try {
      const room = this.server.sockets.adapter.rooms.get(consultationId.toString());
      if (!room) throw 'Room not found';
      room.forEach((socketId) => {
        const client = this.server.sockets.sockets.get(socketId);
        if (!client) throw 'There is no client';
        client.disconnect();
        console.log(`members of chat ${consultationId} disconnected`);
      });
    } catch (error) {
      console.log(error);
    }
  }

  sendActiveOperatorsViaSocket(message: any) {
    return this.server.emit('getActiveOperator', CoreApiResponse.success(message));
  }
  sendStopActionToClientViaSocket(consultationId: string, message: any) {
    return this.server
      .to(consultationId)
      .emit('stopConsultation', CoreApiResponse.success(message));
  }

  @SubscribeMessage('message')
  async sendMessageHandle(@MessageBody() data: any, @ConnectedSocket() client: any) {
    if (!client?.consultationId) {
      const error = new NotFoundException('Consultation not found or already closed');
      const data = CoreApiResponse.error(error.getResponse());
      this.server.to(client.id).emit('error', data);
      return client.disconnect();
    }

    const existConsultation = await this.prisma.consultation.findFirst({
      where: {
        id: client?.consultationId,
      },
    });

    if (!existConsultation) {
      throw new BadRequestException('Consultation not found or already closed');
    }

    if (existConsultation.status === ConsultationStatus.NEW) {
      throw new BadRequestException('Can not send message');
    }

    const response = await this.chatService.message(data, client.user);

    if (!response.success) {
      throw new BadRequestException(response.message);
    }

    return this.server
      .to(client.consultationId)
      .emit('acceptMyMessage', CoreApiResponse.success(response.data));
  }

  @SubscribeMessage('message:update')
  async updateMessageHandle(@MessageBody() data: UpdateMessageDto, @ConnectedSocket() client: any) {
    const response = await this.chatService.updateMessage(data, client.user);
    return this.server
      .to(client.consultationId)
      .emit('updateMyMessage', CoreApiResponse.success(response));
  }
}
