import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UserLocationDto } from 'src/modules/modes/dto/user.location';

export class AnalizeTextDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto no puede estar vacío' })
  prompt: string;

  @ValidateNested()
  @Type(() => UserLocationDto)
  @IsOptional()
  location?: UserLocationDto;
}
