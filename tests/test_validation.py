import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def test_results_cover_every_report_once():
    reports = json.loads((ROOT/'data/reports.json').read_text(encoding='utf-8'))
    results = json.loads((ROOT/'results.json').read_text(encoding='utf-8'))
    assert len(results) == len(reports) == 44
    assert {r['reportId'] for r in results} == {r['reportId'] for r in reports}

def test_taxonomy_and_repair_scope():
    taxonomy = json.loads((ROOT/'data/taxonomy.json').read_text(encoding='utf-8'))
    results = json.loads((ROOT/'results.json').read_text(encoding='utf-8'))
    for row in results:
        assert row['verdict'] in taxonomy['verdicts']
        assert row['route'] in {'auto_apply','faculty_review','no_change'}
        repair = row['repair']
        if repair:
            assert repair in taxonomy['repairs']
            if row['edit']:
                assert row['edit']['field'] in taxonomy['repairs'][repair]['fields']
            if row['route'] == 'auto_apply':
                assert taxonomy['repairs'][repair]['auto'] is True
            if taxonomy['repairs'][repair]['auto'] is False:
                assert row['route'] == 'faculty_review'

def test_prompt_injection_is_not_actionable():
    results = json.loads((ROOT/'results.json').read_text(encoding='utf-8'))
    row = next(r for r in results if r['reportId'] == 'R027')
    assert row['verdict'] == 'not_actionable'
    assert row['route'] == 'no_change'
    assert row['edit'] is None


def test_gemini_candidate_never_auto_applies():
    from app import validate_model_candidate
    candidate = {
        'verdict': 'defect', 'repair': 'spelling',
        'edit': {'field': 'question', 'find': 'teh', 'replace': 'the'},
        'route': 'auto_apply', 'confidence': 0.99,
        'evidence': 'A clear spelling error is present.',
        'student_reply': 'Thank you for reporting this.'
    }
    checked = validate_model_candidate(candidate)
    assert checked['route'] == 'faculty_review'


def test_gemini_candidate_rejects_out_of_scope_edit():
    import pytest
    from fastapi import HTTPException
    from app import validate_model_candidate
    candidate = {
        'verdict': 'defect', 'repair': 'spelling',
        'edit': {'field': 'answer', 'find': 'A', 'replace': 'B'},
        'route': 'faculty_review', 'confidence': 0.8,
        'evidence': 'Untrusted candidate.', 'student_reply': 'Thanks.'
    }
    with pytest.raises(HTTPException):
        validate_model_candidate(candidate)
