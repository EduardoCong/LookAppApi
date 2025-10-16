import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GeminiIaService {
  private readonly logger = new Logger(GeminiIaService.name);
  private genIA: GoogleGenerativeAI;
  private modelIA: string = 'gemini-2.5-pro';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('No se encontró la API key de Gemini');
    this.genIA = new GoogleGenerativeAI(apiKey);
  }

  async analizeText(prompt: string): Promise<string> {
    try {
      const model = this.genIA.getGenerativeModel({ model: this.modelIA });
      const result = await model.generateContent(prompt);
      return result.response.text();
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
        { text: 'Describe esta imagen en español de forma clara y natural.' },
        { inlineData: { mimeType, data: imageBase64 } },
      ]);

      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Error generando texto desde imagen', error);
      throw new Error('Fallo al analizar la imagen');
    }
  }

  async analyzeImageFromUrl(imageUrl: string) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const mimeType = imageUrl.endsWith('png') ? 'image/png' : 'image/jpeg';
    return this.analyzeImage(buffer, mimeType);
  }
}
