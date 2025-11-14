import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class AnalizeTextDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto no puede estar vacío' })
  prompt: string;

  @IsNumber()
  lat?: number;

  @IsNumber()
  lng?: number;
}
