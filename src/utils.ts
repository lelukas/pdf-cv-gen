import { readFileSync, existsSync } from 'fs'

const JSON_FILES = [
  'data.json',
  'config/prompts.template.json',
  'config/prompts.custom.json',
  'config/translation.template.json',
  'config/translation.custom.json',
]

export function validateJsonFiles(): boolean {
  let allValid = true

  for (const file of JSON_FILES) {
    if (!existsSync(file)) {
      console.warn(`  ⚠  ${file} not found — skipped`)
      continue
    }

    try {
      JSON.parse(readFileSync(file, 'utf-8'))
    } catch (err: any) {
      console.error(`  ✖  ${file}: ${err.message}`)
      allValid = false
    }
  }

  return allValid
}
