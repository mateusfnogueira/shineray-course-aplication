import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateStoreDto {
  @ApiProperty({ example: 'Loja Centro São Paulo' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'SP-001', description: 'Código único, maiúsculas, números, hífens e underscores' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Código deve conter apenas letras maiúsculas, números, hífens e underscores',
  })
  @Transform(({ value }: { value: string }) => value.toUpperCase())
  code: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-99' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({ example: 'Sudeste' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  region?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Estado deve ter exatamente 2 caracteres' })
  @Transform(({ value }: { value: string }) => value.toUpperCase())
  state?: string;
}
