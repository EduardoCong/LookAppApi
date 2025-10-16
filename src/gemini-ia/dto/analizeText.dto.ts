import { IsNotEmpty, IsString } from 'class-validator';

export class AnalizeTextDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto no puede estar vacío' })
  prompt: string;
}
