import { fmtDate, fmtMoney } from '../core/ui.js';

export function buildAiHandoff(caseData) {
  const c = caseData;
  const lines = [];
  lines.push('PDI CASE BUILDER — CHATGPT HANDOFF');
  lines.push('');
  lines.push('Use the attached PDI Support Playbook as the primary source of truth for this environment if it is provided. Diagnose from evidence before recommending changes. Ask for the single highest-value missing evidence when needed. Label conclusions Confirmed, Likely, Possible, or Unknown. Do not recommend DRIMP deletion, manual GT correction, Office Use Only adjustment, repeated Store Close, or production-server restart/shutdown merely to clear an error.');
  lines.push('');
  add(lines, 'Store / Location', c.overview.store);
  add(lines, 'Site', c.overview.site);
  add(lines, 'Ticket', c.overview.ticket);
  add(lines, 'Business date', fmtDate(c.overview.businessDate));
  add(lines, 'Symptom', c.overview.symptom);
  add(lines, 'Reported issue', c.overview.reportedIssue);
  lines.push('');
  lines.push('EVIDENCE COLLECTED');
  add(lines, 'Shared paperwork', c.checks.paperwork.result);
  add(lines, 'Paperwork notes', c.checks.paperwork.notes);
  add(lines, 'Enterprise Uploads', c.checks.uploads.result);
  add(lines, 'Uploads notes', c.checks.uploads.notes);
  add(lines, 'Poll attempt', c.checks.poll.result);
  add(lines, 'Exact poll message', c.checks.poll.message);
  add(lines, 'Poll notes', c.checks.poll.notes);
  add(lines, 'PDI Host', c.checks.connection.result || enumLabel(c.evidence.host_status));
  add(lines, 'Connection notes', c.checks.connection.notes);
  add(lines, 'XMLGateway / POSOutbox', c.checks.gateway.result || enumLabel(c.evidence.xmlgateway_status));
  add(lines, 'Gateway notes', c.checks.gateway.notes);
  structuredEvidence(lines, c.evidence);
  gtEvidence(lines, c.evidence);
  const shots = Object.values(c.screenshots || {}).reduce((n, list) => n + (list?.length || 0), 0);
  add(lines, 'Screenshots attached in Case Builder', shots ? `${shots} (upload the relevant screenshots or exported case PDF to ChatGPT when visual evidence matters)` : 'None');
  lines.push('');
  lines.push('CASE BUILDER PATTERN SIGNAL');
  if (c.patternMatch?.patternId) {
    add(lines, 'Suggested pattern', c.patternMatch.patternName);
    add(lines, 'Pattern confidence', c.patternMatch.confidence);
    add(lines, 'Pattern score', String(c.patternMatch.score));
    if (c.patternMatch.reasons?.length) lines.push(`Why it surfaced: ${c.patternMatch.reasons.join('; ')}`);
    lines.push('Important: This is a pattern signal, not a diagnosis. Independently verify the evidence.');
  } else {
    lines.push('No known pattern currently matches strongly enough.');
  }
  if (c.timeline?.length) {
    lines.push('');
    lines.push('ACTIONS / TIMELINE');
    c.timeline.slice(-12).forEach((item, i) => lines.push(`${i + 1}. ${item.source}: ${item.text}`));
  }
  lines.push('');
  lines.push('Please identify the safest next troubleshooting step. If evidence is insufficient, ask for only the single highest-value missing piece of evidence first.');
  return lines.join('\n');
}

function add(lines, label, value) { if (value !== '' && value !== null && value !== undefined) lines.push(`${label}: ${value}`); }
function enumLabel(v) { return v && v !== 'unknown' ? v.replace(/_/g,' ') : ''; }
function structuredEvidence(lines, e) {
  const entries = [
    ['Store Close status',e.store_close_status],['Poll XML status',e.poll_files_status],['Reports status',e.reports_status],
    ['Incomplete data submitted',e.incomplete_data_submitted],['USB Ethernet adapter',e.usb_adapter_status],
    ['Paperwork lock',e.paperwork_lock_status],['Lock owner/process',e.lock_owner],['Recent power/network event',e.power_event],
    ['SCO/transaction during close',e.sco_activity_during_close],['Known close count',e.close_count],['Poll time',e.poll_time],['Latest file time',e.latest_file_time]
  ];
  for (const [label,value] of entries) if (value && value !== 'unknown') add(lines,label,String(value).replace(/_/g,' '));
}
function gtEvidence(lines,e) {
  const vals = [['Previous GT Ending',e.gt_previous_ending],['Affected GT Beginning',e.gt_current_beginning],['Affected GT Ending',e.gt_current_ending],['Skipped Close',e.skipped_close_amount]];
  for (const [label,v] of vals) if (v !== '' && v !== null && v !== undefined) add(lines,label,fmtMoney(v));
}
