import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Store } from '../stores/entities/store.entity';
import { PosStock } from '../stores/entities/pos_stock.entity';
import { PosSale } from '../web/admin-store/pos/entities/pos-sale.entity';
import { AiSearchInput } from '../app/History/entities/ai_search_input.entity';
import { AiSearchOutput } from '../app/History/entities/ai_search_output.entity';
import { SupabaseService } from 'src/supabase.service';
import { UserLocationDto } from '../modes/dto/user.location';

@Injectable()
export class GeminiIaService {
  private readonly logger = new Logger(GeminiIaService.name);
  private readonly storeRadius = 5;
  private readonly generalRadius = 5000;
  private genIA: GoogleGenerativeAI;
  private modelIA: string = 'gemini-2.5-pro';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(PosSale)
    private readonly posSaleRepo: Repository<PosSale>,
    @InjectRepository(PosStock)
    private readonly posStockRepo: Repository<PosStock>,
    @InjectRepository(AiSearchInput)
    private readonly inputRepo: Repository<AiSearchInput>,
    @InjectRepository(AiSearchOutput)
    private readonly outputRepo: Repository<AiSearchOutput>,
    private readonly supabaseService: SupabaseService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('No se encontró la API key de Gemini');
    this.genIA = new GoogleGenerativeAI(apiKey);
  }

  async analyzeText(prompt: string, location?: UserLocationDto) {
    const input = await this.inputRepo.save({
      type: 'text',
      query: prompt,
    });

    try {
      const materials = await this.extractMaterialsFromPrompt(prompt);

      if (!materials.length) {
        return this.saveAndReturn(
          input,
          {
            success: false,
            message: 'No se pudieron identificar materiales en la solicitud.',
          },
          false,
        );
      }

      const stores = await this.getStoresForMaterials(materials, location);

      const successResult = stores.length
        ? { success: true, materials, available: true, stores }
        : {
            success: true,
            materials,
            available: false,
            message: `No se encontraron tiendas con los productos solicitados (${materials.join(
              ', ',
            )}).`,
          };

      return this.saveAndReturn(input, successResult, true);
    } catch (error) {
      this.logger.error('Error al analizar el texto', error);
      throw new Error('Error al analizar el texto');
    }
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string, location?: UserLocationDto) {
    const imageUrl = await this.supabaseService.uploadImage(
      imageBuffer,
      `analyze-${Date.now()}.${mimeType.split('/')[1]}`,
      mimeType,
    );

    const input = await this.inputRepo.save({
      type: 'image',
      query: imageUrl,
    });

    try {
      const imageBase64 = imageBuffer.toString('base64');
      const materials = await this.extractMaterialsFromImage(
        imageBase64,
        mimeType,
      );

      if (!materials.length) {
        return this.saveAndReturn(
          input,
          {
            success: false,
            message: 'No se pudieron identificar materiales en la imagen.',
          },
          false,
        );
      }

      const stores = await this.getStoresForMaterials(materials, location);

      const successResult = stores.length
        ? { success: true, materials, available: true, stores }
        : {
            success: true,
            materials,
            available: false,
            message: `No se encontraron tiendas con los productos detectados (${materials.join(
              ', ',
            )}).`,
          };

      return this.saveAndReturn(input, successResult, true);
    } catch (error) {
      this.logger.error('Error al analizar la imagen', error);
      throw new Error('Fallo al analizar la imagen');
    }
  }

  async analyzeImageFromUrl(imageUrl: string, location?: UserLocationDto) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data, 'binary');
      const mimeType = imageUrl.endsWith('png') ? 'image/png' : 'image/jpeg';
      return this.analyzeImage(buffer, mimeType, location);
    } catch (error) {
      this.logger.error('Error al analizar imagen desde URL', error);
      throw new Error('Fallo al analizar la imagen desde URL');
    }
  }

  async analyzeStorePerformance(storeId: number) {
    const sales = await this.posSaleRepo
      .createQueryBuilder('s')
      .select([
        's.productName AS productName',
        'SUM(s.quantity) AS totalQty',
        'SUM(s.total) AS totalRevenue',
      ])
      .where('s.storeId = :storeId', { storeId })
      .groupBy('s.productName')
      .orderBy('totalQty', 'DESC')
      .getRawMany();

    const global = await this.posSaleRepo
      .createQueryBuilder('s')
      .select([
        's.productName AS productName',
        'AVG(s.quantity) AS avgQty',
        'AVG(s.total) AS avgRevenue',
      ])
      .groupBy('s.productName')
      .getRawMany();

    const stock = await this.posStockRepo.find({
      where: { store: { id: storeId } },
    });

    const prompt = `
Eres un analista de datos y marketing experto en ventas retail.

Datos de la tienda ID ${storeId}:
- Ventas por producto: ${JSON.stringify(sales)}
- Promedio global por producto: ${JSON.stringify(global)}
- Niveles de stock actuales: ${JSON.stringify(
      stock.map((s) => ({
        name: s.productName,
        quantity: s.quantity,
        cost: s.cost,
      })),
    )}

Tareas:
1. Identifica los 5 productos más vendidos y explica 2 razones posibles de su éxito.
2. Identifica los 5 productos menos vendidos y sugiere 2 acciones para mejorar sus ventas.
3. Compara los resultados con el promedio global.
4. Devuelve la respuesta en formato JSON con esta estructura:
{
 "top_products": [...],
 "low_products": [...],
 "executive_summary": [...]
}
`;

    const model = this.genIA.getGenerativeModel({ model: this.modelIA });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    this.logger.log('AI Analysis generated successfully');
    return { data: sales, ai: text };
  }

  private async extractMaterialsFromPrompt(prompt: string): Promise<string[]> {
    const model = this.genIA.getGenerativeModel({ model: this.modelIA });
    const result = await model.generateContent(`
      Analiza este texto: "${prompt}".
      Devuelve solo un JSON con una lista de los materiales o productos necesarios.
      Ejemplo: ["madera MDF", "tornillos", "pegamento", "bisagras"]
    `);

    return this.parseAIResponse(result.response.text());
  }

  private async extractMaterialsFromImage(
    imageBase64: string,
    mimeType: string,
  ): Promise<string[]> {
    const model = this.genIA.getGenerativeModel({ model: this.modelIA });
    const result = await model.generateContent([
      {
        text: `
          Observa la imagen adjunta y responde **solo** con un JSON válido (sin texto adicional).
          Devuelve un array con los materiales/productos detectados o {"success": false, "message":"No se pudieron identificar materiales o productos en la imagen."}.
          Usa español.
        `,
      },
      { inlineData: { mimeType, data: imageBase64 } },
    ]);

    return this.parseAIResponse(result.response.text());
  }

  private parseAIResponse(text: string): string[] {
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return cleaned.split(',').map((m) => m.trim());
    }
  }

  private async saveAndReturn(
    input: AiSearchInput,
    response: any,
    success: boolean,
  ) {
    await this.outputRepo.save({ input, response, success });
    return response;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/s\b/g, '')
      .trim();
  }

  private calcDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371e3;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lng2 - lng1);
    const a =
      Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getStoresForMaterials(
    materials: string[],
    location?: UserLocationDto,
    currentStore?: Store,
  ) {
    const stores = await this.storeRepo.find({ relations: ['products'] });

    let mode: 'store' | 'general' = 'general';
    let nearestStore: Store | undefined = currentStore;

    if (location?.lat && location?.lng) {
      if (!nearestStore) {
        nearestStore = stores
          .map((s) => ({
            store: s,
            distance: this.calcDistance(
              location.lat,
              location.lng,
              Number(s.latitude),
              Number(s.longitude),
            ),
          }))
          .sort((a, b) => a.distance - b.distance)[0]?.store;
      }

      const distanceToNearest = nearestStore
        ? this.calcDistance(
            location.lat,
            location.lng,
            Number(nearestStore.latitude),
            Number(nearestStore.longitude),
          )
        : Infinity;

      if (distanceToNearest <= this.storeRadius) mode = 'store';
    }

    if (mode === 'store' && nearestStore) {
      return this.filterProductsInStore(materials, nearestStore);
    }

    const generalMax = this.generalRadius;
    return stores
      .map((store) => {
        const distance = location
          ? this.calcDistance(
              location.lat,
              location.lng,
              Number(store.latitude),
              Number(store.longitude),
            )
          : null;
        if (distance !== null && distance > generalMax) return null;

        const filtered = this.filterProductsInStore(materials, store);
        if (!filtered.length) return null;

        return { ...store, distance, products: filtered };
      })
      .filter((s) => s !== null);
  }

  private filterProductsInStore(materials: string[], store: Store) {
    const matchingProducts = store.products
      .filter((p) =>
        materials.some((m) =>
          this.normalizeText(p.name).includes(this.normalizeText(m)),
        ),
      )
      .map((p) => ({ name: p.name, price: p.price, stock: p.stock }));
    if (!matchingProducts.length) return [];
    return matchingProducts;
  }
}
