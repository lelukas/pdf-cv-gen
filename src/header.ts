import { CurriculoData } from './types.js'

export function gerarHeader(dados: CurriculoData): string {
  const contato = dados.contato
  if (!contato) return ''

  const telefoneEmail = [contato.telefone, contato.email].filter(Boolean).join(' • ')
  const linksStr = (contato.links || []).join(' • ')

  return `
    <div class="name">${dados.nome}</div>
    <div class="header-subtitle">${dados.cargo || ''}</div>
    <div class="header-subtitle">${contato.localizacao || ''}</div>
    <div class="header-contacts">${telefoneEmail}</div>
    <div class="header-links">${linksStr}</div>
  `
}
