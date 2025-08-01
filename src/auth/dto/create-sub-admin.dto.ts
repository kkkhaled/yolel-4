import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateSubAdminDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsString()
  @IsNotEmpty()
  password: string;
}
