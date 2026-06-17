# PDF CV Generator

AI-powered resume builder that adapts your CV to each job description. Uses any OpenAI-compatible API to rewrite bullet points and summary to match the target role.

## Setup

```bash
cp .env.example .env
npm install
```

Configure your AI provider in `.env`:

| Variable | Description |
|----------|-------------|
| `AI_API_KEY` | Your API key |
| `AI_BASE_URL` | API base URL |
| `AI_MODEL` | Model name |
| `AI_RESPONSE_PATH` | Response path in the API output |

Default values for DeepSeek (OpenAI-compatible):

```env
AI_API_KEY=sk-your-key
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_RESPONSE_PATH=choices.0.message.content
```

For any other OpenAI-compatible provider, just change the values. The `AI_RESPONSE_PATH` follows dot notation with numeric indices for arrays (e.g., `choices.0.message.content`).

## Quick Start

Create your `data.json` with the template:

```bash
npm run init
# Edit data.json with your data
```

Generate a CV from a job description file:

```bash
npm run generate -- vaga.txt
# Output: output/cv-en.pdf
```

With flags:

```bash
npm run generate -- vaga.txt --lang pt-BR
# Output: output/cv-pt-BR.pdf
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run init` | Create `data.json` template |
| `npm run generate -- arquivo_vaga.txt` | Generate CV adapted to the job (output in `output/` folder) |

## Flags for `generate` command

| Flag | Description |
|------|-------------|
| `--lang pt-BR, -l pt-BR` | Output in Brazilian Portuguese |
| `--extract` | Extract plain text alongside PDF as `.txt` |
| `--skip-range YYYY-YYYY` | Omit experiences falling entirely within a year range |

### Examples

```bash
# Portuguese CV
npm run generate -- vaga.txt --lang pt-BR
# Output: output/cv-pt-BR.pdf

# Extract text for copy-paste
npm run generate -- vaga.txt --extract
# Output: output/cv-en.pdf + output/cv-en.txt

# Skip experiences before 2020
npm run generate -- vaga.txt --skip-range 2017-2019
```

## Output

Generated PDFs and text files are saved to the `output/` directory (gitignored).

## Data Source

Your resume data lives in `data.json` (gitignored). Edit it directly to add metrics, adjust bullets, or restructure experience entries.

## Custom Prompts

AI behavior for rewriting is controlled by two files in `config/`:

| File | Purpose |
|------|---------|
| `config/prompts.template.json` | Default AI rules |
| `config/prompts.custom.json` | Your custom overrides |

Created automatically by `npm run init`. Custom rules are deep-merged into the template by key — you only need to define what you want to override.

Example — `config/prompts.custom.json`:
```json
{
  "rewriteBullets": {
    "system": {
      "rules": {
        "animation_boost": "ANIMATION BOOST: Prioritize Lottie and After Effects bullets if the JD mentions animation"
      }
    }
  }
}
```

Valid keys per section:

- **`rewriteBullets.system`**: `rules` (merged by key), `examples` (concatenated), `preamble` (replaces)
- **`rewriteSummary.system`**: `rules` (merged by key)

## Translation

When `--lang` is not English, the AI translates the resume. Configured separately in `config/`:

| File | Purpose |
|------|---------|
| `config/translation.template.json` | Default translation rules |
| `config/translation.custom.json` | Your custom overrides |

Inside `langRules` (in `config/translation.custom.json`), each key is a language code (ISO 639-1 or BCP 47 like `pt-BR`), and must match the value passed to `--lang`. The value is an array of additional instructions — the base "Write all output in {language}" is always prepended automatically. Example — `config/translation.custom.json`:

```json
{
  "langRules": {
    "pt-BR": [
      "Use an impersonal tone. Do not refer to self.",
      "Use masculine gender consistently when referring to the developer"
    ],
    "fr": [
      "Use formal tone (vous)",
      "Use feminine gender"
    ]
  }
}
```

This is the right place to adjust control tone, gender, formality for each language. The template handles the core translation rules; the custom file is only for language-specific writing instructions.
