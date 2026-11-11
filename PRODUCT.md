# Product note — Acadza Report → Analyse

## Who loses the most when a question is broken?

The student who encounters the defect during a timed practice session loses more than a mark: they lose time, confidence and trust in the learning product. A wrong key can also teach a false concept to every later student. The console therefore groups duplicate reports by question, puts high-impact answer/stem/option issues near the top, shows the original question in its real MathML-capable rendering, and explains the evidence before asking faculty to act. The student receives a calm, specific reply rather than a generic “thanks”.

## What I would never let the AI auto-apply

I would never let a model invent or replace a diagram, author a new distractor, resolve an ambiguous/multi-correct question, change a chapter or syllabus mapping without faculty confirmation, or overwrite an answer key without an independently reproducible derivation. These changes affect assessment integrity and may not be inferable from the report alone. The taxonomy marks several of these repairs `auto: false`; the backend treats that as a hard policy, not a prompt suggestion. Even auto-eligible candidates are staged in the review console; this demo does not write to the production question bank.

## One week-one metric

**Faculty-confirmed precision of AI-escalated defects**: the share of cases the system labels as a genuine content defect that faculty confirms as a defect, measured separately by repair type. This is more useful initially than raw automation volume: false positives waste scarce faculty attention and can damage student trust.

## One idea beyond the brief

Add a **question health graph** that joins reports, answer-change history, attempt-level anomalies and cohort-level outcome shifts. A question with no explicit report but an unusual spike in answer switching, option-selection entropy or “wrong despite correct choice” events could be proactively surfaced. The graph should be a prioritisation signal—not proof of a defect—and should always show the underlying cohort evidence to faculty.
