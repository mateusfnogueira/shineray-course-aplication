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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { CreateModuleDto, UpdateModuleDto, ReorderModulesDto } from './dto/module.dto';
import { CreateLessonDto, UpdateLessonDto, ReorderLessonsDto } from './dto/lesson.dto';
import { SetStoreAccessDto } from './dto/store-access.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('courses')
@ApiBearerAuth('access-token')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  // ─── Courses ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List courses (MA: all; SA: published for their store)' })
  findAll(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ListCoursesQueryDto,
  ): ReturnType<CoursesService['findAll']> {
    return this.coursesService.findAll(requester, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create a course (DRAFT status)' })
  create(
    @Body() dto: CreateCourseDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['create']> {
    return this.coursesService.create(dto, requester);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get course details with modules and store access' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['findOne']> {
    return this.coursesService.findOne(id, requester);
  }

  @Patch(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update course (only DRAFT and PUBLISHED)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['update']> {
    return this.coursesService.update(id, dto, requester);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a course' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['softDelete']> {
    return this.coursesService.softDelete(id, requester);
  }

  @Get(':id/validate-publish')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Check publication requirements without publishing' })
  validatePublish(
    @Param('id', ParseUUIDPipe) id: string,
  ): ReturnType<CoursesService['validateForPublish']> {
    return this.coursesService.validateForPublish(id);
  }

  @Post(':id/publish')
  @Roles(UserRole.MASTER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a DRAFT course (validates requirements)' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['publish']> {
    return this.coursesService.publish(id, requester);
  }

  @Post(':id/archive')
  @Roles(UserRole.MASTER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a DRAFT or PUBLISHED course' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['archive']> {
    return this.coursesService.archive(id, requester);
  }

  // ─── Modules ─────────────────────────────────────────────────────────────────

  @Get(':id/modules')
  @ApiOperation({ summary: 'List modules of a course (ordered)' })
  findModules(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['findModules']> {
    return this.coursesService.findModules(id, requester);
  }

  @Post(':id/modules')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Add a module to a course' })
  createModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['createModule']> {
    return this.coursesService.createModule(id, dto, requester);
  }

  // NOTE: define /modules/reorder BEFORE /modules/:moduleId to avoid route conflict
  @Patch(':id/modules/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Reorder modules by providing an ordered list of IDs' })
  reorderModules(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderModulesDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['reorderModules']> {
    return this.coursesService.reorderModules(id, dto, requester);
  }

  @Patch(':id/modules/:moduleId')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update a module' })
  updateModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['updateModule']> {
    return this.coursesService.updateModule(id, moduleId, dto, requester);
  }

  @Delete(':id/modules/:moduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete a module and all its lessons' })
  deleteModule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['deleteModule']> {
    return this.coursesService.deleteModule(id, moduleId, requester);
  }

  // ─── Lessons ─────────────────────────────────────────────────────────────────

  @Post(':id/modules/:moduleId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Add a lesson to a module' })
  createLesson(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['createLesson']> {
    return this.coursesService.createLesson(id, moduleId, dto, requester);
  }

  // NOTE: define /lessons/reorder BEFORE /lessons/:lessonId
  @Patch(':id/lessons/reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Reorder lessons within a module' })
  reorderLessons(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderLessonsDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['reorderLessons']> {
    return this.coursesService.reorderLessons(id, dto, requester);
  }

  @Patch(':id/lessons/:lessonId')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update a lesson' })
  updateLesson(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['updateLesson']> {
    return this.coursesService.updateLesson(id, lessonId, dto, requester);
  }

  @Delete(':id/lessons/:lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete a lesson' })
  deleteLesson(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['deleteLesson']> {
    return this.coursesService.deleteLesson(id, lessonId, requester);
  }

  // ─── Store access ─────────────────────────────────────────────────────────────

  @Get(':id/store-access')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'List store access for a course' })
  findStoreAccess(
    @Param('id', ParseUUIDPipe) id: string,
  ): ReturnType<CoursesService['findStoreAccess']> {
    return this.coursesService.findStoreAccess(id);
  }

  @Put(':id/store-access')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Replace all store access entries (full sync)' })
  setStoreAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStoreAccessDto,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['setStoreAccess']> {
    return this.coursesService.setStoreAccess(id, dto, requester);
  }

  @Delete(':id/store-access/:storeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Remove one store from course access' })
  removeStoreAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() requester: JwtPayload,
  ): ReturnType<CoursesService['removeStoreAccess']> {
    return this.coursesService.removeStoreAccess(id, storeId, requester);
  }
}
