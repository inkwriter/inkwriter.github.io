import { escapeHtml, fmtMoney } from '../core/ui.js';
import { screenshotGallery, bindScreenshotGallery, addScreenshots } from './screenshots.js';

export function renderGtAnalysis(caseData, { onChange, compact = false } = {}) {
  const e = caseData.evidence;
  const insight = calculateGtInsight(e);
  return `<div class="tech-section" id="gtAnalysisBlock">
    <h3>GT / Red Close Analysis</h3>
    <div class="gt-grid">
      ${moneyField('gt_previous_ending','Previous day GT Ending',e.gt_previous_ending)}
      ${moneyField('gt_current_beginning','Affected day GT Beginning',e.gt_current_beginning)}
      ${moneyField('gt_current_ending','Affected day GT Ending',e.gt_current_ending)}
      ${moneyField('skipped_close_amount','Skipped Close amount',e.skipped_close_amount)}
    </div>
    <div class="gt-insight ${insight.strong ? 'strong' : ''}"><h3>${escapeHtml(insight.title)}</h3><p>${escapeHtml(insight.text)}</p></div>
    ${compact ? '' : `<div class="shot-section"><div class="shot-tools"><label class="btn secondary small file-btn">Add GT / DRPOS Screenshot<input class="gt-shot-input" type="file" accept="image/*" multiple hidden></label></div><div class="gt-gallery">${screenshotGallery(caseData,'gt')}</div></div>`}
  </div>`;
}

export function bindGtAnalysis(root, caseData, { onChange } = {}) {
  root.querySelectorAll('[data-gt-field]').forEach(input => input.addEventListener('input', () => {
    caseData.evidence[input.dataset.gtField] = input.value;
    caseData.updatedAt = new Date().toISOString();
    onChange?.({ rerender: true });
  }));
  const shotInput = root.querySelector('.gt-shot-input');
  if (shotInput) shotInput.addEventListener('change', async e => { await addScreenshots(caseData,'gt',e.target.files); onChange?.({rerender:true}); });
  const gallery = root.querySelector('.gt-gallery');
  if (gallery) bindScreenshotGallery(gallery,caseData,opts=>onChange?.(opts));
}

export function calculateGtInsight(evidence) {
  const p = num(evidence.gt_previous_ending), b = num(evidence.gt_current_beginning), s = num(evidence.skipped_close_amount);
  if (valid(p,b,s) && approx(b,p*2) && approx(s,p)) return { strong:true,title:'Strong known double-close fingerprint',text:`Current Beginning ${fmtMoney(b)} is approximately twice Previous Ending ${fmtMoney(p)}, and Skipped Close ${fmtMoney(s)} matches the previous ending. Verify DRPOS and surrounding business days before changing values.` };
  if (valid(p,b) && approx(b,p*2)) return { strong:false,title:'GT relationship worth checking',text:'The affected-day GT Beginning is approximately twice the previous-day GT Ending. This alone does not confirm a double close; compare Skipped Close and DRPOS evidence.' };
  if (valid(p,s) && approx(s,p)) return { strong:false,title:'Skipped Close matches previous ending',text:'That relationship appears in confirmed double-close cases, but it is not sufficient by itself. Check current GT Beginning and DRPOS.' };
  return { strong:false,title:'No strong GT fingerprint detected yet',text:'Enter the surrounding GT values only when the issue involves red Skipped Close, GT mismatch, double close, or close-time transaction activity.' };
}
function moneyField(id,label,value){return `<div class="field"><label>${escapeHtml(label)}</label><input data-gt-field="${id}" inputmode="decimal" value="${escapeHtml(value)}" placeholder="0.00"></div>`}
function num(v){if(v===''||v==null)return null;const n=Number(String(v).replace(/[$,]/g,''));return Number.isFinite(n)?n:null}
function valid(...x){return x.every(v=>typeof v==='number'&&Number.isFinite(v))}
function approx(a,b){const scale=Math.max(1,Math.abs(a),Math.abs(b));return Math.abs(a-b)<=Math.max(.02,scale*.000001)}
