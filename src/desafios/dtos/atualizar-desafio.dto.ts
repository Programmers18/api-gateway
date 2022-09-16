import { IsOptional } from 'class-validator'
import { DesafioStatus } from '../desafio-status.enum'

export class AtualizarDesafioDto {
    @IsOptional()
    status: DesafioStatus
}
