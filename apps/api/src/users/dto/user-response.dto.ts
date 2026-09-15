import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@compliance/shared';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty({ nullable: true }) storeId: string | null;
  @ApiProperty({ nullable: true }) storeName: string | null;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty({ nullable: true }) position: string | null;
  @ApiProperty({ nullable: true }) firstAccessCompletedAt: Date | null;
  @ApiProperty({ nullable: true }) lastLoginAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
