import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IdDto } from 'src/common/dto/id.dto';
import { CoreApiResponse } from 'src/common/response-class/core-api.response';
import { RolesGuard } from 'src/common/guard/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { Role } from 'src/common/enum/role.enum';
import { AuthGuard } from 'src/common/guard/auth.guard';

@ApiTags('User')
@ApiBearerAuth('authorization')
@Controller('user')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    const data = await this.userService.findAll();
    return CoreApiResponse.success(data);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Get('shifts/:id')
  async getShifts(@Param() { id }: IdDto) {
    const data = await this.userService.getShifts(id);
    return CoreApiResponse.success(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }
}
