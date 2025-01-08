import { InjectBot } from '@grammyjs/nestjs';
import { Injectable } from '@nestjs/common';
import { Bot, Context, InputFile, Keyboard } from 'grammy';
import { PrismaService } from '../prisma/prisma.service';
import { file, user } from '@prisma/client';
import { FileService } from '../file/file.service';
import { extname } from 'path';
import { getFileUrl } from 'src/common/util/get-tg-file-url.util';
import axios from 'axios';
import { BufferedFile } from 'src/common/interface/buffered-file.interface';
import { pathToStatic } from 'src/common/var/index.var';
import { formatMessage } from 'src/common/util/formate-message.util';
import { usersWithChats } from 'src/common/type/usersWithChats.type';
import { env } from 'src/common/config/env.config';
import { SocketGateway } from '../socket/socket.server';

@Injectable()
export class BotService {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly prisma: PrismaService,
    private readonly fileService: FileService,
    private readonly socketGateWay: SocketGateway,
  ) {}

  async onStart(ctx: Context): Promise<void> {
    ctx.reply(
      `Hey, ${ctx.from.first_name}. I'm ${this.bot.botInfo.first_name}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ callback_data: 'register', text: 'Register' }],
            [{ callback_data: 'launch', text: 'Launch' }],
            [{ callback_data: 'stop', text: 'End' }],
          ],
        },
      },
    );
  }

  async commandStart(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
      },
    });

    if (!operator) {
      return ctx.reply(
        'Please /register and(or) wait administrator to approve',
      );
    }
    if (operator.shiftStatus == 'active') {
      ctx.reply(`You've already activated your status`);
      return;
    }
    await this.prisma.shift.create({
      data: { status: 'active', operatorId: operator.id },
    });
    await this.prisma.user.update({
      where: { id: operator.id },
      data: { shiftStatus: 'active' },
    });
    return await ctx.reply(`You've activated your status`);
  }

  async commandStop(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
      },
    });
    if (!operator) {
      return ctx.reply(
        'Please /register and(or) wait administrator to approve',
      );
    }
    const chat = await this.prisma.chat.findFirst({
      where: {
        operatorId: operator.id,
        status: 'active',
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
      where: { id: operator.id },
      data: { shiftStatus: 'inactive' },
    });
    return ctx.reply(`You've deactivated your status`);
  }

  async register(ctx: Context) {
    const operator = await this.prisma.user.findFirst({
      where: { telegramId: ctx.from.id.toString() },
    });
    if (operator) {
      return ctx.reply(
        'Application already saved. Please wait for administrator to approve',
      );
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
    const operator = await this.prisma.user.findFirst({
      where: {
        OR: [
          { telegramId: ctx.from.id.toString() },
          { phone: contact.phone_number },
        ],
      },
    });
    if (operator) {
      return ctx.reply(
        'If you want to change your phone number, please contact administration',
        { reply_markup: { remove_keyboard: true } },
      );
    }
    await this.prisma.user.create({
      data: {
        firstname: ctx.from.first_name,
        lastname: ctx.from.last_name,
        phone: contact.phone_number,
        telegramId: ctx.from.id.toString(),
        username: ctx.from.username,
      },
    });
    ctx.reply(
      'Application successfully saved. Please wait for administrator to approve',
      { reply_markup: { remove_keyboard: true } },
    );
  }

  async sendReceiveConversationButton(
    operators: usersWithChats[],
    client: user,
    chatId: string,
    topic: string,
  ) {
    for (const operator of operators) {
      const date = new Date();
      date.setMinutes(
        date.getMinutes() - env.REJECTED_MESSAGE_TIMEOUT_IN_MINUTES,
      );
      const rejected = operator.rejectedChats.some((rejectedChat) => {
        return rejectedChat.chatId == chatId && date < rejectedChat.createdAt;
      });
      if (rejected) continue;
      const messageToDelete = await this.prisma.messageToDelete.findFirst({
        where: { chatId: chatId, operatorId: operator.id },
      });
      if (messageToDelete) {
        await this.bot.api
          .deleteMessage(operator.telegramId, +messageToDelete.tgMessageId)
          .catch((err) => console.log(err.message));
      }
      const data = await this.bot.api.sendMessage(
        operator.telegramId,
        `From: *${client.firstname} ${client.lastname}*\nTopic: _${topic}_
        `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Receive', callback_data: `receive$${chatId}` }],
              [{ text: 'Reject', callback_data: `reject$${chatId}` }],
            ],
            one_time_keyboard: true,
          },
          parse_mode: 'MarkdownV2',
        },
      );
      messageToDelete
        ? await this.prisma.messageToDelete.update({
            where: { id: messageToDelete.id },
            data: { tgMessageId: data.message_id.toString() },
          })
        : await this.prisma.messageToDelete.create({
            data: {
              tgMessageId: data.message_id.toString(),
              operatorId: operator.id,
              chatId: chatId,
            },
          });
    }
  }

  async receive(ctx: Context, chatId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId, status: { not: 'active' }, operatorId: null },
      include: { topic: true },
    });
    if (!chat) {
      return ctx.editMessageText('Chat already started with other operator');
    }
    const operator = await this.prisma.user.findFirst({
      where: { telegramId: ctx.from.id.toString() },
    });
    await this.prisma.chat.update({
      where: { id: chat.id },
      data: { operatorId: operator.id, status: 'active' },
    });
    const { firstname, lastname } = await this.prisma.user.findFirst({
      where: { id: chat.clientId },
    });
    const messages = await this.prisma.message.findMany({
      where: { chatId: chat.id },
      include: { file: true },
      orderBy: { createdAt: 'asc' },
    });
    const editedMsgText = `Chat started with *${firstname} ${lastname}*`;
    await ctx.editMessageText(editedMsgText, { parse_mode: 'MarkdownV2' });
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
  }

  async handleMessage(ctx: Context, fileId?: string, caption?: string) {
    const operator = await this.prisma.user.findFirst({
      where: {
        telegramId: ctx.from.id.toString(),
        approvedAt: { not: null },
        blockedAt: null,
      },
    });
    if (!operator) return ctx.reply('You have no right');
    const activeChat = await this.prisma.chat.findFirst({
      where: { status: 'active', operatorId: operator.id },
    });
    if (!activeChat) return ctx.reply('No active chats');
    const repliedMessageTgId =
      ctx.update?.message?.reply_to_message?.message_id;
    const tgMessageId = ctx.update?.message?.message_id;
    let repliedMessageId: string;
    if (repliedMessageTgId) {
      const repliedMessage = await this.prisma.message.findFirst({
        where: { tgMsgId: repliedMessageTgId.toString() },
      });
      repliedMessageId = repliedMessage?.id || null;
    }
    const content = caption || ctx.message?.text || null;
    const message = await this.prisma.message.create({
      data: {
        authorId: operator.id,
        chatId: activeChat.id,
        content,
        fileId,
        repliedMessageId,
        tgMsgId: tgMessageId.toString(),
      },
      include: {
        author: true,
        repliedMessage: { include: { file: true } },
        file: true,
      },
    });
    this.socketGateWay.sendMessageViaSocket(activeChat.id.toString(), message);
  }

  async fileToAPI(ctx: Context): Promise<{ fileId: string; caption: string }> {
    const file = await ctx.getFile();
    const caption = ctx.update.message.caption;
    const url = getFileUrl(file.file_path);
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    const uploadingData: BufferedFile = {
      buffer: res.data,
      fieldName: file.file_id,
      mimetype: 'telegram/file',
      encoding: null,
      originalname: file.file_path.split('/')[1],
      size: file.file_size,
    };
    const uploadedFile = await this.fileService.upload(uploadingData);
    return { fileId: uploadedFile.id, caption };
  }

  async fileToBot(
    tgUserId: number,
    file: file,
    content: string,
    replyParams: any,
  ) {
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
    const messageFromTg = await this.bot.api.sendMessage(
      +operator.telegramId,
      formattedMessage,
      {
        parse_mode: 'MarkdownV2',
        reply_parameters: replyParameters,
      },
    );
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
        shiftStatus: 'active',
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
    const text = `Dialog with *${chat.client.firstname} ${chat.client.lastname}* stopped`;
    return await ctx.reply(text, { parse_mode: 'MarkdownV2' });
  }

  async reject(ctx: Context, chatId: string) {
    const operator = await this.prisma.user.findFirst({
      where: { telegramId: ctx.from.id.toString() },
    });
    const chat = await this.prisma.chat.findFirst({
      where: { id: chatId },
    });
    if (!chat || chat.status === 'active' || chat.status === 'done') {
      return ctx.reply(
        'This chat is already active with another operator or closed.',
      );
    }
    await this.prisma.rejectedChat.create({
      data: {
        chatId: chatId,
        operatorId: operator.id,
      },
    });
    return await ctx.editMessageReplyMarkup({
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Receive', callback_data: `receive$${chatId}` }],
        ],
      },
    });
  }
}
