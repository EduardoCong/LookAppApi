import { Module, forwardRef } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { ModesGateway } from './modes.gateway';
import { ModesService } from './modes.service';
import { ModesController } from './modes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from '../stores/entities/store.entity';


@Module({
  imports: [
    forwardRef(() => StoresModule),
    TypeOrmModule.forFeature([Store])
  ],
  providers: [ModesService, ModesGateway],
  controllers: [ModesController],
  exports: [ModesService],
})
export class ModesModule {}
