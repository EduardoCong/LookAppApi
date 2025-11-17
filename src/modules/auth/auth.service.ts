import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Store } from '../stores/entities/store.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
  ) {}

  async validateUser(email: string, password: string) {
    const emailTrimmed = email.trim();
    const user = await this.usersService.findByEmail(emailTrimmed);

    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      throw new UnauthorizedException('Credenciales incorrectas');

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const store = await this.storeRepo.findOne({
      where: { user: { id: user.id } },
      select: ['id', 'business_name', 'status'],
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      storeId: store?.id,
    };

    const token = this.jwtService.sign(payload);

    return {
      status: 'success',
      access_token: token,
      token_type: 'Bearer',
      expires_in: 60 * 60 * 24 * 7,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.store,
      },
    };
  }

  async profile(token: string) {
    try {
      const decoded = this.jwtService.verify(token.replace('Bearer ', ''));
      const user = await this.usersService.findOne(decoded.sub);
      if (!user) throw new UnauthorizedException('Token inválido');

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch {
      throw new UnauthorizedException('Token expirado o inválido');
    }
  }

  async logout() {
    return { status: 'success', message: 'Sesión cerrada correctamente' };
  }
}
