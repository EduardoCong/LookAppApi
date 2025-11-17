import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store, StoreStatus } from './entities/store.entity';
import { CreateStoreDto, UpdateStoreDto } from './dto/create-store.dto';
import { Category } from 'src/modules/categories/entities/category.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { UpdateStoreDetailDto } from './dto/store-detail.dto';
import { StoreDetail } from './entities/store-detail.entity';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findActive(): Promise<Store[]> {
    return this.storeRepo.find({
      where: { status: StoreStatus.ACTIVE },
      relations: ['category', 'user'],
    });
  }

  async findPending(): Promise<Store[]> {
    return this.storeRepo.find({
      where: { status: StoreStatus.PENDING },
      relations: ['user', 'category'],
    });
  }

  async findRejected(): Promise<Store[]> {
    return this.storeRepo.find({
      where: { status: StoreStatus.REJECTED },
      relations: ['user', 'category'],
    });
  }

  async findByStatus(status: StoreStatus): Promise<Store[]> {
    return this.storeRepo.find({
      where: { status },
      relations: ['user', 'category'],
    });
  }

  async create(dto: CreateStoreDto): Promise<Store> {
    const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
    const category = await this.categoryRepo.findOne({
      where: { id: dto.category_id },
    });

    if (!user) throw new NotFoundException('Usuario propietario no encontrado');
    if (!category) throw new NotFoundException('Categoría no encontrada');

    const store = this.storeRepo.create({
      ...dto,
      user,
      category,
      status: StoreStatus.PENDING,
      is_verified: false,
    });

    return this.storeRepo.save(store);
  }

  async findAll(): Promise<Store[]> {
    return this.storeRepo.find({ relations: ['user', 'category'] });
  }

  async findOne(id: number): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { id },
      relations: ['user', 'category', 'products', 'detail'],
    });

    if (!store) {
      throw new NotFoundException(`La tienda con ID ${id} no existe`);
    }

    return store;
  }

  async findActiveById(storeId: number) {
    const store = await this.storeRepo.findOne({
      where: {
        id: storeId,
        status: StoreStatus.ACTIVE,
      },
      relations: ['products', 'detail', 'category', 'user'],
    });

    if (!store) {
      throw new NotFoundException(
        `La tienda con ID ${storeId} no existe o no está activa`,
      );
    }

    return store;
  }

  async findByUser(userId: number): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { user: { id: userId } },
      relations: ['category', 'products'],
    });
    if (!store)
      throw new NotFoundException(
        `El usuario con ID ${userId} no tiene una tienda registrada`,
      );
    return store;
  }

  async update(id: number, dto: UpdateStoreDto): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { id },
      relations: ['user', 'category'],
    });

    if (!store) throw new NotFoundException(`La tienda con ID ${id} no existe`);

    if (dto.user_id) {
      const user = await this.userRepo.findOne({ where: { id: dto.user_id } });
      if (!user)
        throw new NotFoundException(
          `El usuario con ID ${dto.user_id} no existe`,
        );
      store.user = user;
    }

    if (dto.category_id) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.category_id },
      });
      if (!category)
        throw new NotFoundException(
          `La categoría con ID ${dto.category_id} no existe`,
        );
      store.category = category;
    }

    Object.assign(store, dto);
    return this.storeRepo.save(store);
  }

  async changeStatus(id: number, status: StoreStatus): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException(`La tienda con ID ${id} no existe`);

    store.status = status;
    if (status === StoreStatus.ACTIVE) store.is_verified = true;
    return this.storeRepo.save(store);
  }

  async remove(id: number): Promise<void> {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException(`La tienda con ID ${id} no existe`);
    await this.storeRepo.remove(store);
  }

  getStoreWithProducts(): Promise<Store[]> {
    return this.storeRepo.find({ relations: ['products'] });
  }
  async updateDetail(
    storeId: number,
    dto: UpdateStoreDetailDto,
  ): Promise<StoreDetail> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      relations: ['detail'],
    });

    if (!store) throw new NotFoundException('Tienda no encontrada');

    if (store.detail) {
      Object.assign(store.detail, dto);
    } else {
      store.detail = this.storeRepo.manager.create(StoreDetail, dto);
    }

    await this.storeRepo.save(store);
    return store.detail;
  }

  async getDetail(storeId: number): Promise<StoreDetail> {
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      relations: ['detail'],
    });
    if (!store || !store.detail)
      throw new NotFoundException('Detalle de tienda no encontrado');
    return store.detail;
  }

  async getNearestStores(lat: number, lng: number, maxMeters: number) {
    return this.storeRepo.query(
      `
    SELECT 
      s.*,
      ROUND(
        (
          6371 * acos(
            cos(radians($1))
            * cos(radians(s.latitude::float))
            * cos(radians(s.longitude::float) - radians($2))
            + sin(radians($1))
            * sin(radians(s.latitude::float))
          )
        ) * 1000
      ) AS distance_meters
    FROM stores s
    CROSS JOIN LATERAL (
      SELECT (
        6371 * acos(
          cos(radians($1))
          * cos(radians(s.latitude::float))
          * cos(radians(s.longitude::float) - radians($2))
          + sin(radians($1))
          * sin(radians(s.latitude::float))
        )
      ) AS distance
    ) d
    WHERE s.status = 'active'
      AND d.distance <= ($3 / 1000.0)
    ORDER BY distance_meters ASC;
    `,
      [lat, lng, maxMeters],
    );
  }
}
