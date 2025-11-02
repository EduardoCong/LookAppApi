import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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
    const result = await this.aiService.analizeText(prompt);
    return { success: true, result };
  }

  @Post('photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Solo se permiten fotos JPG o PNG'),
            false,
          );
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('La foto es obligatoria');
    }

    return {
      message: 'Foto recibida correctamente',
      fileName: file.originalname,
    };
  }

  @Post('imagen')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const allowedTypes = [ 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (allowedTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Tipo de archivo no permitido.'),
            false,
          );
        }
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
    let text: string;

    if (file) {
      source = file.originalname;
      text = await this.aiService.analyzeImage(file.buffer, file.mimetype);
    } else {
      source = imageUrl!;
      text = await this.aiService.analyzeImageFromUrl(imageUrl!);
    }

    return { source, text };
  }
}
