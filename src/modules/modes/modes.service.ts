import { Injectable } from '@nestjs/common';
import { StoresService } from '../stores/stores.service';
import {
  DISTANCE_NEARBY_STORES,
  DISTANCE_STORE_MODE,
} from 'src/config/constats';
import { UserLocationDto } from './dto/user.location';
import { ModeResponse } from '../stores/interfaces/store.interface';

@Injectable()
export class ModesService {
  private readonly storeRadius = DISTANCE_STORE_MODE;
  private readonly searchRadius = DISTANCE_NEARBY_STORES;

  constructor(
    private readonly storesService: StoresService,
  ) { }

  async detectMode(location: UserLocationDto): Promise<ModeResponse> {
    const storesNearby = await this.storesService.getNearestStores(
      location.lat,
      location.lng,
      this.searchRadius,
    );

    const nearest = storesNearby[0];
    if (!nearest) {
      const allStores = await this.storesService.findActive();
      return {
        mode: 'general',
        distance: null,
        stores: allStores,
      };
    }

    const distance = nearest.distance_meters;
    if (distance <= this.storeRadius) {
      const fullStore = await this.storesService.findActiveById(nearest.id);

      return {
        mode: 'store',
        distance,
        store_id: nearest.id,
        store: fullStore,
      };
    }

    const allStores = await this.storesService.findActive();
    return {
      mode: 'general',
      distance,
      stores: allStores,
    };
  }
}
