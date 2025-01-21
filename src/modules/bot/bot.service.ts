import { InjectBot } from '@grammyjs/nestjs';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Bot, Context, InputFile, Keyboard } from 'grammy';
import { PrismaService } from '../prisma/prisma.service';
import { file, user } from '@prisma/client';
import { FileService } from '../file/file.service';
import { extname } from 'path';
import { getFileUrl } from 'src/common/util/get-tg-file-url.util';
import axios from 'axios';
import { BufferedFile } from 'src/common/interface/buffered-file.interface';
import { pathToStatic } from 'src/common/var/index.var';
import { formatMessage, objectId } from 'src/common/util/formate-message.util';
import { usersWithChats } from 'src/common/type/usersWithChats.type';
import { SocketGateway } from '../chat/socket.gateway';
import { ConsultationStatus, MessageTypeEnum } from '../chat/enum';
import { ChatService } from '../chat/chat.service';
import { existDoctorInfo } from '../prisma/query';

@Injectable()
export class BotService {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
    private readonly socketGateWay: SocketGateway,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  async onStart(ctx: Context): Promise<void> {
    const commands = [
      { command: 'start', description: 'Start the bot 🚀' },
      { command: 'launch', description: "I\'m ready to get a new client. ✅" },
      { command: 'stopdialog', description: 'Stop talking to Clint 🛑' },
      { command: 'queue', description: 'Connecting to a client in the queue 🚶‍♂️🚶‍♀️🚶‍♂️🚶‍♀️🚶‍♂️' },
    ];
    await this.bot.api.setMyCommands(commands);
    ctx.reply(`Hey, ${ctx.from.first_name}. I'm ${this.bot.botInfo.first_name}`, {
      reply_markup: {
        inline_keyboard: [
          [{ callback_data: 'register', text: 'Register' }],
          [{ callback_data: 'launch', text: 'Launch' }],
          [{ callback_data: 'stop', text: 'End' }],
        ],
      },
    });
  }

  async commandStart(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        isDeleted: false,
      },
    });

    if (!operator) {
      return ctx.reply('Please /register and(or) wait administrator to approve');
    }
    if (operator.shiftStatus == 'active') {
      ctx.reply(`You've already activated your status`);
      return;
    }
    await this.prisma.shift.create({
      data: { status: 'active', operatorId: operator.id },
    });
    await this.prisma.user.update({
      where: { id: operator.id, isDeleted: false },
      data: { shiftStatus: 'active' },
    });
    return await ctx.reply(`You've activated your status`);
  }

  async commandQueue(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        blockedAt: null,
        approvedAt: { not: null },
        shiftStatus: 'active',
        operatorChats: { none: { status: 'active' } },
      },
      include: { rejectedChats: true },
    });

    if (!operator) {
      return ctx.reply('Please /register and(or) wait for the administrator to approve');
    }

    const order = await this.prisma.consultationOrder.findFirst({
      where: { status: 'waiting', operatorId: null },
      orderBy: { order: 'asc' },
      select: { id: true, consultationId: true },
    });

    if (!order) {
      return ctx.reply('No waiting orders are available.');
    }

    const consultation = await this.prisma.consultation.findFirst({
      where: { id: order.consultationId },
    });

    if (!consultation) {
      return ctx.reply('Consultation data is missing or invalid.');
    }

    const existChat = await this.prisma.chat.findFirst({
      where: {
        status: 'active',
        isDeleted: false,
        operatorId: operator.id,
      },
      include: { client: true, topic: true },
    });

    if (existChat) {
      return ctx.reply(`Cannot get a new client dialog open`);
    }

    const getClient = await this.prisma.user.findFirst({
      where: { userId: consultation.userId, isDeleted: false, doctorId: null },
    });

    if (!getClient) {
      return ctx.reply('Client not found or already deleted');
    }

    let chat: any;
    if (consultation?.chatId) {
      chat = await this.prisma.chat.findFirst({
        where: {
          id: consultation?.chatId,
          isDeleted: false,
        },
        include: { client: true, topic: true },
      });
    } else {
      chat = await this.chatService.chatCreate(
        {
          consultationId: consultation?.id,
          type: 'init',
        },
        getClient,
      );
    }

    if (!chat) {
      return ctx.reply('Chat data is missing or invalid.');
    }

    await this.prisma.consultation.update({
      where: { id: consultation.id },
      data: { chatId: chat.id },
    });

    await this.prisma.chat.update({
      where: {
        id: chat.id,
      },
      data: {
        status: 'active',
        operatorId: operator?.id,
      },
    });

    await this.prisma.consultationOrder.update({
      where: { id: order.id },
      data: {
        status: 'active',
        operatorId: operator?.id,
      },
    });

    await this.sendReceiveConversationButton([operator], getClient, chat.id, chat.topic.name);

    return { success: true };
  }

  async takeNextClient(ctx: Context, operator: any, order: any, trx: any) {
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: order.consultationId,
        // operatorId: null,
        // chatId: null,
        // topicId: null,
        status: ConsultationStatus.NEW,
        // userId: { not: null },
      },
    });

    if (!consultation?.userId) {
      return ctx.reply('Consultation data is missing or invalid.');
    }

    const getClient = await this.prisma.user.findFirst({
      where: { userId: consultation.userId, isDeleted: false, doctorId: null },
    });

    if (!getClient) {
      return ctx.reply('Queue user not found');
    }

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

    const chat = await trx.chat.create({
      data: {
        id: objectId(),
        status: 'active',
        clientId: getClient.id,
        topicId: topic.id,
        consultationId: consultation.id,
        operatorId: operator.id,
      },
      include: { messages: true, topic: true, client: true },
    });

    if (!chat) {
      return ctx.reply('Chat data is missing or invalid.');
    }

    await trx.consultation.update({
      where: { id: consultation.id },
      data: { chatId: chat.id, status: ConsultationStatus.IN_PROGRESS },
    });

    await trx.consultationOrder.update({
      where: {
        id: order.id,
      },
      data: {
        operatorId: operator.id,
        status: 'active',
      },
    });

    await this.sendReceiveConversationButton(
      [operator],
      getClient,
      chat.id,
      chat?.topic?.name,
      trx,
    );

    return { success: true };
  }

  async commandStop(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        isDeleted: false,
      },
    });
    if (!operator) {
      return ctx.reply('Please /register and(or) wait administrator to approve');
    }
    const chat = await this.prisma.chat.findFirst({
      where: {
        operatorId: operator.id,
        status: 'active',
        isDeleted: false,
      },
    });
    if (chat) {
      return ctx.reply(`Cannot leave dialog open`);
    }
    if (operator.shiftStatus == 'inactive' || operator.shiftStatus == null) {
      return ctx.reply(`You've already deactivated your status`);
    }
    await this.prisma.shift.create({
      data: { status: 'inactive', operatorId: operator.id },
    });
    await this.prisma.user.update({
      where: { id: operator.id, isDeleted: false },
      data: { shiftStatus: 'inactive' },
    });
    return ctx.reply(`You've deactivated your status`);
  }

  async register(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: { telegramId: ctx.from.id.toString(), isDeleted: false },
    });

    if (operator) {
      return ctx.reply('Application already saved. Please wait for administrator to approve');
    }

    const contactButton = Keyboard.requestContact('Share Contact');
    return await ctx.reply('Send your contact', {
      reply_markup: {
        one_time_keyboard: true,
        keyboard: [[contactButton]],
        resize_keyboard: true,
      },
    });
  }

  async contact(ctx: Context, contact: any) {
    contact.phone_number = contact.phone_number.replace('+', '');
    const [exitDoc]: any = await this.prisma.$queryRaw`
        select *
        from doctor.doctors as d
        where d.is_deleted is false
          and d.is_verified is true
          and d.role = 'operator'
          and d.phone_number = ${contact.phone_number}
        limit 1;
      `;

    if (!exitDoc) {
      return ctx.reply('Your number is not registered as an operator on the davoai.uz platform.', {
        reply_markup: { remove_keyboard: true },
      });
    }

    const operator = await this.prisma.user.findFirst({
      where: {
        OR: [{ telegramId: ctx.from.id.toString() }, { phone: contact.phone_number }],
        isDeleted: false,
      },
    });

    if (operator) {
      return ctx.reply('If you want to change your phone number, please contact administration', {
        reply_markup: { remove_keyboard: true },
      });
    }

    await this.prisma.user.create({
      data: {
        firstname: exitDoc.first_name,
        lastname: exitDoc.last_name,
        phone: contact.phone_number,
        telegramId: ctx.from.id.toString(),
        username: ctx.from.username,
        doctorId: exitDoc?.id,
        createdBy: exitDoc.id,
        email: exitDoc.email,
      },
    });
    ctx.reply('Application successfully saved. Please wait for administrator to approve', {
      reply_markup: { remove_keyboard: true },
    });
  }

  async sendReceiveConversationButton(
    operators: usersWithChats[],
    client: user,
    chatId: string,
    topic: string,
    trx = null,
  ) {
    trx = trx ? trx : this.prisma;
    // for (const operator of operators) {
    //   const date = new Date();
    //   date.setMinutes(date.getMinutes() - env.REJECTED_MESSAGE_TIMEOUT_IN_MINUTES);
    //   const rejected = operator?.rejectedChats?.some((rejectedChat) => {
    //     return rejectedChat.chatId == chatId && date < rejectedChat.createdAt;
    //   });
    //   if (rejected) continue;
    //   const messageToDelete = await this.prisma.messageToDelete.findFirst({
    //     where: { chatId: chatId, operatorId: operator.id, isDeleted: false },
    //   });
    //   if (messageToDelete) {
    //     await this.bot.api
    //       .deleteMessage(operator.telegramId, +messageToDelete.tgMessageId)
    //       .catch((err) => console.log(err.message));
    //   }

    // console.log(operator.telegramId);

    const operator = operators[0];

    return this.bot.api.sendMessage(
      operator.telegramId,
      `From: *${client?.firstname} ${client?.lastname}*\nTopic: _${topic}_
        `,
      {
        reply_markup: {
          inline_keyboard: [[{ text: 'Receive', callback_data: `receive$${chatId}` }]],
          one_time_keyboard: true,
        },
        parse_mode: 'MarkdownV2',
      },
    );

    //   messageToDelete
    //     ? await trx.messageToDelete.update({
    //         where: { id: messageToDelete.id },
    //         data: { tgMessageId: data.message_id.toString() },
    //       })
    //     : await trx.messageToDelete.create({
    //         data: {
    //           tgMessageId: data.message_id.toString(),
    //           operatorId: operator.id,
    //           chatId: chatId,
    //         },
    //       });
    // }
  }

  async sendShowButton(operator: usersWithChats, client: user, chatId: string, topic: string) {
    await this.bot.api.sendMessage(
      operator.telegramId,
      `From: *${client?.firstname} ${client?.lastname}*\nTopic: _${topic}_
        `,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Receive', callback_data: `receive$${chatId}` }],
            // [{ text: 'Reject', callback_data: `reject$${chatId}` }],
          ],
          one_time_keyboard: true,
        },
        parse_mode: 'MarkdownV2',
      },
    );

    return {
      success: true,
    };
  }

  async receive(ctx: Context, chatId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        operatorId: null,
        isDeleted: false,
      },
      include: { topic: true },
    });

    if (!chat) {
      return ctx.editMessageText('Chat already started with other operator');
    }

    if (!chat?.consultationId) {
      return ctx.editMessageText('User consultation not found');
    }

    const operator = await this.prisma.user.findFirst({
      where: { telegramId: ctx.from.id.toString(), isDeleted: false },
    });

    await this.prisma.chat.update({
      where: { id: chat.id },
      data: { operatorId: operator.id, status: 'active' },
    });
    const { firstname, lastname } = await this.prisma.user.findFirst({
      where: { id: chat.clientId, isDeleted: false },
    });
    const messages = await this.prisma.message.findMany({
      where: { chatId: chat.id, isDeleted: false },
      include: { file: true },
      orderBy: { createdAt: 'asc' },
    });
    const editedMsgText = `Chat started with *${firstname} ${lastname}*`;
    await ctx.editMessageText(editedMsgText, { parse_mode: 'MarkdownV2' });

    if (!chat.consultationId) {
      throw new NotFoundException('Consultation not found');
    }

    await this.prisma.$transaction(async (trx) => {
      await trx.consultation.update({
        where: { id: chat.consultationId },
        data: {
          chatId: chat.id,
          operatorId: operator.id,
          // topicId: chat.topicId,
          chatStartedAt: new Date(),
          status: ConsultationStatus.IN_PROGRESS,
        },
      });

      for (const message of messages) {
        const formattedMessage = formatMessage({
          firstname,
          lastname,
          topic: chat.topic.name,
          message: message.content,
        });
        if (message.file) {
          await this.fileToBot(ctx.from.id, message.file, formattedMessage, null);
          continue;
        }

        await ctx.reply(formattedMessage, { parse_mode: 'MarkdownV2' });
        this.socketGateWay.sendMessageToAcceptOperator(chat?.consultationId, operator);
      }

      await trx.user.update({
        where: { id: operator?.id },
        data: {
          shiftStatus: 'inactive',
        },
      });
    });
  }
  async showMessageButton(ctx: Context, chatId: string) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        blockedAt: null,
        isDeleted: false,
      },
    });

    if (!operator) {
      return ctx.reply('You have no right');
    }

    const existDoctorWithQuery: any = await existDoctorInfo(this.prisma, operator?.doctorId);

    const chat = await this.prisma.chat.findFirst({
      where: {
        id: chatId,
        status: 'active',
        isDeleted: false,
        consultationId: { not: null },
      },
      include: { topic: true },
    });

    if (!chat) {
      return ctx.editMessageText('Chat already started with other operator');
    }

    if (!chat?.consultationId) {
      return ctx.editMessageText('User consultation not found');
    }

    const { firstname, lastname } = await this.prisma.user.findFirst({
      where: { id: chat.clientId, isDeleted: false },
    });

    const messages = await this.prisma.message.findMany({
      where: { chatId: chat.id, isDeleted: false },
      include: { file: true },
      orderBy: { createdAt: 'asc' },
    });

    const editedMsgText = `Chat started with *${firstname} ${lastname}*`;
    await ctx.editMessageText(editedMsgText, { parse_mode: 'MarkdownV2' });

    return this.prisma.$transaction(async (trx) => {
      await this.prisma.user.update({
        where: { id: operator?.id },
        data: {
          shiftStatus: 'inactive',
        },
      });

      await trx.consultation.update({
        where: { id: chat.consultationId },
        data: {
          chatId: chat.id,
          operatorId: operator.id,
          // topicId: chat.topicId,
          chatStartedAt: new Date(),
          status: ConsultationStatus.IN_PROGRESS,
        },
      });

      await trx.message.create({
        data: {
          authorId: operator.id,
          chatId: chat.id,
          id: objectId(),
          content: 'Accept Operator',
          type: MessageTypeEnum.AcceptOperator,
          acceptDoctorId: operator?.doctorId,
        },
      });

      for (const message of messages) {
        const formattedMessage = formatMessage({
          firstname,
          lastname,
          topic: chat.topic.name,
          message: message.content,
        });
        if (message.file) {
          await this.fileToBot(ctx.from.id, message.file, formattedMessage, null);
          continue;
        }

        await ctx.reply(formattedMessage, { parse_mode: 'MarkdownV2' });
      }

      const sendMessage = {
        ...operator,
        specialties: existDoctorWithQuery?.specialties || null,
      };

      return this.socketGateWay.sendMessageToAcceptOperator(chat?.consultationId, sendMessage);
    });
  }

  async handleMessage(ctx: Context, file?: { fileId: string; mimetype: string }, caption?: string) {
    let messageType = null;

    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        blockedAt: null,
        isDeleted: false,
      },
    });

    if (!operator) return ctx.reply('You have no right');

    const activeChat = await this.prisma.chat.findFirst({
      where: {
        status: 'active',
        operatorId: operator.id,
        isDeleted: false,
      },
    });

    if (!activeChat) {
      return ctx.reply('No active chats');
    }

    if (!activeChat?.consultationId) {
      return ctx.reply('Client consultation not found');
    }

    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: activeChat.consultationId,
        chatId: activeChat?.id,
        status: { in: [ConsultationStatus.NEW, ConsultationStatus.IN_PROGRESS] },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Active or new consultation not found');
    }

    const repliedMessageTgId = ctx.update?.message?.reply_to_message?.message_id;
    const tgMessageId = ctx.update?.message?.message_id;
    let repliedMessageId: string;

    if (repliedMessageTgId) {
      const repliedMessage = await this.prisma.message.findFirst({
        where: { tgMsgId: repliedMessageTgId.toString(), isDeleted: false },
      });
      repliedMessageId = repliedMessage?.id || null;
    }

    const content = caption || ctx.message?.text || null;

    if (content && !file?.fileId) {
      messageType = MessageTypeEnum.Text;
    } else if (file?.fileId && file?.mimetype && file?.mimetype?.includes('image')) {
      messageType = MessageTypeEnum.Photo;
    } else if (file?.fileId && file?.mimetype && file?.mimetype?.includes('telegram')) {
      messageType = MessageTypeEnum.Document;
    }

    const message = await this.prisma.message.create({
      data: {
        authorId: operator.id,
        chatId: activeChat.id,
        content,
        fileId: file?.fileId,
        repliedMessageId,
        tgMsgId: tgMessageId.toString(),
        type: messageType,
      },
      select: {
        id: true,
        content: true,
        chatId: true,
        createdAt: true,
        updatedAt: true,
        type: true,
        author: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
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
    });

    this.socketGateWay.sendMessageViaSocket(activeChat?.consultationId.toString(), message);
  }

  async fileToAPI(ctx: Context): Promise<{ fileId: string; caption: string; mimetype: string }> {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        blockedAt: null,
        isDeleted: false,
      },
    });

    const file = await ctx.getFile();
    const caption = ctx.update.message.caption;
    const url = getFileUrl(file.file_path);
    const res = await axios.get(url, { responseType: 'arraybuffer' });

    const mimetype = file.file_path.includes('photo')
      ? `image/${extname(file?.file_path).replace('.', '')}`
      : 'telegram/file';

    const uploadingData: BufferedFile = {
      buffer: res.data,
      fieldName: file.file_id,
      mimetype,
      encoding: null,
      originalname: file.file_path.split('/')[1],
      size: file.file_size,
    };

    const uploadedFile = await this.fileService.upload(uploadingData, {
      id: operator.id,
      userId: operator.userId,
      doctorId: operator.doctorId,
    });
    return { fileId: uploadedFile.id, caption, mimetype };
  }

  async fileToBot(tgUserId: number, file: file, content: string, replyParams: any) {
    await this.fileService.downloadToStatic(file.id);
    const filename = `${file.id}${extname(file.name)}`;
    const inputFile = new InputFile(pathToStatic + filename);

    await this.bot.api.sendDocument(tgUserId, inputFile, {
      reply_parameters: replyParams,
      caption: content,
      parse_mode: 'MarkdownV2',
    });
    await this.fileService.deleteFromStatic(pathToStatic + filename);
  }

  async messageViaBot(messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
      },
      include: {
        chat: { include: { operator: true, topic: true } },
        file: true,
        author: true,
        repliedMessage: true,
      },
    });
    const operator = message.chat.operator;
    const { firstname, lastname } = message.author;
    const topic = message.chat.topic;
    const formattedMessage = formatMessage({
      firstname,
      lastname,
      message: message.content,
      topic: topic.name,
    });
    const replyParameters = message.repliedMessageId
      ? { message_id: +message.repliedMessage.tgMsgId }
      : null;
    if (message.fileId) {
      return await this.fileToBot(
        +operator.telegramId,
        message.file,
        formattedMessage,
        replyParameters,
      );
    }
    const messageFromTg = await this.bot.api.sendMessage(+operator.telegramId, formattedMessage, {
      parse_mode: 'MarkdownV2',
      reply_parameters: replyParameters,
    });
    await this.prisma.message.update({
      where: { id: message.id },
      data: { tgMsgId: messageFromTg.message_id.toString() },
    });
  }

  async stopDialog(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        shiftStatus: 'inactive',
      },
    });

    if (!operator) return;
    const chat = await this.prisma.chat.findFirst({
      where: { operatorId: operator.id, status: 'active' },
      include: { client: true },
    });
    if (!chat) return ctx.reply('No active chats');
    this.socketGateWay.disconnectChatMembers(chat.id);

    await this.prisma.chat.update({
      where: { id: chat.id },
      data: { status: 'done' },
    });

    if (chat?.consultationId) {
      const data = await this.prisma.consultation.update({
        where: {
          id: chat?.consultationId,
        },
        data: {
          status: ConsultationStatus.FINISHED,
        },
      });
      this.socketGateWay.sendStopActionToClientViaSocket(chat?.consultationId, data);
    }

    await this.prisma.user.update({
      where: {
        id: operator?.id,
      },
      data: {
        shiftStatus: 'active',
      },
    });

    const text = `Dialog with *${chat?.client?.firstname} ${chat?.client?.lastname}* stopped`;
    await ctx.reply(text, { parse_mode: 'MarkdownV2' });
    await this.commandQueue(ctx);
  }

  async stopDialogAndTakeNextQueue(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        shiftStatus: 'inactive',
      },
    });

    if (!operator) return;

    const chat = await this.prisma.chat.findFirst({
      where: {
        operatorId: operator.id,
        status: 'active',
        // consultationId: { not: null },
        // clientId: { not: null },
      },
      include: { client: true },
    });

    if (!chat?.consultationId && chat?.clientId) {
      return ctx.reply('No active chats');
    }

    const activeConsultationOrder = await this.prisma.consultationOrder.findFirst({
      where: {
        consultationId: chat?.consultationId,
        status: 'active',
      },
    });

    return this.prisma.$transaction(async (trx) => {
      await trx.chat.update({
        where: { id: chat.id },
        data: { status: 'done' },
      });

      const data = await trx.consultation.update({
        where: {
          id: chat?.consultationId,
        },
        data: {
          status: ConsultationStatus.FINISHED,
          chatId: chat?.id,
          // topicId: chat?.topicId,
        },
      });

      this.socketGateWay.sendStopActionToClientViaSocket(chat?.consultationId, data);

      const text = `Dialog with *${chat?.client?.firstname} ${chat?.client?.lastname}* stopped`;

      await ctx.reply(text, { parse_mode: 'MarkdownV2' });

      const order = await this.prisma.consultationOrder.findFirst({
        where: { status: 'waiting', operatorId: null },
        orderBy: { order: 'asc' },
        select: { id: true, consultationId: true },
      });

      if (activeConsultationOrder?.id) {
        await trx.consultationOrder.update({
          where: {
            id: activeConsultationOrder?.id,
          },
          data: {
            status: 'done',
          },
        });
      }

      if (order?.id) {
        await this.takeNextClient(ctx, operator, order, trx);
      } else {
        await trx.user.update({
          where: { id: operator?.id },
          data: {
            shiftStatus: 'active',
          },
        });
      }

      this.socketGateWay.disconnectChatMembers(chat?.consultationId);
    });
  }

  async reject(ctx: Context, chatId: string) {
    const operator = await this.prisma.user.findFirst({
      where: { telegramId: ctx.from.id.toString() },
    });
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId },
    });
    if (!chat || chat.status === 'active' || chat.status === 'done') {
      return ctx.reply('This chat is already active with another operator or closed.');
    }
    await this.prisma.rejectedChat.create({
      data: {
        chatId: chatId,
        operatorId: operator.id,
      },
    });
    return await ctx.editMessageReplyMarkup({
      reply_markup: {
        inline_keyboard: [[{ text: 'Receive', callback_data: `receive$${chatId}` }]],
      },
    });
  }
}
