import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function fontBase64(...parts: string[]): string {
  const buf = readFileSync(join(__dirname, ...parts))
  return buf.toString('base64')
}

const FONT_REGULAR = fontBase64('assets', 'open_sans', 'OpenSans-Regular.ttf')
const FONT_BOLD = fontBase64('assets', 'open_sans', 'OpenSans-Bold.ttf')
const FONT_ITALIC = fontBase64('assets', 'open_sans', 'OpenSans-Italic.ttf')
const FONT_ABRIL = fontBase64('assets', 'abril_fatface', 'AbrilFatface-Regular.ttf')

export const FONT_FACE_CSS = `
@font-face {
  font-family: 'Open Sans';
  src: url(data:font/ttf;base64,${FONT_REGULAR}) format('truetype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Open Sans';
  src: url(data:font/ttf;base64,${FONT_ITALIC}) format('truetype');
  font-weight: 400;
  font-style: italic;
}
@font-face {
  font-family: 'Open Sans';
  src: url(data:font/ttf;base64,${FONT_BOLD}) format('truetype');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Abril Fatface';
  src: url(data:font/ttf;base64,${FONT_ABRIL}) format('truetype');
  font-weight: 400;
  font-style: normal;
}`
