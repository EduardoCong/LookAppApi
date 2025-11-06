import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.dataSource.query('SELECT NOW()');
      console.log('Conexión a Neon establecida correctamente');
    } catch (error) {
      console.error('Error al conectar con Neon:', error);
    }
  }
}
