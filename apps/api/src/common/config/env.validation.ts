import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsNumber()
  PORT: number = 3001;

  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  CORS_ORIGIN: string = 'http://localhost:5173';

  @IsUrl()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_SERVICE_ROLE_KEY: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsUrl()
  JNE_CANDIDATES_URL: string =
    'https://votoinformado.jne.gob.pe/presidente-vicepresidentes';

  @IsString()
  APP_NAME: string = 'encuesta-peru-2026';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}
