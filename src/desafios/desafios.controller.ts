import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Post,
    Put,
    Query,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { lastValueFrom } from 'rxjs'
import { Jogador } from '../jogadores/interfaces/jogador.interface'
import { ClientProxySmartRanking } from '../proxyrmq/client-proxy'
import { DesafioStatus } from './desafio-status.enum'
import { AtribuirDesafioPartidaDto } from './dtos/atribuir-desafio-partida.dto'
import { AtualizarDesafioDto } from './dtos/atualizar-desafio.dto'
import { CriarDesafioDto } from './dtos/criar-desafio.dto'
import { Desafio } from './interfaces/desafio.interface'
import { DesafioStatusValidacaoPipe } from './pipes/desafio-status-validation.pipe'
import { Partida } from './interfaces/partida.interface'

@Controller('api/v1/desafios')
export class DesafiosController {
    private readonly logger = new Logger(DesafiosController.name)

    constructor(private clientProxySmartRanking: ClientProxySmartRanking) {}

    private clientDesafios = this.clientProxySmartRanking.getClientProxyDesafiosInstance()
    private clientAdminBackend = this.clientProxySmartRanking.getClientProxyAdminBackendInstance()

    @Post()
    @UsePipes(ValidationPipe)
    async criarDesafio(@Body() criarDesafioDto: CriarDesafioDto) {
        this.logger.log(`criarDesafioDto: ${JSON.stringify(criarDesafioDto)}`)

        /**
         * Validacoes relacionadas ao array de jogadores que participam
         * do desafio
         */
        const jogadores$ = this.clientAdminBackend.send<Jogador[]>('consultar-jogadores', '')
        const jogadores: Jogador[] = await lastValueFrom(jogadores$)

        criarDesafioDto.jogadores.map((jogadorDto) => {
            const jogadorFilter: Jogador[] = jogadores.filter(
                (jogador) => jogador._id === jogadorDto._id,
            )

            this.logger.log(`jogadorFilter: ${JSON.stringify(jogadorFilter)}`)

            /**
             * Verificamos se os jogadores do desafio estao cadastrados
             */
            if (jogadorFilter.length === 0) {
                throw new BadRequestException(`O id ${jogadorDto._id} nao e um jogador!`)
            }

            /**
             * Verificar se os jogadores fazem parte da categoria informada no desafio
             */
            if (jogadorFilter[0].categoria !== criarDesafioDto.categoria) {
                throw new BadRequestException(
                    `O jogador ${jogadorFilter[0]._id} nao faz parte da categoria informada!`,
                )
            }
        })

        /**
         * Verficamos se o solicitante é um jogador da partida
         */
        const solicitanteEhJogadorDaPartida: Jogador[] = criarDesafioDto.jogadores.filter(
            (jogador) => jogador._id === jogadores[0]._id,
        )

        this.logger.log(
            `solicitanteEhJogadorDaPartida: ${JSON.stringify(solicitanteEhJogadorDaPartida)}`,
        )

        if (solicitanteEhJogadorDaPartida.length === 0) {
            throw new BadRequestException(`O solicitante deve ser um jogador da partida!`)
        }

        /**
         * Verificamos se a categoria está cadastrada
         */
        const categoria$ = this.clientAdminBackend.send(
            'consultar-categorias',
            criarDesafioDto.categoria,
        )
        const categoria = await lastValueFrom(categoria$)

        this.logger.log(`categoria: ${JSON.stringify(categoria)}`)

        if (!categoria) {
            throw new BadRequestException(`Categoria informada nao existe!`)
        }

        this.clientDesafios.emit('criar-desafio', criarDesafioDto)
    }

    @Get()
    async consultarDesafios(@Query('idJogador') idJogador: string): Promise<any> {
        /**
         * Verificamos se o jogador informado está cadastrado
         */
        if (idJogador) {
            const jogador$ = this.clientAdminBackend.send('consultar-jogadores', {
                idJogador: idJogador,
            })
            const jogador: Jogador = await lastValueFrom(jogador$)
            this.logger.log(`jogador: ${JSON.stringify(jogador)}`)
            if (!jogador) {
                throw new BadRequestException(`Jogador nao cadastrado!`)
            }
        }
        return this.clientDesafios
            .send('consultar-desafios', { idJogador: idJogador, _id: '' })
            .toPromise()
    }

    @Put('/:desafio')
    async atualizarDesafio(
        @Body(DesafioStatusValidacaoPipe) atualizarDesafioDto: AtualizarDesafioDto,
        @Param('desafio') _id: string,
    ) {
        /*
					Validações em relação ao desafio
				*/

        const desafio: Desafio = await this.clientDesafios
            .send('consultar-desafios', { idJogador: '', _id: _id })
            .toPromise()

        this.logger.log(`desafio: ${JSON.stringify(desafio)}`)

        /*
					Verificamos se o desafio está cadastrado
				*/
        if (!desafio) {
            throw new BadRequestException(`Desafio não cadastrado!`)
        }

        /*
					Somente podem ser atualizados desafios com status PENDENTE
				*/
        if (desafio.status != DesafioStatus.PENDENTE) {
            throw new BadRequestException(
                'Somente desafios com status PENDENTE podem ser atualizados!',
            )
        }

        await this.clientDesafios.emit('atualizar-desafio', {
            id: _id,
            desafio: atualizarDesafioDto,
        })
    }

    @Post(':desafio/partida')
    async atribuirDesafioPartida(
        @Body(ValidationPipe) atribuirDesafioPartidaDto: AtribuirDesafioPartidaDto,
        @Param('desafio') _id: string,
    ): Promise<void> {
        const desafio$ = this.clientDesafios.send('consultar-desafios', {
            idJogador: '',
            _id: _id,
        })
        const desafio: Desafio = await lastValueFrom(desafio$)

        this.logger.log(`desafio: ${JSON.stringify(desafio)}`)

        /**
         * Verificamos se o desafio está cadastrado
         */
        if (!desafio) {
            throw new BadRequestException(`Desafio nao cadastrado!`)
        }

        /**
         * Verificamos se o desafio já foi realizado
         */
        if (desafio.status === DesafioStatus.REALIZADO) {
            throw new BadRequestException('Desafio já realizado!')
        }

        /**
         * Somente deve ser possível lancar uma partida para um desafio
         * con status ACEITO
         */
        if (desafio.status !== DesafioStatus.ACEITO) {
            throw new BadRequestException(
                'Partidas somente podem ser lancadas em desafios aceitos pelos adversários',
            )
        }

        /**
         * Verificamos se o jogador informado faz parte do desafio
         */
        if (!desafio.jogadores.includes(atribuirDesafioPartidaDto.def)) {
            throw new BadRequestException(
                'O jogador vencedor da partida deve fazer parte do desafio!',
            )
        }

        /**
         * Criamos nosso objeto partida, que é formado pelas
         * informacoes presentes no DTO que recebemos e por informacoes
         * presentes no objeto desafio que recuperamos
         */
        const partida: Partida = {}
        partida.categoria = desafio.categoria
        partida.def = atribuirDesafioPartidaDto.def
        partida.desafio = _id
        partida.jogadores = desafio.jogadores
        partida.resultado = atribuirDesafioPartidaDto.resultado

        /**
         * Enviamos a partida para o tópico 'criar-partida'
         * Este tópico é responsavel por persistir a partida na
         * collection Partidas
         */
        this.clientDesafios.emit('criar-partida', partida)
    }

    @Delete('/:_id')
    async deletarDesafio(@Param('_id') _id: string): Promise<void> {
        const desafio$ = this.clientDesafios.send('consultar-desafios', {
            idJogador: '',
            _id: _id,
        })
        const desafio: Desafio = await lastValueFrom(desafio$)

        this.logger.log(`desafio: ${JSON.stringify(desafio)}`)

        /**
         * Verificamos se o desafio está cadastrado
         */
        if (!desafio) {
            throw new BadRequestException(`Desafio nao cadastrado!`)
        }

        this.clientDesafios.emit('deletar-desafio', desafio)
    }
}
