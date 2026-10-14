import { SYMPTOMS } from '../config.js';
import { escapeHtml } from '../core/ui.js';
import { screenshotGallery, bindScreenshotGallery, addScreenshots } from './screenshots.js';

export function renderIntake(container, caseData, { onChange, onNext }) {
  const o = caseData.overview;
  container.innerHTML = `<div class="panel form-panel">
    <span class="eyebrow">STEP 1 • INTAKE</span>
    <h2>What happened?</h2>
    <p class="muted">Capture the basics. Blank fields stay out of the final report.</p>
    <div class="form-grid">
      <div class="field"><label>Store / Location</label><input id="intakeStore" value="${escapeHtml(o.store)}" placeholder="Optional"></div>
      <div class="field"><label>Site #</label><input id="intakeSite" value="${escapeHtml(o.site)}" placeholder="Optional"></div>
      <div class="field"><label>Ticket #</label><input id="intakeTicket" value="${escapeHtml(o.ticket)}" placeholder="Optional"></div>
      <div class="field"><label>Business Date</label><input id="intakeDate" type="date" value="${escapeHtml(o.businessDate)}"></div>
      <div class="field full"><label>Reported Issue</label><textarea id="intakeIssue" placeholder="What did the store/user report? Include exact wording when useful.">${escapeHtml(o.reportedIssue)}</textarea></div>
    </div>
    <div class="section-divider"></div>
    <div class="field full"><label>Primary Symptom</label>
      <div class="symptom-grid">${SYMPTOMS.map(s => `<button type="button" class="symptom-btn ${o.symptom === s ? 'active' : ''}" data-symptom="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join('')}</div>
    </div>
    <div class="shot-section">
      <div class="shot-tools"><label class="btn secondary file-btn">Add Screenshot<input id="intakeShots" type="file" accept="image/*" multiple hidden></label><span class="muted">Screenshots stay in this browser unless you export the case.</span></div>
      <div id="intakeGallery">${screenshotGallery(caseData, 'intake')}</div>
    </div>
    <div class="actions-row"><button class="btn primary" id="intakeNext">Continue to Troubleshooting</button></div>
  </div>`;

  bindText('intakeStore','store'); bindText('intakeSite','site'); bindText('intakeTicket','ticket'); bindText('intakeDate','businessDate'); bindText('intakeIssue','reportedIssue');
  container.querySelectorAll('[data-symptom]').forEach(btn => btn.addEventListener('click', () => {
    caseData.overview.symptom = btn.dataset.symptom;
    caseData.updatedAt = new Date().toISOString();
    onChange?.({ timeline: { source: 'Intake', text: `Symptom selected: ${btn.dataset.symptom}` }, rerender: true });
  }));
  container.querySelector('#intakeShots').addEventListener('change', async e => {
    await addScreenshots(caseData, 'intake', e.target.files);
    onChange?.({ rerender: true });
  });
  bindScreenshotGallery(container.querySelector('#intakeGallery'), caseData, opts => onChange?.(opts));
  container.querySelector('#intakeNext').addEventListener('click', () => onNext?.());

  function bindText(id, field) {
    const el = container.querySelector('#'+id);
    el.addEventListener('input', () => { caseData.overview[field] = el.value; caseData.updatedAt = new Date().toISOString(); onChange?.(); });
  }
}
