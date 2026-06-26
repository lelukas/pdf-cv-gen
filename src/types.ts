export interface Experience {
  company: string
  period: string
  role: string
  bullets: string[]
}

export interface Education {
  course: string
  institution: string
  type?: string
  startYear: number
  endYear: number
}

export interface Language {
  language: string
  level?: string
}

export interface Contact {
  info?: string
  links?: string[]
  phone?: string
  email?: string
}

export interface ResumeData {
  name: string
  role?: string
  contact?: Contact
  summary?: string
  skillCategories?: Record<string, string[]>
  practices?: string
  skills?: string[]
  experience: Experience[]
  education?: Education[]
  certifications?: string[]
  languages?: Language[]
  _titles?: {
    skills: string
    practices: string
    experience: string
    education: string
    languages: string
  }
}
