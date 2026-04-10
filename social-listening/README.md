# Social Listening: Gulf Expat Exodus

**Supabase project:** `geopolitical-radar` (cdesyawysphgtsxmvleu, eu-west-3)
**Edge Function:** `social-listening` (runs via GitHub Actions cron)
**Schedule:** Daily at 21:00 CET

## What it does
1. Reads 5 active narrative hypotheses from Supabase
2. Web searches for new signals per narrative
3. Scores signals with Claude (Accuracy 40% + Actionability 30% + Coverage 30%)
4. Upserts to Supabase (`narrative_signals`, `narrative_scores`, `research_log`)
5. Autoresearch loop: compares delta vs yesterday, creates experiments if score drops
6. Pushes dated markdown report to `social-listening/reports/YYYY-MM-DD.md`

## Active Narratives
| Slug | Confidence |
|------|-----------|
| gulf-exodus-scale | 92% |
| first-mover-window-closing | 88% |
| italy-relocation-hub | 72% |
| wellness-demand-spike | 71% |
| corporate-restructuring-wave | 68% |

## Source Document
[Gulf Expat Exodus](../docs/gulf-expat-exodus.md)

## Supabase Tables
- `source_documents` — seed knowledge
- `narratives` — tracked hypotheses
- `narrative_signals` — daily raw observations
- `narrative_scores` — composite scores per narrative per day
- `research_log` — system-level run summary
- `experiments` — autoresearch improvement proposals
