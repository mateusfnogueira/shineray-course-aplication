import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourseDto {
  @ApiProperty({ example: 'Ética e Compliance nas Vendas' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Aprenda sobre conduta ética nas relações comerciais' })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  shortDescription: string;

  @ApiProperty({ description: 'Descrição completa em HTML ou texto longo' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ example: 120, description: 'Duração total em minutos' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  estimatedDurationMinutes: number;

  @ApiPropertyOptional({ example: 70, description: 'Nota mínima de aprovação (0–100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minimumPassingScore?: number;

  @ApiPropertyOptional({ example: 3, description: 'Máximo de tentativas no teste' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maximumAttempts?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  certificateEnabled?: boolean;
}
