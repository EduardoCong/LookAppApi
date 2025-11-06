import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Store } from '../stores/entities/store.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class GeminiIaService {
  private readonly logger = new Logger(GeminiIaService.name);
  private genIA: GoogleGenerativeAI;
  private modelIA: string = 'gemini-2.5-pro';

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('No se encontró la API key de Gemini');
    this.genIA = new GoogleGenerativeAI(apiKey);
  }

  async analyzeText(prompt: string) {
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
        return {
          success: false,
          message: 'No se pudieron identificar materiales en la solicitud.',
        };
      }

      const matchingStores = await this.findStoresWithMaterials(materials);

      if (!matchingStores.length) {
        return {
          success: true,
          materials,
          available: false,
          message: `No se encontraron tiendas con los productos solicitados (${materials.join(', ')}).`,
        };
      }

      return {
        success: true,
        materials,
        available: true,
        stores: matchingStores,
      };
    } catch (error) {
      this.logger.error('Error al analizar el texto', error);
      throw new Error('Error al analizar el texto');
    }
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string) {
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
        return {
          success: false,
          message: 'No se pudieron identificar materiales en la imagen.',
        };
      }

      const matchingStores = await this.findStoresWithMaterials(materials);

      if (!matchingStores.length) {
        return {
          success: true,
          materials,
          available: false,
          message: `No se encontraron tiendas con los productos detectados (${materials.join(', ')}).`,
        };
      }

      return {
        success: true,
        materials,
        available: true,
        stores: matchingStores,
      };
    } catch (error) {
      this.logger.error('Error al analizar la imagen', error);
      throw new Error('Fallo al analizar la imagen');
    }
  }

  async analyzeImageFromUrl(imageUrl: string) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const mimeType = imageUrl.endsWith('png') ? 'image/png' : 'image/jpeg';
    return this.analyzeImage(buffer, mimeType);
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
