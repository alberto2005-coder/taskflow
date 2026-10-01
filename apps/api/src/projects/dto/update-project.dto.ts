import { OmitType, PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['name'] as const)) {
  @ApiProperty({ example: 'Nombre nuevo', minLength: 2, maxLength: 100, required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, example: ProjectStatus.ARCHIVED })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}
