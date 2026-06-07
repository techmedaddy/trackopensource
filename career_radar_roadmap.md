# Product Roadmap: Open Source Career Radar

## The Vision
Pivot from "What's trending on GitHub?" to **"What technologies are gaining both developer adoption and hiring demand?"** 

We are building a tool that answers the question: *What should I learn next to stay relevant and get hired?* (But branded neutrally as a momentum intelligence platform for founders, investors, and developers).

---

## Phase 1: Repositioning & Score Transparency (Quick Wins)
*Goal: Fix the immediate UX clarity issues and expand the data footprint.*

### 1. Score Transparency (No more mystery numbers)
Expose the component scores directly in the API payload so the UI can draw visual progress bars or clear callouts:
- `velocityScore` (Stars gained / velocity)
- `growthScore` (Growth ratio)
- `contributorScore` (Contributor growth)
- `socialScore` (Reddit + HN comments/scores)
- `hiringScore` (HN "Who is hiring" mentions)

### 2. Human-Readable "Reasoning Engine" (Signal Callouts)
Generate dynamic arrays of textual callouts on the backend rather than expecting users to understand raw scores.
*Example payload:*
```json
"signals": [
  { "variant": "surge", "description": "+1,200 stars in the past 7 days" },
  { "variant": "enterprise", "description": "Mentioned in 12 HN hiring threads this month" },
  { "variant": "social", "description": "Active discussion across 8 subreddits" }
]
```

### 3. Dataset Expansion
Scale database tracking to 500+ repositories programmatically by scheduling the collector to ingest top frameworks across Major Languages using the GitHub Search API (instead of maintaining a narrow static list).

---

## Phase 2: The Hiring Intelligence & Alias Engine
*Goal: Solidify data quality and backend intelligence.*

### 1. Robust Mapping & Aliases (`jobs.rs`)
Update the string heuristic parser to match synonyms and abbreviations to prevent missing posts:
- `OpenTelemetry` -> matches `otel`, `opentelemetry-rust`, `opentelemetry`
- `Kubernetes` -> matches `k8s`, `kubernetes`
- `PostgreSQL` -> matches `postgres`, `postgresql`, `psql`

### 2. Job Collector Cron
Scrape the official Hacker News "Who is hiring?" thread (posted on the 1st of every month) automatically, caching and parsing descriptions for these aliases.

---

## Phase 3: The "Hype vs. Hiring" Dashboard
*Goal: Elevate the UI from a list-view to a decision-making matrix.*

1. **The 4-Quadrant Scatter Plot:**
   - **X-Axis:** Developer mindshare (GitHub velocity + Social signals)
   - **Y-Axis:** Corporate adoption (Hiring mentions)
   - *Quadrants:* Golden Zone (High Hype/High Hire), Speculative Hype (High Hype/Low Hire), Bedrocks (Low Hype/High Hire), and Long Tail (Low/Low).
2. **Category / Stack Filtering:** Filter by Domain (Backend Infra, Frontend, DevOps, AI, Mobile).

---

## Phase 4: Retention Engine
*Goal: Draw users back programmatically.*

1. **Outbound Webhooks / Alerts:** Outbound alerts when a repo transitions into the "Golden Zone" or sees a hiring breakout.
2. **Weekly Newsletter Compiler:** Automatically aggregate the week's highest climbers into a newsletter.
