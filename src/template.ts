import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ResumeData } from './types.js'
import { generateHeader } from './header.js'
import { FONT_FACE_CSS } from './fonts.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSS = readFileSync(join(__dirname, 'style.css'), 'utf-8')

const BULLET = '\u2022'

export function generateHtml(data: ResumeData): string {
  const titles = data._titles || {
    skills: 'Technical Skills',
    practices: 'Practices & Specialties',
    experience: 'Professional Experience',
    education: 'Education',
    languages: 'Languages',
  }
  const experienceHtml = data.experience
    .map(
      (exp) => `
    <div class="exp-block">
      <div class="title-exp">
        <strong>${exp.company}</strong> | <span class="title-exp-period">${exp.period}</span>
      </div>
      <div class="exp-role">${exp.role}</div>
      <ul>
        ${exp.bullets.map((b) => `<li>${BULLET} ${b}</li>`).join('\n        ')}
      </ul>
    </div>
  `,
    )
    .join('\n')

  const skillsHtml = data.skillCategories
    ? Object.entries(data.skillCategories)
        .map(([cat, skills]) => {
          if (Array.isArray(skills) && skills.length) {
            return `<p><strong>${cat}:</strong> ${skills.join(', ')}</p>`
          }
          return ''
        })
        .join('\n        ')
    : (data.skills || []).map((h) => `<p>${h}</p>`).join('\n        ')

  const educationHtml = (data.education || [])
    .map((f) => `<li>${BULLET} ${f.course}${f.type ? `, ${f.type}` : ''} — ${f.institution} (${f.startYear}–${f.endYear})</li>`)
    .join('\n        ')

  const summarySection = data.summary ? `<div class="summary">${data.summary}</div>` : ''
  const skillsSection =
    data.skillCategories || data.skills?.length
      ? `<div class="section">
      <div class="title-section">${titles.skills}</div>
      <div class="skills-section">
        ${skillsHtml}
      </div>
    </div>`
      : ''
  const practicesSection = data.practices
    ? `<div class="section">
      <div class="title-section">${titles.practices}</div>
      <p>${data.practices}</p>
    </div>`
    : ''
  const educationSection = educationHtml
    ? `<div class="section">
      <div class="title-section">${titles.education}</div>
      <ul>
        ${educationHtml}
      </ul>
    </div>`
    : ''
  const languagesSection = data.languages?.length
    ? `<div class="section">
      <div class="title-section">${titles.languages}</div>
      <ul>
        ${data.languages.map((i) => `<li>${BULLET} ${i.language}${i.level ? ` (${i.level})` : ''}</li>`).join('\n        ')}
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
        ${generateHeader(data)}
        ${summarySection}
        ${skillsSection}
        ${practicesSection}
        <div class="section">
          <div class="title-section">${titles.experience}</div>
          ${experienceHtml}
        </div>
        ${educationSection}
        ${languagesSection}
      </div>
    </body>
    </html>
`
}
