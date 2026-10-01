import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ description: 'Id del usuario a añadir al proyecto' })
  @IsUUID()
  userId: string;
}
