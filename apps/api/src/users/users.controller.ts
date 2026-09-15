import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import type { Multer } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';

// Alias for clarity — multer File type
type MulterFile = Express.Multer.File & { _multer?: Multer };
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Roles(UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (MASTER_ADMIN: all; STORE_ADMIN: own store)' })
  findAll(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ): ReturnType<UsersService['findAll']> {
    return this.usersService.findAll(requester, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a user and send activation invite' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<UsersService['create']> {
    return this.usersService.create(dto, requester);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Bulk import users from CSV file (max 500 rows)' })
  @UseInterceptors(FileInterceptor('file'))
  importUsers(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 })], // 5 MB
      }),
    )
    file: MulterFile,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<UsersService['importFromCsv']> {
    return this.usersService.importFromCsv(file.buffer, requester);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details (store-scoped)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<UsersService['findOne']> {
    return this.usersService.findOne(id, requester);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user (store-scoped)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<UsersService['update']> {
    return this.usersService.update(id, dto, requester);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user (store-scoped)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<UsersService['updateStatus']> {
    return this.usersService.updateStatus(id, dto.status, requester);
  }

  @Post(':id/resend-invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Resend activation invite to INVITED user' })
  resendInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<UsersService['resendInvite']> {
    return this.usersService.resendInvite(id, requester);
  }
}
