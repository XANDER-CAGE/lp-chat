import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/chat.dto';
import { User } from 'src/common/decorator/user.decorator';
import { IdDto } from 'src/common/dto/id.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateMessageDto, GetMessagesByChatIdDto, UpdateMessageDto } from './dto/message.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { IUser } from 'src/common/interface/my-req.interface';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { ChatListDto } from './dto/chat-list.dto';
import { RejectedChatListDto } from './dto/rejectted-chat-list.dto';
import { Cron } from '@nestjs/schedule';
import { findOperatorsCronId } from 'src/common/var/index.var';
import { env } from 'src/common/config/env.config';
import { AuthGuard } from 'src/common/guard/auth.guard';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(AuthGuard)
@ApiBearerAuth('authorization')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // @Post()
  async chat(@Body() dto: CreateChatDto, @User() user: IUser) {
    return await this.chatService.chatCreate(dto, user);
  }

  @ApiOperation({
    summary:
      'Create messages with chatId (client, operator). There is also a socket version of this app.',
  })
  @Post('message')
  async message(@Body() dto: CreateMessageDto, @User() user: IUser) {
    const data = await this.chatService.message(dto, user);
    return CoreApiResponse.success(data);
  }

  @ApiOperation({ summary: 'Get messages with chatId (client, operator)' })
  @Get('message-by-chat')
  async messageByChaId(@Query() dto: GetMessagesByChatIdDto, @User() user: IUser) {
    const data = await this.chatService.getMessagesByChatId(dto, user);
    return CoreApiResponse.success(data);
  }

  @ApiOperation({
    summary:
      'Update messages with chatId (client, operator). There is also a socket version of this app.',
  })
  @Post('message-update')
  async messageUpdate(@Body() dto: UpdateMessageDto, @User() user: IUser) {
    const data = await this.chatService.updateMessage(dto, user);
    return CoreApiResponse.success(data);
  }

  // @Post('rate')
  async rate(@Body() dto: CreateRatingDto, @User() user: IUser) {
    const data = await this.chatService.rate(dto, user);
    return CoreApiResponse.success(data);
  }

  @ApiOperation({
    summary: 'Get all active operators list',
  })
  @Get('all-active-operators')
  async getAllActiveOperators() {
    const data = await this.chatService.getAllActiveOperators();
    return CoreApiResponse.success(data);
  }

  @Get('all-messages')
  async allMessages(@Query() dto: PaginationDto, @User() user: IUser) {
    const data = await this.chatService.getMessages(dto, user);
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('list')
  async chatList(@Query() dto: ChatListDto) {
    const data = await this.chatService.chatList(dto);
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('rejected/list')
  async rejectedchatList(@Query() dto: RejectedChatListDto) {
    const data = await this.chatService.rejectedChatList(dto);
    return CoreApiResponse.success(data);
  }

  @Cron(env.FIND_FREE_OPERATORS_CRON_PATTERN, { name: findOperatorsCronId })
  async handleCron() {
    // return this.chatService.findOperatorsCron();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('analytics/chat-statistics')
  async getChatStatistics() {
    const data = await this.chatService.getChatStatistics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('analytics/message-statistics')
  async getMessageStatistics() {
    const data = await this.chatService.getMessageStatistics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('analytics/operator-analytics')
  async getOperatorAnalytics() {
    const data = await this.chatService.getOperatorAnalytics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('analytics/average-response-time')
  async getAverageResponseTime() {
    const data = await this.chatService.getAverageResponseTime();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('analytics/rating-analytics')
  async getRatingAnalytics() {
    const data = await this.chatService.getRatingAnalytics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get('analytics/rejected-chats')
  async getRejectedChatsAnalytics() {
    const data = await this.chatService.getRejectedChatAnalytics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  // @Get(':id')
  async getChatHistory(@Param() { id }: IdDto) {
    const data = await this.chatService.chatHistory(id);
    return CoreApiResponse.success(data);
  }
}
