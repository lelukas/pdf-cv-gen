import { ResumeData } from './types.js'

export function generateHeader(data: ResumeData): string {
  const contact = data.contact
  if (!contact) return ''

  const phoneEmail = [contact.phone, contact.email].filter(Boolean).join(' • ')
  const linksStr = (contact.links || []).join(' • ')

  return `
    <div class="name">${data.name}</div>
    <div class="header-subtitle">${data.role || ''}</div>
    <div class="header-subtitle">${contact.location || ''}</div>
    <div class="header-contacts">${phoneEmail}</div>
    <div class="header-links">${linksStr}</div>
  `
}
