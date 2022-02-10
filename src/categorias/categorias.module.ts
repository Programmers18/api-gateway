import { Module } from '@nestjs/common';
import { ProxyRMQModule } from '../proxyrmq/proxyrmq.module';
import { CategoriasController } from './categorias.controller';

@Module({
  imports: [ProxyRMQModule],
  controllers: [CategoriasController]
})
export class CategoriasModule {}
