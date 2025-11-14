import { Controller, Post, Body } from '@nestjs/common';
import { ModesService } from './modes.service';
import { UserLocationDto } from './dto/user.location';

@Controller('modes')
export class ModesController {
  constructor(private readonly modesService: ModesService) {}

  @Post('check')
  async checkMode(@Body() location: UserLocationDto) {
    return this.modesService.detectMode(location);
  }
}
