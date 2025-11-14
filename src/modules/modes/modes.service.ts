import { Injectable, Inject, Optional } from '@nestjs/common';

import { StoresService } from '../stores/stores.service';
import { UserLocationDto } from './dto/user.location';
import { ModeResult } from './interfaces/modes-result.interface';
import { getDistanceFromLatLonInKm } from './utils/distance';

@Injectable()
export class ModesService {
  private readonly defaultMaxDistance = 300;
  private readonly storeRadius = 0.006;

  constructor(
    @Optional()
    @Inject(StoresService)
    private readonly storesService?: StoresService,
  ) {}

  async detectMode(
  location: UserLocationDto,
  maxDistance?: number,
): Promise<ModeResult> {
  const m = maxDistance ?? this.defaultMaxDistance;

  if (this.storesService) {
    try {
      const nearest = await this.storesService.getNearestStore(
        location.lat,
        location.lng,
        m,
      );

      if (nearest) {
        const distance = this.calcDistanceTo(
          location.lat,
          location.lng,
          nearest.lat,
          nearest.lng,
        );

        if (distance <= this.storeRadius) {
          return { mode: 'store', meta: { store: nearest, distance } };
        }
      }
    } catch (err) {
      console.error('Error detectando tienda:', err);
    }
  }

  return { mode: 'general' };
}

  calcDistanceTo(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    return getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
  }
}
