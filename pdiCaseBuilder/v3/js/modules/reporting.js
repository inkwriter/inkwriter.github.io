import { escapeHtml, fmtDate, fmtMoney } from '../core/ui.js';
import { allScreenshots } from './screenshots.js';

export function buildHumanReportHtml(c) {
  const rows=[]; add(rows,'Store / Location',c.overview.store);add(rows,'Site',c.overview.site);add(rows,'Ticket',c.overview.ticket);add(rows,'Business Date',fmtDate(c.overview.businessDate));add(rows,'Symptom',c.overview.symptom);
  const evidence=[];
  add(evidence,'Shared Paperwork',c.checks.paperwork.result);add(evidence,'Enterprise Uploads',c.checks.uploads.result);add(evidence,'Poll Result',c.checks.poll.result);add(evidence,'Poll Message',c.checks.poll.message);add(evidence,'PDI Host',c.checks.connection.result);add(evidence,'XMLGateway / POSOutbox',c.checks.gateway.result);
  addEvidence(evidence,c.evidence);
  const screenshots=allScreenshots(c);
  return `<div class="report-preview"><h2>PDI Troubleshooting Case${c.overview.store?` — ${escapeHtml(c.overview.store)}`:''}</h2>
    ${section('Case Summary',list(rows))}
    ${c.overview.reportedIssue?section('Reported Issue',`<p>${nl(c.overview.reportedIssue)}</p>`):''}
    ${section('Evidence',list(evidence))}
    ${c.patternMatch?.patternId?section('Case Builder Pattern Signal',`<p><b>${escapeHtml(c.patternMatch.patternName)}</b> — ${escapeHtml(c.patternMatch.confidence)} confidence (score ${escapeHtml(c.patternMatch.score)})</p>${c.patternMatch.reasons?.length?`<ul>${c.patternMatch.reasons.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}<p><i>Pattern signal only; not a diagnosis.</i></p>`):''}
    ${section('Diagnosis',list([['Root Cause Category',c.resolution.rootCauseCategory],['Cause Confidence',c.resolution.confidence],['Root Cause',c.resolution.rootCause]]))}
    ${section('Resolution',list([['Fix',c.resolution.fix],['Verification Notes',c.resolution.verificationNotes],['Resolved',c.resolution.resolved]]))}
    ${(c.resolution.verificationChecks||[]).length?section('Verification Checklist',`<ul>${c.resolution.verificationChecks.map(x=>`<li>✓ ${escapeHtml(x)}</li>`).join('')}</ul>`):''}
    ${section('Prevention & Learning',list([['Preventable',c.resolution.preventable],['Repeat Issue',c.resolution.repeatIssue],['Builder Suggestion Accurate',c.resolution.suggestionAccuracy],['Documentation Update Recommended',c.resolution.documentationUpdate],['New Learning',c.resolution.newLearning],['Tags',(c.resolution.tags||[]).join(', ')]]))}
    ${screenshots.length?section('Screenshots',screenshots.map(s=>`<div class="report-shot"><img src="${s.dataUrl}" alt="Case screenshot">${s.caption?`<p><b>${escapeHtml(s.bucket)}:</b> ${escapeHtml(s.caption)}</p>`:''}</div>`).join('')):''}
    ${c.timeline?.length?section('Troubleshooting Timeline',`<ol>${c.timeline.map(x=>`<li><b>${escapeHtml(x.source)}:</b> ${escapeHtml(x.text)}</li>`).join('')}</ol>`):''}
    <p style="font-size:11px;color:#66758b">Created with PDI Case Builder ${escapeHtml(c.appVersion)} • Pattern Library ${escapeHtml(c.patternLibraryVersion)}</p>
  </div>`;
}

export function buildHumanReportText(c){
  const lines=[];lines.push(`PDI Troubleshooting Case${c.overview.store?' — '+c.overview.store:''}`);addText(lines,'Store / Location',c.overview.store);addText(lines,'Site',c.overview.site);addText(lines,'Ticket',c.overview.ticket);addText(lines,'Business Date',fmtDate(c.overview.businessDate));addText(lines,'Symptom',c.overview.symptom);if(c.overview.reportedIssue)lines.push(`\nReported Issue\n${c.overview.reportedIssue}`);
  lines.push('\nEvidence');[['Shared Paperwork',c.checks.paperwork.result],['Enterprise Uploads',c.checks.uploads.result],['Poll Result',c.checks.poll.result],['Poll Message',c.checks.poll.message],['PDI Host',c.checks.connection.result],['XMLGateway / POSOutbox',c.checks.gateway.result]].forEach(([k,v])=>addText(lines,k,v));addEvidenceText(lines,c.evidence);
  if(c.patternMatch?.patternId){lines.push('\nCase Builder Pattern Signal');addText(lines,'Suggested Pattern',c.patternMatch.patternName);addText(lines,'Pattern Confidence',c.patternMatch.confidence);addText(lines,'Pattern Score',c.patternMatch.score);if(c.patternMatch.reasons?.length)lines.push(...c.patternMatch.reasons.map(x=>'- '+x));lines.push('Pattern signal only; not a diagnosis.');}
  lines.push('\nDiagnosis');addText(lines,'Root Cause Category',c.resolution.rootCauseCategory);addText(lines,'Cause Confidence',c.resolution.confidence);addText(lines,'Root Cause',c.resolution.rootCause);
  lines.push('\nResolution');addText(lines,'Fix',c.resolution.fix);addText(lines,'Verification Notes',c.resolution.verificationNotes);addText(lines,'Resolved',c.resolution.resolved);if(c.resolution.verificationChecks?.length)lines.push('Verification: '+c.resolution.verificationChecks.join('; '));
  lines.push('\nPrevention & Learning');addText(lines,'Preventable',c.resolution.preventable);addText(lines,'Repeat Issue',c.resolution.repeatIssue);addText(lines,'Builder Suggestion Accurate',c.resolution.suggestionAccuracy);addText(lines,'Documentation Update Recommended',c.resolution.documentationUpdate);addText(lines,'New Learning',c.resolution.newLearning);addText(lines,'Tags',(c.resolution.tags||[]).join(', '));
  const shots=allScreenshots(c);if(shots.length)lines.push(`\nScreenshots\n${shots.length} attached to the case report.`);if(c.timeline?.length){lines.push('\nTroubleshooting Timeline',...c.timeline.map((x,i)=>`${i+1}. ${x.source}: ${x.text}`));}
  lines.push(`\nCreated with PDI Case Builder ${c.appVersion} • Pattern Library ${c.patternLibraryVersion}`);return lines.join('\n');
}
function add(rows,k,v){if(v!==''&&v!==null&&v!==undefined&&v!=='unknown')rows.push([k,String(v).replace(/_/g,' ')])}
function addText(lines,k,v){if(v!==''&&v!==null&&v!==undefined&&v!=='unknown')lines.push(`${k}: ${String(v).replace(/_/g,' ')}`)}
function list(rows){return rows.length?`<ul>${rows.map(([k,v])=>`<li><b>${escapeHtml(k)}:</b> ${nl(v)}</li>`).join('')}</ul>`:''}
function section(title,html){return html?`<section><h3>${escapeHtml(title)}</h3>${html}</section>`:''}
function nl(v){return escapeHtml(v).replace(/\n/g,'<br>')}
function addEvidence(rows,e){[['Store Close Status',e.store_close_status],['Poll XML Status',e.poll_files_status],['Reports Status',e.reports_status],['Incomplete Data Submitted',e.incomplete_data_submitted],['Host Status',e.host_status],['XMLGateway Status',e.xmlgateway_status],['USB Adapter Status',e.usb_adapter_status],['Paperwork Lock',e.paperwork_lock_status],['Lock Owner / Process',e.lock_owner],['Recent Power/Network Event',e.power_event],['SCO / Transaction During Close',e.sco_activity_during_close],['Close Count',e.close_count],['Poll Time',e.poll_time],['Latest File Time',e.latest_file_time]].forEach(([k,v])=>add(rows,k,v));[['Previous GT Ending',e.gt_previous_ending],['Affected GT Beginning',e.gt_current_beginning],['Affected GT Ending',e.gt_current_ending],['Skipped Close',e.skipped_close_amount]].forEach(([k,v])=>{if(v!==''&&v!=null)add(rows,k,fmtMoney(v))})}
function addEvidenceText(lines,e){const rows=[];addEvidence(rows,e);rows.forEach(([k,v])=>addText(lines,k,v))}
