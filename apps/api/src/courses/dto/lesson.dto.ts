import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonType } from '@compliance/shared';

export class CreateLessonDto {
  @ApiProperty({ example: 'O que é Compliance?' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: LessonType })
  @IsEnum(LessonType)
  type: LessonType;

  @ApiProperty({ description: 'Posição da aula dentro do módulo (1-based)' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  order: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @ApiPropertyOptional({
    description:
      'URL do YouTube ou videoId direto. Aceita: https://youtube.com/watch?v=ID, https://youtu.be/ID, ou apenas o ID de 11 caracteres.',
  })
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional({ description: 'Conteúdo HTML/Markdown para aulas do tipo TEXT' })
  @IsOptional()
  @IsString()
  textContent?: string;
}

export class UpdateLessonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  youtubeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textContent?: string;
}

export class ReorderLessonsDto {
  @ApiProperty({ description: 'ID do módulo cujas aulas serão reordenadas' })
  @IsString()
  moduleId: string;

  @ApiProperty({ type: [String], description: 'IDs das aulas na nova ordem' })
  orderedIds: string[];
}
