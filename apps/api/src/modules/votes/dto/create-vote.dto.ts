import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateVoteDto {
  @IsUUID()
  voteOptionId: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number;

  @IsEnum(['granted', 'prompt', 'denied'])
  permissionState: 'granted' | 'prompt' | 'denied';

  @IsString()
  @IsOptional()
  sessionId?: string;
}
