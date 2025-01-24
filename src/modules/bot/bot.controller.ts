import { Context } from 'grammy';
import { Update, Start, Ctx, Command, On, Message, CallbackQuery } from '@grammyjs/nestjs';
import { BotService } from './bot.service';
// import { UseFilters } from '@nestjs/common';
// import { BotExceptionFilter } from 'src/common/filter/bot.exception-filter';

@Update()
// @UseFilters(BotExceptionFilter)
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    await this.botService.onStart(ctx);
  }

  @CallbackQuery('online')
  async callbackLaunch(@Ctx() ctx: Context) {
    await this.botService.commandStart(ctx);
  }

  @Command('online')
  async commandLaunch(@Ctx() ctx: Context) {
    await this.botService.commandStart(ctx);
  }

  @Command('offline')
  async commandEnd(@Ctx() ctx: Context) {
    await this.botService.commandEnd(ctx);
  }

  @CallbackQuery('offline')
  async callbackEnd(@Ctx() ctx: Context) {
    await this.botService.commandEnd(ctx);
  }

  @CallbackQuery('queue')
  async callbackQueue(@Ctx() ctx: Context) {
    await this.botService.commandQueue(ctx);
  }

  @Command('queue')
  async commandQueue(@Ctx() ctx: Context) {
    await this.botService.commandQueue(ctx);
  }

  // @Command('stop')
  // async commandStop(@Ctx() ctx: Context) {
  //   await this.botService.commandStop(ctx);
  // }

  // @CallbackQuery('stop')
  // async callbackStop(@Ctx() ctx: Context) {
  //   await this.botService.commandStop(ctx);
  // }

  @Command('register')
  async commandRegister(@Ctx() ctx: Context) {
    await this.botService.register(ctx);
  }

  @Command('stopdialog')
  async stopDialogCommand(@Ctx() ctx: Context) {
    await this.botService.stopDialogAndTakeNextQueue(ctx);
  }

  @Command('stopdialog')
  async stopDialogCallback(@Ctx() ctx: Context) {
    await this.botService.stopDialogAndTakeNextQueue(ctx);
  }

  @Command('getbooking')
  async commandGetBooking(@Ctx() ctx: Context) {
    await this.botService.commandGetBooking(ctx);
  }

  @CallbackQuery('getbooking')
  async callbackGetBooking(@Ctx() ctx: Context) {
    await this.botService.commandGetBooking(ctx);
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
    const { fileId, caption, mimetype } = await this.botService.fileToAPI(ctx);
    await this.botService.handleMessage(ctx, { fileId, mimetype }, caption);
  }

  @On('message')
  async messageFile(@Ctx() ctx: Context) {
    await this.botService.handleMessage(ctx);
  }

  @On('callback_query')
  async callback(@Ctx() ctx: Context) {
    const [callback, data] = ctx.callbackQuery.data.split('$');
    if (callback == 'receive') {
      return this.botService.showMessageButton(ctx, data);
    } else if (callback == 'get_booking') {
      return this.botService.callbackGetBookingButton(ctx, data);
    }
  }
}
