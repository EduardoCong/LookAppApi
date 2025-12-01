import { Injectable } from '@nestjs/common';
import { PurchaseApartado } from './entities/purchase_apartado.entity';
import { Repository, Between } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PurchaseFull } from 'src/modules/app/Purchases/entities/purchase-full.entity';
import { PurchaseFisico } from './entities/purchase_fisico.entity';
import { GeminiIaService } from 'src/modules/gemini-ia/gemini-ia.service';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(PurchaseApartado)
    private readonly purchaseApartado: Repository<PurchaseApartado>,

    @InjectRepository(PurchaseFull)
    private readonly purchaseFull: Repository<PurchaseFull>,

    @InjectRepository(PurchaseFisico)
    private readonly purchaseFisico: Repository<PurchaseFisico>,

    private readonly geminiIaService: GeminiIaService,
  ) { }

  async getAllFromStore(storeId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const formatDate = (d: Date) =>
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')
      }/${d.getFullYear()}`;


    const apartado = await this.purchaseApartado.find({
      where: {
        store: { id: storeId },
        created_at: Between(startOfMonth, endOfMonth),
      },
      relations: ['product', 'store'],
      order: { created_at: 'DESC' },
    });

    const full = await this.purchaseFull.find({
      where: {
        store: { id: storeId },
        created_at: Between(startOfMonth, endOfMonth),
      },
      relations: ['product', 'store'],
      order: { created_at: 'DESC' },
    });

    const fisico = await this.purchaseFisico.find({
      where: {
        store: { id: storeId },
        created_at: Between(startOfMonth, endOfMonth),
      },
      relations: ['product', 'store'],
      order: { created_at: 'DESC' },
    });

    const cleanItem = (item: any) => ({
      id: item.id,
      product: item.product
        ? {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          stock: item.product.stock,
        }
        : null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    });

    const apartadoClean = apartado.map(cleanItem);
    const fullClean = full.map(cleanItem);
    const fisicoClean = fisico.map(cleanItem);

    const all = [...apartado, ...full, ...fisico];

    const productMap: Record<number, { product: any; totalQty: number }> = {};

    for (const row of all) {
      if (!row.product) continue;

      if (!productMap[row.product.id]) {
        productMap[row.product.id] = {
          product: row.product,
          totalQty: 0,
        };
      }

      productMap[row.product.id].totalQty += row.quantity;
    }

    const statsArray = Object.values(productMap);

    const top3 = statsArray
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5)
      .map((p) => ({
        id: p.product.id,
        name: p.product.name,
        total_sold: p.totalQty,
      }));

    const bottom3 = statsArray
      .sort((a, b) => a.totalQty - b.totalQty)
      .slice(0, 5)
      .map((p) => ({
        id: p.product.id,
        name: p.product.name,
        total_sold: p.totalQty,
      }));

    const totalVendido = all.reduce((sum, item) => sum + item.total_price, 0);
    const totalCantidad = all.reduce((sum, item) => sum + item.quantity, 0);
    const promedioPorProducto = totalCantidad ? totalVendido / totalCantidad : 0;

    return {
      store_id: storeId,
      apartado: apartadoClean.length
        ? apartadoClean
        : [],

      full: fullClean.length
        ? fullClean
        : [],

      fisico: fisicoClean.length
        ? fisicoClean
        : [],
      top_sales: top3.length ? top3 : 'No hay productos vendidos',
      top_lowest_sales: bottom3.length ? bottom3 : 'No hay productos vendidos',
      total_sales: Number(totalVendido),
      total_products_sales: totalCantidad,
      average_ticket: promedioPorProducto,
      month_range: {
        from: formatDate(startOfMonth),
        to: formatDate(endOfMonth),
      },
    };
  }

  async getSalesInsights(storeId: number) {
    const data = await this.getAllFromStore(storeId);

    const topProducts = Array.isArray(data.top_sales) ? data.top_sales.slice(0, 5) : [];
    const lowProducts = Array.isArray(data.top_lowest_sales) ? data.top_lowest_sales.slice(0, 5) : [];

    const prompt = `
Eres un experto en retail. Analiza la tienda con ID ${storeId}.

TOP VENTAS:
${JSON.stringify(topProducts)}

PRODUCTOS CON BAJAS VENTAS:
${JSON.stringify(lowProducts)}

Genera un texto dividido en 3 secciones EXACTAS:

Resumen Ejecutivo:
Análisis Top Productos:
Análisis Productos con Bajas Ventas:

En "Resumen Ejecutivo" explica la situación general de la tienda.
En "Análisis Top Productos" explica por qué cada producto se vende más.
En "Análisis Productos con Bajas Ventas" explica por qué cada producto se vende menos.
Habla en español y explica de manera clara.
`;

    const model = this.geminiIaService['genIA'].getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    const summaryMatch = aiText.match(/Resumen Ejecutivo:(.*?)(Análisis Top Productos:|$)/s);
    const topMatch = aiText.match(/Análisis Top Productos:(.*?)(Análisis Productos con Bajas Ventas:|$)/s);
    const lowMatch = aiText.match(/Análisis Productos con Bajas Ventas:(.*)/s);

    const aiSummary = summaryMatch ? summaryMatch[1].trim() : '';
    const aiTopProductAnalysis = topMatch
      ? topMatch[1].trim().split('\n').filter(Boolean)
      : topProducts.map(p => `Producto: ${p.name}, unidades vendidas: ${p.total_sold}.`);
    const aiLowProductAnalysis = lowMatch
      ? lowMatch[1].trim().split('\n').filter(Boolean)
      : lowProducts.map(p => `Producto: ${p.name}, unidades vendidas: ${p.total_sold}.`);

    return {
      store_id: storeId,
      topProducts,
      lowProducts,
      aiSummary,
      aiTopProductAnalysis,
      aiLowProductAnalysis
    };
  }

  async getPromotionRecommendations(storeId: number) {
    const data = await this.getAllFromStore(storeId);

    const products = [...(data.apartado || []), ...(data.full || []), ...(data.fisico || [])];

    const prompt = `
Eres un experto en marketing retail. Analiza los siguientes productos de la tienda ${storeId}:

${JSON.stringify(products)}

Devuelve un texto dividido en 3 secciones EXACTAS:

Recomendaciones de Promoción:
Sugerencias de Precio y Stock:
Consejos de Visibilidad:

Si no hay productos, indica claramente "No hay productos para analizar".
Habla en español y haz que las recomendaciones sean accionables y claras.
`;

    const model = this.geminiIaService['genIA'].getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    const promoMatch = aiText.match(/Recomendaciones de Promoción:(.*?)(Sugerencias de Precio y Stock:|$)/s);
    const pricingMatch = aiText.match(/Sugerencias de Precio y Stock:(.*?)(Consejos de Visibilidad:|$)/s);
    const visibilityMatch = aiText.match(/Consejos de Visibilidad:(.*)/s);

    const promotionRecommendations = promoMatch ? promoMatch[1].trim().split('\n').filter(Boolean) : [];
    const pricingSuggestions = pricingMatch ? pricingMatch[1].trim().split('\n').filter(Boolean) : [];
    const visibilityTips = visibilityMatch ? visibilityMatch[1].trim().split('\n').filter(Boolean) : [];

    if (products.length === 0) {
      promotionRecommendations.push('No hay productos para analizar.');
      pricingSuggestions.push('No hay productos para analizar.');
      visibilityTips.push('No hay productos para analizar.');
    }

    return {
      store_id: storeId,
      products,
      promotionRecommendations,
      pricingSuggestions,
      visibilityTips
    };
  }
}
