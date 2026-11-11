# Acadza Report â†’ Fix

A faculty-first question integrity console for triaging student error reports, proposing constrained repairs, and recording review decisions.

## What is included

- **44 report-level decisions** in `results.json`, in the assignment's required schema.
- **Question-grouped faculty queue**: duplicate reports are grouped into one work item and sorted by risk.
- **Production HTML + MathML rendering**: original question markup is retained, with basic executable-content sanitisation.
- **Evidence and confidence**: each report decision includes a concise rationale and a student-facing reply.
- **Before/after proposal view** for surgical edits.
- **Approve / edit / reject actions** with persistent JSON audit history.
- **Taxonomy guards** in the optional LLM path: closed verdict/repair lists, field-scope enforcement, taxonomy membership, field-scope enforcement and fail-closed faculty routing. A single Gemini response is never auto-applied.
- **Optional Google Gemini candidate generation**. The shipped baseline does not pretend to be live model inference; without an API key, the audited deterministic decisions remain active.

## Run locally

Python 3.10+ is recommended.

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell
# .venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8000
```

Open http://localhost:8000. API health: http://localhost:8000/api/health. Interactive API docs: http://localhost:8000/api/docs.

## Optional Google Gemini candidate mode

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/api-keys), then set it in the server environment before starting the app:

```bash
export GEMINI_API_KEY="..."
export GEMINI_MODEL="gemini-3.5-flash-lite"
```

PowerShell:

```powershell
$env:GEMINI_API_KEY="..."
$env:GEMINI_MODEL="gemini-3.5-flash-lite"
```

The **Re-analyse** endpoint is available at `POST /api/reanalyze` with `{"questionId":"<question _id>"}`. The model returns a candidate only. Deterministic guards reject unknown taxonomy keys and out-of-scope fields; even a model-requested auto-apply route is downgraded to faculty review. No LLM output can directly publish a question-bank change.

## Main endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Runtime and provider status |
| GET | `/api/overview` | Queue metrics |
| GET | `/api/cases` | Grouped review queue; supports `q`, `verdict`, `route`, `status` filters |
| GET | `/api/cases/{question_id}` | One question, linked reports and audit trail |
| POST | `/api/actions` | Record approve, edit, reject or reopen action |
| POST | `/api/reanalyze` | Optional Gemini candidate with deterministic guards |
| GET | `/api/export/results` | Download scored `results.json` |

## Safety and product decisions

1. Student comments are untrusted data, not instructions. Prompt injection is explicitly tested.
2. Repair scope comes from `data/taxonomy.json`; an edit may only touch fields allowed by that repair.
3. Repairs with `auto: false` are always routed to faculty.
4. Missing authored content (for example a new distractor or a diagram) is not invented by the system.
5. Answer-key changes always remain with faculty; one Gemini call cannot independently verify an answer key. Publishing is not connected to the source bank.
6. All review actions are append-only audit entries in `audit.json`.
7. A report about rendering, loading or selection persistence is routed as an app/display issue, not â€œfixedâ€ by rewriting question content.

## Data and scoring notes

The original assignment files are retained under `data/`. `results.json` contains one item per input report, preserving report order. Duplicate reports are grouped in the console, but remain separate in the scoring output.

The provided dataset does not include an LLM API key or ground-truth labels. Therefore, the committed output is an **audited deterministic baseline** built from the supplied question, solution, taxonomy and report evidence. It is not represented as a live LLM run. Review `PROMPTS.md` for the exact product prompts, decision log and known limitations.

## Deploy on Render

1. Push this folder to a public GitHub repository.
2. Create a new **Web Service** on Render and connect the repository.
3. Runtime: Python. Build command: `pip install -r requirements.txt`.
4. Start command: `python -m uvicorn app:app --host 0.0.0.0 --port $PORT`.
5. Optional environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL`. Set these in Render Environment settings; never commit the key.
6. Verify `/api/health` and the root console URL after deploy.

A free instance may sleep when idle. Confirm availability and the requested seven-day uptime from the live deployment dashboard before submitting.

## Files

- `app.py` â€” FastAPI API, grouping, sanitisation, audit actions and optional LLM route.
- `static/` â€” responsive faculty console.
- `data/` â€” original production-format assignment data.
- `results.json` â€” all 44 report-level triage decisions.
- `PROMPTS.md` â€” prompts and design log.
- `PRODUCT.md` â€” product thinking, one page.
- `ASSIGNMENT_BRIEF.md` â€” original brief supplied by Acadza.

## Validation

```bash
python generate_results.py
pytest -q
```

`BONUS_SCAN.md` records the four unreported question-bank records reviewed for the assignment's bonus task. The additional endpoints `/api/taxonomy` and `/api/audit` expose the closed policy list and audit feed.
