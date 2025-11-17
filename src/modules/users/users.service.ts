import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({ ...dto, password: hashed });
    return this.userRepo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.userRepo.find({ relations: ['store'] });
  }

  findOne(id: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id }, relations: ['store'] });
  }

  async findByEmail(email: string) {
    return this.userRepo
      .createQueryBuilder('u')
      .select(['u.id', 'u.email', 'u.password', 'u.name', 'u.role'])
      .where('LOWER(u.email) = LOWER(:email)', { email })
      .getOne();
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`El usuario con ID ${id} no existe`);
    }

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExists) {
        throw new Error(
          `El correo ${dto.email} ya está registrado por otro usuario`,
        );
      }
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);

    return this.userRepo.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`El usuario con ID ${id} no existe`);
    }
    await this.userRepo.remove(user);
  }
}
