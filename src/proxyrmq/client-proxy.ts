import { Injectable } from '@nestjs/common'
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ClientProxySmartRanking {
    RABBITMQ_USER: string
    RABBITMQ_PASSWORD: string
    RABBITMQ_URL: string

    constructor(private readonly configService: ConfigService) {
        this.RABBITMQ_USER = this.configService.get<string>('RABBITMQ_USER')
        this.RABBITMQ_PASSWORD = this.configService.get<string>('RABBITMQ_PASSWORD')
        this.RABBITMQ_URL = this.configService.get<string>('RABBITMQ_URL')
    }

    getClientProxyAdminBackendInstance(): ClientProxy {
        return ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [
                    `amqp://${this.RABBITMQ_USER}:${this.RABBITMQ_PASSWORD}@${this.RABBITMQ_URL}`,
                ],
                queue: 'admin-backend',
            },
        })
    }

    getClientProxyDesafiosInstance(): ClientProxy {
        return ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [
                    `amqp://${this.RABBITMQ_USER}:${this.RABBITMQ_PASSWORD}@${this.RABBITMQ_URL}`,
                ],
                queue: 'desafios',
            },
        })
    }
}
