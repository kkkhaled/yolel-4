import { Type, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsBoolean,
} from 'class-validator';

export class GetUploadsByUserLevelsDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @IsPositive()
  limit?: number = 20;

  // Accepts true/false or "true"/"false" in querystring
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() !== 'false';
    return true; // default
  })
  includeSelf?: boolean = true;

  @IsOptional()
  @IsIn(['level', 'createdAt'])
  sort?: 'level' | 'createdAt' = 'level';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
