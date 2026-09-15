import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '@compliance/shared';

// ─── Admin request DTOs ───────────────────────────────────────────────────────

export class CreateQuizDto {
  @ApiProperty() @IsString() @MinLength(2) title: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ description: 'Nota mínima de aprovação (0–100)', example: 70 })
  @IsInt() @Min(0) @Max(100) minimumPassingScore: number;

  @ApiPropertyOptional({ description: 'null = tentativas ilimitadas' })
  @IsOptional() @IsInt() @IsPositive() maximumAttempts?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean() shuffleQuestions?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean() shuffleAnswers?: boolean;
}

export class UpdateQuizDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) minimumPassingScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() maximumAttempts?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleQuestions?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() shuffleAnswers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateOptionDto {
  @ApiProperty() @IsString() @MinLength(1) text: string;
  @ApiProperty() @IsBoolean() isCorrect: boolean;
  @ApiProperty() @IsInt() @IsPositive() order: number;
}

export class CreateQuestionDto {
  @ApiProperty() @IsString() @MinLength(5) statement: string;
  @ApiProperty({ enum: QuestionType }) @IsEnum(QuestionType) type: QuestionType;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
  @ApiProperty() @IsInt() @IsPositive() order: number;

  @ApiProperty({ type: [CreateOptionDto], description: 'Mínimo de 2 opções' })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options: CreateOptionDto[];
}

export class UpdateQuestionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(5) statement?: string;
  @ApiPropertyOptional({ enum: QuestionType }) @IsOptional() @IsEnum(QuestionType) type?: QuestionType;
  @ApiPropertyOptional() @IsOptional() @IsString() explanation?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @IsPositive() order?: number;

  @ApiPropertyOptional({ type: [CreateOptionDto], description: 'Se informado, substitui todas as opções existentes' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}

// ─── Admin response DTOs ──────────────────────────────────────────────────────

export class OptionAdminDto {
  @ApiProperty() id: string;
  @ApiProperty() text: string;
  @ApiProperty() isCorrect: boolean;
  @ApiProperty() order: number;
}

export class QuestionAdminDto {
  @ApiProperty() id: string;
  @ApiProperty() quizId: string;
  @ApiProperty() statement: string;
  @ApiProperty() type: string;
  @ApiProperty({ nullable: true }) explanation: string | null;
  @ApiProperty() order: number;
  @ApiProperty({ type: [OptionAdminDto] }) options: OptionAdminDto[];
}

export class QuizAdminDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() minimumPassingScore: number;
  @ApiProperty({ nullable: true }) maximumAttempts: number | null;
  @ApiProperty() shuffleQuestions: boolean;
  @ApiProperty() shuffleAnswers: boolean;
  @ApiProperty() active: boolean;
  @ApiProperty() questionCount: number;
  @ApiProperty({ type: [QuestionAdminDto] }) questions: QuestionAdminDto[];
}
