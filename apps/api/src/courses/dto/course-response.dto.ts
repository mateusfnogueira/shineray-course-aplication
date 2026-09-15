import { ApiProperty } from '@nestjs/swagger';
import { CourseStatus } from '@compliance/shared';

export class LessonResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() moduleId: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() type: string;
  @ApiProperty() order: number;
  @ApiProperty() required: boolean;
  @ApiProperty({ nullable: true }) durationMinutes: number | null;
  @ApiProperty({ nullable: true }) youtubeVideoId: string | null;
  @ApiProperty({ nullable: true }) youtubeEmbedUrl: string | null;
  @ApiProperty({ nullable: true }) textContent: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ModuleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() order: number;
  @ApiProperty({ type: [LessonResponseDto] }) lessons: LessonResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class CourseStoreAccessResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() storeId: string;
  @ApiProperty() storeName: string;
  @ApiProperty() storeCode: string;
  @ApiProperty() assignmentType: string;
  @ApiProperty({ nullable: true }) availableFrom: Date | null;
  @ApiProperty({ nullable: true }) availableUntil: Date | null;
  @ApiProperty() active: boolean;
}

export class CourseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty() description: string;
  @ApiProperty({ nullable: true }) coverImageUrl: string | null;
  @ApiProperty() estimatedDurationMinutes: number;
  @ApiProperty({ nullable: true }) minimumPassingScore: number | null;
  @ApiProperty({ nullable: true }) maximumAttempts: number | null;
  @ApiProperty({ enum: CourseStatus }) status: CourseStatus;
  @ApiProperty() certificateEnabled: boolean;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() moduleCount: number;
  @ApiProperty() lessonCount: number;
}

export class CourseDetailResponseDto extends CourseResponseDto {
  @ApiProperty({ type: [ModuleResponseDto] }) modules: ModuleResponseDto[];
  @ApiProperty({ type: [CourseStoreAccessResponseDto] }) storeAccess: CourseStoreAccessResponseDto[];
}

export class PublishValidationResponseDto {
  @ApiProperty() valid: boolean;
  @ApiProperty({ type: [String] }) errors: string[];
}
