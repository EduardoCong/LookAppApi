import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ModesService } from './modes.service';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { UserLocationDto } from './dto/user.location';

@WebSocketGateway({ cors: { origin: '*' } })
export class ModesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketUserMap = new Map<string, string | null>();

  constructor(private readonly modesService: ModesService) { }

  handleConnection(client: Socket) {
    this.socketUserMap.set(client.id, null);
  }

  handleDisconnect(client: Socket) {
    this.socketUserMap.delete(client.id);
  }

  @SubscribeMessage('userLocation')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleUserLocation(
    @MessageBody() payload: UserLocationDto,
    @ConnectedSocket() client: Socket,
  ) {
    const previousMode = this.socketUserMap.get(client.id);
    const result = await this.modesService.detectMode(payload);
    if (previousMode !== result.mode) {
      client.emit('modeChange', result);
      this.socketUserMap.set(client.id, result.mode);
      console.log(result);
    }
  }
}
