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

## Custom Prompts

AI behavior is controlled by two files:

| File | Purpose |
|------|---------|
| `prompts.template.json` | Default AI rules |
| `prompts.custom.json` | Your custom overrides |

Created automatically by `npm run init`. Custom rules are deep-merged into the template by key — you only need to define what you want to override.

Example — `prompts.custom.json`:
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

- **`rewriteBullets.system`**: `rules` (merged by key), `examples` (replaces), `preamble` (replaces)
- **`rewriteSummary.system`**: `rules` (merged by key)
- **`translateRest.system`**: `rules` (merged by key)

You can freely add or replace rules without touching any code.
