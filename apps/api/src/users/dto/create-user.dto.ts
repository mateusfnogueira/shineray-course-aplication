import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@compliance/shared';

export class CreateUserDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'joao.silva@loja.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'Perfil inválido' })
  role: UserRole;

  @ApiPropertyOptional({ description: 'Obrigatório para STORE_ADMIN e STUDENT' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId inválido' })
  storeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Vendedor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string | null;
}
