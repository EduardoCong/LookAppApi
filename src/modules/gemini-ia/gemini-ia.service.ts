import { GoogleGenerativeAI } from '@google/generative-ai';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { StoresService } from '../stores/stores.service';
import {
  DISTANCE_NEARBY_STORES,
  DISTANCE_STORE_MODE,
} from 'src/config/constats';
import { ModesService } from '../modes/modes.service';

@Injectable()
export class GeminiIaService {
  private readonly logger = new Logger(GeminiIaService.name);
  private genIA: GoogleGenerativeAI;
  private modelIA = 'gemini-2.0-flash';

  constructor(
    private readonly configService: ConfigService,
    private readonly storesService: StoresService,
    private readonly modesService: ModesService,

    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,

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
    if (!apiKey) throw new Error('No se encontró GEMINI_API_KEY');

    this.genIA = new GoogleGenerativeAI(apiKey);
  }

  async analyzeText(prompt: string, location?: UserLocationDto) {
    const input = await this.inputRepo.save({ type: 'text', query: prompt });

    try {
      const materials = await this.extractMaterialsFromPrompt(prompt);
      if (!materials.length) {
        return this.saveAndReturn(
          input,
          { success: false, message: 'No se identificaron materiales.' },
          false,
        );
      }

      const stores = await this.resolveStoresForMaterials(materials, location);
      const modeInfo = await this.getUserMode(location);

      return this.saveAndReturn(
        input,
        {
          mode: modeInfo.mode,
          distance: modeInfo.distance,
          success: true,
          materials,
          available: stores.length > 0,
          stores: stores.length > 0 ? stores : [],
          message:
            stores.length === 0
              ? `No hay tiendas con ${materials.join(', ')}`
              : undefined,
        },
        true,
      );
    } catch (error) {
      this.logger.error('Error al analizar texto', error);
      throw new Error('Error al analizar texto');
    }
  }

  async analyzeImage(buffer: Buffer, mime: string, location?: UserLocationDto) {
    const imageUrl = await this.supabaseService.uploadImage(
      buffer,
      `analyze-${Date.now()}.${mime.split('/')[1]}`,
      mime,
    );

    const input = await this.inputRepo.save({ type: 'image', query: imageUrl });

    try {
      const base64 = buffer.toString('base64');
      const materials = await this.extractMaterialsFromImage(base64, mime);

      if (!materials.length) {
        return this.saveAndReturn(
          input,
          {
            success: false,
            message: 'No se identificaron materiales en la imagen.',
          },
          false,
        );
      }

      const stores = await this.resolveStoresForMaterials(materials, location);
      const modeInfo = await this.getUserMode(location);

      return this.saveAndReturn(
        input,
        {
          mode: modeInfo.mode,
          distance: modeInfo.distance,
          success: true,
          materials,
          available: stores.length > 0,
          stores: stores.length > 0 ? stores : [],
          message:
            stores.length === 0
              ? `No hay tiendas con ${materials.join(', ')}`
              : undefined,
        },
        true,
      );
    } catch (error) {
      this.logger.error('Error al analizar imagen', error);
      throw new Error('Fallo al analizar imagen');
    }
  }

  async analyzeImageFromUrl(url: string, location?: UserLocationDto) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const mime = url.endsWith('png') ? 'image/png' : 'image/jpeg';

      return this.analyzeImage(buffer, mime, location);
    } catch (error) {
      this.logger.error('Error leyendo imagen desde URL', error);
      throw new Error('Fallo al analizar imagen desde URL');
    }
  }

  async analyzeStorePerformance(storeId: number) {
    if (!storeId) throw new BadRequestException('StoreId es requerido');

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
Eres un analista experto en retail.
Analiza estos datos de la tienda ID ${storeId}:

VENTAS: ${JSON.stringify(sales)}
PROMEDIO GLOBAL: ${JSON.stringify(global)}
STOCK ACTUAL: ${JSON.stringify(stock)}

Devuelve JSON estricto con:
- top_products
- low_products
- executive_summary
`;

    const model = this.genIA.getGenerativeModel({ model: this.modelIA });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return { data: { sales, global, stock }, ai: text };
  }

  private async getUserMode(location?: UserLocationDto) {
    if (!location?.lat || !location?.lng) {
      return { mode: 'general', distance: null };
    }

    return this.modesService.detectMode(location);
  }

  private async resolveStoresForMaterials(
    materials: string[],
    location?: UserLocationDto,
  ) {
    if (!location?.lat || !location?.lng) {
      return this.searchMaterialsInAllStores(materials);
    }

    const nearby = await this.storesService.getNearestStores(
      location.lat,
      location.lng,
      DISTANCE_NEARBY_STORES,
    );

    const nearest = nearby[0];
    if (!nearest) return [];

    const isInsideStore = nearest.distance_meters <= DISTANCE_STORE_MODE;

    if (isInsideStore) {
      const store = await this.storeRepo.findOne({
        where: { id: nearest.id },
        relations: ['products'],
      });

      if (!store) return [];
      return this.filterProductsInStore(materials, store);
    }

    const stores = await this.storeRepo.find({ relations: ['products'] });

    return stores
      .map((store) => {
        const match = nearby.find((s) => s.id === store.id);
        if (!match) return null;

        const found = this.filterProductsInStore(materials, store);
        if (!found.length) return null;

        return {
          ...store,
          distance_meters: match.distance_meters,
          products: found,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.distance_meters - b!.distance_meters);
  }

  private async searchMaterialsInAllStores(materials: string[]) {
    const stores = await this.storeRepo.find({ relations: ['products'] });

    return stores
      .map((store) => {
        const found = this.filterProductsInStore(materials, store);
        if (!found.length) return null;
        return { ...store, products: found };
      })
      .filter(Boolean);
  }

  private async extractMaterialsFromPrompt(prompt: string) {
    const model = this.genIA.getGenerativeModel({ model: this.modelIA });

    const result = await model.generateContent(`
    Extrae SOLO el nombre del producto principal del siguiente texto:
    "${prompt}"

    Devuelve JSON ARRAY válido:
    ["audifonos bluetooth jbl"]
  `);

    return this.parseList(result.response.text());
  }

  private async extractMaterialsFromImage(base64: string, mime: string) {
    const model = this.genIA.getGenerativeModel({ model: this.modelIA });

    const result = await model.generateContent([
      { text: `Devuelve JSON array con productos detectados.` },
      { inlineData: { mimeType: mime, data: base64 } },
    ]);

    return this.parseList(result.response.text());
  }

  private parseList(text: string): string[] {
    const cleaned = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return cleaned.split(',').map((s) => s.trim());
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

  private normalize(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private filterProductsInStore(materials: string[], store: Store) {
    const normalizedMaterials = materials.map((m) => this.normalize(m));

    const found = store.products.filter((p) => {
      const name = this.normalize(p.name);
      return normalizedMaterials.some((m) => name.includes(m));
    });

    return found.map((p) => ({
      name: p.name,
      price: p.price,
      stock: p.stock,
    }));
  }
}
