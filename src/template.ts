import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { CurriculoData } from './types.js'
import { gerarHeader } from './header.js'
import { FONT_FACE_CSS } from './fonts.js'
import { t, Lang } from './i18n.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSS = readFileSync(join(__dirname, 'style.css'), 'utf-8')

const BULLET = '\u2022'

export function gerarHtml(dados: CurriculoData, lang: Lang = 'en'): string {
  const experienciaHtml = dados.experiencias
    .map(
      (exp) => `
    <div class="exp-block">
      <div class="title-exp">
        <strong>${exp.empresa}</strong> | <span class="title-exp-period">${exp.periodo}</span>
      </div>
      <div class="exp-role">${exp.cargo}</div>
      <ul>
        ${exp.topicos.map((b) => `<li>${BULLET} ${b}</li>`).join('\n        ')}
      </ul>
    </div>
  `,
    )
    .join('\n')

  const skillsHtml = dados.categorias_skills
    ? Object.entries(dados.categorias_skills)
        .map(([cat, skills]) => {
          if (Array.isArray(skills) && skills.length) {
            return `<p><strong>${cat}:</strong> ${skills.join(', ')}</p>`
          }
          return ''
        })
        .join('\n        ')
    : (dados.habilidades || []).map((h) => `<p>${h}</p>`).join('\n        ')

  const formacaoHtml = (dados.formacao || [])
    .map((f) => `<li>${BULLET} ${f.nome}${f.tipo ? `, ${f.tipo}` : ''} — ${f.instituicao} (${f.anoInicio}–${f.anoFim})</li>`)
    .join('\n        ')

  const sectionResumo = dados.resumo ? `<div class="summary">${dados.resumo}</div>` : ''
  const sectionSkills =
    dados.categorias_skills || dados.habilidades?.length
      ? `<div class="section">
      <div class="title-section">${t('Technical Skills', lang)}</div>
      <div class="skills-section">
        ${skillsHtml}
      </div>
    </div>`
      : ''
  const sectionPractices = dados.praticas
    ? `<div class="section">
      <div class="title-section">${t('Practices & Specialties', lang)}</div>
      <p>${dados.praticas}</p>
    </div>`
    : ''
  const sectionEducation = formacaoHtml
    ? `<div class="section">
      <div class="title-section">${t('Education', lang)}</div>
      <ul>
        ${formacaoHtml}
      </ul>
    </div>`
    : ''
  const sectionLanguages = dados.idiomas?.length
    ? `<div class="section">
      <div class="title-section">${t('Languages', lang)}</div>
      <ul>
        ${dados.idiomas.map((i) => `<li>${BULLET} ${i.idioma}${i.nivel ? ` (${i.nivel})` : ''}</li>`).join('\n        ')}
      </ul>
    </div>`
    : ''

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>${FONT_FACE_CSS}</style>
      <style>${CSS}</style>
    </head>
    <body>
      <div class="page">
        ${gerarHeader(dados)}
        ${sectionResumo}
        ${sectionSkills}
        ${sectionPractices}
        <div class="section">
          <div class="title-section">${t('Professional Experience', lang)}</div>
          ${experienciaHtml}
        </div>
        ${sectionEducation}
        ${sectionLanguages}
      </div>
    </body>
    </html>
`
}
