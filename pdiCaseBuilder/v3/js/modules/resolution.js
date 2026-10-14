import { escapeHtml } from '../core/ui.js';
import { screenshotGallery, bindScreenshotGallery, addScreenshots } from './screenshots.js';

const ROOT_CATEGORIES = ['Double Close','Store Close Not Completed','Store Close Hung','Missing Poll XML','Malformed / Bad XML','Polled Too Early / Partial Files','Partial Data Already Submitted','USB / XMLGateway Communication','VPN / Host Connectivity','Paperwork / Process Lock','SCO / Transaction During Close','Missed Close / Rollover','Other'];
const VERIFY = ['Poll successful','Open/Close populated','Skipped Close cleared','Item Sales checked','Poll Day Exceptions reviewed','GT continuity checked','Correct business date verified','Relevant lock cleared/verified'];

export function renderResolution(container, caseData, { onChange, onNext }) {
  const r=caseData.resolution;
  container.innerHTML=`<div class="panel form-panel">
    <span class="eyebrow">STEP 3 • RESOLVE</span><h2>Document what actually fixed it</h2><p class="muted">Keep confirmed cause separate from suspected cause. The final report should be useful to the next technician.</p>
    <div class="resolve-grid">
      <div class="field"><label>Root Cause Category</label><select id="rootCategory"><option value="">Choose if known</option>${ROOT_CATEGORIES.map(x=>`<option ${r.rootCauseCategory===x?'selected':''}>${escapeHtml(x)}</option>`).join('')}</select></div>
      <div class="field"><label>Cause Confidence</label><select id="rootConfidence">${['Unknown','Possible','Likely','Confirmed'].map(x=>`<option ${r.confidence===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="field full"><label>Root Cause</label><textarea id="rootCause" placeholder="What actually caused the issue? If not confirmed, say so.">${escapeHtml(r.rootCause)}</textarea></div>
      <div class="field full"><label>Resolution / Fix</label><textarea id="fix" placeholder="What was done to resolve it?">${escapeHtml(r.fix)}</textarea></div>
      <div class="field full"><label>Verification Notes</label><textarea id="verificationNotes" placeholder="How did you prove it was resolved?">${escapeHtml(r.verificationNotes)}</textarea></div>
    </div>
    <div class="section-divider"></div>
    <h2 style="font-size:18px">Verification Checklist</h2>
    <div class="verify-list">${VERIFY.map(x=>`<label class="verify-item"><input type="checkbox" data-verify="${escapeHtml(x)}" ${r.verificationChecks.includes(x)?'checked':''}><span>${escapeHtml(x)}</span></label>`).join('')}</div>
    <div class="section-divider"></div>
    <div class="resolve-grid">
      ${select('preventable','Preventable?',r.preventable,['Unknown','Yes','No','Maybe'])}
      ${select('repeatIssue','Repeat issue?',r.repeatIssue,['Unknown','Yes','No'])}
      ${select('suggestionAccuracy','Was the Case Builder suggestion accurate?',r.suggestionAccuracy,['Unknown','Yes','Partly','No'])}
      ${select('documentationUpdate','Documentation update recommended?',r.documentationUpdate,['No','Yes'])}
      ${select('resolved','Case resolved?',r.resolved,['No','Yes'])}
      <div class="field"><label>Tags</label><input id="tags" value="${escapeHtml((r.tags||[]).join(', '))}" placeholder="polling, xml, skipped-close"></div>
      <div class="field full"><label>New Learning</label><textarea id="newLearning" placeholder="What should the team know next time?">${escapeHtml(r.newLearning)}</textarea></div>
    </div>
    <div class="shot-section"><div class="shot-tools"><label class="btn secondary file-btn">Add Resolution Screenshot<input id="resolutionShots" type="file" accept="image/*" multiple hidden></label></div><div id="resolutionGallery">${screenshotGallery(caseData,'resolution')}</div></div>
    <div class="actions-row"><button class="btn primary" id="resolutionNext">Review Final Case</button></div>
  </div>`;
  bindText('rootCategory','rootCauseCategory');bindText('rootConfidence','confidence');bindText('rootCause','rootCause');bindText('fix','fix');bindText('verificationNotes','verificationNotes');bindText('preventable','preventable');bindText('repeatIssue','repeatIssue');bindText('suggestionAccuracy','suggestionAccuracy');bindText('documentationUpdate','documentationUpdate');bindText('resolved','resolved');bindText('newLearning','newLearning');
  container.querySelector('#tags').addEventListener('input',e=>{r.tags=e.target.value.split(',').map(x=>x.trim()).filter(Boolean);onChange?.()});
  container.querySelectorAll('[data-verify]').forEach(box=>box.addEventListener('change',()=>{r.verificationChecks=[...container.querySelectorAll('[data-verify]:checked')].map(x=>x.dataset.verify);onChange?.()}));
  container.querySelector('#resolutionShots').addEventListener('change',async e=>{await addScreenshots(caseData,'resolution',e.target.files);onChange?.({rerender:true})});
  bindScreenshotGallery(container.querySelector('#resolutionGallery'),caseData,opts=>onChange?.(opts));
  container.querySelector('#resolutionNext').addEventListener('click',()=>onNext?.());
  function bindText(id,field){container.querySelector('#'+id).addEventListener('input',e=>{r[field]=e.target.value;caseData.updatedAt=new Date().toISOString();onChange?.()})}
}
function select(id,label,value,options){return `<div class="field"><label>${escapeHtml(label)}</label><select id="${id}">${options.map(x=>`<option ${value===x?'selected':''}>${x}</option>`).join('')}</select></div>`}
