import { escapeHtml, safetyLabel } from '../core/ui.js';
import { screenshotGallery, bindScreenshotGallery, addScreenshots } from './screenshots.js';
import { renderGtAnalysis, bindGtAnalysis } from './gt-analysis.js';

const CHECKS = [
  {id:'paperwork',title:'Shared Paperwork',prompt:'What is in the shared paperwork folder for the expected business day?',why:'This establishes whether reports/paperwork reached the normal shared location before deeper troubleshooting.',safety:'read_only',choices:['Paperwork present','Nothing for expected day','Some paperwork / incomplete','Wrong date / unusual files','Not checked']},
  {id:'uploads',title:'Enterprise Data → Uploads',prompt:'What do you see in Enterprise Data → Uploads?',why:'This shows what actually reached Enterprise and helps separate store-side generation from downstream processing.',safety:'read_only',choices:['Normal poll files present','Network batch only','Nothing present','Files present but timestamps look wrong','Wrong business date','Other']},
  {id:'poll',title:'Attempt a Poll',prompt:'What happened when Poll Day was attempted?',why:'Capture the exact result before changing anything. The error/result often determines the next branch.',safety:'changes_something',choices:['Poll successful','Poll failed','No files available','Timeout','Connection error','Lock / data error','Poll completed but data is wrong','Store Close batch failed','Other']},
  {id:'connection',title:'PDI Connection Check',prompt:'What does the PDI desktop client show for Host status?',why:'Working internet does not prove the PDI Host/VPN path is healthy.',safety:'read_only',choices:['Host is connected','Disconnected','Connecting','Unknown / not checked']},
  {id:'gateway',title:'XMLGateway / POSOutbox',prompt:'What did you find in XMLGateway / POSOutbox?',why:'Use this deeper store-side check after the earlier evidence indicates a communication or close-generation question.',safety:'read_only',choices:['Mapped successfully; close is present','Mapped successfully; close is missing','Could not reach XMLGateway IP','POSOutbox unavailable','USB Ethernet adapter missing','Not checked']}
];

const EVIDENCE_LABELS = {
  store_close_status:['Store Close status',['unknown','confirmed_completed','not_completed','process_hung','batch_failed']],
  poll_files_status:['Passport poll XML status',['unknown','present_normal','missing','partial','present_suspected_bad','network_batch_only']],
  reports_status:['Store Close / Passport reports',['unknown','present','missing']],
  incomplete_data_submitted:['Incomplete data already submitted?',['unknown','no','yes']],
  host_status:['PDI Host status',['unknown','connected','disconnected','connecting']],
  xmlgateway_status:['XMLGateway / POSOutbox',['unknown','reachable_close_present','reachable_close_missing','unreachable','posoutbox_unavailable']],
  usb_adapter_status:['USB-to-Ethernet adapter',['unknown','present','missing_in_device_manager','physically_unplugged','reset_restored_path']],
  paperwork_lock_status:['Paperwork lock',['unknown','none','lock_reported','owner_identified']],
  power_event:['Recent power/network event',['unknown','no','yes']],
  sco_activity_during_close:['Transaction/SCO activity during close',['unknown','no','yes']],
  close_count:['Known number of closes',['unknown','one','more_than_one']]
};

export function renderTroubleshooting(container, caseData, context) {
  const { mode='guided', nextEvidenceField=null } = context;
  container.innerHTML = mode === 'guided' ? guidedHtml(caseData,nextEvidenceField) : techHtml(caseData,nextEvidenceField);
  bind(container,caseData,context);
}

function guidedHtml(c,nextField) {
  const completed = CHECKS.filter(s=>c.checks[s.id]?.result).map(s=>`<div class="completed-row"><b>✓ ${escapeHtml(s.title)}</b><span>${escapeHtml(c.checks[s.id].result)}</span></div>`).join('');
  const current = nextGuidedCheck(c);
  let currentHtml='';
  if (current) currentHtml = checkCard(c,current,true);
  else if (nextField) currentHtml = evidenceQuestion(c,nextField);
  else currentHtml = `<div class="panel guided-card"><span class="step-number">✓</span><h2>Core evidence captured</h2><p class="muted">Review the pattern signal and move to Resolve when you know the cause/fix. Technician Mode can expose all structured evidence fields.</p></div>`;
  return `${completed?`<div class="check-complete">${completed}</div>`:''}${currentHtml}${shouldShowGt(c)?`<div class="panel form-panel" style="margin-top:14px">${renderGtAnalysis(c,{compact:false})}</div>`:''}`;
}

function techHtml(c,nextField) {
  return `<div class="panel form-panel">
    <span class="eyebrow">STEP 2 • TECHNICIAN MODE</span><h2>Full evidence workspace</h2><p class="muted">All checks are visible. The pattern engine still treats matches as guidance, not diagnosis.</p>
    <div class="tech-grid">${CHECKS.map(s=>checkCard(c,s,false)).join('')}</div>
    <div class="section-divider"></div>
    <h2 style="font-size:18px">Structured Evidence</h2>
    <div class="tech-grid">${Object.entries(EVIDENCE_LABELS).map(([id,[label,values]])=>selectEvidence(c,id,label,values)).join('')}
      <div class="tech-section"><h3>Lock owner / process</h3><div class="field"><input data-evidence-text="lock_owner" value="${escapeHtml(c.evidence.lock_owner||'')}" placeholder="Optional"></div></div>
      <div class="tech-section"><h3>Timing</h3><div class="field"><label>Poll Day time</label><input type="datetime-local" data-evidence-text="poll_time" value="${escapeHtml(c.evidence.poll_time||'')}"></div><div class="field"><label>Latest Passport file time</label><input type="datetime-local" data-evidence-text="latest_file_time" value="${escapeHtml(c.evidence.latest_file_time||'')}"></div></div>
    </div>
    ${nextField?`<div class="evidence-question"><h3>Highest-value missing evidence</h3><p>${escapeHtml(nextField.label)} is currently unresolved and could change the top pattern ranking.</p></div>`:''}
    <div class="section-divider"></div>${renderGtAnalysis(c,{compact:false})}
  </div>`;
}

function checkCard(c,s,guided) {
  const value=c.checks[s.id]?.result||'';
  const notes=c.checks[s.id]?.notes||'';
  const extra=s.id==='poll'?`<div class="field full"><label>Exact message / error text</label><textarea data-check-message="poll" placeholder="Copy the exact message when possible.">${escapeHtml(c.checks.poll.message||'')}</textarea></div>`:'';
  return `<div class="${guided?'panel guided-card':'tech-section'}" data-check-card="${s.id}">
    ${guided?`<span class="step-number">${CHECKS.indexOf(s)+1}</span>`:''}<div class="card-kicker"><span class="safety-dot ${s.safety}"></span>${escapeHtml(safetyLabel(s.safety))}</div>
    <h2${guided?'':' style="font-size:16px;margin:6px 0"'}>${escapeHtml(s.title)}</h2><p class="muted">${escapeHtml(s.prompt)}</p>
    <div class="choice-grid">${s.choices.map(ch=>`<button type="button" class="choice-btn ${value===ch?'active':''}" data-check-choice="${s.id}" data-choice="${escapeHtml(ch)}">${escapeHtml(ch)}</button>`).join('')}</div>
    <div class="why-box" style="margin-top:12px"><b>Why this check?</b><br>${escapeHtml(s.why)}</div>
    <div class="form-grid" style="margin-top:12px">${extra}<div class="field full"><label>Notes</label><textarea data-check-notes="${s.id}" placeholder="Optional">${escapeHtml(notes)}</textarea></div></div>
    <div class="shot-section"><div class="shot-tools"><label class="btn secondary small file-btn">Add Screenshot<input data-shot-input="${s.id}" type="file" accept="image/*" multiple hidden></label></div><div data-shot-gallery="${s.id}">${screenshotGallery(c,s.id)}</div></div>
  </div>`;
}

function evidenceQuestion(c,field) {
  const meta=EVIDENCE_LABELS[field.id];
  if (!meta) return `<div class="panel guided-card"><h2>${escapeHtml(field.label)}</h2><p class="muted">Switch to Technician Mode to capture this evidence field.</p></div>`;
  const [label,values]=meta;
  return `<div class="panel guided-card"><span class="step-number">?</span><div class="card-kicker"><span class="safety-dot read_only"></span>Highest-value missing evidence</div><h2>${escapeHtml(label)}</h2><p class="muted">This answer can materially change which known pattern ranks highest.</p><div class="inline-choices">${values.filter(v=>v!=='unknown').map(v=>`<button type="button" class="pill-choice ${c.evidence[field.id]===v?'active':''}" data-evidence-choice="${field.id}" data-value="${v}">${escapeHtml(pretty(v))}</button>`).join('')}</div><button class="btn small" style="margin-top:10px" data-evidence-choice="${field.id}" data-value="unknown">Not sure</button></div>`;
}

function selectEvidence(c,id,label,values){return `<div class="tech-section"><h3>${escapeHtml(label)}</h3><div class="field"><select data-evidence-select="${id}">${values.map(v=>`<option value="${v}" ${c.evidence[id]===v?'selected':''}>${escapeHtml(pretty(v))}</option>`).join('')}</select></div></div>`}

function bind(root,c,context){
  root.querySelectorAll('[data-check-choice]').forEach(btn=>btn.addEventListener('click',()=>{
    const id=btn.dataset.checkChoice,value=btn.dataset.choice;c.checks[id].result=value;syncEvidenceFromCheck(c,id,value);context.onChange?.({timeline:{source:CHECKS.find(x=>x.id===id).title,text:value},rerender:true});
  }));
  root.querySelectorAll('[data-check-notes]').forEach(el=>el.addEventListener('input',()=>{c.checks[el.dataset.checkNotes].notes=el.value;context.onChange?.()}));
  root.querySelectorAll('[data-check-message]').forEach(el=>el.addEventListener('input',()=>{c.checks.poll.message=el.value;context.onChange?.()}));
  root.querySelectorAll('[data-shot-input]').forEach(input=>input.addEventListener('change',async()=>{await addScreenshots(c,input.dataset.shotInput,input.files);context.onChange?.({rerender:true})}));
  root.querySelectorAll('[data-shot-gallery]').forEach(g=>bindScreenshotGallery(g,c,opts=>context.onChange?.(opts)));
  root.querySelectorAll('[data-evidence-choice]').forEach(btn=>btn.addEventListener('click',()=>{c.evidence[btn.dataset.evidenceChoice]=btn.dataset.value;context.onChange?.({timeline:{source:'Evidence',text:`${pretty(btn.dataset.evidenceChoice)}: ${pretty(btn.dataset.value)}`},rerender:true})}));
  root.querySelectorAll('[data-evidence-select]').forEach(sel=>sel.addEventListener('change',()=>{c.evidence[sel.dataset.evidenceSelect]=sel.value;context.onChange?.({rerender:true})}));
  root.querySelectorAll('[data-evidence-text]').forEach(el=>el.addEventListener('input',()=>{c.evidence[el.dataset.evidenceText]=el.value;context.onChange?.()}));
  const gt=root.querySelector('#gtAnalysisBlock');if(gt)bindGtAnalysis(gt,c,{onChange:opts=>context.onChange?.(opts)});
}

function nextGuidedCheck(c){
  for (const id of ['paperwork','uploads','poll']) { const s=CHECKS.find(x=>x.id===id); if(!c.checks[id].result)return s; }
  const poll=c.checks.poll.result,uploads=c.checks.uploads.result;
  const needConnection=['Connection error','Timeout','No files available','Poll failed'].includes(poll)||['Nothing present','Network batch only'].includes(uploads);
  if(needConnection&&!c.checks.connection.result)return CHECKS.find(x=>x.id==='connection');
  const needGateway=(needConnection&&c.checks.connection.result==='Host is connected')||(['Nothing present','Network batch only'].includes(uploads)&&c.checks.connection.result!=='Disconnected');
  if(needGateway&&!c.checks.gateway.result)return CHECKS.find(x=>x.id==='gateway');
  return null;
}
function shouldShowGt(c){return c.overview.symptom==='Red Skipped Close'||['more_than_one','one'].includes(c.evidence.close_count)||c.evidence.gt_previous_ending!==''||c.evidence.skipped_close_amount!==''}
function syncEvidenceFromCheck(c,id,value){
  if(id==='uploads'){
    const map={'Normal poll files present':'present_normal','Network batch only':'network_batch_only','Nothing present':'missing','Files present but timestamps look wrong':'present_suspected_bad'};if(map[value])c.evidence.poll_files_status=map[value];
  }
  if(id==='poll'){
    if(value==='Store Close batch failed')c.evidence.store_close_status='batch_failed';
    if(value==='Lock / data error')c.evidence.paperwork_lock_status='lock_reported';
  }
  if(id==='connection'){
    const map={'Host is connected':'connected','Disconnected':'disconnected','Connecting':'connecting','Unknown / not checked':'unknown'};c.evidence.host_status=map[value]||c.evidence.host_status;
  }
  if(id==='gateway'){
    const map={'Mapped successfully; close is present':'reachable_close_present','Mapped successfully; close is missing':'reachable_close_missing','Could not reach XMLGateway IP':'unreachable','POSOutbox unavailable':'posoutbox_unavailable'};if(map[value])c.evidence.xmlgateway_status=map[value];
    if(value==='USB Ethernet adapter missing')c.evidence.usb_adapter_status='missing_in_device_manager';
  }
}
function pretty(v){return String(v||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
