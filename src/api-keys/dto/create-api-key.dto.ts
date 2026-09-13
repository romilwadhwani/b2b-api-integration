import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production Caller', description: 'Human-readable label for this key' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z', description: 'Optional expiry as ISO date string' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
