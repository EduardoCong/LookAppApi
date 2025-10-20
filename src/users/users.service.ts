import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

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
        return this.userRepo.findOne({
            where: { email },
            select: [
                'id',
                'email',
                'password',
                'name',
                'role',
            ],
        });
    }

}
