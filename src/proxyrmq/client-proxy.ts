import { Injectable } from "@nestjs/common";
import { ClientProxy, ClientProxyFactory, Transport } from "@nestjs/microservices";

@Injectable()
export class ClientProxySmartRanking {

    getClientProxyAdminBackendInstance(): ClientProxy {
        return ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: ['amqp://user:TmB52Q1lVFWE@34.205.191.150:5672/smartranking'],
                queue: 'admin-backend'
            },
        });
    }
    
}
