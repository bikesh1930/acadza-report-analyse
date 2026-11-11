const $ = (s) => document.querySelector(s);
let allCases = [], selectedId = null, currentView = 'queue', overview = null;
let modalResolver = null;

const verdictLabels = {
  defect: 'Content issue', no_error: 'No error found', app_issue: 'App issue',
  display_issue: 'Display issue', language_mode: 'Language request',
  already_fixed: 'Already fixed', not_actionable: 'Not actionable'
};
const routeLabels = { auto_apply: 'Low-risk candidate', faculty_review: 'Faculty review', no_change: 'No change suggested' };
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = (s) => { try { return new Date(s).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return s; } };
const routeClass = r => r === 'auto_apply' ? 'auto' : r === 'faculty_review' ? 'faculty' : 'nochange';
const repairLabel = k => String(k || '').replaceAll('_',' ');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3200);
}
async function api(url, opts={}) {
  const r = await fetch(url, {headers:{'Content-Type':'application/json'}, ...opts});
  const d = await r.json(); if (!r.ok) throw new Error(d.detail || 'Something went wrong. Please try again.'); return d;
}
async function init() {
  try {
    [overview, window.taxonomy] = await Promise.all([api('/api/overview'), api('/api/taxonomy')]);
    renderMetrics(); await loadCases();
    $('#engineMode').textContent = overview.mode || 'Review system ready';
    $('#navPending').textContent = overview.pendingCases ?? '—';
  } catch (e) {
    $('#caseList').innerHTML = `<div class="empty-list">We couldn’t load the queue: ${esc(e.message)}</div>`;
  }
}
function renderMetrics() {
  const o = overview || {};
  $('#mReports').textContent = o.reportCount ?? '—';
  $('#mCases').textContent = o.caseCount ?? '—';
  $('#mFaculty').textContent = o.facultyReview ?? '—';
  $('#mAuto').textContent = o.autoCandidates ?? '—';
}
async function loadCases() {
  const p = new URLSearchParams();
  if ($('#searchInput').value.trim()) p.set('q', $('#searchInput').value.trim());
  if ($('#verdictFilter').value) p.set('verdict', $('#verdictFilter').value);
  if ($('#routeFilter').value) p.set('route', $('#routeFilter').value);
  if ($('#statusFilter').value) p.set('status', $('#statusFilter').value);
  try {
    allCases = await api('/api/cases?' + p.toString());
    $('#caseCount').textContent = allCases.length;
    $('#queueFootCount').textContent = `${allCases.length} grouped ${allCases.length === 1 ? 'question' : 'questions'}`;
    renderList();
    if (selectedId && allCases.some(c => c.questionId === selectedId)) await selectCase(selectedId);
    else if (allCases.length) await selectCase(allCases[0].questionId);
    else $('#detailPanel').innerHTML = '<div class="empty-detail"><div class="empty-icon">✓</div><h3>Nothing to review here</h3><p>Try clearing a filter or changing your search to see more student feedback.</p></div>';
  } catch (e) { $('#caseList').innerHTML = `<div class="empty-list">Couldn’t load reports: ${esc(e.message)}</div>`; }
}
function renderList() {
  const el = $('#caseList');
  if (!allCases.length) { el.innerHTML = '<div class="empty-list">No matching reports yet.</div>'; return; }
  el.innerHTML = allCases.map(c => {
    const t = c.triage, comment = c.comments[0] || '', status = c.reviewStatus || 'pending';
    const statusLabel = status === 'pending' ? routeLabels[t.route] : status === 'approve' ? 'Approved' : status === 'reject' ? 'Declined' : 'Edited';
    return `<button class="case-card ${selectedId === c.questionId ? 'selected' : ''}" data-id="${esc(c.questionId)}">
      <div class="case-top"><span class="case-id">${esc(c.question.qid || c.questionId.slice(0,10))} · ${c.reportCount} ${c.reportCount === 1 ? 'report' : 'reports'}</span><span class="pill ${t.verdict}">${esc(verdictLabels[t.verdict] || t.verdict)}</span></div>
      <div class="case-subject">${esc(c.question.subject || 'Question without a subject')} <span style="font-weight:500;color:#a1a6b5">· ${esc(c.question.level || '')}</span></div>
      <div class="case-chapter">${esc(c.question.chapter || 'Chapter not specified')}</div>
      <div class="case-comment">“${esc(comment)}”</div>
      <div class="case-bottom"><span class="case-meta">${fmtDate(c.firstReportedAt)}</span><span class="pill ${routeClass(t.route)}">${esc(statusLabel)}</span></div>
    </button>`;
  }).join('');
  el.querySelectorAll('.case-card').forEach(b => b.addEventListener('click', () => selectCase(b.dataset.id)));
}
async function selectCase(id) {
  selectedId = id;
  const c = await api('/api/cases/' + encodeURIComponent(id));
  renderList(); renderDetail(c);
}
function textForEdit(c) {
  const e = c.triage.edit; if (!e) return null;
  let before = '', after = '';
  if (e.field === 'answer' || Array.isArray(e.find) || Array.isArray(e.replace)) { before = JSON.stringify(e.find); after = JSON.stringify(e.replace); }
  else { before = e.find; after = e.replace; }
  return {field:e.field, before, after};
}
function renderDetail(c) {
  const t = c.triage, q = c.question, edit = textForEdit(c), status = c.audit?.[0]?.action || 'pending';
  const confidence = Math.round((t.confidence || 0) * 100);
  const reports = c.reports.map(r => `<div class="report-item"><div class="report-item-top"><span>${esc(r.reportId)} · ${esc(r.source)}</span><span>${fmtDate(r.reportedAt)}</span></div><p>${esc(r.comment)}</p></div>`).join('');
  const safeQuestion = q.questionHtml || '<em>The source question is not available in this sample.</em>';
  const statusText = status === 'pending' ? 'Waiting for review' : status === 'approve' ? 'Approved' : status === 'reject' ? 'Declined' : 'Edited';
  const repairName = t.repair ? ((window.taxonomy?.repairs?.[t.repair]?.label) || repairLabel(t.repair)) : 'No repair proposed';
  $('#detailPanel').innerHTML = `
    <div class="detail-head">
      <div class="detail-head-top"><div><div class="detail-kicker">QUESTION ${esc(q.qid || q.id)} · ${esc(q.questionType || 'QUESTION').toUpperCase()}</div><h2 class="detail-title">${esc(q.subject || 'Question review')}</h2><div class="detail-meta">${esc(q.chapter || 'Chapter not available')} · ${esc(q.level || 'Level not available')} · Feedback from ${c.reportCount} ${c.reportCount === 1 ? 'learner' : 'learners'}</div></div><span class="pill ${routeClass(t.route)}">${esc(routeLabels[t.route] || t.route)}</span></div>
      <div class="detail-badges"><span class="pill ${t.verdict}">${esc(verdictLabels[t.verdict] || t.verdict)}</span>${t.repair ? `<span class="pill">${esc(repairName)}</span>` : ''}<span class="pill signal-pill">Rule-based assessment</span><span class="pill">${esc(statusText)}</span></div>
    </div>
    <div class="detail-body">
      <div><div class="section-label">THE QUESTION AS STUDENTS SEE IT</div><div class="question-card">${safeQuestion}</div><div class="answer-chip">Answer on record <b>${esc(JSON.stringify(q.answer))}</b></div><details class="solution-details"><summary>See the source solution</summary><div class="question-card solution-card">${q.solutionHtml || '<em>No worked solution was included.</em>'}</div></details></div>
      <div><div class="section-label">OUR INITIAL ASSESSMENT</div><div class="analysis-card"><div class="analysis-top"><span class="pill ${t.verdict}">${esc(verdictLabels[t.verdict] || t.verdict)}</span><span class="confidence">Rule-based signal · not a verified probability</span></div><div class="analysis-row"><label>WHY THIS WAS FLAGGED</label><p>${esc(t.evidence || 'No additional explanation was provided.')}</p></div><div class="analysis-row"><label>WHAT WE RECOMMEND</label><p>${t.repair ? `<b>${esc(repairName)}</b> — ` : ''}${t.route === 'faculty_review' ? 'A faculty member should check the source before making a change.' : t.route === 'auto_apply' ? 'This appears to fit the low-risk repair policy. Please review before recording approval.' : 'The available evidence does not support changing the question.'}</p></div><div class="analysis-row"><button class="secondary-btn" id="reanalyzeBtn">↻ Re-check this report</button></div></div>
      <div class="analysis-row"><div class="section-label">WHAT LEARNERS TOLD US (${c.reportCount})</div><div class="report-list">${reports}</div></div></div>
      <div class="diff-section"><div class="section-label">PROPOSED CONTENT CHANGE</div>${edit ? `<div class="diff-grid"><div class="diff-box"><div class="diff-label">CURRENT VERSION · ${esc(edit.field.toUpperCase())}</div><div class="diff-content">${esc(edit.before)}</div></div><div class="diff-box after"><div class="diff-label">SUGGESTED VERSION · ${esc(edit.field.toUpperCase())}</div><div class="diff-content">${esc(edit.after)}</div></div></div>` : `<div class="no-edit">No content change is being suggested. ${t.route === 'faculty_review' ? 'A faculty member may need to inspect the source material before deciding.' : 'Based on the available information, keeping the question as it is looks like the safest next step.'}</div>`}</div>
      <div class="reply-preview"><label>A POSSIBLE RESPONSE TO THE LEARNER</label><p>${esc(t.student_reply || 'Thank you for flagging this question. The team has reviewed your feedback.')}</p></div>
      <div class="detail-actions"><div class="action-note">${t.route === 'faculty_review' ? 'Please add a short note when approving this case. Your decision will be saved in the history.' : t.route === 'auto_apply' ? 'This suggestion appears eligible under the demo repair policy. Your decision is recorded here; the live question bank is not changed.' : 'No content change is recommended from the available evidence. Your decision will be recorded for traceability.'}</div><div class="action-buttons"><button class="action-btn reject" id="rejectBtn">Decline</button><button class="action-btn edit" id="editBtn">Edit suggestion</button><button class="action-btn approve" id="approveBtn">${t.route === 'faculty_review' ? 'Approve with note' : 'Approve'}</button></div></div>
    </div>`;
  $('#approveBtn').addEventListener('click', () => submitAction(c, 'approve'));
  $('#rejectBtn').addEventListener('click', () => submitAction(c, 'reject'));
  $('#editBtn').addEventListener('click', () => submitEdit(c));
  $('#reanalyzeBtn').addEventListener('click', () => reanalyze(c));
}
function openActionModal({title, description, fields, submitLabel='Save decision'}) {
  $('#modalTitle').textContent = title;
  $('#modalDescription').textContent = description;
  $('#modalSubmit').textContent = submitLabel;
  $('#modalFields').innerHTML = fields.map(f => `<label class="modal-field"><span>${esc(f.label)}${f.required ? ' · REQUIRED' : ''}</span>${f.type === 'input' ? `<input name="${esc(f.name)}" value="${esc(f.value || '')}" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}">` : `<textarea name="${esc(f.name)}" rows="${f.rows || 3}" ${f.required ? 'required' : ''} placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`}</label>`).join('');
  $('#actionModal').classList.remove('hidden');
  const first = $('#modalFields input, #modalFields textarea'); if (first) first.focus();
  return new Promise(resolve => { modalResolver = resolve; });
}
function closeActionModal(result=null) { $('#actionModal').classList.add('hidden'); if (modalResolver) { modalResolver(result); modalResolver = null; } }
$('#modalCancel').addEventListener('click', () => closeActionModal(null));
$('#actionModal').addEventListener('click', e => { if (e.target === $('#actionModal')) closeActionModal(null); });
$('#actionModalForm').addEventListener('submit', e => {
  e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  if ([...e.currentTarget.querySelectorAll('[required]')].some(el => !el.value.trim())) return;
  closeActionModal(data);
});
async function submitAction(c, action) {
  let note = '';
  if (action === 'approve' && c.triage.route === 'faculty_review') {
    const result = await openActionModal({title:'Approve this question review?',description:'Add a brief note explaining why this decision is appropriate. It will be saved in the decision history.',fields:[{name:'note',label:'Faculty note',required:true,placeholder:'I checked the source question and…'}],submitLabel:'Approve review'});
    if (!result) return; note = result.note;
  } else if (action === 'reject') {
    const result = await openActionModal({title:'Decline this suggested change?',description:'You can leave a short reason so the team understands why no change was made.',fields:[{name:'note',label:'Reason (optional)',required:false,placeholder:'The original question is correct because…'}],submitLabel:'Decline suggestion'});
    if (!result) return; note = result.note || '';
  } else {
    const result = await openActionModal({title:'Approve this review?',description:'Your decision will be recorded in the decision history. The source question bank is not modified by this demo.',fields:[{name:'note',label:'Review note (optional)',required:false,placeholder:'Add context for the team…'}],submitLabel:'Record approval'});
    if (!result) return; note = result.note || '';
  }
  try {
    await api('/api/actions',{method:'POST',body:JSON.stringify({questionId:c.questionId,action,reportIds:c.reports.map(r=>r.reportId),note})});
    toast(`${action === 'approve' ? 'Approval' : 'Decision'} saved in the history.`);
    overview = await api('/api/overview'); renderMetrics(); await loadCases();
  } catch (e) { toast(e.message); }
}
async function submitEdit(c) {
  const e = c.triage.edit;
  if (!e) return toast('There is no suggested edit for this case. Add a review note or decline the suggestion instead.');
  const initial = Array.isArray(e.replace) ? JSON.stringify(e.replace) : String(e.replace ?? '');
  const result = await openActionModal({title:'Refine the suggested change',description:'Review the proposed value and explain what you changed. This stages an edit and records it in the history; it does not publish to the question bank.',fields:[{name:'editedValue',label:`Updated ${e.field}`,type:'input',required:true,value:initial},{name:'note',label:'Why are you changing it?',required:true,placeholder:'Explain the correction…'}],submitLabel:'Save edited suggestion'});
  if (!result) return;
  try {
    await api('/api/actions',{method:'POST',body:JSON.stringify({questionId:c.questionId,action:'edit',reportIds:c.reports.map(r=>r.reportId),note:result.note,editedValue:result.editedValue})});
    toast('Your edited suggestion has been saved to the history.');
    overview = await api('/api/overview'); renderMetrics(); await loadCases();
  } catch (err) { toast(err.message); }
}
async function reanalyze(c) {
  const b = $('#reanalyzeBtn'); b.disabled = true; b.textContent = 'Checking…';
  try {
    const out = await api('/api/reanalyze',{method:'POST',body:JSON.stringify({questionId:c.questionId})});
    if (out.candidate) {
      const x = out.candidate;
      toast(`Re-check complete: ${verdictLabels[x.verdict] || x.verdict}. Nothing was published.`);
      const box = document.createElement('div'); box.className = 'reply-preview';
      const proposed = x.edit ? `<div class="analysis-row"><label>PROPOSED EDIT · ${esc(x.edit.field || 'FIELD')}</label><p><s>${esc(x.edit.find ?? '')}</s> → <b>${esc(x.edit.replace ?? '')}</b></p></div>` : '';
      box.innerHTML = `<label>GEMINI REVIEW CANDIDATE · NOT PUBLISHED</label><p><b>${esc(verdictLabels[x.verdict] || x.verdict)}</b><br>${esc(x.evidence || 'No extra evidence returned')}<br><b>Suggested route:</b> ${esc(routeLabels[x.route] || x.route || 'Not specified')} · <b>Model signal:</b> uncalibrated; faculty review required</p>${proposed}<div class="analysis-row"><label>POSSIBLE STUDENT REPLY</label><p>${esc(x.student_reply || 'No reply suggested.')}</p></div>`;
      $('#detailPanel .detail-body').prepend(box);
    } else toast(out.message || 'The re-check is complete.');
  } catch (e) { toast(e.message); }
  finally { b.disabled = false; b.textContent = '↻ Re-check this report'; }
}
async function showAudit() {
  currentView = 'audit'; $('#queueWorkspace').classList.add('hidden'); $('#metrics').classList.add('hidden'); $('#auditWorkspace').classList.remove('hidden');
  $('#pageTitle').innerHTML = 'A clear record of <span class="heading-period">every decision.</span>';
  $('#pageSub').textContent = 'See what was approved, edited or declined, and why.'; $('#crumbCurrent').textContent = 'Decision history';
  const entries = await api('/api/audit');
  $('#auditList').innerHTML = entries.length ? entries.map(a => `<div class="audit-row"><small>${fmtDate(a.createdAt)}</small><b>${esc(a.action.toUpperCase())}</b><span>${esc(a.subject)} · ${esc(a.chapter)}<br><span style="color:#9aa1b2">${esc(a.note || 'No note was added')}</span></span><small>${esc(a.auditId)}</small></div>`).join('') : '<div class="audit-empty">No decisions have been recorded yet. Once a faculty member reviews a case, the decision will appear here.</div>';
}
function showQueue() {
  currentView = 'queue'; $('#queueWorkspace').classList.remove('hidden'); $('#metrics').classList.remove('hidden'); $('#auditWorkspace').classList.add('hidden');
  $('#pageTitle').innerHTML = 'Your review desk. <span class="heading-period">Start with what matters.</span>';
  $('#pageSub').textContent = 'A clear view of learner feedback, suggested fixes and the decisions that still need you.';
  $('#crumbCurrent').textContent = 'Review queue'; loadCases();
}
$('#navAudit').addEventListener('click', showAudit);
$('#navQueue').addEventListener('click', showQueue);
$('#backQueue').addEventListener('click', showQueue);
$('#refreshBtn').addEventListener('click', async () => { overview = await api('/api/overview'); renderMetrics(); await loadCases(); toast('The review queue is up to date.'); });
$('#exportBtn').addEventListener('click', () => window.location.href = '/api/export/results');
$('#searchInput').addEventListener('input', debounce(loadCases, 220));
['verdictFilter','routeFilter','statusFilter'].forEach(id => $('#'+id).addEventListener('change', loadCases));
$('#filterToggle').addEventListener('click', () => $('#filters').classList.toggle('collapsed'));
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
init();
