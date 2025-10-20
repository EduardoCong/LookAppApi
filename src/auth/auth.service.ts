import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) { }

    async validateUser(email: string, password: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new UnauthorizedException('Usuario no encontrado');

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword)
            throw new UnauthorizedException('Credenciales incorrectas');

        return user;
    }

    async login(email: string, password: string) {
        const user = await this.validateUser(email, password);

        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const token = this.jwtService.sign(payload);

        return {
            status: 'success',
            access_token: token,
            token_type: 'Bearer',
            expires_in: 60 * 60 * 24 * 7, // 7 días
            // user: {
            //     id: user.id,
            //     email: user.email,
            //     name: user.name,
            //     role: user.role,
            // },
        };
    }
}
