import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Store } from '../stores/entities/store.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PosStock } from '../stores/entities/pos_stock.entity';
import { PosSale } from '../web/admin-store/pos/entities/pos-sale.entity';
import { AiSearchInput } from '../app/History/entities/ai_search_input.entity';
import { AiSearchOutput } from '../app/History/entities/ai_search_output.entity';
import { User } from '../users/entities/user.entity';
import { SupabaseService } from 'src/supabase.service';

@Injectable()
export class GeminiIaService {
  private readonly logger = new Logger(GeminiIaService.name);
  private genIA: GoogleGenerativeAI;
  private modelIA: string = 'gemini-2.5-pro';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(PosSale) private readonly posSaleRepo: Repository<PosSale>,
    @InjectRepository(PosStock) private readonly posStockRepo: Repository<PosStock>,

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

  async analyzeText(prompt: string, user?: User) {

    const input = await this.inputRepo.save({
      user,
      type: 'text',
      query: prompt,
    });


    try {
      const model = this.genIA.getGenerativeModel({ model: this.modelIA });
      const result = await model.generateContent(`
      Analiza este texto: "${prompt}".
      Devuelve solo un JSON con una lista de los materiales o productos necesarios.
      Ejemplo: ["madera MDF", "tornillos", "pegamento", "bisagras"]
    `);

      const aiResponse = result.response
        .text()
        .replace(/```json|```/g, '')
        .trim();
      let materials: string[];

      try {
        materials = JSON.parse(aiResponse);
      } catch {
        materials = aiResponse.split(',').map((m) => m.trim());
      }

      if (!materials.length) {
        const failResult = {
          success: false,
          message: 'No se pudieron identificar materiales en la solicitud.',
        };

        //Guardar OUTPUT fallido
        await this.outputRepo.save({
          input,
          response: failResult,
          success: false,
        });

        return failResult;
      }



      const matchingStores = await this.findStoresWithMaterials(materials);
      const successResult = !matchingStores.length
        ? {
          success: true,
          materials,
          available: false,
          message: `No se encontraron tiendas con los productos solicitados (${materials.join(', ')}).`,
        }
        : {
          success: true,
          materials,
          available: true,
          stores: matchingStores,
        };

      await this.outputRepo.save({
        input,
        response: successResult,
        success: true,
      });

      return successResult;

    } catch (error) {
      this.logger.error('Error al analizar el texto', error);
      throw new Error('Error al analizar el texto');
    }
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string, user?: User) {
    const imageUrl = await this.supabaseService.uploadImage(
      imageBuffer,
      `analyze-${Date.now()}.${mimeType.split('/')[1]}`,
      mimeType,
    );

    const input = await this.inputRepo.save({
      user,
      type: 'image',
      query: imageUrl,
    });
    try {
      const model = this.genIA.getGenerativeModel({ model: this.modelIA });
      const imageBase64 = imageBuffer.toString('base64');

      const result = await model.generateContent([
        {
          text: `
            Observa la imagen adjunta y responde **solo** con un JSON válido (sin texto adicional).
            Tu tarea:
            1. Si la imagen muestra UN SOLO producto final (por ejemplo: "audífonos", "teléfono", "laptop"), devuelve un array con **únicamente el nombre exacto del producto**. Ejemplo: ["audífonos"].
            2. Si la imagen muestra un objeto compuesto o una construcción que requiere materiales (por ejemplo: una mesa, una cómoda, una estantería), devuelve un array con los **materiales y componentes necesarios** para fabricar o reparar ese objeto. Ejemplo: ["madera MDF", "tornillos", "pegamento"].
            3. Si la imagen tiene varios productos distintos (por ejemplo, una caja con varias herramientas) devuelve el array con **todos los productos/materiales relevantes**.
            4. Si no puedes identificar nada útil, devuelve: {"success": false, "message":"No se pudieron identificar materiales o productos en la imagen."}
            Respuesta esperada (solo uno de estos formatos):
            - ["audífonos"]
            - ["madera MDF", "tornillos", "pegamento"]
            - {"success": false, "message":"No se pudieron identificar materiales o productos en la imagen."}

            IMPORTANTE:
            - Devuelve **EXACTAMENTE** un JSON válido (o array) y **nada más** (sin explicaciones, sin markdown).
            - Usa español.
            `,
        },
        { inlineData: { mimeType, data: imageBase64 } },
      ]);

      const aiResponse = result.response
        .text()
        .replace(/```json|```/g, '')
        .trim();

      let materials: string[];
      try {
        materials = JSON.parse(aiResponse);
      } catch {
        materials = aiResponse.split(',').map((m) => m.trim());
      }

      if (!materials.length) {
        const failResult = {
          success: false,
          message: 'No se pudieron identificar materiales en la imagen.',
        };

        await this.outputRepo.save({
          input,
          response: failResult,
          success: false,
        });

        return failResult;
      }

      const matchingStores = await this.findStoresWithMaterials(materials);

      const successResult = !matchingStores.length
        ? {
          success: true,
          materials,
          available: false,
          message: `No se encontraron tiendas con los productos detectados (${materials.join(', ')}).`,
        }
        : {
          success: true,
          materials,
          available: true,
          stores: matchingStores,
        };

      await this.outputRepo.save({
        input,
        response: successResult,
        success: true,
      });

      return successResult;
    } catch (error) {
      this.logger.error('Error al analizar la imagen', error);
      throw new Error('Fallo al analizar la imagen');
    }
  }



  async analyzeImageFromUrl(imageUrl: string, user?: User) {

    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const mimeType = imageUrl.endsWith('png') ? 'image/png' : 'image/jpeg';

      const result = await this.analyzeImage(buffer, mimeType, user);

      return result;
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

  private async findStoresWithMaterials(materials: string[]) {
    const stores = await this.storeRepo.find({
      relations: ['products'],
    });

    const matchingStores = stores
      .map((store) => {
        const matchingProducts = store.products
          .filter((p) =>
            materials.some((m) =>
              this.normalizeText(p.name).includes(this.normalizeText(m)),
            ),
          )
          .map((p) => ({
            name: p.name,
            price: p.price,
            stock: p.stock,
          }));

        if (matchingProducts.length > 0) {
          return {
            business_name: store.business_name,
            address: store.address,
            latitude: store.latitude,
            longitude: store.longitude,
            products: matchingProducts,
          };
        }

        return null;
      })
      .filter((store) => store !== null);

    return matchingStores;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/s\b/g, '')
      .trim();
  }
}
