import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { PasswordResetToken } from './entities/password-reset.entity';
import { RequestResetDto } from './dto/request-reset.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { UsersService } from '../users/users.service';


@Injectable()
export class RecoveryPasswordService {
    constructor(
        @InjectRepository(PasswordResetToken)
        private tokenRepo: Repository<PasswordResetToken>,

        private usersService: UsersService,
    ) { }

    private generateCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async requestReset({ email }: RequestResetDto) {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new NotFoundException('Este correo no está registrado');

        const token = this.generateCode();
        const expires_at = new Date(Date.now() + 1000 * 60 * 10);

        await this.tokenRepo.save({ email, token, expires_at });

        return { message: 'Código enviado a tu correo' };
    }

    async verifyCode({ email, code, newPassword }: VerifyCodeDto) {
        const record = await this.tokenRepo.findOne({ where: { email, token: code } });

        if (!record) throw new BadRequestException('Código incorrecto');
        if (record.expires_at < new Date()) throw new BadRequestException('Código expirado');

        const hashed = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePasswordByEmail(email, hashed);

        await this.tokenRepo.remove(record);

        return { message: 'Contraseña actualizada correctamente' };
    }

    async resetByAdmin(userId: number) {
        const user = await this.usersService.findOne(userId);
        if (!user) throw new NotFoundException('Usuario no encontrado');


        const newPassword = "12345678";
        const hashed = await bcrypt.hash(newPassword, 10);

        await this.usersService.updatePasswordByEmail(user.email, hashed);

        return { message: 'Contraseña restablecida y correo enviado' };
    }

}
