import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CourseAssignmentType } from '@compliance/shared';

export class StoreAccessItemDto {
  @ApiProperty()
  @IsUUID('4')
  storeId: string;

  @ApiProperty({ enum: CourseAssignmentType })
  @IsEnum(CourseAssignmentType)
  assignmentType: CourseAssignmentType;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  availableFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  availableUntil?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  active: boolean;
}

export class SetStoreAccessDto {
  @ApiProperty({ type: [StoreAccessItemDto], description: 'Substituição completa dos acessos — envie um array vazio para remover todos' })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => StoreAccessItemDto)
  accesses: StoreAccessItemDto[];
}
