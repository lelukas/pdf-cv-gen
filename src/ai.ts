import { readFileSync, existsSync } from 'fs'
import { Experience } from './types.js'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PromptSection {
  preamble: string
  rules: Record<string, string>
  examples?: string[]
}

interface PromptsFile {
  rewriteBullets: { system: PromptSection }
  rewriteSummary: { system: Pick<PromptSection, 'preamble' | 'rules'> }
}

interface TranslationPrompt {
  preamble: string
  rules: Record<string, string>
}

interface DadosTraduzir {
  role?: string
  info?: string
  practices?: string
  experience?: { role: string; bullets: string[] }[]
  education: { course: string; type?: string; institution: string }[]
  languages: { language: string; level?: string }[]
  _titles: {
    skills: string
    practices: string
    experience: string
    education: string
    languages: string
  }
}

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

function loadPrompts(): PromptsFile {
  const base = JSON.parse(readFileSync('config/prompts.template.json', 'utf-8'))
  if (existsSync('config/prompts.custom.json')) {
    const extra = JSON.parse(readFileSync('config/prompts.custom.json', 'utf-8'))
    return deepMerge(base, extra)
  }
  return base
}

function deepMerge(base: any, extra: any): any {
  const result = { ...base }
  for (const key of Object.keys(extra)) {
    if (typeof extra[key] === 'object' && !Array.isArray(extra[key]) && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], extra[key])
    } else if (Array.isArray(extra[key]) && Array.isArray(base[key])) {
      result[key] = base[key].concat(extra[key])
    } else {
      result[key] = extra[key]
    }
  }
  return result
}

function buildPrompt(section: PromptSection, lang: string): string {
  const lines = [section.preamble, '', ...Object.values(section.rules)]
  if (section.examples) lines.push('', ...section.examples)
  lines.push('', '- ' + langRules(lang).join('\n- '))
  return lines.join('\n')
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
      temperature: 0.6,
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

function loadLangRules(): Record<string, string[]> {
  const base = JSON.parse(readFileSync('config/translation.template.json', 'utf-8'))
  const rules: Record<string, string[]> = { ...base.langRules }
  if (existsSync('config/translation.custom.json')) {
    const extra = JSON.parse(readFileSync('config/translation.custom.json', 'utf-8'))
    if (extra.langRules) {
      Object.assign(rules, extra.langRules)
    }
  }
  return rules
}

function cleanJson(raw: string): string {
  return raw.replace(/```(?:json)?\n?/g, '').trim()
}

function langRules(lang: string): string[] {
  const base = [`Write all output in ${languageName(lang)}`]
  const custom = loadLangRules()[lang]
  return custom ? base.concat(custom) : base
}

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames('en', { type: 'language' }).of(code) || code
  } catch {
    return code
  }
}

export async function rewriteBullets(experiences: Experience[], jobDescription: string, lang: string = 'en'): Promise<Experience[]> {
  const prompts = loadPrompts()
  const systemPrompt = buildPrompt(prompts.rewriteBullets.system, lang)

  const userPrompt = `Job Description:
${jobDescription}

My current experience entries (company, role, period, and original bullets):

${JSON.stringify(experiences, null, 2)}

Return a JSON array where each object has the same "company", "period" fields, but "role" and "bullets" are rewritten for this job. Format:

[
  {
    "company": "...",
    "period": "...",
    "role": "...",
    "bullets": ["rewritten bullet 1", "rewritten bullet 2"]
  }
]`

  const result = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  return JSON.parse(cleanJson(result))
}
export async function rewriteSummary(summary: string, jobDescription: string, lang: string = 'en', bulletsContext?: string): Promise<string> {
  const prompts = loadPrompts()
  const preamble = prompts.rewriteSummary.system.preamble
  const rules = Object.values(prompts.rewriteSummary.system.rules)
    .map((r) => `- ${r}`)
    .join('\n')
  const langRulesText = '- ' + langRules(lang).join('\n- ')
  const systemPrompt = `${preamble}\n\n${rules}\n${langRulesText}`

  const userPrompt = `Job Description:
${jobDescription}

Current summary:
${summary}

Candidate's rewritten bullet points for this job:
${bulletsContext || ''}

Rewritten summary:`
  return (
    await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
  ).trim()
}

function loadTranslationPrompts(): TranslationPrompt {
  const base = JSON.parse(readFileSync('config/translation.template.json', 'utf-8'))
  if (existsSync('config/translation.custom.json')) {
    const extra = JSON.parse(readFileSync('config/translation.custom.json', 'utf-8'))
    const merged = deepMerge(base, extra)
    return merged.system
  }
  return base.system
}

export async function translateRest(dados: DadosTraduzir, lang: string): Promise<DadosTraduzir> {
  const targetLang = languageName(lang)

  if (lang === 'en') {
    return {
      ...dados,
      _titles: dados._titles || {
        skills: 'Technical Skills',
        practices: 'Practices & Specialties',
        experience: 'Professional Experience',
        education: 'Education',
        languages: 'Languages',
      },
    }
  }

  const translation = loadTranslationPrompts()
  const preamble = translation.preamble.replace('{targetLang}', targetLang)
  const rules = Object.values(translation.rules)
    .map((r) => `- ${r}`)
    .join('\n')
  const systemPrompt = `${preamble}\n\n${rules}`

  const userPrompt = `Translate this data to ${targetLang}:

${JSON.stringify(dados, null, 2)}

Return the same structure with fields translated.`

  const result = await callAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  return JSON.parse(cleanJson(result))
}
