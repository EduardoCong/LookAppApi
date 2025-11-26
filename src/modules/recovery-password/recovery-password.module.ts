import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RecoveryPasswordController } from './recovery-password.controller';
import { RecoveryPasswordService } from './recovery-password.service';
import { PasswordResetToken } from './entities/password-reset.entity';
import { UsersModule } from '../users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
    imports: [
        TypeOrmModule.forFeature([PasswordResetToken]),
        UsersModule,
        MailerModule,
    ],
    controllers: [RecoveryPasswordController],
    providers: [RecoveryPasswordService],
})
export class RecoveryPasswordModule { }
