import { Module } from '@nestjs/common'
import { CategoriasModule } from './categorias/categorias.module'
import { JogadoresModule } from './jogadores/jogadores.module'
import { ClientProxySmartRanking } from './proxyrmq/client-proxy'
import { ProxyRMQModule } from './proxyrmq/proxyrmq.module'
import { AwsModule } from './aws/aws.module'
import { ConfigModule } from '@nestjs/config'
import { DesafiosModule } from './desafios/desafios.module'

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ProxyRMQModule,
        AwsModule,
        CategoriasModule,
        JogadoresModule,
        DesafiosModule,
    ],
    controllers: [],
    providers: [ClientProxySmartRanking],
})
export class AppModule {}
