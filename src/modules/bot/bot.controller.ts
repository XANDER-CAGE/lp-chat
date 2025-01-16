import { Context } from 'grammy';
import { Update, Start, Ctx, Command, On, Message, CallbackQuery } from '@grammyjs/nestjs';
import { BotService } from './bot.service';
import { UseFilters } from '@nestjs/common';
import { BotExceptionFilter } from 'src/common/filter/bot.exception-filter';

@Update()
@UseFilters(BotExceptionFilter)
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    await this.botService.onStart(ctx);
  }

  @CallbackQuery('launch')
  async callbackLaunch(@Ctx() ctx: Context) {
    await this.botService.commandStart(ctx);
  }

  @Command('launch')
  async commandLaunch(@Ctx() ctx: Context) {
    await this.botService.commandStart(ctx);
  }

  //
  @CallbackQuery('queue')
  async callbackQueue(@Ctx() ctx: Context) {
    await this.botService.commandQueue(ctx);
  }

  @Command('queue')
  async commandQueue(@Ctx() ctx: Context) {
    await this.botService.commandQueue(ctx);
  }

  @Command('stop')
  async commandStop(@Ctx() ctx: Context) {
    await this.botService.commandStop(ctx);
  }

  @CallbackQuery('stop')
  async callbackStop(@Ctx() ctx: Context) {
    await this.botService.commandStop(ctx);
  }

  @Command('register')
  async commandRegister(@Ctx() ctx: Context) {
    await this.botService.register(ctx);
  }

  @Command('stopdialog')
  async stopDialog(@Ctx() ctx: Context) {
    await this.botService.stopDialog(ctx);
  }

  @CallbackQuery('register')
  async callbackRegister(@Ctx() ctx: Context) {
    await this.botService.register(ctx);
  }

  @On('message:contact')
  async contact(@Ctx() ctx: Context, @Message('contact') contact: any) {
    await this.botService.contact(ctx, contact);
  }

  @On('message:file')
  async message(@Ctx() ctx: Context) {
    const { fileId, caption } = await this.botService.fileToAPI(ctx);
    await this.botService.handleMessage(ctx, fileId, caption);
  }

  @On('message')
  async messageFile(@Ctx() ctx: Context) {
    await this.botService.handleMessage(ctx);
  }

  @On('callback_query')
  async callback(@Ctx() ctx: Context) {
    const [callback, data] = ctx.callbackQuery.data.split('$');
    if (callback == 'receive') {
      return this.botService.receiveByOperator(ctx, data);
    }
    // else if (callback == 'reject') {
    //   return this.botService.reject(ctx, data);
    // }
  }
}
