import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Param,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeminiIaService } from './gemini-ia.service';
import { memoryStorage } from 'multer';
import { AnalizeTextDto } from './dto/analizeText.dto';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Controller('analyze')
export class GeminiIaController {
  private readonly jwtSecret: string;
  constructor(private readonly aiService: GeminiIaService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET not found');
    this.jwtSecret = secret;
  }

  @Post('text')
  async analyzeText(@Req() req: Request, @Body() AnalizeTextDto: AnalizeTextDto) {
    const { prompt } = AnalizeTextDto;

    const authHeader = req.headers.authorization;
    if (!authHeader) throw new BadRequestException('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '').trim();

    const decoded: any = jwt.verify(token, this.jwtSecret);
    const user = { id: decoded.sub } as any;

    const result = await this.aiService.analyzeText(prompt, user);
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
  async analyzePhoto(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('La foto es obligatoria');

    const authHeader = req.headers.authorization;
    if (!authHeader) throw new BadRequestException('Missing Authorization header');
    const token = authHeader.replace('Bearer ', '').trim();

    const decoded: any = jwt.verify(token, this.jwtSecret);
    if (!decoded?.sub) {
      throw new BadRequestException('Invalid or malformed token: missing user ID');
    }

    const user = { id: decoded.sub } as any;

    const result = await this.aiService.analyzeImage(
      file.buffer,
      file.mimetype,
      user
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
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('imageUrl') imageUrl: string,
  ) {
    if (!file && !imageUrl) {
      throw new BadRequestException(
        'Debes enviar un archivo o una URL de imagen',
      );
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) throw new BadRequestException('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '').trim();
    const decoded: any = jwt.verify(token, this.jwtSecret);
    if (!decoded?.sub) {
      throw new BadRequestException('Invalid or malformed token: missing user ID');
    }

    const user = { id: decoded.sub } as any;

    let source: string;
    let result: any;

    if (file) {
      source = file.originalname;
      result = await this.aiService.analyzeImage(file.buffer, file.mimetype, user);
    } else {
      source = imageUrl;
      result = await this.aiService.analyzeImageFromUrl(imageUrl);
    }

    return { source, ...result };
  }

  @Get(':id/stats')
  async getStoreStats(@Param('id') id: string) {
    const storeId = parseInt(id, 10);
    return await this.aiService.analyzeStorePerformance(storeId);
  }
}
