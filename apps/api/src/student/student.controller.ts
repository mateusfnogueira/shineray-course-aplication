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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { StudentQuizService } from '../quizzes/student-quiz.service';
import { CertificatesService } from '../certificates/certificates.service';
import { TrailsService } from '../trails/trails.service';
import { AnnouncementsService } from '../announcements/announcements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentCoursesQueryDto, UpdateLessonProgressDto } from './dto/student.dto';
import { SaveAnswerDto } from '../quizzes/dto/attempt.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('student')
@ApiBearerAuth('access-token')
@Roles(UserRole.STUDENT)
@Controller('student')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly studentQuizService: StudentQuizService,
    private readonly certificatesService: CertificatesService,
    private readonly trailsService: TrailsService,
    private readonly announcementsService: AnnouncementsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: "Student's dashboard with stats and recent activity" })
  getDashboard(@CurrentUser() user: JwtPayload): ReturnType<StudentService['getDashboard']> {
    return this.studentService.getDashboard(user.sub, user.storeId!);
  }

  // ─── Catalog — specific routes BEFORE /:id ────────────────────────────────

  @Get('courses/required')
  @ApiOperation({ summary: 'List required courses for the student store' })
  getRequiredCourses(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['getRequiredCourses']> {
    return this.studentService.getRequiredCourses(user.sub, user.storeId!);
  }

  @Get('courses/in-progress')
  @ApiOperation({ summary: 'List in-progress enrollments' })
  getInProgressCourses(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['getInProgressCourses']> {
    return this.studentService.getInProgressCourses(user.sub, user.storeId!);
  }

  @Get('courses/completed')
  @ApiOperation({ summary: 'List completed courses' })
  getCompletedCourses(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['getCompletedCourses']> {
    return this.studentService.getCompletedCourses(user.sub, user.storeId!);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Browse the course catalog (published + store-available)' })
  getCatalog(
    @CurrentUser() user: JwtPayload,
    @Query() query: StudentCoursesQueryDto,
  ): ReturnType<StudentService['getCatalog']> {
    return this.studentService.getCatalog(user.sub, user.storeId!, query);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Get course details (student view with enrollment info)' })
  getCourseDetail(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['getCourseDetail']> {
    return this.studentService.getCourseDetail(courseId, user.sub, user.storeId!);
  }

  @Post('courses/:courseId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create enrollment (idempotent) and return full course structure' })
  startCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['startCourse']> {
    return this.studentService.startCourse(courseId, user.sub, user.storeId!);
  }

  // ─── Enrollment ───────────────────────────────────────────────────────────

  @Get('enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Get enrollment with full course structure and progress' })
  getEnrollment(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['getEnrollment']> {
    return this.studentService.getEnrollment(enrollmentId, user.sub);
  }

  @Post('enrollments/:enrollmentId/lessons/:lessonId/start')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark lesson as started, transition enrollment to IN_PROGRESS' })
  startLesson(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['startLesson']> {
    return this.studentService.startLesson(enrollmentId, lessonId, user.sub);
  }

  @Post('enrollments/:enrollmentId/lessons/:lessonId/progress')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update video position and watched seconds' })
  updateLessonProgress(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateLessonProgressDto,
  ): ReturnType<StudentService['updateLessonProgress']> {
    return this.studentService.updateLessonProgress(enrollmentId, lessonId, user.sub, dto);
  }

  @Post('enrollments/:enrollmentId/lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lesson as complete and recalculate enrollment progress' })
  completeLesson(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['completeLesson']> {
    return this.studentService.completeLesson(enrollmentId, lessonId, user.sub);
  }

  // ─── Favorites ────────────────────────────────────────────────────────────

  @Post('courses/:courseId/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add course to favorites' })
  addFavorite(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['addFavorite']> {
    return this.studentService.addFavorite(courseId, user.sub, user.storeId!);
  }

  @Delete('courses/:courseId/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove course from favorites' })
  removeFavorite(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentService['removeFavorite']> {
    return this.studentService.removeFavorite(courseId, user.sub);
  }

  // ─── Quiz attempts ────────────────────────────────────────────────────────

  @Post('enrollments/:enrollmentId/quiz/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start (or resume) a quiz attempt for the enrollment' })
  startQuizAttempt(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentQuizService['startAttempt']> {
    return this.studentQuizService.startAttempt(enrollmentId, user.sub);
  }

  @Get('quiz-attempts/:attemptId')
  @ApiOperation({ summary: 'Get in-progress attempt with questions (no isCorrect)' })
  getQuizAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentQuizService['getAttempt']> {
    return this.studentQuizService.getAttempt(attemptId, user.sub);
  }

  @Post('quiz-attempts/:attemptId/answer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Save (upsert) answer for one question' })
  saveQuizAnswer(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveAnswerDto,
  ): ReturnType<StudentQuizService['saveAnswer']> {
    return this.studentQuizService.saveAnswer(attemptId, user.sub, dto);
  }

  @Post('quiz-attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit attempt — backend calculates score' })
  submitQuizAttempt(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentQuizService['submitAttempt']> {
    return this.studentQuizService.submitAttempt(attemptId, user.sub);
  }

  @Get('quiz-attempts/:attemptId/result')
  @ApiOperation({ summary: 'Get result with isCorrect revealed (only after submission)' })
  getQuizResult(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StudentQuizService['getResult']> {
    return this.studentQuizService.getResult(attemptId, user.sub);
  }

  // ─── Trails ───────────────────────────────────────────────────────────────

  @Get('trails')
  @ApiOperation({ summary: 'List active trails with student progress' })
  getTrails(@CurrentUser() user: JwtPayload): ReturnType<TrailsService['findStudentTrails']> {
    return this.trailsService.findStudentTrails(user.sub);
  }

  @Get('trails/:trailId')
  @ApiOperation({ summary: 'Get trail detail with course list and progress' })
  getTrail(
    @Param('trailId', ParseUUIDPipe) trailId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<TrailsService['findStudentTrailDetail']> {
    return this.trailsService.findStudentTrailDetail(trailId, user.sub);
  }

  // ─── Announcements ────────────────────────────────────────────────────────

  @Get('announcements')
  @ApiOperation({ summary: 'List announcements relevant to student store' })
  getAnnouncements(@CurrentUser() user: JwtPayload): ReturnType<AnnouncementsService['findAll']> {
    return this.announcementsService.findAll(user);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  @Get('notifications')
  @ApiOperation({ summary: 'List notifications (last 50)' })
  getNotifications(@CurrentUser() user: JwtPayload): ReturnType<NotificationsService['findByUser']> {
    return this.notificationsService.findByUser(user.sub);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsRead(@CurrentUser() user: JwtPayload): ReturnType<NotificationsService['markAllRead']> {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  markNotificationRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<NotificationsService['markRead']> {
    return this.notificationsService.markRead(id, user.sub);
  }

  // ─── Certificates ─────────────────────────────────────────────────────────

  @Get('certificates')
  @ApiOperation({ summary: "List student's certificates" })
  getCertificates(
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CertificatesService['listByUser']> {
    return this.certificatesService.listByUser(user.sub);
  }

  @Get('certificates/:id')
  @ApiOperation({ summary: 'Get certificate details and download URL' })
  getCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CertificatesService['getByIdForUser']> {
    return this.certificatesService.getByIdForUser(id, user.sub);
  }
}
