# Course Architect

AI-powered course intelligence for educators. Upload your course content — get a precise report on what to keep, remove, and add to beat competitors and win more enrolments.

## Quick Start

```bash
npm install
cp .env.example .env   # add your Anthropic API key inside
npm start
```

Open http://localhost:3000

## How it works

1. **Paste your syllabus** — any format: module list, bullet points, full outline
2. **AI analyses it** — compares against current job market demand
3. **Get your report** — three clear action panels:
   - ✓ **Keep** — what's working and why
   - ✕ **Remove** — what's outdated or irrelevant
   - **+ Add** — what employers are hiring for that you're missing
   - ◎ **Market Summary** — strategic overview + alignment score

## Files

```
src/
  utils/claudeApi.js   ← Claude API + system prompt + parsers
  App.js               ← All UI: input, loading, results
  styles.css           ← Warm cream/forest aesthetic
```

## Demo courses included

- Cybersecurity Fundamentals
- Data Analytics for Business
- Digital Marketing Professional
