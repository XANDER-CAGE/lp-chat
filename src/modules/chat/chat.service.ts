import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatDto } from './dto/chat.dto';
import { BotService } from '../bot/bot.service';
import { user } from '@prisma/client';
import { SchedulerRegistry } from '@nestjs/schedule';
import { findOperatorsCronId } from 'src/common/var/index.var';
import { CreateMessageDto } from './dto/message.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ChatListDto } from './dto/chat-list.dto';
import { RejectedChatListDto } from './dto/rejectted-chat-list.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botService: BotService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  async message(dto: CreateMessageDto, user: user) {
    let chat: any = await this.prisma.chat.findFirst({
      where: {
        clientId: user.id,
        status: { in: ['active', 'init'] },
      },
      include: { messages: true },
    });
    if (!chat) {
      chat = await this.chatCreate({}, user);
    }
    if (dto.fileId) {
      const file = await this.prisma.file.findFirst({
        where: { id: dto.fileId },
      });
      if (!file) throw new NotFoundException('File not found');
    }
    const message = await this.prisma.message.create({
      data: <any>{ ...dto, authorId: user.id, chatId: chat.id },
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
      const history: any = await this.getMessages(user.id, {});
      history.availableOperators = operators.length;
      const job = this.schedulerRegistry.getCronJob(findOperatorsCronId);
      job.start();
      return history;
    }
    await this.botService.messageViaBot(message.id);
    return await this.getMessages(user.id, {});
  }

  async chatHistory(id: string) {
    return await this.prisma.chat.findMany({
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
    const clientquery = dto.userEmail
      ? { client: { email: { contains: dto.userEmail } } }
      : {};
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
    return await this.prisma.rejectedChat.findMany({
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

  async chatCreate(dto: CreateChatDto, user: user) {
    if (dto.topicId) {
      const topic = await this.prisma.topic.findFirst({
        where: { id: dto.topicId },
      });
      if (!topic) throw new NotFoundException('Topic not found');
    } else {
      let topic = await this.prisma.topic.findFirst({
        where: { name: 'other' },
      });
      if (!topic) {
        topic = await this.prisma.topic.create({
          data: { name: 'other', description: 'other' },
        });
      }
      dto.topicId = topic.id;
    }
    const chat = await this.prisma.chat.findFirst({
      where: {
        clientId: user.id,
        status: { in: ['active', 'init'] },
      },
      include: { messages: true },
    });
    if (chat) return chat;
    return this.prisma.chat.create({
      data: { status: 'init', clientId: user.id, topicId: dto.topicId },
      include: { messages: true },
    });
  }

  async rate(dto: CreateRatingDto, user: user) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: dto.chatId, clientId: user.id },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return await this.prisma.rating.create({
      data: <any>{ ...dto, clientId: user.id },
    });
  }

  async getMessages(clientId: string, dto: PaginationDto) {
    const skip = ((dto.page || 1) - 1) * (dto.limit || 50);
    const activeChat = await this.prisma.chat.findMany({
      where: { clientId, status: { in: ['active', 'init'] } },
    });
    const messages = await this.prisma.message.findMany({
      where: { chat: { clientId } },
      include: {
        author: true,
        repliedMessage: { include: { file: true } },
        file: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: dto.limit || 50,
    });
    return { activeChat, messages };
  }

  // *** Методы аналитики ***

  async getChatStatistics() {
    const totalChats = await this.prisma.chat.count();
    const activeChats = await this.prisma.chat.count({
      where: { status: 'active' },
    });
    const closedChats = await this.prisma.chat.count({
      where: { status: 'done' },
    });
    const initiatedChats = await this.prisma.chat.count({
      where: { status: 'init' },
    });
    const totalMessages = await this.prisma.message.count();

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
      where: { author: { telegramId: null } },
    });
    const operatorMessages = await this.prisma.message.count({
      where: {
        author: { NOT: { telegramId: null } },
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
      name: `${operator.firstname} ${operator.lastname}`,
      activeChats: operator.operatorChats.length,
      rejectedChats: operator.rejectedChats.length,
    }));
  }

  async getAverageResponseTime() {
    const chatsWithMessages = await this.prisma.chat.findMany({
      where: {
        OR: [{ status: 'active' }, { status: 'done' }],
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
      const firstClientMessage = chat.messages.find(
        (msg) => msg.author.telegramId == null,
      );
      const firstOperatorMessage = chat.messages.find(
        (msg) => msg.author.telegramId != null,
      );

      if (firstClientMessage && firstOperatorMessage) {
        const responseTime =
          firstOperatorMessage.createdAt.getTime() -
          firstClientMessage.createdAt.getTime();
        totalResponseTime += responseTime;
        responseCount++;
      }
    });

    const averageResponseTime = responseCount
      ? totalResponseTime / responseCount
      : 0;
    return { averageResponseTime };
  }

  async getRatingAnalytics() {
    const totalRatings = await this.prisma.rating.count();
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
    const rejectedChats = await this.prisma.rejectedChat.count();
    const rejectedChatsByOperator = await this.prisma.rejectedChat.groupBy({
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
}
