import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTrailDto {
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MinLength(10) description: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateTrailDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) @MaxLength(200) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(10) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class AddCourseToTrailDto {
  @ApiProperty() @IsString() courseId: string;
  @ApiProperty() @IsInt() @IsPositive() order: number;
}

export class ReorderTrailCoursesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedCourseIds: string[];
}

export class TrailCourseDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty() courseTitle: string;
  @ApiProperty() courseSlug: string;
  @ApiProperty() estimatedDurationMinutes: number;
  @ApiProperty() order: number;
  @ApiProperty() courseStatus: string;
}

export class TrailResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() description: string;
  @ApiProperty({ nullable: true }) coverImageUrl: string | null;
  @ApiProperty() active: boolean;
  @ApiProperty() courseCount: number;
  @ApiProperty() totalDurationMinutes: number;
  @ApiProperty() createdAt: Date;
}

export class TrailDetailDto extends TrailResponseDto {
  @ApiProperty({ type: [TrailCourseDto] }) courses: TrailCourseDto[];
}

export class StudentTrailDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() slug: string;
  @ApiProperty() description: string;
  @ApiProperty({ nullable: true }) coverImageUrl: string | null;
  @ApiProperty() courseCount: number;
  @ApiProperty() completedCourses: number;
  @ApiProperty() progressPercentage: number;
  @ApiProperty({ nullable: true }) nextCourseId: string | null;
  @ApiProperty({ nullable: true }) nextCourseTitle: string | null;
  @ApiProperty() totalDurationMinutes: number;
}
