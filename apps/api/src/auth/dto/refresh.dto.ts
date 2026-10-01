import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token devuelto en el login/registro',
    example: '9f2c…',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
