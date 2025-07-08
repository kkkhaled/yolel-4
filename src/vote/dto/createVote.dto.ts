import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsMongoId,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImageDataDto {
  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsMongoId()
  user: string;

  @IsNotEmpty()
  @IsNumber()
  voteNum: number;
}

export class CreateVoteDto {
  @ValidateNested()
  @Type(() => ImageDataDto)
  imageOne: ImageDataDto;

  @ValidateNested()
  @Type(() => ImageDataDto)
  imageTwo: ImageDataDto;

  @IsNotEmpty()
  @IsMongoId()
  user: string;

  @IsNotEmpty()
  @IsBoolean()
  isArchived: boolean;
}
