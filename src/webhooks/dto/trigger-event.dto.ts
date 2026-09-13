import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, MinLength } from 'class-validator';

export class TriggerEventDto {
  @ApiProperty({ example: 'user.signup', description: 'Event name identifying what happened' })
  @IsString()
  @MinLength(1)
  event: string;

  @ApiProperty({ example: { userId: 'u_123', email: 'user@example.com' }, description: 'Arbitrary JSON payload' })
  @IsObject()
  payload: Record<string, unknown>;
}
