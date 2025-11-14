import { IsNumber } from 'class-validator';

export class UserLocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}
