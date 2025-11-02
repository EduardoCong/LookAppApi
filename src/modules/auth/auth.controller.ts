import {
    Controller,
    Post,
    Body,
    Get,
    Req,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';



@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiBody({
        description: 'Credenciales de inicio de sesión',
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'juan@example.com' },
                password: { type: 'string', example: '123456' },
            },
            required: ['email', 'password'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Inicio de sesión exitoso',
        schema: {
            example: {
                status: 'success',
                access_token: 'your-jwt-token',
                token_type: 'Bearer',
                expires_in: 604800,
            },
        },
    })
    async login(
        @Body('email') email: string,
        @Body('password') password: string,
    ) {
        return await this.authService.login(email, password);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiResponse({
        status: 200,
        description: 'Perfil del usuario autenticado',
        schema: {
            example: {
                id: 1,
                name: 'Juan Pérez',
                email: 'juan@example.com',
                role: 'user',
            },
        },
    })
    async getProfile(@Req() req) {
        const token = req.headers.authorization;
        return this.authService.profile(token);
    }

    @Post('logout')
    @ApiResponse({
        status: 200,
        description: 'Sesión cerrada correctamente',
        schema: {
            example: {
                status: 'success',
                message: 'Sesión cerrada correctamente',
            },
        },
    })
    async logout() {
        return this.authService.logout();
    }
}
