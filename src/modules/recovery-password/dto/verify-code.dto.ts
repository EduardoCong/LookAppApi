import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyCodeDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @Length(6, 6)
    code: string;

    @IsNotEmpty()
    newPassword: string;
}
