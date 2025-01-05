import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/chat.dto';
import { User } from 'src/common/decorator/user.decorator';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { user } from '@prisma/client';
import { IdDto } from 'src/common/dto/id.dto';
import { Cron } from '@nestjs/schedule';
import { findOperatorsCronId } from 'src/common/var/index.var';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateMessageDto } from './dto/message.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { env } from 'src/common/config/env.config';
import { IMyReq } from 'src/common/interface/my-req.interface';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Roles } from 'src/common/decorator/roles.decorator';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Role } from 'src/common/enum/role.enum';
import { ChatListDto } from './dto/chat-list.dto';
import { RejectedChatListDto } from './dto/rejectted-chat-list.dto';

@ApiTags('Chat')
@Controller('chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() dto: CreateChatDto, @User() user: user) {
    const data = await this.chatService.chatCreate(dto, user);
    return CoreApiResponse.success(data);
  }

  @Post('message')
  async message(@Body() dto: CreateMessageDto, @User() user: user) {
    const data = await this.chatService.message(dto, user);
    return CoreApiResponse.success(data);
  }

  @Post('rate')
  async rate(@Body() dto: CreateRatingDto, @User() user: user) {
    const data = await this.chatService.rate(dto, user);
    return CoreApiResponse.success(data);
  }

  @Get('all-messages')
  async allMessages(@Req() req: IMyReq, @Query() dto: PaginationDto) {
    const data = await this.chatService.getMessages(req.user.id, dto);
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('list')
  async chatList(@Query() dto: ChatListDto) {
    const data = await this.chatService.chatList(dto);
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('rejected/list')
  async rejectedchatList(@Query() dto: RejectedChatListDto) {
    const data = await this.chatService.rejectedChatList(dto);
    return CoreApiResponse.success(data);
  }

  @Cron(env.FIND_FREE_OPERATORS_CRON_PATTERN, { name: findOperatorsCronId })
  async handleCron() {
    return this.chatService.findOperatorsCron();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('analytics/chat-statistics')
  async getChatStatistics() {
    const data = await this.chatService.getChatStatistics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('analytics/message-statistics')
  async getMessageStatistics() {
    const data = await this.chatService.getMessageStatistics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('analytics/operator-analytics')
  async getOperatorAnalytics() {
    const data = await this.chatService.getOperatorAnalytics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('analytics/average-response-time')
  async getAverageResponseTime() {
    const data = await this.chatService.getAverageResponseTime();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('analytics/rating-analytics')
  async getRatingAnalytics() {
    const data = await this.chatService.getRatingAnalytics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('analytics/rejected-chats')
  async getRejectedChatsAnalytics() {
    const data = await this.chatService.getRejectedChatAnalytics();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get(':id')
  async getChatHistory(@Param() { id }: IdDto) {
    const data = await this.chatService.chatHistory(id);
    return CoreApiResponse.success(data);
  }
}
