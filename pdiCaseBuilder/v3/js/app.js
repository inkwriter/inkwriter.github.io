import { APP_VERSION } from './config.js';
import { caseStore, createEmptyCase, normalizeCase } from './core/state.js';
import { createNavigation } from './core/navigation.js';
import { saveCase, getCases, getCase, deleteCase, importCases } from './core/storage.js';
import { escapeHtml, toast, showModal, closeModal, safetyLabel } from './core/ui.js';
import { loadJson, loadPatternLibrary } from './services/data-loader.js';
import { evaluatePatterns, chooseNextEvidenceField } from './services/pattern-engine.js';
import { validateForFinalize, caseProgress } from './services/validation.js';
import { buildAiHandoff } from './services/ai-handoff.js';
import { exportCaseJson, exportCaseCsv, exportText, exportArchive } from './services/export.js';
import { renderIntake } from './modules/intake.js';
import { renderTroubleshooting } from './modules/troubleshooting.js';
import { renderResolution } from './modules/resolution.js';
import { buildHumanReportHtml, buildHumanReportText } from './modules/reporting.js';
import { renderKnownPatterns } from './modules/known-patterns.js';
import { renderDemoList, makeDemo } from './modules/demo.js';
import { renderCaseLibrary } from './modules/case-library.js';

const els = {
  version: document.getElementById('versionBadge'),
  patternCount: document.getElementById('homePatternCount'),
  demoList: document.getElementById('demoCaseList'),
  intake: document.getElementById('case-step-intake'),
  troubleshoot: document.getElementById('case-step-troubleshoot'),
  resolve: document.getElementById('case-step-resolve'),
  finalize: document.getElementById('case-step-finalize'),
  nextStep: document.getElementById('nextStepCard'),
  patternCard: document.getElementById('patternMatchCard'),
  progress: document.getElementById('caseProgressCard'),
  patternGrid: document.getElementById('patternGrid'),
  caseList: document.getElementById('caseList'),
  printReport: document.getElementById('printReport')
};

els.version.textContent = `v${APP_VERSION}`;

let currentView = 'home';
let libraryCache = [];
let isRendering = false;

const nav = createNavigation({
  onViewChange: view => {
    currentView = view;
    if (view === 'patterns') renderPatternView();
    if (view === 'library') refreshLibrary();
  },
  onCaseStepChange: step => {
    caseStore.getCase().workflow.currentStep = step;
    renderCurrentCase();
  }
});

boot().catch(err => {
  console.error(err);
  toast('V3 could not finish loading. Check the console.');
});

async function boot() {
  const [patternBundle, evidenceSchema, demos] = await Promise.all([
    loadPatternLibrary('./data/patterns-manifest.json'),
    loadJson('./data/evidence-schema.json'),
    loadJson('./data/demo-cases.json')
  ]);
  caseStore.setPatterns(patternBundle.patterns);
  caseStore.setEvidenceSchema(evidenceSchema);
  caseStore.setDemoCases(demos.cases || []);
  els.patternCount.textContent = String(caseStore.patterns.length);
  renderDemoList(els.demoList, caseStore.demoCases, loadDemo);
  renderPatternView();
  bindGlobalActions();
  recalculatePattern();
  renderCurrentCase();
  await refreshLibrary();
  autoLoadFromQuery();
}

function bindGlobalActions() {
  document.getElementById('homeStartBtn').addEventListener('click', startNewCase);
  document.getElementById('newCaseBtn').addEventListener('click', startNewCase);
  document.getElementById('saveCaseBtn').addEventListener('click', saveCurrentCase);
  document.getElementById('modeToggle').addEventListener('click', toggleMode);
  document.getElementById('copyHandoffBtn').addEventListener('click', copyAiHandoff);
  document.getElementById('exportCaseBtn').addEventListener('click', showExportModal);
  document.getElementById('patternSearch').addEventListener('input', renderPatternView);
  document.getElementById('caseSearchInput').addEventListener('input', renderLibraryFromCache);
  document.getElementById('caseStatusFilter').addEventListener('change', renderLibraryFromCache);
  document.getElementById('exportArchiveBtn').addEventListener('click', async () => exportArchive(await getCases()));
  document.getElementById('importArchiveInput').addEventListener('change', importArchive);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
}

function startNewCase() {
  if (!confirm('Start a new case? Unsaved changes to the current case will be cleared.')) return;
  caseStore.newCase();
  recalculatePattern();
  renderCurrentCase();
  nav.showView('case');
  nav.showCaseStep('intake');
  toast('New case started');
}

async function saveCurrentCase() {
  const c = caseStore.getCase();
  if (c.isDemo) {
    if (!confirm('This is a synthetic demo. Save a copy to the local case library?')) return;
    c.id = `case-${Date.now().toString(36)}`;
    c.isDemo = false;
    c.overview.ticket = '';
  }
  const saved = await saveCase(c);
  caseStore.setCase(saved, true);
  toast('Case saved in this browser');
  await refreshLibrary();
}

function toggleMode() {
  const c = caseStore.getCase();
  c.workflow.mode = c.workflow.mode === 'guided' ? 'tech' : 'guided';
  c.updatedAt = new Date().toISOString();
  renderCurrentCase();
  toast(c.workflow.mode === 'guided' ? 'Guided Mode enabled' : 'Technician Mode enabled');
}

function onCaseChange(options = {}) {
  const c = caseStore.getCase();
  c.updatedAt = new Date().toISOString();
  if (options.timeline) caseStore.addTimeline(options.timeline.source, options.timeline.text, false);
  recalculatePattern();
  if (options.rerender) renderCurrentCase();
  else renderSidebars();
}

function recalculatePattern() {
  const c = caseStore.getCase();
  const results = evaluatePatterns(c, caseStore.patterns);
  const top = results[0];
  c.patternMatch = top ? {
    evaluatedAt: new Date().toISOString(),
    patternId: top.pattern.id,
    patternName: top.pattern.name,
    confidence: top.confidence,
    score: top.score,
    reasons: top.reasons,
    alternatives: results.slice(1,4).map(x => ({ id:x.pattern.id, name:x.pattern.name, confidence:x.confidence, score:x.score }))
  } : { evaluatedAt:new Date().toISOString(), patternId:'', patternName:'', confidence:'none', score:0, reasons:[], alternatives:[] };
  return results;
}

function renderCurrentCase() {
  if (isRendering) return;
  isRendering = true;
  try {
    const c = caseStore.getCase();
    const results = evaluatePatterns(c, caseStore.patterns);
    const nextEvidenceField = chooseNextEvidenceField(c, results, caseStore.evidenceSchema);
    updateCaseHeader(c);
    document.getElementById('modeToggle').textContent = c.workflow.mode === 'guided' ? 'Guided Mode' : 'Technician Mode';
    renderIntake(els.intake, c, { onChange:onCaseChange, onNext:()=>nav.showCaseStep('troubleshoot') });
    renderTroubleshooting(els.troubleshoot, c, { mode:c.workflow.mode, nextEvidenceField, patternResults:results, onChange:onCaseChange });
    renderResolution(els.resolve, c, { onChange:onCaseChange, onNext:()=>nav.showCaseStep('finalize') });
    renderFinalize(c);
    renderSidebars(results,nextEvidenceField);
    updateStepper(c);
  } finally { isRendering = false; }
}

function updateCaseHeader(c) {
  document.getElementById('caseStatusEyebrow').textContent = c.isDemo ? 'SYNTHETIC DEMO CASE' : (c.resolution.resolved === 'Yes' ? 'RESOLVED CASE' : 'ACTIVE CASE');
  document.getElementById('caseTitle').textContent = c.overview.store ? `${c.overview.store}${c.overview.site ? ` #${c.overview.site}` : ''}` : 'New PDI Case';
  document.getElementById('caseSubtitle').textContent = c.overview.symptom || 'Gather the minimum evidence needed to choose the next safe check.';
}

function updateStepper(c) {
  const order=['intake','troubleshoot','resolve','finalize'];
  const current=order.indexOf(c.workflow.currentStep || 'intake');
  document.querySelectorAll('[data-case-step]').forEach(btn => {
    const idx=order.indexOf(btn.dataset.caseStep);
    btn.classList.toggle('done', idx < current || (btn.dataset.caseStep==='finalize' && c.resolution.resolved==='Yes'));
  });
}

function renderSidebars(results = evaluatePatterns(caseStore.getCase(),caseStore.patterns), nextEvidenceField = chooseNextEvidenceField(caseStore.getCase(),results,caseStore.evidenceSchema)) {
  const c=caseStore.getCase();
  renderNextStep(c,results,nextEvidenceField);
  renderPatternSignal(c,results);
  const p=caseProgress(c);
  const shots=Object.values(c.screenshots||{}).reduce((n,x)=>n+(x?.length||0),0);
  els.progress.innerHTML=`<div class="card-kicker">CASE PROGRESS</div><h3 style="margin:8px 0 10px">${p.completed} of ${p.total} checkpoints</h3><div class="progress-line"><span style="width:${p.percent}%"></span></div><div class="progress-meta"><span>${p.percent}% captured</span><span>${shots} screenshot${shots===1?'':'s'}</span></div><div class="why-box" style="margin-top:12px"><b>Storage</b><br>Case data and screenshots remain in this browser until you export/copy them.</div>`;
}

function renderNextStep(c,results,nextEvidenceField) {
  const baseNext = getBaseNext(c);
  if (baseNext) {
    els.nextStep.innerHTML=`<div class="card-kicker"><span class="safety-dot ${baseNext.safety}"></span>NEXT SAFEST STEP</div><h3>${escapeHtml(baseNext.title)}</h3><p>${escapeHtml(baseNext.text)}</p><div class="why-box"><b>Why now?</b><br>${escapeHtml(baseNext.why)}</div>`;
    return;
  }
  if (nextEvidenceField) {
    els.nextStep.innerHTML=`<div class="card-kicker"><span class="safety-dot read_only"></span>NEXT SAFEST STEP</div><h3>Capture ${escapeHtml(nextEvidenceField.label)}</h3><p>This is the highest-value unresolved evidence field for the current pattern ranking.</p><div class="why-box"><b>Why now?</b><br>A single answer may strengthen, weaken, or replace the current pattern signal.</div>`;
    return;
  }
  const top=results[0];
  if (top) {
    els.nextStep.innerHTML=`<div class="card-kicker"><span class="safety-dot ${top.pattern.safety}"></span>NEXT SAFEST STEP</div><h3>${escapeHtml(top.pattern.next_safe_step)}</h3><p>${escapeHtml(top.pattern.why)}</p><div class="why-box"><b>Safety</b><br>${escapeHtml(safetyLabel(top.pattern.safety))}. A pattern signal never authorizes an advanced correction by itself.</div>`;
  } else {
    els.nextStep.innerHTML=`<div class="card-kicker"><span class="safety-dot read_only"></span>NEXT SAFEST STEP</div><h3>Keep gathering evidence</h3><p>No known pattern is strong enough yet. Complete the core checks and capture exact messages/timestamps rather than guessing.</p>`;
  }
}

function getBaseNext(c) {
  if (!c.checks.paperwork.result) return {title:'Check Shared Paperwork',text:'Look for the expected business-day paperwork before jumping to deeper systems.',why:'This is the first evidence point in the standard PDI troubleshooting flow.',safety:'read_only'};
  if (!c.checks.uploads.result) return {title:'Check Enterprise Data → Uploads',text:'See what actually reached Enterprise for the affected business date.',why:'This separates a missing-generation/communication problem from a downstream processing issue.',safety:'read_only'};
  if (!c.checks.poll.result) return {title:'Attempt Poll Day and capture the result',text:'Record the exact message or result before making changes.',why:'The poll result often determines whether the next branch is connectivity, locking, timing, or data.',safety:'changes_something'};
  const needConnection=['Connection error','Timeout','No files available','Poll failed'].includes(c.checks.poll.result)||['Nothing present','Network batch only'].includes(c.checks.uploads.result);
  if(needConnection&&!c.checks.connection.result)return {title:'Verify PDI Host status',text:'Check whether the PDI desktop client reports Host connected, disconnected, or connecting.',why:'Internet access does not prove the PDI/VPN path is healthy.',safety:'read_only'};
  const needGateway=(needConnection&&c.checks.connection.result==='Host is connected')||(['Nothing present','Network batch only'].includes(c.checks.uploads.result)&&c.checks.connection.result!=='Disconnected');
  if(needGateway&&!c.checks.gateway.result)return {title:'Check XMLGateway / POSOutbox',text:'Use the deeper store-side check now that paperwork, uploads, poll result, and Host status have been reviewed.',why:'This can show whether Store Close output exists and where the data trail stopped.',safety:'read_only'};
  return null;
}

function renderPatternSignal(c,results) {
  const top=results[0];
  if(!top){els.patternCard.innerHTML=`<div class="card-kicker">KNOWN PATTERN SIGNAL</div><h3>No strong match yet</h3><p>That is okay. The Case Builder should not force a diagnosis when the evidence is incomplete.</p><span class="confidence none">No match</span>`;return;}
  els.patternCard.innerHTML=`<div class="card-kicker">KNOWN PATTERN SIGNAL</div><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h3>${escapeHtml(top.pattern.name)}</h3><span class="confidence ${top.confidence}">${escapeHtml(top.confidence)}</span></div><p>${escapeHtml(top.pattern.summary)}</p><div class="match-reasons">${top.reasons.slice(0,5).map(r=>`<div class="match-reason">${escapeHtml(r)}</div>`).join('')}</div><div class="why-box"><b>Not a diagnosis</b><br>The historical pattern helps choose what to inspect next. Verify the evidence before changing PDI data.</div>${top.pattern.guardrails?.length?`<details><summary>Safety guardrails</summary><div class="pattern-detail"><ul>${top.pattern.guardrails.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div></details>`:''}`;
}

function renderFinalize(c) {
  const result=validateForFinalize(c);
  const warningHtml=[...result.errors.map(x=>`<div class="why-box" style="background:var(--red-soft);margin-bottom:8px"><b>Required:</b> ${escapeHtml(x)}</div>`),...result.warnings.map(x=>`<div class="why-box" style="background:var(--amber-soft);margin-bottom:8px"><b>Review:</b> ${escapeHtml(x)}</div>`)].join('');
  els.finalize.innerHTML=`<div class="panel form-panel"><span class="eyebrow">STEP 4 • FINALIZE</span><h2>Review the case record</h2><p class="muted">The final report omits blank fields and keeps the Case Builder's pattern signal separate from the documented root cause.</p>${warningHtml}${buildHumanReportHtml(c)}<div class="actions-row"><button class="btn secondary" id="finalCopyAi">Copy for ChatGPT</button><button class="btn" id="finalExport">Export Options</button><button class="btn primary" id="finalSave">Save Final Case</button></div></div>`;
  els.finalize.querySelector('#finalCopyAi').addEventListener('click',copyAiHandoff);
  els.finalize.querySelector('#finalExport').addEventListener('click',showExportModal);
  els.finalize.querySelector('#finalSave').addEventListener('click',saveCurrentCase);
}

async function copyAiHandoff() {
  const text=buildAiHandoff(caseStore.getCase());
  try { await navigator.clipboard.writeText(text); toast('ChatGPT handoff copied'); }
  catch { showModal('Copy for ChatGPT',`<textarea style="min-height:360px">${escapeHtml(text)}</textarea>`); }
}

function showExportModal() {
  const c=caseStore.getCase();
  showModal('Export Case',`<div class="export-grid">
    <div class="export-option"><h3>Human-readable TXT</h3><p>Standardized case report for cataloging or attaching to a ticket.</p><button class="btn small primary" data-export-action="txt">Download TXT</button></div>
    <div class="export-option"><h3>Structured JSON</h3><p>Full case record, including screenshots. Best for backup/import.</p><button class="btn small primary" data-export-action="json">Download JSON</button></div>
    <div class="export-option"><h3>CSV summary</h3><p>One-row structured summary for analysis across cases.</p><button class="btn small primary" data-export-action="csv">Download CSV</button></div>
    <div class="export-option"><h3>PDF / Print</h3><p>Printable report with attached screenshots and case details.</p><button class="btn small primary" data-export-action="pdf">Open Print/PDF</button></div>
  </div>`);
  document.querySelectorAll('[data-export-action]').forEach(btn=>btn.addEventListener('click',()=>{
    const action=btn.dataset.exportAction;
    if(action==='txt')exportText(c,buildHumanReportText(c));
    if(action==='json')exportCaseJson(c);
    if(action==='csv')exportCaseCsv(c);
    if(action==='pdf'){els.printReport.innerHTML=buildHumanReportHtml(c);window.print();}
  }));
}

function renderPatternView() { renderKnownPatterns(els.patternGrid, caseStore.patterns, document.getElementById('patternSearch')?.value || ''); }

async function refreshLibrary() { libraryCache=await getCases();renderLibraryFromCache(); }
function renderLibraryFromCache() {
  renderCaseLibrary(els.caseList,libraryCache,{query:document.getElementById('caseSearchInput').value,status:document.getElementById('caseStatusFilter').value,onOpen:openSaved,onDuplicate:duplicateSaved,onDelete:deleteSaved,onExport:exportSaved});
}
async function openSaved(id){const c=await getCase(id);if(!c)return;caseStore.setCase(c,true);recalculatePattern();renderCurrentCase();nav.showView('case');nav.showCaseStep(c.workflow.currentStep||'intake');toast('Case loaded');}
async function duplicateSaved(id){const c=await getCase(id);if(!c)return;const copy=normalizeCase(c);copy.id=`case-${Date.now().toString(36)}`;copy.overview.ticket='';copy.resolution.resolved='No';copy.createdAt=new Date().toISOString();copy.updatedAt=new Date().toISOString();caseStore.setCase(copy,true);renderCurrentCase();nav.showView('case');nav.showCaseStep('intake');toast('Duplicated into a new case');}
async function deleteSaved(id){if(!confirm('Delete this locally saved case?'))return;await deleteCase(id);await refreshLibrary();toast('Case deleted');}
async function exportSaved(id){const c=await getCase(id);if(c)exportCaseJson(c);}

async function importArchive(e){
  const file=e.target.files?.[0];if(!file)return;
  try{const raw=JSON.parse(await file.text());const cases=Array.isArray(raw)?raw:(raw.cases||[raw]);const count=await importCases(cases);await refreshLibrary();toast(`${count} case${count===1?'':'s'} imported`);}catch(err){console.error(err);alert('The archive could not be imported.');}finally{e.target.value='';}
}

function loadDemo(demoCase) {
  caseStore.setCase(normalizeCase(demoCase),true);
  recalculatePattern();
  renderCurrentCase();
  nav.showView('case');
  nav.showCaseStep('troubleshoot');
  toast('Synthetic demo loaded');
}

function autoLoadFromQuery(){
  const params=new URLSearchParams(location.search);const demo=params.get('demo');if(!demo)return;
  const def=caseStore.demoCases.find(x=>x.id===demo||x.id===`demo-${demo}`);if(def)loadDemo(makeDemo(def));
}
