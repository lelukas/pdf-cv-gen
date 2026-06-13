# PDF CV Generator

AI-powered resume builder that adapts your CV to each job description. Uses DeepSeek API to rewrite bullet points and summary to match the target role.

## Setup

```bash
cp .env.example .env
# Add your DEEPSEEK_API_KEY to .env
npm install
```

## Quick Start

Create your `experiencias.json` with the template:

```bash
npm run init
# Edit experiencias.json with your data
```

Generate a CV for a specific job:

```bash
npm run generate -- "Senior Frontend Engineer Nubank"
```

Or from a file with the full job description:

```bash
npm run generate -- vaga.txt
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run init` | Create `experiencias.json` template |
| `npm run generate -- "vaga"` | Generate CV adapted to a job |
| `npm run lint` | Lint source code |
| `npm run format` | Auto-fix lint issues |
| `npm run typecheck` | Run TypeScript type checking |

## Flags

| Flag | Description |
|------|-------------|
| `--lang pt, -l pt` | Output in Brazilian Portuguese |
| `--extract` | Extract plain text alongside PDF as `.txt` |
| `--skip-range YYYY-YYYY` | Omit experiences falling entirely within a year range |

### Examples

```bash
# Portuguese CV
npm run generate -- vaga.txt --lang pt

# Extract text for copy-paste
npm run generate -- vaga.txt --extract

# Skip experiences before 2020
npm run generate -- vaga.txt --skip-range 2017-2019
```

## Data Source

Your resume data lives in `experiencias.json` (gitignored). Edit it directly to add metrics, adjust bullets, or restructure experience entries.
