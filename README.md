# PDF CV Generator

AI-powered resume builder that adapts your CV to each job description. Uses DeepSeek API to rewrite bullet points and summary to match the target role.

## Setup

```bash
cp .env.example .env
# Add your DEEPSEEK_API_KEY to .env
npm install
```

## Quick Start

Create your `data.json` with the template:

```bash
npm run init
# Edit data.json with your data
```

Generate a CV from a job description file:

```bash
npm run generate -- vaga.txt
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run init` | Create `data.json` template |
| `npm run generate -- arquivo_vaga.txt` | Generate CV adapted to the job |

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

Your resume data lives in `data.json` (gitignored). Edit it directly to add metrics, adjust bullets, or restructure experience entries.
