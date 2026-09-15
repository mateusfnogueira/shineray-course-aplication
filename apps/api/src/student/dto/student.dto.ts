import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EnrollmentStatus, CourseAssignmentType } from '@compliance/shared';

// ─── Query ────────────────────────────────────────────────────────────────────

export class StudentCoursesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateLessonProgressDto {
  @ApiPropertyOptional({ description: 'Segundos assistidos do vídeo' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  watchedSeconds?: number;

  @ApiPropertyOptional({ description: 'Última posição no vídeo (segundos)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastPositionSeconds?: number;
}

// ─── Responses ────────────────────────────────────────────────────────────────

export class EnrollmentSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: EnrollmentStatus }) status: EnrollmentStatus;
  @ApiProperty() progressPercentage: number;
  @ApiProperty({ nullable: true }) startedAt: Date | null;
  @ApiProperty({ nullable: true }) completedAt: Date | null;
  @ApiProperty({ nullable: true }) lastAccessedAt: Date | null;
}

export class StudentCourseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty({ nullable: true }) coverImageUrl: string | null;
  @ApiProperty() estimatedDurationMinutes: number;
  @ApiProperty({ nullable: true }) minimumPassingScore: number | null;
  @ApiProperty() certificateEnabled: boolean;
  @ApiProperty() publishedAt: Date;
  @ApiProperty() moduleCount: number;
  @ApiProperty() lessonCount: number;
  @ApiProperty({ enum: CourseAssignmentType }) assignmentType: CourseAssignmentType;
  @ApiProperty({ nullable: true, type: EnrollmentSummaryDto }) enrollment: EnrollmentSummaryDto | null;
  @ApiProperty() isFavorited: boolean;
}

export class LessonProgressDto {
  @ApiProperty({ nullable: true }) startedAt: Date | null;
  @ApiProperty({ nullable: true }) completedAt: Date | null;
  @ApiProperty({ nullable: true }) watchedSeconds: number | null;
  @ApiProperty({ nullable: true }) lastPositionSeconds: number | null;
}

export class LessonWithProgressDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() type: string;
  @ApiProperty() order: number;
  @ApiProperty() required: boolean;
  @ApiProperty({ nullable: true }) durationMinutes: number | null;
  @ApiProperty({ nullable: true }) youtubeVideoId: string | null;
  @ApiProperty({ nullable: true }) youtubeEmbedUrl: string | null;
  @ApiProperty({ nullable: true }) textContent: string | null;
  @ApiProperty({ nullable: true, type: LessonProgressDto }) progress: LessonProgressDto | null;
}

export class ModuleWithProgressDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() order: number;
  @ApiProperty({ type: [LessonWithProgressDto] }) lessons: LessonWithProgressDto[];
}

export class EnrollmentDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty({ enum: EnrollmentStatus }) status: EnrollmentStatus;
  @ApiProperty() progressPercentage: number;
  @ApiProperty({ nullable: true }) startedAt: Date | null;
  @ApiProperty({ nullable: true }) completedAt: Date | null;
  @ApiProperty({ nullable: true }) lastAccessedAt: Date | null;
  @ApiProperty() hasQuiz: boolean;
  @ApiProperty({ type: [ModuleWithProgressDto] }) modules: ModuleWithProgressDto[];
}

export class CompleteLessonResponseDto {
  @ApiProperty() progressPercentage: number;
  @ApiProperty() enrollmentCompleted: boolean;
  @ApiProperty({ enum: EnrollmentStatus }) enrollmentStatus: EnrollmentStatus;
}

export class StudentDashboardStatsDto {
  @ApiProperty() totalEnrollments: number;
  @ApiProperty() completed: number;
  @ApiProperty() inProgress: number;
  @ApiProperty() notStarted: number;
  @ApiProperty() requiredPending: number;
  @ApiProperty() overallProgressPercentage: number;
}

export class StudentDashboardDto {
  @ApiProperty() userName: string;
  @ApiProperty({ type: StudentDashboardStatsDto }) stats: StudentDashboardStatsDto;
  @ApiProperty({ type: [StudentCourseDto] }) requiredPending: StudentCourseDto[];
  @ApiProperty({ type: [StudentCourseDto] }) inProgress: StudentCourseDto[];
  @ApiProperty({ nullable: true }) lastAccessedCourseId: string | null;
  @ApiProperty({ nullable: true }) lastAccessedEnrollmentId: string | null;
}
