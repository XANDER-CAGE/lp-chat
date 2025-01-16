import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatDto } from './dto/chat.dto';
import { BotService } from '../bot/bot.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { findOperatorsCronId } from 'src/common/var/index.var';
import { CreateMessageDto, GetMessagesByChatIdDto, UpdateMessageDto } from './dto/message.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ChatListDto } from './dto/chat-list.dto';
import { RejectedChatListDto } from './dto/rejectted-chat-list.dto';
import { objectId } from 'src/common/util/formate-message.util';
import { IUser } from 'src/common/interface/my-req.interface';
import { MessageTypeEnum } from './enum';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
    private schedulerRegistry: SchedulerRegistry,
    private socket: SocketGateway,
  ) {}

  async test() {
    return this.socket.test();
  }

  async message(dto: CreateMessageDto, user: IUser) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: dto.consultationId },
    });

    if (!consultation?.id) {
      throw new NotFoundException('Consultation not found');
    }

    let chat: any = await this.prisma.chat.findFirst({
      where: {
        clientId: user.id,
        status: { in: ['active', 'init'] },
        consultationId: dto.consultationId,
      },
      include: { messages: true },
    });

    if (!chat) {
      chat = await this.chatCreate(
        {
          consultationId: dto.consultationId,
          type: 'init',
        },
        user,
      );
    }

    for (const mes of dto.messages) {
      let file: any;
      if (mes.fileId) {
        file = await this.prisma.file.findFirst({
          where: { id: mes.fileId },
        });
        if (!file) throw new NotFoundException('File not found');
      }

      const message = await this.prisma.message.create({
        data: {
          authorId: user.id,
          chatId: chat.id,
          id: objectId(),
          content: mes.content,
          fileId: mes.fileId,
          type: mes.type,
          transactionId: mes.transaction_id,
          rate: mes.rate || null,
          repliedMessageId: mes.repliedMessageId,
          createdAt: mes.createdAt,
        },
        include: { chat: true },
      });
      if (chat.status == 'init') {
        const operators = await this.prisma.user.findMany({
          where: {
            approvedAt: { not: null },
            telegramId: { not: null },
            blockedAt: null,
            operatorChats: { none: { status: 'active' } },
            shiftStatus: 'active',
          },
        });
        const history: any = await this.getMessages({}, user);
        history.availableOperators = operators.length;
        const job = this.schedulerRegistry.getCronJob(findOperatorsCronId);

        await this.prisma.consultation.update({
          where: {
            id: dto.consultationId,
          },
          data: {
            chatId: chat.id,
            topicId: chat.topicId,
          },
        });
        await this.prisma.consultationOrder.create({
          data: {
            consultationId: dto.consultationId,
            userId: user.userId,
            status: 'waiting',
          },
        });
        job.start();
        return history;
      }
      await this.botService.messageViaBot(message.id);
    }

    return {
      success: true,
      chatId: chat.id,
      consultationId: chat.consultationId,
    };
  }

  async startChatWithOperator(dto: CreateMessageDto, user: IUser) {
    const consultation = await this.prisma.consultation.findFirst({
      where: { id: dto.consultationId },
    });

    if (!consultation?.id) {
      throw new NotFoundException('Consultation not found');
    }

    const operator = await this.prisma.user.findFirst({
      where: {
        id: dto.operatorId,
        blockedAt: null,
        approvedAt: { not: null },
        telegramId: { not: null },
        shiftStatus: 'active',
        operatorChats: { none: { status: 'active' } },
      },
      include: { rejectedChats: true },
    });

    if (!operator) {
      throw new NotFoundException('Operator not found');
    }

    let chat: any = await this.prisma.chat.findFirst({
      where: {
        clientId: user.id,
        status: { in: ['active', 'init'] },
        consultationId: dto.consultationId,
      },
      include: { messages: true, client: true },
    });

    return this.prisma.$transaction(async (trx) => {
      if (!chat) {
        chat = await this.chatCreate(
          {
            consultationId: dto.consultationId,
            type: 'active',
          },
          user,
          trx,
        );
      }

      // console.log(chat);
      let message = [];
      await trx.consultation.update({
        where: {
          id: dto.consultationId,
        },
        data: {
          chatId: chat.id,
          topicId: chat.topicId,
        },
      });

      for (const mes of dto.messages) {
        let file: any;
        if (mes.fileId) {
          file = await this.prisma.file.findFirst({
            where: { id: mes.fileId },
          });
          if (!file) throw new NotFoundException('File not found');
        }

        message.push({
          authorId: user.id,
          chatId: chat.id,
          id: objectId(),
          content: mes.content,
          fileId: mes.fileId,
          type: mes.type,
          transactionId: mes.transaction_id,
          rate: mes.rate || null,
          repliedMessageId: mes.repliedMessageId,
          createdAt: mes.createdAt,
        });

        // await this.botService.messageViaBot(message.id);
      }

      await trx.message.createMany({
        data: message,
      });

      console.log(operator, chat.client, chat.id, chat.topic.name);

      await this.botService.sendShowButton(operator, chat.client, chat.id, chat.topic.name);

      // await this.botService.send ReceiveConversationButton(
      //   [operator],
      //   chat.client,
      //   chat.id,
      //   chat.topic.name,
      // );

      return {
        success: true,
        chatId: chat.id,
        consultationId: chat.consultationId,
      };
    });
  }

  async updateMessage({ id, ...dto }: UpdateMessageDto, user: IUser) {
    let file: any;
    const existMessage = await this.prisma.message.findFirst({
      where: { id, isDeleted: false },
    });

    if (!existMessage) {
      throw new NotFoundException('Message does not exist');
    }

    if (dto.fileId) {
      file = await this.prisma.file.findFirst({
        where: { id: dto.fileId },
      });
      if (!file) throw new NotFoundException('File not found');
    }
    const type = this.checkingMessageType(
      {
        fileId: dto.fileId,
        content: dto.content,
      },
      file,
    );

    const updateObj: any = { ...dto, type, updatedAt: new Date(), updatedBy: user.id };

    return this.prisma.message.update({ where: { id }, data: updateObj });
  }

  async chatHistory(id: string) {
    return this.prisma.chat.findMany({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: true, file: true, repliedMessage: true },
        },
      },
    });
  }

  async chatList(dto: ChatListDto) {
    const operatorQuery = dto.operatorPhoneNumber
      ? { operator: { phone: { contains: dto.operatorPhoneNumber || '' } } }
      : {};
    const clientquery = dto.userEmail ? { client: { email: { contains: dto.userEmail } } } : {};
    const where = { ...operatorQuery, ...clientquery };
    return this.prisma.chat.findMany({
      where,
      include: { operator: true, client: true },
      orderBy: { createdAt: 'desc' },
      take: dto.limit,
      skip: (dto.page - 1) * dto.limit,
    });
  }

  async rejectedChatList(dto: RejectedChatListDto) {
    return this.prisma.rejectedChat.findMany({
      where: {
        operator: { phone: { contains: dto.operatorPhoneNumber || '' } },
        // chatId: dto.chatId,
      },
      include: { operator: true, chat: true },
      orderBy: { createdAt: 'desc' },
      take: dto.limit,
      skip: (dto.page - 1) * dto.limit,
    });
  }

  private async toStopCron() {
    const chats = await this.prisma.chat.findMany({
      where: {
        status: 'init',
        messages: {
          some: { OR: [{ content: { not: null } }, { fileId: { not: null } }] },
        },
      },
      include: { messages: true },
    });
    return !chats.length;
  }

  async findOperatorsCron() {
    const operators = await this.prisma.user.findMany({
      where: {
        blockedAt: null,
        approvedAt: { not: null },
        telegramId: { not: null },
        shiftStatus: 'active',
        operatorChats: { none: { status: 'active' } },
      },
      include: { rejectedChats: true },
    });

    const chats = await this.prisma.chat.findMany({
      where: { status: 'init', messages: { some: {} } },
      include: { client: true, topic: true },
    });

    for (const chat of chats) {
      await this.botService.sendReceiveConversationButton(
        operators,
        chat.client,
        chat.id,
        chat.topic.name,
      );
    }
    const toStopCron = await this.toStopCron();
    if (toStopCron) {
      const job = this.schedulerRegistry.getCronJob(findOperatorsCronId);
      job.stop();
    }
  }

  async findOperatorsAndSendToClient(operatorId: string, chatId: string) {
    const operators = await this.prisma.user.findMany({
      where: {
        id: operatorId,
        blockedAt: null,
        approvedAt: { not: null },
        telegramId: { not: null },
        shiftStatus: 'active',
        operatorChats: { none: { status: 'active' } },
      },
      include: { rejectedChats: true },
    });

    const chats = await this.prisma.chat.findMany({
      where: { id: chatId, status: 'init', messages: { some: {} } },
      include: { client: true, topic: true },
    });

    for (const chat of chats) {
      await this.botService.sendReceiveConversationButton(
        operators,
        chat.client,
        chat.id,
        chat.topic.name,
      );
    }
    return {
      success: true,
    };
  }

  async chatCreate(dto: CreateChatDto, user: IUser, trx = null) {
    trx = trx ? trx : this.prisma;

    if (dto.topicId) {
      const topic = await this.prisma.topic.findFirst({
        where: { id: dto.topicId, isDeleted: false },
      });
      if (!topic) throw new NotFoundException('Topic not found');
    } else {
      let topic = await this.prisma.topic.findFirst({
        where: { name: 'other', isDeleted: false },
      });
      if (!topic) {
        topic = await trx.topic.create({
          data: {
            id: objectId(),
            name: 'other',
            description: 'other',
          },
        });
      }
      dto.topicId = topic.id;
    }

    if (dto.consultationId) {
      const consultation = await this.prisma.consultation.findFirst({
        where: { id: dto.consultationId },
      });
      if (!consultation?.id) throw new NotFoundException('Consultation not found');
    }

    const chat = await this.prisma.chat.findFirst({
      where: {
        clientId: user.userId,
        consultationId: dto.consultationId,
        status: { in: ['active', 'init'] },
        isDeleted: false,
      },
      include: { messages: true, client: true, topic: true },
    });
    if (chat) return chat;

    return trx.chat.create({
      data: {
        id: objectId(),
        status: dto.type || 'init',
        clientId: user.id,
        topicId: dto.topicId,
        consultationId: dto.consultationId,
      },
      include: { messages: true, topic: true, client: true },
    });
  }

  async rate(dto: CreateRatingDto, user: IUser) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: dto.chatId, clientId: user.id, isDeleted: false },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return this.prisma.rating.create({
      data: <any>{ ...dto, clientId: user.id },
    });
  }

  async getMessages(dto: PaginationDto, { id: clientId }: IUser) {
    const skip = ((dto.page || 1) - 1) * (dto.limit || 50);
    const activeChat = await this.prisma.chat.findMany({
      where: { clientId, status: { in: ['active', 'init'] }, isDeleted: false },
    });
    const messages = await this.prisma.message.findMany({
      where: { chat: { clientId }, isDeleted: false },
      include: {
        author: true,
        repliedMessage: { include: { file: true } },
        file: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: dto.limit || 50,
    });
    return { activeChat, messages, success: true };
  }

  async getMessagesByChatId(dto: GetMessagesByChatIdDto, { id: userId }: IUser) {
    const existConsultation = await this.prisma.consultation.findFirst({
      where: {
        id: dto?.consultationId,
      },
    });

    if (!existConsultation || !existConsultation?.chatId) {
      throw new NotFoundException('ChatId not found');
    }

    const activeChat = await this.prisma.chat.findMany({
      select: {
        id: true,
        consultationId: true,
        status: true,
        clientId: true,
        operatorId: true,
        topicId: true,
      },
      where: {
        id: existConsultation.chatId,
        status: { in: ['active', 'init'] },
        isDeleted: false,
        OR: [
          {
            clientId: userId,
          },
          {
            operatorId: userId,
          },
        ],
      },
    });

    const messages = await this.prisma.message.findMany({
      select: {
        id: true,
        content: true,
        chatId: true,
        createdAt: true,
        updatedAt: true,
        type: true,
        rate: true,
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            userId: true,
            doctorId: true,
          },
        },
        repliedMessage: {
          select: {
            id: true,
            chatId: true,
            file: true,
          },
        },
        file: true,
      },
      where: {
        chat: {
          OR: [
            {
              clientId: userId,
            },
            {
              operatorId: userId,
            },
          ],
        },
        isDeleted: false,
      },
    });

    return { activeChat, messages };
  }

  async getAllActiveOperators() {
    const data: any[] = await this.prisma.$queryRaw`
        select chu.id,
               chu.shift_status,
               chu.user_id,
               chu.doctor_id,
               chu.firstname,
               chu.phone,
               to_json(ct.*) as transaction_info
        from chat."user" as chu
                 left join consultation.transactions as ct
                           on ct.operator_id = chu.id and ct.status = 0 and ct.expires_at <= now()
        where chu.is_deleted is false
          and chu.shift_status = 'active'
    `;

    this.socket.sendActiveOperatorsViaSocket(data || []);

    return data;
  }

  // *** Методы аналитики ***

  async getChatStatistics() {
    const totalChats = await this.prisma.chat.count();
    const activeChats = await this.prisma.chat.count({
      where: { status: 'active', isDeleted: false },
    });
    const closedChats = await this.prisma.chat.count({
      where: { status: 'done', isDeleted: false },
    });
    const initiatedChats = await this.prisma.chat.count({
      where: { status: 'init', isDeleted: false },
    });
    const totalMessages = await this.prisma.message.count({
      where: { isDeleted: false },
    });

    return {
      totalChats,
      activeChats,
      closedChats,
      initiatedChats,
      totalMessages,
    };
  }

  async getMessageStatistics() {
    const clientMessages = await this.prisma.message.count({
      where: { author: { telegramId: null, isDeleted: false } },
    });
    const operatorMessages = await this.prisma.message.count({
      where: {
        author: { NOT: { telegramId: null } },
        isDeleted: false,
      },
    });

    return {
      totalMessages: clientMessages + operatorMessages,
      clientMessages,
      operatorMessages,
    };
  }

  async getOperatorAnalytics() {
    const activeOperators = await this.prisma.user.findMany({
      where: {
        shiftStatus: 'active',
        blockedAt: null,
        approvedAt: { not: null },
        isDeleted: false,
      },
      include: {
        operatorChats: {
          where: { status: 'active' },
        },
        rejectedChats: true,
      },
    });

    return activeOperators.map((operator) => ({
      operatorId: operator.id,
      name: `${operator?.firstname} ${operator?.lastname}`,
      activeChats: operator.operatorChats.length,
      rejectedChats: operator.rejectedChats.length,
    }));
  }

  async getAverageResponseTime() {
    const chatsWithMessages = await this.prisma.chat.findMany({
      where: {
        OR: [{ status: 'active' }, { status: 'done' }],
        isDeleted: false,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: true },
        },
      },
    });

    let totalResponseTime = 0;
    let responseCount = 0;

    chatsWithMessages.forEach((chat) => {
      const firstClientMessage = chat.messages.find((msg) => msg.author.telegramId == null);
      const firstOperatorMessage = chat.messages.find((msg) => msg.author.telegramId != null);

      if (firstClientMessage && firstOperatorMessage) {
        const responseTime =
          firstOperatorMessage.createdAt.getTime() - firstClientMessage.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const averageResponseTime = responseCount ? totalResponseTime / responseCount : 0;
    return { averageResponseTime };
  }

  async getRatingAnalytics() {
    const totalRatings = await this.prisma.rating.count({
      where: { isDeleted: false },
    });
    const averageRating = await this.prisma.rating.aggregate({
      _avg: {
        rate: true,
      },
    });

    return {
      totalRatings,
      averageRating: averageRating._avg.rate,
    };
  }

  async getRejectedChatAnalytics() {
    const rejectedChats = await this.prisma.rejectedChat.count({
      where: { isDeleted: false },
    });
    const rejectedChatsByOperator = await this.prisma.rejectedChat.groupBy({
      where: { isDeleted: false },
      by: ['operatorId'],
      _count: {
        operatorId: true,
      },
      orderBy: {
        _count: {
          operatorId: 'desc',
        },
      },
    });

    return {
      totalRejectedChats: rejectedChats,
      rejectedChatsByOperator,
    };
  }

  checkingMessageType(data: { fileId?: string; content?: string }, file?: any): string | null {
    const { fileId, content } = data;

    if (content && !fileId && !file?.id) {
      return MessageTypeEnum.Text;
    } else if (fileId && file?.id) {
      if (file?.type.includes('image')) {
        return MessageTypeEnum.Photo;
      } else return MessageTypeEnum.Document;
    }

    return null;
  }
}
