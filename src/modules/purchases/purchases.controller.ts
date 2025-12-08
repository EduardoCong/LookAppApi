import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) { }
  @Get('store/:id')
  getAllFromStore(
    @Param('id', ParseIntPipe) storeId: number,
  ) {
    return this.purchasesService.getAllFromStore(storeId);
  }

  @Get('store/:id/recommendations')
  async getSalesInsights(@Param('id') storeId: string) {
    const storeIdNumber = Number(storeId);
    if (isNaN(storeIdNumber)) {
      throw new Error('storeId debe ser un número');
    }
    return this.purchasesService.getSalesInsights(storeIdNumber);
  }

  @Get('store/:id/promotions')
  async getPromotionRecommendations(@Param('id') storeId: string) {
    const storeIdNumber = Number(storeId);
    if (isNaN(storeIdNumber)) {
      throw new Error('storeId debe ser un número');
    }
    return this.purchasesService.getPromotionRecommendations(storeIdNumber);
  }
}