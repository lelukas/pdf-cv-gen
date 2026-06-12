import { Experiencia } from './types.js'
import { Lang } from './i18n.js'

const DEEPSEEK_BASE = 'https://api.deepseek.com'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function callDeepSeek(messages: Message[]): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY não definida. Crie um arquivo .env com a chave.')
  }

  const res = await fetch(`${DEEPSEEK_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 4000,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeepSeek API error (${res.status}): ${text}`)
  }

  const data = (await res.json()) as any
  return data.choices[0].message.content
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
  const systemPrompt = `You are a senior resume writer. Your task is to select the most relevant bullet points from a candidate's experience and rewrite them to align with a job description.

Rules:
- From each experience, keep ONLY the 3-4 bullets most relevant to this job
- Drop bullets that are irrelevant or too generic for this specific job
- NEVER invent facts, numbers, or achievements not present in the original
- Keep the same accomplishment and factual content
- Adjust wording, emphasis, and framing to match the job's language and priorities
- Identify the key technical skills and responsibilities from the job description (e.g., React, Next.js, TypeScript, design systems, performance, animations, SSR) and rewrite bullets to explicitly connect the candidate's past work to those same skills — even if the original bullet used different terminology
- Use strong action verbs (led, drove, built, implemented, optimized, delivered)
- Be concise — each bullet should be 1 line
- Use periods, not hyphens or dashes, to separate phrases
- Translate the "cargo" (job title) to match the target language
- ${LANG_RULES[lang].join('\n- ')}
- Return ONLY valid JSON, no explanation`

  const userPrompt = `Job Description:
${descricaoVaga}

My current experience entries (company, role, period, and original bullets):

${JSON.stringify(experiencias, null, 2)}

Return a JSON array where each object has the same "empresa", "periodo" fields, but "cargo" and "bullets" are rewritten for this job. Format:

[
  {
    "empresa": "...",
    "periodo": "...",
    "cargo": "...",
    "bullets": ["rewritten bullet 1", "rewritten bullet 2"]
  }
]`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const cleaned = result.replace(/```(?:json)?\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function rewriteSummary(resumo: string, descricaoVaga: string, lang: Lang = 'en'): Promise<string> {
  const systemPrompt = `You are a senior resume writer. Rewrite the candidate's professional summary to align with the job description.

Rules:
- Keep the same seniority level and key facts
- Adjust language to match the job's requirements
- Maximum 3 sentences
- Use periods, not hyphens or dashes, to separate phrases
- ${LANG_RULES[lang].join('\n- ')}
- Return ONLY the rewritten text, no explanation`

  const userPrompt = `Job Description:
${descricaoVaga}

Current summary:
${resumo}

Rewritten summary:`

  return (
    await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])
  ).trim()
}

interface DadosTraduzir {
  practices?: string
  formacao: { nome: string; tipo?: string; instituicao: string }[]
  idiomas: { idioma: string; nivel?: string }[]
}

export async function translateRest(dados: DadosTraduzir, lang: Lang): Promise<DadosTraduzir> {
  if (lang === 'en') return dados

  const systemPrompt = `You are a translator. Translate the following resume fields from English to Brazilian Portuguese.

Rules:
- Keep proper nouns (company names, institution names) unchanged
- Translate only: practices/specialties text, degree types (e.g. Bachelor's → Bacharelado), and language names (e.g. Portuguese → Português, English → Inglês)
- Return ONLY valid JSON, no explanation`

  const userPrompt = `Translate this data to Brazilian Portuguese:

${JSON.stringify(dados, null, 2)}

Return the same structure with fields translated.`

  const result = await callDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  const cleaned = result.replace(/```(?:json)?\n?/g, '').trim()
  return JSON.parse(cleaned)
}
