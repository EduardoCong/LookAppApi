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

  private getUserFromToken(req: Request) {
    const auth = req.headers.authorization;
    if (!auth) throw new BadRequestException('Missing Authorization header');

    const token = auth.replace('Bearer ', '').trim();
    const decoded: any = jwt.verify(token, this.jwtSecret);
    if (!decoded?.sub) {
      throw new BadRequestException('Invalid token: missing user ID');
    }

    return { id: decoded.sub };
  }

  private extractLocation(body: any) {
    if (!body?.lat || !body?.lng) return undefined;
    return { lat: Number(body.lat), lng: Number(body.lng) };
  }

  @Post('text')
  async analyzeText(@Req() req: Request, @Body() dto: AnalizeTextDto) {
    const user = this.getUserFromToken(req);
    const { prompt, location } = dto;

    const result = await this.aiService.analyzeText(
      prompt,
      user,
      location,
    );

    return { success: true, result };
  }

  @Post('photo')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async analyzePhoto(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const user = this.getUserFromToken(req);
    const location = this.extractLocation(body);

    if (!file) throw new BadRequestException('La foto es obligatoria');

    const result = await this.aiService.analyzeImage(
      file.buffer,
      file.mimetype,
      user,
      location,
    );

    return { source: file.originalname, ...result };
  }

  @Post('imagen')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];
        if (allowedTypes.includes(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Tipo de archivo no permitido'), false);
      },
    }),
  )
  async analyzeImage(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    const user = this.getUserFromToken(req);
    const location = this.extractLocation(body);

    if (!file && !body.imageUrl) {
      throw new BadRequestException(
        'Debes enviar un archivo o una URL de imagen',
      );
    }

    if (file) {
      const result = await this.aiService.analyzeImage(
        file.buffer,
        file.mimetype,
        user,
        location,
      );
      return { source: file.originalname, ...result };
    }

    const result = await this.aiService.analyzeImageFromUrl(
      body.imageUrl,
      location,
      user,
    );

    return { source: body.imageUrl, ...result };
  }

  @Get(':id/stats')
  async getStoreStats(@Param('id') id: string) {
    const storeId = parseInt(id, 10);
    return await this.aiService.analyzeStorePerformance(storeId);
  }
}
