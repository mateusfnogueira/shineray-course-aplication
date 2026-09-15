import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual' })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @ApiProperty({ description: 'Nova senha (mín. 8 chars, maiúscula, minúscula, número)' })
  @IsString()
  @MinLength(8, { message: 'Nova senha deve ter pelo menos 8 caracteres' })
  @Matches(/[A-Z]/, { message: 'Nova senha deve conter pelo menos uma letra maiúscula' })
  @Matches(/[a-z]/, { message: 'Nova senha deve conter pelo menos uma letra minúscula' })
  @Matches(/[0-9]/, { message: 'Nova senha deve conter pelo menos um número' })
  newPassword: string;
}
