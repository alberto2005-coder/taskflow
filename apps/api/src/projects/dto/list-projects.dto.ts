import { ProjectStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { SearchablePaginationDto } from '../../common/dto/pagination.dto';

export class ListProjectsDto extends SearchablePaginationDto {
  @ApiPropertyOptional({ enum: ProjectStatus, description: 'Filtrar por estado' })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
