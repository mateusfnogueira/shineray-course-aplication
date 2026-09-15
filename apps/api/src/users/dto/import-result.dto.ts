import { ApiProperty } from '@nestjs/swagger';

export class ImportRowErrorDto {
  @ApiProperty() row: number;
  @ApiProperty() field: string;
  @ApiProperty() message: string;
}

export class ImportResultDto {
  @ApiProperty() total: number;
  @ApiProperty() accepted: number;
  @ApiProperty() rejected: number;
  @ApiProperty({ type: [ImportRowErrorDto] }) errors: ImportRowErrorDto[];
}
