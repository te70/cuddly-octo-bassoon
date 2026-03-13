# Career Architect — Hackathon Demo

AI-powered career readiness platform for African universities.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set your API key
cp .env.example .env
# Edit .env and add your Anthropic API key

# 3. Run
npm start
```

Open http://localhost:3000

## API Key

Get one from https://console.anthropic.com/ — free tier is enough for the demo.

## Three Roles

| Role | Features |
|------|---------|
| **Student** | Socratic AI coach + Assignment → Portfolio generator |
| **Lecturer** | Curriculum upload → Gap analysis + Lab recommendations + Case studies |
| **Career Coach** | Student readiness scoring + Job match percentages + Portfolio readiness |

## Architecture

```
src/
  utils/claudeApi.js     ← All Claude API calls & system prompts
  pages/StudentPage.js   ← Socratic coach + portfolio gen
  pages/LecturerPage.js  ← Curriculum intelligence
  pages/CareerCoachPage.js ← Readiness dashboard
  App.js                 ← Landing + role routing
  styles.css             ← Global dark theme
```

## Claude API Integration

All prompts live in `src/utils/claudeApi.js`:

- `socratesChat()` — streaming multi-turn Socratic coach
- `generatePortfolio()` — streaming portfolio generator
- `analyseCurriculum()` — streaming curriculum gap analysis
- `scoreStudent()` — JSON readiness scoring

All streaming calls use SSE (`stream: true`) and update UI live as tokens arrive.
