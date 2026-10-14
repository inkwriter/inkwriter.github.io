import { safeName } from '../core/ui.js';

export function downloadBlob(filename, blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 400);
}

export function exportCaseJson(caseData) {
  const filename = `PDI_Case_${safeName(caseData.overview.store)}_${caseData.overview.businessDate || 'undated'}.json`;
  downloadBlob(filename, new Blob([JSON.stringify(caseData, null, 2)], { type: 'application/json' }));
}

export function exportCaseCsv(caseData) {
  const c = caseData;
  const headers = ['case_id','store','site','ticket','business_date','symptom','suggested_pattern','pattern_confidence','suggestion_accuracy','root_cause_category','root_cause_confidence','root_cause','resolution','resolved','preventable','repeat_issue','documentation_update','tags','app_version','pattern_library_version','updated_at'];
  const row = [c.id,c.overview.store,c.overview.site,c.overview.ticket,c.overview.businessDate,c.overview.symptom,c.patternMatch.patternId,c.patternMatch.confidence,c.resolution.suggestionAccuracy,c.resolution.rootCauseCategory,c.resolution.confidence,c.resolution.rootCause,c.resolution.fix,c.resolution.resolved,c.resolution.preventable,c.resolution.repeatIssue,c.resolution.documentationUpdate,(c.resolution.tags||[]).join('|'),c.appVersion,c.patternLibraryVersion,c.updatedAt];
  const quote = v => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = `${headers.map(quote).join(',')}\n${row.map(quote).join(',')}\n`;
  const filename = `PDI_Case_${safeName(c.overview.store)}_${c.overview.businessDate || 'undated'}.csv`;
  downloadBlob(filename, new Blob([csv], { type: 'text/csv' }));
}

export function exportText(caseData, text) {
  const filename = `PDI_Case_${safeName(caseData.overview.store)}_${caseData.overview.businessDate || 'undated'}.txt`;
  downloadBlob(filename, new Blob([text], { type: 'text/plain' }));
}

export function exportArchive(cases) {
  const payload = { schemaVersion: '3.0', exportedAt: new Date().toISOString(), cases };
  downloadBlob(`PDI_Case_Archive_${new Date().toISOString().slice(0,10)}.json`, new Blob([JSON.stringify(payload,null,2)], { type: 'application/json' }));
}
