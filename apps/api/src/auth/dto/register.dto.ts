import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ana García', description: 'Nombre visible del usuario' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'ana@taskflow.dev', description: 'Email único' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ example: 'Secreta123', minLength: 8, description: 'Contraseña (mínimo 8)' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
