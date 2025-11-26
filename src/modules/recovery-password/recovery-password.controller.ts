import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';

import { RecoveryPasswordService } from './recovery-password.service';
import { RequestResetDto } from './dto/request-reset.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

@ApiTags('Recovery Password')
@Controller('recovery-password')
export class RecoveryPasswordController {
    constructor(private readonly recoveryService: RecoveryPasswordService) { }

    @Post('request')
    @ApiOperation({
        summary: 'Enviar código de recuperación',
        description: 'Envía un código de recuperación de contraseña al correo del usuario.',
    })
    @ApiBody({
        description: 'Correo del usuario que solicita el código',
        type: RequestResetDto,
        examples: {
            ejemplo: {
                summary: 'Ejemplo de solicitud',
                value: {
                    email: 'usuario@correo.com',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Código enviado al correo del usuario.' })
    @ApiResponse({ status: 404, description: 'El correo no existe en el sistema.' })
    requestCode(@Body() dto: RequestResetDto) {
        return this.recoveryService.requestReset(dto);
    }

    @Post('verify')
    @ApiOperation({
        summary: 'Verificar código y actualizar contraseña',
        description:
            'Valida el código enviado al correo y actualiza la contraseña del usuario.',
    })
    @ApiBody({
        description: 'Datos para validar el código y cambiar la contraseña',
        type: VerifyCodeDto,
        examples: {
            ejemplo: {
                summary: 'Ejemplo de verificación',
                value: {
                    email: 'usuario@correo.com',
                    code: '123456',
                    newPassword: 'NuevaPassword123',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Contraseña actualizada correctamente.' })
    @ApiResponse({ status: 400, description: 'Código incorrecto o expirado.' })
    verifyCode(@Body() dto: VerifyCodeDto) {
        return this.recoveryService.verifyCode(dto);
    }

    @Post('admin/reset/:id')
    @ApiOperation({
        summary: 'Restablecer contraseña por administrador',
        description:
            'El superadmin restablece la contraseña de un usuario. La nueva contraseña es 12345678 y se envía por correo.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID del usuario a restablecer',
        example: 5,
    })
    @ApiResponse({
        status: 200,
        description: 'Contraseña restablecida y correo enviado.',
    })
    @ApiResponse({
        status: 404,
        description: 'Usuario no encontrado.',
    })
    resetByAdmin(@Param('id') id: string) {
        return this.recoveryService.resetByAdmin(Number(id));
    }
}
