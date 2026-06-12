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
1. EXTRACT: First, identify the key skills, tools, and responsibilities from the job description (e.g., React, Next.js, TypeScript, design systems, performance, SSR, animations, Figma, aesthetic sense)
2. MAP & SELECT: From each experience, keep ONLY the 3-4 bullets that best demonstrate those extracted skills. Drop bullets with no clear connection to the JD
3. ANIMATION BOOST: If the job description mentions ANY of these terms — Canvas, animation, motion, Smart TV, media, entertainment, visual design, After Effects, Lottie, rendering — then PRIORITIZE bullets involving Lottie, After Effects, GSAP, Three.js, animation, visual prototyping, Adobe XD, Photoshop, Illustrator. These should be kept and placed FIRST, before other bullets
4. REWRITE: Reframe each kept bullet to use the JD's own terminology. If the JD mentions "design system" and the original says "UI library", rewrite to "design system". If the JD mentions "performance" and the original says "reduced bundle", rewrite to "performance optimization". If the JD mentions "Canvas" or "animation" and the original says "After Effects" or "Lottie", rewrite to "visual animation using Canvas-based rendering and motion design". Never invent — just relabel what's already there
5. NEVER invent facts, numbers, or achievements not present in the original
6. Keep the same accomplishment and factual content — only the framing changes
7. NO self-praise adjectives: Never use words that embellish or exaggerate (e.g., "new", "complex", "critical", "extensive", "drastic", "significant", "robust", "great", "excellent"). Describe facts objectively — what was done, not how impressive it sounds
8. Use strong action verbs (led, drove, built, implemented, optimized, delivered)
9. Be concise — each bullet should be 1 line
10. Use periods, not hyphens or dashes, to separate phrases
11. Translate the "cargo" (job title) to match the target language
12. ${LANG_RULES[lang].join('\n- ')}
13. Return ONLY valid JSON, no explanation

Examples of correct rewriting:
  Example 1: Original: "Building interfaces for a new service order application using Next.js and an internal UI library. Application built from scratch, recognized by clients for its speed"
    If JD mentions "design system" and "performance":
      Rewritten (en): "Built a greenfield application using Next.js while actively contributing to the internal design system. Recognized by clients for performance and smooth UX"
  Example 2: Original: "Creation of an animation for an existing logo using After Effects and Lottie, implemented on the product's institutional website"
    If JD mentions "Canvas" or "animation" or "Smart TV":
      Rewritten (en): "Created visual animations with After Effects and Lottie for the product interface, applying Canvas-based rendering and motion design principles compatible with Smart TV platforms"`

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
export async function rewriteSummary(resumo: string, descricaoVaga: string, lang: Lang = 'en', bulletsContext?: string): Promise<string> {
  const systemPrompt = `You are a senior resume writer. Rewrite the candidate's professional summary to align with a job description.

Rules:
- DO NOT list technologies, tools, or frameworks — that is a separate section
- Read the job description to understand the role's core expectations (e.g., build engaging UIs, animation, performance, leadership, architecture)
- If the job description mentions Canvas, animation, motion, Smart TV, media, visual design, or entertainment, frame it as implementing animations in code (e.g., "implementing animations using Canvas, Lottie, and motion libraries") — not as conceiving or designing them
- Adapt the summary to highlight areas of expertise that match those expectations, using the bullet points as evidence
- Use broad expertise areas: "frontend architecture", "UI engineering", "performance optimization", "design systems", "team leadership", "animation and interaction design"
- Never invent or exaggerate
- Keep the same seniority level
- Maximum 3 concise sentences
- Use periods, not hyphens or dashes, to separate phrases
- ${LANG_RULES[lang].join('\n- ')}
- Return ONLY the rewritten text, no explanation`

  const userPrompt = `Job Description:
${descricaoVaga}

Current summary:
${resumo}

Candidate's rewritten bullet points for this job:
${bulletsContext || ''}

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
- Translate: practices/specialties text, course names (e.g. Information Systems → Sistemas de Informação), degree types (e.g. Bachelor's → Bacharelado), language names (e.g. Portuguese → Português, English → Inglês), and proficiency levels (e.g. Native → Nativo, Fluent → Fluente)
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
