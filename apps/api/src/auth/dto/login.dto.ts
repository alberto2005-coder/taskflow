import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@taskflow.dev' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ example: 'Secreta123' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
