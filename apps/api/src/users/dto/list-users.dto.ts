import { Role } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { SearchablePaginationDto } from '../../common/dto/pagination.dto';

export class ListUsersDto extends SearchablePaginationDto {
  @ApiPropertyOptional({ enum: Role, description: 'Filtrar por rol' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
