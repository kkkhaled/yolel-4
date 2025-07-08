import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUploadDto {
  @IsNotEmpty()
  imageUrl: string;
  
  @IsOptional()
   imagePath: string;
  @IsNotEmpty()
  voteNum: number;

  @IsNotEmpty()
  user: string; // Assuming this is the user ID

  @IsNotEmpty()
  ageType: string;

  @IsNotEmpty()
  gender: string;
}
