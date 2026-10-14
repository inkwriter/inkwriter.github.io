export function validateForFinalize(caseData) {
  const errors = [];
  const warnings = [];
  if (!caseData.overview?.businessDate) errors.push('Business date is required.');
  if (!caseData.overview?.symptom) errors.push('Select a symptom.');
  if (!caseData.overview?.reportedIssue?.trim()) warnings.push('Reported issue is blank.');
  if (!caseData.resolution?.rootCause?.trim()) warnings.push('Root cause has not been documented.');
  if (!caseData.resolution?.fix?.trim()) warnings.push('Resolution/fix has not been documented.');
  if (caseData.resolution?.resolved === 'Yes' && !(caseData.resolution?.verificationChecks || []).length) warnings.push('Case is marked resolved but no verification checks are selected.');
  return { valid: errors.length === 0, errors, warnings };
}

export function caseProgress(caseData) {
  let completed = 0;
  const total = 8;
  if (caseData.overview?.symptom) completed++;
  if (caseData.overview?.reportedIssue?.trim()) completed++;
  if (caseData.checks?.paperwork?.result) completed++;
  if (caseData.checks?.uploads?.result) completed++;
  if (caseData.checks?.poll?.result) completed++;
  if (caseData.patternMatch?.patternId || caseData.checks?.connection?.result || caseData.checks?.gateway?.result) completed++;
  if (caseData.resolution?.rootCause?.trim() || caseData.resolution?.fix?.trim()) completed++;
  if ((caseData.resolution?.verificationChecks || []).length || caseData.resolution?.resolved === 'Yes') completed++;
  return { completed, total, percent: Math.round((completed / total) * 100) };
}
