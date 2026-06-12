type Lang = 'en' | 'pt'

const translations: Record<string, { en: string; pt: string }> = {
  'Technical Skills': { en: 'Technical Skills', pt: 'Habilidades Técnicas' },
  'Practices & Specialties': { en: 'Practices & Specialties', pt: 'Práticas & Especialidades' },
  'Professional Experience': { en: 'Professional Experience', pt: 'Experiência Profissional' },
  Education: { en: 'Education', pt: 'Formação' },
  Languages: { en: 'Languages', pt: 'Idiomas' },
}

export function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] ?? key
}

export type { Lang }
