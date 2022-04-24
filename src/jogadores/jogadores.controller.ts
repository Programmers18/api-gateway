import { Controller, Get, Logger, Post, UsePipes, ValidationPipe, Body, Query, Put, Param, BadRequestException, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { CriarJogadorDto } from './dtos/criar-jogador.dto';
import { AtualizarJogadorDto } from './dtos/atualizar-jogador.dto'
import { lastValueFrom, Observable } from 'rxjs';
import { ClientProxySmartRanking } from '../proxyrmq/client-proxy'
import { ValidacaoParametrosPipe } from '../common/pipes/validacao-parametros.pipe'
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsService } from '../aws/aws.service';
import { Jogador } from './interfaces/jogador.interface';
import { Categoria } from '../categorias/interfaces/categoria.interface';

@Controller('api/v1/jogadores')
export class JogadoresController {
    categoria: Categoria;
    jogador: Jogador;

    private logger = new Logger(JogadoresController.name)

    constructor(
        private clientProxySmartRanking: ClientProxySmartRanking,
        private awsService: AwsService
    ) { }

    private clientAdminBackend = this.clientProxySmartRanking.getClientProxyAdminBackendInstance();

    @Post()
    @UsePipes(ValidationPipe)
    async criarJogador(@Body() criarJogadorDto: CriarJogadorDto) {

        this.logger.log(`criarJogadorDto: ${JSON.stringify(criarJogadorDto)}`);

        let categoria = await this.clientAdminBackend.send<Categoria>('consultar-categorias',
            criarJogadorDto.categoria).toPromise();

        if (categoria) {
            this.clientAdminBackend.emit('criar-jogador', criarJogadorDto);
        } else {
            throw new BadRequestException(`Categoria não cadastrada!`);
        }
    }

    @Post('/:_id/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadArquivos(
        @UploadedFile() file,
        @Param('_id') _id: string
    ) {
        const jogador$ = await this.clientAdminBackend.send<Jogador>('consultar-jogadores', _id)
        this.jogador = await lastValueFrom(jogador$)

        if (!this.jogador) {
            throw new BadRequestException(`Jogador nao encontrado`)
        }

        const urlPhotoJogador = await this.awsService.uploadArchivo(file, _id)

        const atualizarJogadorDto: AtualizarJogadorDto = {}
        atualizarJogadorDto.urlFotoJogador = urlPhotoJogador.url

        this.clientAdminBackend.emit('atualizar-jogador', { id: _id, jogador: atualizarJogadorDto })

        return this.clientAdminBackend.send('consultar-jogadores', _id)
    }

    @Get()
    consultarJogadores(@Query('idJogador') _id: string): Observable<any> {
        return this.clientAdminBackend.send('consultar-jogadores', _id ? _id : '');
    }

    @Put('/:_id')
    @UsePipes(ValidationPipe)
    async atualizarJogador(
        @Body() atualizarJogadorDto: AtualizarJogadorDto,
        @Param('_id', ValidacaoParametrosPipe) _id: string
    ) {
        const categoria$ = this.clientAdminBackend.send<Categoria>('consultar-categorias',
            atualizarJogadorDto.categoria);
        this.categoria = await lastValueFrom(categoria$);

        if (this.categoria) {
            this.clientAdminBackend.emit('atualizar-jogador', { id: _id, jogador: atualizarJogadorDto });
        } else {
            throw new BadRequestException(`Categoria não cadastrada!`);
        }
    }

    @Delete('/:_id')
    async deletarJogador(@Param('_id', ValidacaoParametrosPipe) _id: string) {
        this.clientAdminBackend.emit('deletar-jogador', { _id });
    }
}
