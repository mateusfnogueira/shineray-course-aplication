import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class ActivateAccountDto {
  @ApiProperty({ description: 'Token de ativação recebido por e-mail' })
  @IsString()
  @MinLength(1)
  token: string;

  @ApiProperty({ description: 'Senha a definir (mín. 8 chars, maiúscula, minúscula, número)' })
  @IsString()
  @MinLength(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
  @Matches(/[A-Z]/, { message: 'Senha deve conter pelo menos uma letra maiúscula' })
  @Matches(/[a-z]/, { message: 'Senha deve conter pelo menos uma letra minúscula' })
  @Matches(/[0-9]/, { message: 'Senha deve conter pelo menos um número' })
  password: string;
}
