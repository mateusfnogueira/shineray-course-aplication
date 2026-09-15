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
import { QuizzesService } from './quizzes.service';
import {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
} from './dto/admin-quiz.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('courses/quiz')
@ApiBearerAuth('access-token')
@Roles(UserRole.MASTER_ADMIN)
@Controller() // empty prefix — routes use full paths
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get('courses/:courseId/quiz')
  @ApiOperation({ summary: 'Get quiz for a course (admin view with isCorrect)' })
  getQuiz(@Param('courseId', ParseUUIDPipe) courseId: string): ReturnType<QuizzesService['getQuiz']> {
    return this.quizzesService.getQuiz(courseId);
  }

  @Post('courses/:courseId/quiz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create quiz for a course (one per course)' })
  createQuiz(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateQuizDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<QuizzesService['createQuiz']> {
    return this.quizzesService.createQuiz(courseId, dto, user.sub);
  }

  @Patch('quizzes/:quizId')
  @ApiOperation({ summary: 'Update quiz settings' })
  updateQuiz(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: UpdateQuizDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<QuizzesService['updateQuiz']> {
    return this.quizzesService.updateQuiz(quizId, dto, user.sub);
  }

  @Post('quizzes/:quizId/questions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add question with options to quiz' })
  createQuestion(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: CreateQuestionDto,
  ): ReturnType<QuizzesService['createQuestion']> {
    return this.quizzesService.createQuestion(quizId, dto);
  }

  @Patch('questions/:questionId')
  @ApiOperation({ summary: 'Update question (replaces options if provided)' })
  updateQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateQuestionDto,
  ): ReturnType<QuizzesService['updateQuestion']> {
    return this.quizzesService.updateQuestion(questionId, dto);
  }

  @Delete('questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete question and its options' })
  deleteQuestion(
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): ReturnType<QuizzesService['deleteQuestion']> {
    return this.quizzesService.deleteQuestion(questionId);
  }
}
