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
import { UserLocationDto } from './dto/user.location';

@WebSocketGateway({ cors: { origin: '*' } })
export class ModesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private socketUserMap = new Map<string, string | null>();

  constructor(private readonly modesService: ModesService) {}

  handleConnection(client: Socket) {
    this.socketUserMap.set(client.id, null);
    //console.log('Socket connected', client.id);
  }

  handleDisconnect(client: Socket) {
    this.socketUserMap.delete(client.id);
    //console.log('Socket disconnected', client.id);
  }

  @SubscribeMessage('userLocation')
  async handleUserLocation(
    @MessageBody()
    payload: Partial<
      UserLocationDto & { userId?: string; maxDistance?: number }
    >,
    @ConnectedSocket() client: Socket,
  ) {
    const lat = Number(payload.lat);
    const lng = Number(payload.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      client.emit('modeChange', { error: 'invalid_location' });
      return;
    }

    const location: UserLocationDto = { lat, lng };

    const result = await this.modesService.detectMode(
      location,
      payload.maxDistance,
    );

    client.emit('modeChange', result);
  }
}
