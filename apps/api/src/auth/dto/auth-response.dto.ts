import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserPublicDto {
  @ApiProperty({ example: 'a1b2c3d4-…' })
  id: string;

  @ApiProperty({ example: 'Ana García' })
  name: string;

  @ApiProperty({ example: 'ana@taskflow.dev' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.MEMBER })
  role: Role;

  @ApiProperty({ example: '2026-01-15T10:30:00.000Z' })
  createdAt: Date;
}

/** Respuesta compartida por registro, login y refresh. */
export class AuthResponseDto {
  @ApiProperty({ type: UserPublicDto })
  user: UserPublicDto;

  @ApiProperty({ description: 'JWT de acceso (15 min)' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token (7 días), también hasheado en servidor' })
  refreshToken: string;
}
