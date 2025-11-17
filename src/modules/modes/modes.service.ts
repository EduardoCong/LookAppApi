import { Injectable } from '@nestjs/common';
import { StoresService } from '../stores/stores.service';
import {
  DISTANCE_NEARBY_STORES,
  DISTANCE_STORE_MODE,
} from 'src/config/constats';
import { UserLocationDto } from './dto/user.location';
import { Repository } from 'typeorm';
import { Store } from '../stores/entities/store.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ModesService {
  private readonly storeRadius = DISTANCE_STORE_MODE;
  private readonly searchRadius = DISTANCE_NEARBY_STORES;

  constructor(
    private readonly storesService: StoresService,

    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
  ) {}

  async detectMode(location: UserLocationDto) {
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
    const store = await this.storesService.findActiveById(nearest.id);

    if (distance <= this.storeRadius) {
      const fullStore = await this.storesService.findActiveById(nearest.id);

      return {
        mode: 'store',
        store_id: nearest.id,
        store: {
          id: fullStore.id,
          business_name: fullStore.business_name,
          owner_name: fullStore.owner_name,
          address: fullStore.address,
          latitude: fullStore.latitude,
          longitude: fullStore.longitude,
          category: fullStore.category,
          detail: fullStore.detail,
          products: fullStore.products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            imageUrl: p.imageUrl,
          })),
        },
      };
    }

    const allStores = await this.storesService.findActive();
    return {
      mode: 'general',
      stores: allStores,
    };
  }
}
