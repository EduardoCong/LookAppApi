import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeminiIaService } from './gemini-ia.service';
import { memoryStorage } from 'multer';
import { AnalizeTextDto } from './dto/analizeText.dto';

@Controller('analyze')
export class GeminiIaController {
  constructor(private readonly aiService: GeminiIaService) {}

  @Post('text')
  async analyzeText(@Body() AnalizeTextDto: AnalizeTextDto) {
    const { prompt } = AnalizeTextDto;
    const result = await this.aiService.analyzeText(prompt);
    return { success: true, result };
  }

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new BadRequestException('Solo se permiten imágenes'), false);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async analyzePhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('La foto es obligatoria');

    const result = await this.aiService.analyzeImage(
      file.buffer,
      file.mimetype,
    );

    return {
      source: file.originalname,
      ...result,
    };
  }

  @Post('imagen')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (allowedTypes.includes(file.mimetype)) callback(null, true);
        else
          callback(
            new BadRequestException('Tipo de archivo no permitido.'),
            false,
          );
      },
    }),
  )
  async analyzeImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('imageUrl') imageUrl: string,
  ) {
    if (!file && !imageUrl) {
      throw new BadRequestException(
        'Debes enviar un archivo o una URL de imagen',
      );
    }

    let source: string;
    let result: any;

    if (file) {
      source = file.originalname;
      result = await this.aiService.analyzeImage(file.buffer, file.mimetype);
    } else {
      source = imageUrl;
      result = await this.aiService.analyzeImageFromUrl(imageUrl);
    }

    return { source, ...result };
  }
}
