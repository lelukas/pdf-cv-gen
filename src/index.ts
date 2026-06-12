import 'dotenv/config'
import { readFileSync, existsSync } from 'fs'
import puppeteer from 'puppeteer'
import { CurriculoData } from './types.js'
import { gerarHtml } from './template.js'
import { rewriteBullets, rewriteSummary, translateRest } from './ai.js'
import { Lang } from './i18n.js'

const EXPERIENCIAS_PATH = 'experiencias.json'

function parseArgs(args: string[]): { vagaPath: string; lang: Lang } {
  let lang: Lang = 'en'
  const filtered: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' || args[i] === '-l') {
      lang = (args[++i] as Lang) || 'en'
    } else {
      filtered.push(args[i])
    }
  }

  return { vagaPath: filtered[0], lang }
}

async function main() {
  const args = process.argv.slice(2)
  const { vagaPath, lang } = parseArgs(args)
  const langSuffix = lang !== 'en' ? `-${lang}` : ''
  const OUTPUT_PATH = `cv${langSuffix}.pdf`

  if (!vagaPath) {
    console.error('Uso: npm run gerar -- caminho/para/vaga.txt')
    console.error('      npm run gerar -- "Senior Frontend Engineer Nubank"')
    console.error('      npm run gerar -- caminho/para/vaga.txt --lang pt')
    process.exit(1)
  }

  let dados: CurriculoData
  try {
    dados = JSON.parse(readFileSync(EXPERIENCIAS_PATH, 'utf-8'))
  } catch {
    console.error(`Erro: arquivo ${EXPERIENCIAS_PATH} não encontrado ou inválido`)
    process.exit(1)
  }

  let descricaoVaga: string
  if (existsSync(vagaPath)) {
    descricaoVaga = readFileSync(vagaPath, 'utf-8')
  } else {
    descricaoVaga = [vagaPath, ...args.slice(1)].join(' ')
  }

  console.log(`Adaptando currículo para a vaga (${lang})...`)
  const dadosAdaptados = { ...dados }

  console.log('Reescrevendo bullets e resumo com IA...')
  try {
    const [experienciasReescritas, resumoReescrito] = await Promise.all([
      rewriteBullets(dadosAdaptados.experiencias, descricaoVaga, lang),
      dadosAdaptados.resumo ? rewriteSummary(dadosAdaptados.resumo, descricaoVaga, lang) : Promise.resolve(''),
    ])
    dadosAdaptados.experiencias = experienciasReescritas
    if (resumoReescrito) dadosAdaptados.resumo = resumoReescrito
  } catch (err: any) {
    console.warn('Aviso: reescrita com IA falhou, usando bullets originais:', err.message)
  }

  if (lang === 'pt') {
    try {
      const traduzido = await translateRest(
        {
          practices: dadosAdaptados.practices,
          formacao: (dadosAdaptados.formacao || []).map((f) => ({
            nome: f.nome,
            tipo: f.tipo,
            instituicao: f.instituicao,
          })),
          idiomas: (dadosAdaptados.idiomas || []).map((i) => ({
            idioma: i.idioma,
            nivel: i.nivel,
          })),
        },
        lang,
      )
      dadosAdaptados.practices = traduzido.practices
      if (traduzido.formacao) {
        traduzido.formacao.forEach((f, i) => {
          if (dadosAdaptados.formacao?.[i]) {
            dadosAdaptados.formacao[i].nome = f.nome
            if (f.tipo) dadosAdaptados.formacao[i].tipo = f.tipo
          }
        })
      }
      if (traduzido.idiomas) {
        traduzido.idiomas.forEach((langItem, i) => {
          if (dadosAdaptados.idiomas?.[i]) {
            dadosAdaptados.idiomas[i].idioma = langItem.idioma
          }
        })
      }
    } catch (err: any) {
      console.warn('Aviso: tradução de campos estáticos falhou:', err.message)
    }
  }

  console.log('Gerando PDF...')
  const html = gerarHtml(dadosAdaptados, lang)

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.pdf({
    path: OUTPUT_PATH,
    format: 'A4',
    printBackground: true,
  })

  await browser.close()
  console.log(`PDF gerado: ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
