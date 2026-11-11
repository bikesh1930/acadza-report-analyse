# Acadza Report Analyse

A question review and correction workspace for JEE and NEET practice platforms.

Students often report issues with questions during practice — an incorrect answer, a missing option, unclear wording, or a problem with how a question appears on screen. When the question bank contains thousands of questions, handling these reports individually becomes difficult.

**Ac adza Report Analyse** brings related reports together, helps identify possible issues, and gives faculty members a place to review and record corrections.

## What the application does

- **Organises student reports:** Groups reports about the same question into a single review case.
- **Prioritises issues:** Places potentially high-impact question and answer-key problems higher in the review queue.
- **Shows supporting evidence:** Displays the original question, available solution, student feedback and suggested correction.
- **Keeps the original content visible:** Supports MathML question rendering and basic sanitisation of executable content.
- **Suggests possible fixes:** Uses existing question data and, when configured, Google Gemini to prepare a correction candidate.
- **Records faculty decisions:** Faculty can approve, edit, reject or reopen a case. Decisions are saved in an audit history.
- **Keeps students informed:** Provides a specific response that can be used to communicate the review outcome.

## Project snapshot

The included dataset contains:

| Item | Count |
|---|---:|
| Student reports | 44 |
| Questions | 43 |
| Grouped review cases | 39 |

These are the records included in this demo dataset, not a claim that the application has already processed an entire production question bank.

## How the review process works

1. A student submits a report about a question.
2. Reports concerning the same question are grouped together.
3. The system checks the available question, answer, solution and report details.
4. A possible issue and correction are presented for review.
5. Faculty examines the evidence and approves, edits or rejects the suggestion.
6. The decision is recorded in the audit history.

The application does not directly update or publish changes to a production question bank.

## AI-assisted analysis

Google Gemini can be enabled to generate a structured review candidate.

The model receives the relevant question and report context and can suggest:

- Whether the question appears to have a defect.
- The likely type of issue.
- A possible correction within the allowed repair scope.
- An explanation for the suggestion.
- Whether the case should be reviewed by faculty.

Gemini output is treated as a suggestion, not a final decision. The application applies additional validation before showing a candidate. Unsupported fields and repair types are rejected, and restricted changes are sent to faculty review.

The committed `results.json` file contains the reviewed deterministic baseline for the supplied dataset. It should not be confused with results generated from a live Gemini run.

## Safety and review rules

Some changes need human judgement, particularly when they affect the correctness of an assessment.

The application follows these rules:

- Student-submitted text is treated as input data, not as instructions to the model.
- Suggested changes must match the repair types defined in `data/taxonomy.json`.
- Repairs marked as ineligible for automatic handling remain with faculty.
- Missing diagrams, new answer options and other unavailable content are not invented.
- Answer-key changes require faculty review.
- Gemini cannot publish changes to the question bank.
- Review actions are recorded in `audit.json`.

The aim is to help faculty investigate reports faster without giving up control over question quality.

## Tech stack

- **Backend:** Python, FastAPI
- **Frontend:** HTML, CSS, JavaScript
- **AI integration:** Google Gemini API (optional)
- **Data storage:** JSON files
- **Deployment:** Render

## Getting started

### Requirements

- Python 3.10 or later
- pip

### 1. Clone the repository

```bash
git clone https://github.com/bikesh1930/acadza-report-analyse.git
cd acadza-report-analyse
```

### 2. Create a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Start the application

```bash
python -m uvicorn app:app --reload --port 8000
```

Open the following URLs:

- Application: http://localhost:8000
- Health check: http://localhost:8000/api/health
- API documentation: http://localhost:8000/api/docs

## Configure Google Gemini (optional)

The application can also run without a Gemini API key using the included baseline decisions.

To enable Gemini analysis, create an API key through [Google AI Studio](https://aistudio.google.com/api-keys).

Set the following environment variables before starting the application.

**Windows PowerShell:**

```powershell
$env:GEMINI_API_KEY="YOUR_API_KEY"
$env:GEMINI_MODEL="gemini-3.5-flash-lite"
```

**macOS / Linux:**

```bash
export GEMINI_API_KEY="YOUR_API_KEY"
export GEMINI_MODEL="gemini-3.5-flash-lite"
```

Keep the API key in your local environment or deployment settings. Do not commit it to GitHub.

### Re-analyse a question

The application exposes the following endpoint:

```http
POST /api/reanalyze
Content-Type: application/json
```

Example request:

```json
{
  "questionId": "<question_id>"
}
```

The response contains a review candidate. It does not automatically modify the original question.

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Application and AI provider status |
| GET | `/api/overview` | Dashboard summary |
| GET | `/api/cases` | Grouped faculty review queue |
| GET | `/api/cases/{question_id}` | Question details, reports and audit history |
| POST | `/api/actions` | Approve, edit, reject or reopen a case |
| POST | `/api/reanalyze` | Generate an optional Gemini review candidate |
| GET | `/api/export/results` | Download the report-level results |
| GET | `/api/taxonomy` | View supported repair categories |
| GET | `/api/audit` | View recorded review actions |

The review queue supports filtering by search text, verdict, route and status.

## Project structure

```text
ac adza-report-analyse/
│
├── app.py
├── generate_results.py
├── requirements.txt
├── Procfile
├── render.yaml
│
├── data/
│   ├── questions.json
│   ├── reports.json
│   └── taxonomy.json
│
├── static/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── tests/
│   └── test_validation.py
│
├── results.json
├── audit.json
├── PROMPTS.md
├── PRODUCT.md
├── BONUS_SCAN.md
└── ASSIGNMENT_BRIEF.md
```

## Running the tests

Generate the baseline results:

```bash
python generate_results.py
```

Run the test suite:

```bash
python -m pytest -v
```

The included tests cover report coverage, repair taxonomy and prompt-injection handling.

## Deployment on Render

This project includes a `render.yaml` configuration.

To deploy:

1. Push the repository to GitHub.
2. Create a new Web Service on [Render](https://render.com/).
3. Connect the `bikesh1930/acadza-report-analyse` repository.
4. Use Python as the runtime.
5. Set the build command:

```bash
pip install -r requirements.txt
```

6. Set the start command:

```bash
python -m uvicorn app:app --host 0.0.0.0 --port $PORT
```

7. Add these environment variables in Render if Gemini analysis is required:

```text
GEMINI_API_KEY = your_api_key
GEMINI_MODEL = gemini-3.5-flash-lite
```

After deployment, check the application URL and `/api/health`.

**Note:** Render's free instances can spin down after inactivity. The first request after a period of inactivity may take longer to respond.

## Additional documentation

- [`PRODUCT.md`](PRODUCT.md) — Product decisions and proposed improvements.
- [`PROMPTS.md`](PROMPTS.md) — Prompts, implementation notes and design decisions.
- [`BONUS_SCAN.md`](BONUS_SCAN.md) — Notes from the additional question-bank review.
- [`ASSIGNMENT_BRIEF.md`](ASSIGNMENT_BRIEF.md) — Original assignment brief.

---

Built as part of the Acadza AI Intern assignment.