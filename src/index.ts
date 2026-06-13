import 'dotenv/config'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import puppeteer from 'puppeteer'
import { CurriculoData } from './types.js'
import { gerarHtml } from './template.js'
import { rewriteBullets, rewriteSummary, translateRest } from './ai.js'
import { Lang } from './i18n.js'

const EXPERIENCIAS_PATH = 'data.json'

const TEMPLATE_EXPERIENCIAS: CurriculoData = {
  nome: 'SEU_NOME',
  cargo: 'SEU_CARGO',
  contato: {
    localizacao: 'SUA_LOCALIZACAO',
    links: ['https://seusite.com', 'https://linkedin.com/in/seuperfil'],
    telefone: 'SEU_TELEFONE',
    email: 'seu@email.com',
  },
  resumo: 'SEU_RESUMO',
  categorias_skills: {
    Frontend: ['React', 'TypeScript'],
  },
  practices: 'SUAS_PRATICAS',
  experiencias: [
    {
      empresa: 'SUA_EMPRESA',
      periodo: 'MES ANO – MES ANO',
      cargo: 'SEU_CARGO',
      bullets: ['Bullet 1: descreva seu resultado com métrica', 'Bullet 2: destaque liderança ou impacto no negócio'],
    },
  ],
  formacao: [{ nome: 'SEU_CURSO', instituicao: 'SUA_INSTITUICAO', tipo: 'SEU_TIPO', anoInicio: 2020, anoFim: 2024 }],
  idiomas: [{ idioma: 'SEU_IDIOMA', nivel: 'SEU_NIVEL' }],
}

function initCommand() {
  if (existsSync(EXPERIENCIAS_PATH)) {
    console.error(`Arquivo ${EXPERIENCIAS_PATH} já existe. Remova-o primeiro ou edite manualmente.`)
    process.exit(1)
  }
  writeFileSync(EXPERIENCIAS_PATH, JSON.stringify(TEMPLATE_EXPERIENCIAS, null, 2) + '\n')
  console.log(`Template criado: ${EXPERIENCIAS_PATH}`)
  console.log('Edite o arquivo com seus dados e execute: npm run generate -- caminho/para/vaga.txt')
}

function parseAno(periodo: string): { inicio: number; fim: number } {
  const anos = [...periodo.matchAll(/\b(\d{4})\b/g)].map((m) => parseInt(m[1]))
  return { inicio: anos[0], fim: anos[anos.length - 1] }
}

function parseArgs(args: string[]): { vagaPath: string; lang: Lang; extract: boolean; skipRange: [number, number] | null } {
  let lang: Lang = 'en'
  let extract = false
  let skipRange: [number, number] | null = null
  const filtered: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' || args[i] === '-l') {
      lang = (args[++i] as Lang) || 'en'
    } else if (args[i] === '--extract') {
      extract = true
    } else if (args[i] === '--skip-range' && args[i + 1]) {
      const match = args[++i].match(/^(\d{4})-(\d{4})$/)
      if (match) {
        skipRange = [parseInt(match[1]), parseInt(match[2])]
      } else {
        console.error('Formato inválido para --skip-range. Use YYYY-YYYY (ex: --skip-range 2017-2019)')
        process.exit(1)
      }
    } else {
      filtered.push(args[i])
    }
  }

  return { vagaPath: filtered[0], lang, extract, skipRange }
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === 'init') {
    initCommand()
    return
  }

  const { vagaPath, lang, extract, skipRange } = parseArgs(args)
  const langSuffix = lang !== 'en' ? `-${lang}` : ''
  const OUTPUT_PATH = `cv${langSuffix}.pdf`

  if (!vagaPath) {
    console.error('Uso:')
    console.error('  npm run init            # Cria data.json template')
    console.error('  npm run generate -- caminho/para/vaga.txt')
    console.error('')
    console.error('Flags opcionais:')
    console.error('  --lang pt, -l pt        # Gera currículo em português')
    console.error('  --extract               # Extrai texto do PDF como .txt')
    console.error('  --skip-range YYYY-YYYY  # Omite experiências no range de anos')
    console.error('')
    console.error('Exemplos:')
    console.error('  npm run generate -- vaga.txt --lang pt')
    console.error('  npm run generate -- vaga.txt --extract')
    console.error('  npm run generate -- vaga.txt --skip-range 2017-2019')
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
    console.error(`Arquivo não encontrado: ${vagaPath}`)
    process.exit(1)
  }

  console.log(`Adaptando currículo para a vaga (${lang})...`)
  const dadosAdaptados = { ...dados }

  if (skipRange) {
    const [skipInicio, skipFim] = skipRange
    const antes = dadosAdaptados.experiencias.length
    dadosAdaptados.experiencias = dadosAdaptados.experiencias.filter((e) => {
      const { inicio, fim } = parseAno(e.periodo)
      const dentro = inicio >= skipInicio && fim <= skipFim
      if (dentro) console.log(`  Omitido: ${e.empresa} (${e.periodo})`)
      return !dentro
    })
    console.log(`Entradas omitidas: ${antes - dadosAdaptados.experiencias.length}`)
  }

  console.log('Reescrevendo bullets com IA...')
  try {
    const experienciasReescritas = await rewriteBullets(dadosAdaptados.experiencias, descricaoVaga, lang)
    dadosAdaptados.experiencias = experienciasReescritas
  } catch (err: any) {
    console.warn('Aviso: reescrita de bullets falhou, usando originais:', err.message)
  }

  if (dadosAdaptados.resumo) {
    console.log('Reescrevendo resumo com IA...')
    const bulletsContext = dadosAdaptados.experiencias.map((e) => `[${e.empresa}] ${e.cargo}: ${e.bullets.join('; ')}`).join('\n')
    try {
      dadosAdaptados.resumo = await rewriteSummary(dadosAdaptados.resumo, descricaoVaga, lang, bulletsContext)
    } catch (err: any) {
      console.warn('Aviso: reescrita do resumo falhou, mantendo original:', err.message)
    }
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
            if (langItem.nivel) dadosAdaptados.idiomas[i].nivel = langItem.nivel
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

  if (extract) {
    const textoPuro = await page.evaluate(() => document.body.innerText)
    const txtPath = OUTPUT_PATH.replace(/\.pdf$/, '.txt')
    writeFileSync(txtPath, textoPuro, 'utf-8')
    console.log(`Texto extraído: ${txtPath}`)
  }

  await browser.close()
  console.log(`PDF gerado: ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
