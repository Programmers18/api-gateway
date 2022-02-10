import { Module } from '@nestjs/common';
import { ProxyRMQModule } from 'src/proxyrmq/proxyrmq.module';
import { JogadoresController } from './jogadores.controller';

@Module({
  imports: [ProxyRMQModule],
  controllers: [JogadoresController]
})
export class JogadoresModule {}
