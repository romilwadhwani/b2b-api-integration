import { IsObject, IsString, MinLength } from 'class-validator';

export class TriggerEventDto {
  @IsString()
  @MinLength(1)
  event: string;

  @IsObject()
  payload: Record<string, unknown>;
}
