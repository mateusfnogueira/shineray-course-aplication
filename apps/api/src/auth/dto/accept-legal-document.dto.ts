import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AcceptLegalDocumentDto {
  @ApiProperty({ description: 'ID do documento legal a ser aceito' })
  @IsUUID('4', { message: 'ID de documento inválido' })
  legalDocumentId: string;
}
