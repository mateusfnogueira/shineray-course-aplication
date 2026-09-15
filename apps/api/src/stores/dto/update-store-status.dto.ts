import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateStoreStatusDto {
  @ApiProperty({ description: 'true para ativar, false para inativar' })
  @IsBoolean()
  active: boolean;
}
