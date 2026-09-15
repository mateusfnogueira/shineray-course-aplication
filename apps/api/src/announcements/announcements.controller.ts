import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AnnouncementsService,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './announcements.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('announcements')
@ApiBearerAuth('access-token')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'List active announcements (scoped by role/store)' })
  findAll(@CurrentUser() user: JwtPayload): ReturnType<AnnouncementsService['findAll']> {
    return this.svc.findAll(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create announcement (global or store-specific)' })
  create(
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<AnnouncementsService['create']> {
    return this.svc.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update announcement' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<AnnouncementsService['update']> {
    return this.svc.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete announcement' })
  remove(@Param('id', ParseUUIDPipe) id: string): ReturnType<AnnouncementsService['remove']> {
    return this.svc.remove(id);
  }
}
