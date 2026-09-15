import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { AttemptStatus } from '@compliance/shared';

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export class SaveAnswerDto {
  @ApiProperty({ description: 'ID da questão' })
  @IsUUID('4')
  questionId: string;

  @ApiProperty({ type: [String], description: 'IDs das opções selecionadas' })
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  selectedOptionIds: string[];
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class OptionForAttemptDto {
  @ApiProperty() id: string;
  @ApiProperty() text: string;
  @ApiProperty() order: number;
  // isCorrect is intentionally omitted — never sent before submission
}

export class QuestionForAttemptDto {
  @ApiProperty() id: string;
  @ApiProperty() statement: string;
  @ApiProperty() type: string;
  @ApiProperty() order: number;
  @ApiProperty({ type: [OptionForAttemptDto] }) options: OptionForAttemptDto[];
}

export class SavedAnswerDto {
  @ApiProperty() questionId: string;
  @ApiProperty({ type: [String] }) selectedOptionIds: string[];
}

export class AttemptStateDto {
  @ApiProperty() attemptId: string;
  @ApiProperty() attemptNumber: number;
  @ApiProperty() quizTitle: string;
  @ApiProperty() minimumPassingScore: number;
  @ApiProperty({ nullable: true }) maximumAttempts: number | null;
  @ApiProperty() attemptsUsed: number;
  @ApiProperty() totalQuestions: number;
  @ApiProperty({ type: [QuestionForAttemptDto] }) questions: QuestionForAttemptDto[];
  @ApiProperty({ type: [SavedAnswerDto] }) savedAnswers: SavedAnswerDto[];
}

export class OptionResultDto {
  @ApiProperty() id: string;
  @ApiProperty() text: string;
  @ApiProperty() order: number;
  @ApiProperty() isCorrect: boolean;
  @ApiProperty() wasSelected: boolean;
}

export class QuestionResultDto {
  @ApiProperty() id: string;
  @ApiProperty() statement: string;
  @ApiProperty() type: string;
  @ApiProperty() correct: boolean;
  @ApiProperty({ nullable: true }) explanation: string | null;
  @ApiProperty({ type: [OptionResultDto] }) options: OptionResultDto[];
}

export class AttemptResultDto {
  @ApiProperty() attemptId: string;
  @ApiProperty() attemptNumber: number;
  @ApiProperty({ enum: AttemptStatus }) status: AttemptStatus;
  @ApiProperty() score: number;
  @ApiProperty() passed: boolean;
  @ApiProperty() submittedAt: Date;
  @ApiProperty() minimumPassingScore: number;
  @ApiProperty({ nullable: true }) maximumAttempts: number | null;
  @ApiProperty() attemptsUsed: number;
  @ApiProperty() canRetry: boolean;
  @ApiProperty({ type: [QuestionResultDto] }) questions: QuestionResultDto[];
}
