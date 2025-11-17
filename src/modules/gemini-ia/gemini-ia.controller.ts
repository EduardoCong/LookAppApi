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
  constructor(
    private readonly aiService: GeminiIaService,
    private readonly configService: ConfigService,
  ) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET not found');
    this.jwtSecret = secret;
  }

  @Post('text')
  async analyzeText(@Req() req: Request, @Body() dto: AnalizeTextDto) {
    const { prompt, location } = dto;

    const auth = req.headers.authorization;
    if (!auth) {
      throw new BadRequestException('Missing Authorization header');
    }

    const token = auth.replace('Bearer ', '').trim();
    const decoded: any = jwt.verify(token, this.jwtSecret);

    const result = await this.aiService.analyzeText(prompt, location);
    return { success: true, result };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async analyzePhoto(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { lat?: number; lng?: number },
  ) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      throw new BadRequestException('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '').trim();
    const decoded: any = jwt.verify(token, this.jwtSecret);

    const location =
      body.lat && body.lng
        ? { lat: Number(body.lat), lng: Number(body.lng) }
        : undefined;

    const result = await this.aiService.analyzeImage(
      file.buffer,
      file.mimetype,
      location,
    );

    return { source: file.originalname, ...result };
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
    @Body() body: { imageUrl?: string; lat?: number; lng?: number },
  ) {
    if (!file && !body.imageUrl) {
      throw new BadRequestException(
        'Debes enviar un archivo o una URL de imagen',
      );
    }

    const authHeader = req.headers.authorization;
    if (!authHeader)
      throw new BadRequestException('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '').trim();
    const decoded: any = jwt.verify(token, this.jwtSecret);

    const location =
      body.lat && body.lng ? { lat: body.lat, lng: body.lng } : undefined;

    const user = { id: decoded.sub } as any;

    let source: string;
    let result: any;

    if (file) {
      source = file.originalname;
      result = await this.aiService.analyzeImage(
        file.buffer,
        file.mimetype,
        location,
      );
    } else {
      source = body.imageUrl ?? '';
      result = await this.aiService.analyzeImageFromUrl(
        body.imageUrl ?? '',
        location,
      );
    }

    return { source, ...result };
  }

  @Get(':id/stats')
  async getStoreStats(@Param('id') id: string) {
    const storeId = parseInt(id, 10);
    return await this.aiService.analyzeStorePerformance(storeId);
  }
}
