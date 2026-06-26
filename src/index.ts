import 'dotenv/config'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs'
import puppeteer from 'puppeteer'
import { ResumeData } from './types.js'
import { generateHtml } from './template.js'
import { rewriteBullets, rewriteSummary, translateRest } from './ai.js'
import { validateJsonFiles } from './utils.js'

const DATA_PATH = 'data.json'

const TEMPLATE_DATA: ResumeData = {
  name: 'YOUR_NAME',
  role: 'YOUR_ROLE',
  contact: {
    location: 'YOUR_LOCATION',
    links: ['https://your-site.com', 'https://linkedin.com/in/your-profile'],
    phone: 'YOUR_PHONE',
    email: 'your@email.com',
  },
  summary: 'YOUR_SUMMARY',
  skillCategories: {
    Frontend: ['React', 'TypeScript'],
  },
  practices: 'YOUR_PRACTICES',
  experience: [
    {
      company: 'YOUR_COMPANY',
      period: 'MON YEAR – MON YEAR',
      role: 'YOUR_ROLE',
      bullets: ['Bullet 1: describe your result with metrics', 'Bullet 2: highlight leadership or business impact'],
    },
  ],
  education: [{ course: 'YOUR_COURSE', institution: 'YOUR_INSTITUTION', type: 'YOUR_DEGREE', startYear: 2020, endYear: 2024 }],
  languages: [{ language: 'YOUR_LANGUAGE', level: 'YOUR_LEVEL' }],
}

function initCommand() {
  if (existsSync(DATA_PATH)) {
    console.error(`File ${DATA_PATH} already exists. Remove it or edit manually.`)
    process.exit(1)
  }
  writeFileSync(DATA_PATH, JSON.stringify(TEMPLATE_DATA, null, 2) + '\n')
  console.log(`Template created: ${DATA_PATH}`)

  const CONFIG_DIR = 'config'
  mkdirSync(CONFIG_DIR, { recursive: true })

  const PROMPTS_CUSTOM_PATH = 'config/prompts.custom.json'
  if (!existsSync(PROMPTS_CUSTOM_PATH)) {
    const custom = {
      rewriteBullets: { system: { rules: {} } },
      rewriteSummary: { system: { rules: {} } },
    }
    writeFileSync(PROMPTS_CUSTOM_PATH, JSON.stringify(custom, null, 2) + '\n')
    console.log(`Custom prompts created: ${PROMPTS_CUSTOM_PATH}`)
  }

  const TRANSLATION_CUSTOM_PATH = 'config/translation.custom.json'
  if (!existsSync(TRANSLATION_CUSTOM_PATH)) {
    const custom = { langRules: {} }
    writeFileSync(TRANSLATION_CUSTOM_PATH, JSON.stringify(custom, null, 2) + '\n')
    console.log(`Custom translation prompts created: ${TRANSLATION_CUSTOM_PATH}`)
  }

  console.log('Edit the files with your data and run: npm run generate -- path/to/job.txt')
}

function parseYear(period: string): { start: number; end: number } {
  const years = [...period.matchAll(/\b(\d{4})\b/g)].map((m) => parseInt(m[1]))
  return { start: years[0], end: years[years.length - 1] }
}

function parseArgs(args: string[]): { jobPath: string; lang: string; extract: boolean; skipRange: [number, number] | null } {
  let lang = 'en'
  let extract = false
  let skipRange: [number, number] | null = null
  const filtered: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lang' || args[i] === '-l') {
      lang = args[++i] || 'en'
    } else if (args[i] === '--extract') {
      extract = true
    } else if (args[i] === '--skip-range' && args[i + 1]) {
      const match = args[++i].match(/^(\d{4})-(\d{4})$/)
      if (match) {
        skipRange = [parseInt(match[1]), parseInt(match[2])]
      } else {
        console.error('Invalid format for --skip-range. Use YYYY-YYYY (e.g. --skip-range 2017-2019)')
        process.exit(1)
      }
    } else {
      filtered.push(args[i])
    }
  }

  return { jobPath: filtered[0], lang, extract, skipRange }
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === 'init') {
    initCommand()
    return
  }

  const { jobPath, lang, extract, skipRange } = parseArgs(args)
  const OUTPUT_PATH = `output/cv-${lang}.pdf`
  mkdirSync('output', { recursive: true })

  let data: ResumeData
  try {
    data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  } catch {
    console.error(`Error: ${DATA_PATH} not found or invalid. Run npm run init first.`)
    process.exit(1)
  }

  console.log('Checking JSON files...')
  if (!validateJsonFiles()) {
    console.error('\nFix the errors above and try again.')
    process.exit(1)
  }

  const adaptedData = { ...data }

  if (skipRange) {
    const [skipStart, skipEnd] = skipRange
    const before = adaptedData.experience.length
    adaptedData.experience = adaptedData.experience.filter((e) => {
      const { start, end } = parseYear(e.period)
      const inside = start >= skipStart && end <= skipEnd
      if (inside) console.log(`  Omitted: ${e.company} (${e.period})`)
      return !inside
    })
    console.log(`Entries omitted: ${before - adaptedData.experience.length}`)
  }

  if (jobPath) {
    let jobDescription: string
    if (existsSync(jobPath)) {
      jobDescription = readFileSync(jobPath, 'utf-8')
    } else {
      console.error(`File not found: ${jobPath}`)
      process.exit(1)
    }

    console.log(`Adapting resume for the job (${lang})...`)
    console.log('Rewriting bullets with AI...')
    try {
      const rewritten = await rewriteBullets(adaptedData.experience, jobDescription, lang)
      adaptedData.experience = rewritten
    } catch (err: any) {
      console.warn('Warning: bullet rewrite failed, using originals:', err.message)
    }

    if (adaptedData.summary) {
      console.log('Rewriting summary with AI...')
      const bulletsContext = adaptedData.experience.map((e) => `[${e.company}] ${e.role}: ${e.bullets.join('; ')}`).join('\n')
      try {
        adaptedData.summary = await rewriteSummary(adaptedData.summary, jobDescription, lang, bulletsContext)
      } catch (err: any) {
        console.warn('Warning: summary rewrite failed, using original:', err.message)
      }
    }
  }

  if (lang !== 'en') {
    try {
      const translated = await translateRest(
        {
          practices: adaptedData.practices,
          education: (adaptedData.education || []).map((f) => ({
            course: f.course,
            type: f.type,
            institution: f.institution,
          })),
          languages: (adaptedData.languages || []).map((i) => ({
            language: i.language,
            level: i.level,
          })),
          _titles: {
            skills: 'Technical Skills',
            practices: 'Practices & Specialties',
            experience: 'Professional Experience',
            education: 'Education',
            languages: 'Languages',
          },
        },
        lang,
      )
      adaptedData.practices = translated.practices
      if (translated.education) {
        translated.education.forEach((f, i) => {
          if (adaptedData.education?.[i]) {
            adaptedData.education[i].course = f.course
            if (f.type) adaptedData.education[i].type = f.type
          }
        })
      }
      if (translated.languages) {
        translated.languages.forEach((langItem, i) => {
          if (adaptedData.languages?.[i]) {
            adaptedData.languages[i].language = langItem.language
            if (langItem.level) adaptedData.languages[i].level = langItem.level
          }
        })
      }
      if (translated._titles) {
        adaptedData._titles = translated._titles
      }
    } catch (err: any) {
      console.warn('Warning: translation failed, keeping English:', err.message)
    }
  }

  console.log('Generating PDF...')
  const html = generateHtml(adaptedData)

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.pdf({
    path: OUTPUT_PATH,
    format: 'A4',
    printBackground: true,
  })

  if (extract) {
    const text = await page.evaluate(() => document.body.innerText)
    const txtPath = OUTPUT_PATH.replace(/\.pdf$/, '.txt')
    writeFileSync(txtPath, text, 'utf-8')
    console.log(`Text extracted: ${txtPath}`)
  }

  await browser.close()
  console.log(`PDF generated: ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
