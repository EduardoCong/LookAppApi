import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiBody({
        description: 'User login credentials',
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'juan@example.com' },
                password: { type: 'string', example: '123456' }
            },
            required: ['email', 'password']
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            example: {
                status: 'success',
                access_token: 'your-jwt-token',
                token_type: 'Bearer',
                expires_in: 604800
            }
        }
    })
    async login(
        @Body('email') email: string,
        @Body('password') password: string,
    ) {
        return await this.authService.login(email, password);
    }
}
