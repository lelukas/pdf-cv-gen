import { readFileSync, existsSync } from 'fs'
import { Experiencia } from './types.js'
import { Lang } from './i18n.js'

function getConfig() {
  const key = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL
  const responsePath = process.env.AI_RESPONSE_PATH

  if (!key) throw new Error('AI_API_KEY não definida. Crie um arquivo .env com a chave.')
  if (!baseUrl) throw new Error('AI_BASE_URL não definida. Crie um arquivo .env com a URL.')
  if (!model) throw new Error('AI_MODEL não definida. Crie um arquivo .env com o modelo.')
  if (!responsePath) throw new Error('AI_RESPONSE_PATH não definida. Crie um arquivo .env com o caminho da resposta.')

  return { key, baseUrl, model, responsePath: responsePath.split('.') }
}

function getNested(obj: any, path: string[]): any {
  return path.reduce((acc, key) => {
    if (acc == null) return undefined
    const idx = parseInt(key)
    return Number.isNaN(idx) ? acc[key] : acc[idx]
  }, obj)
}

interface PromptSection {
  preamble: string
  rules: Record<string, string>
  examples?: string[]
}

interface PromptsFile {
  rewriteBullets: { system: PromptSection }
  rewriteSummary: { system: Pick<PromptSection, 'preamble' | 'rules'> }
  translateRest: { system: Pick<PromptSection, 'preamble' | 'rules'> }
}

function loadPrompts(): PromptsFile {
  const base = JSON.parse(readFileSync('prompts.template.json', 'utf-8'))
  if (existsSync('prompts.custom.json')) {
    const extra = JSON.parse(readFileSync('prompts.custom.json', 'utf-8'))
    return deepMerge(base, extra)
  }
  return base
}

function deepMerge(base: any, extra: any): any {
  const result = { ...base }
  for (const key of Object.keys(extra)) {
    if (typeof extra[key] === 'object' && !Array.isArray(extra[key]) && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], extra[key])
    } else {
      result[key] = extra[key]
    }
  }
  return result
}

function buildPrompt(section: PromptSection, lang: Lang): string {
  const lines = [section.preamble, '', ...Object.values(section.rules)]
  if (section.examples) lines.push('', ...section.examples)
  lines.push('', '- ' + LANG_RULES[lang].join('\n- '))
  return lines.join('\n')
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callAI(messages: Message[]): Promise<string> {
  const { baseUrl, key, model, responsePath } = getConfig()
  if (!key) {
    throw new Error('AI_API_KEY não definida. Crie um arquivo .env com a chave.')
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI API error (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  const result = getNested(data, responsePath)
  if (result == null) throw new Error(`Resposta da API não esperada. Caminho "${process.env.AI_RESPONSE_PATH}" não encontrado.`)
  return result
}

const LANG_RULES: Record<Lang, string[]> = {
  en: ['Write all output in English'],
  pt: [
    'Write all output in Brazilian Portuguese',
    'Use an impersonal tone. Do not refer to self. Use words like "atuação", "construção", "implementação", "adição", "migração". Examples: Built -> Construção, Developed -> Desenvolvimento de',
    'Use masculine gender consistently when referring to the developer (e.g., "responsável", "alocado", "designado", "contratado")',
  ],
}

export async function rewriteBullets(experiencias: Experiencia[], descricaoVaga: string, lang: Lang = 'en'): Promise<Experiencia[]> {
  const prompts = loadPrompts()
  const systemPrompt = buildPrompt(prompts.rewriteBullets.system, lang)

  const userPrompt = `Job Description:
${descricaoVaga}

My current experience entries (company, role, period, and original bullets):

${JSON.stringify(experiencias, null, 2)}

Return a JSON array where each object has the same "empresa", "periodo" fields, but "cargo" and "topicos" are rewritten for this job. Format:

[
  {
    "empresa": "...",
    "periodo": "...",
    "cargo": "...",
    "topicos": ["rewritten bullet 1", "rewritten bullet 2"]
  }
]`

  const result = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const cleaned = result.replace(/```(?:json)?\n?/g, '').trim()
  return JSON.parse(cleaned)
}
export async function rewriteSummary(resumo: string, descricaoVaga: string, lang: Lang = 'en', topicosContext?: string): Promise<string> {
  const prompts = loadPrompts()
  const preamble = prompts.rewriteSummary.system.preamble
  const rules = Object.values(prompts.rewriteSummary.system.rules)
    .map((r) => `- ${r}`)
    .join('\n')
  const langRules = '- ' + LANG_RULES[lang].join('\n- ')
  const systemPrompt = `${preamble}\n\n${rules}\n${langRules}`

  const userPrompt = `Job Description:
${descricaoVaga}

Current summary:
${resumo}

Candidate's rewritten bullet points for this job:
${topicosContext || ''}

Rewritten summary:`
  return (
    await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
  ).trim()
}

interface DadosTraduzir {
  praticas?: string
  formacao: { nome: string; tipo?: string; instituicao: string }[]
  idiomas: { idioma: string; nivel?: string }[]
}

export async function translateRest(dados: DadosTraduzir, lang: Lang): Promise<DadosTraduzir> {
  if (lang === 'en') return dados

  const prompts = loadPrompts()
  const preamble = prompts.translateRest.system.preamble
  const rules = Object.values(prompts.translateRest.system.rules).map((r) => `- ${r}`).join('\n')
  const systemPrompt = `${preamble}\n\n${rules}`

  const userPrompt = `Translate this data to Brazilian Portuguese:

${JSON.stringify(dados, null, 2)}

Return the same structure with fields translated.`

  const result = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const cleaned = result.replace(/```(?:json)?\n?/g, '').trim()
  return JSON.parse(cleaned)
}
