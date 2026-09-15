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
import { TrailsService } from './trails.service';
import {
  AddCourseToTrailDto,
  CreateTrailDto,
  ReorderTrailCoursesDto,
  UpdateTrailDto,
} from './dto/trail.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('trails')
@ApiBearerAuth('access-token')
@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Get()
  @ApiOperation({ summary: 'List trails (MA: all including inactive; others: active only)' })
  findAll(@CurrentUser() user: JwtPayload): ReturnType<TrailsService['findAll']> {
    return this.trailsService.findAll(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create a new trail' })
  create(
    @Body() dto: CreateTrailDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['create']> {
    return this.trailsService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trail detail with ordered courses' })
  findOne(@Param('id', ParseUUIDPipe) id: string): ReturnType<TrailsService['findOne']> {
    return this.trailsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update trail' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrailDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['update']> {
    return this.trailsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a trail' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['softDelete']> {
    return this.trailsService.softDelete(id, user.sub);
  }

  @Post(':id/courses')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Add a course to a trail' })
  addCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCourseToTrailDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['addCourse']> {
    return this.trailsService.addCourse(id, dto, user.sub);
  }

  @Patch(':id/courses/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Reorder courses in a trail' })
  reorderCourses(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderTrailCoursesDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['reorderCourses']> {
    return this.trailsService.reorderCourses(id, dto, user.sub);
  }

  @Delete(':id/courses/:courseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Remove a course from a trail' })
  removeCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['removeCourse']> {
    return this.trailsService.removeCourse(id, courseId, user.sub);
  }
}
