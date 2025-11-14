import { Module, forwardRef } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { ModesGateway } from './modes.gateway';
import { ModesService } from './modes.service';
import { ModesController } from './modes.controller';


@Module({
  imports: [forwardRef(() => StoresModule)],
  providers: [ModesService, ModesGateway],
  controllers: [ModesController],
  exports: [ModesService],
})
export class ModesModule {}
