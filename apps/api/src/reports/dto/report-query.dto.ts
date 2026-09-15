import { IsEnum, IsISO8601, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') storeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') courseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() endDate?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 50, maximum: 200 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number = 50;
}

export class ExportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ enum: ['courses', 'students', 'stores', 'pending', 'quiz-results', 'certificates'] })
  @IsOptional()
  @IsEnum(['courses', 'students', 'stores', 'pending', 'quiz-results', 'certificates'])
  type?: string = 'courses';
}
