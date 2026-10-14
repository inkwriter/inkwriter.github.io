const EPSILON = 0.02;

export function buildFacts(caseData) {
  const c = caseData || {};
  const checks = c.checks || {};
  const evidence = c.evidence || {};
  const textParts = [
    c.overview?.reportedIssue,
    checks.paperwork?.notes,
    checks.uploads?.notes,
    checks.poll?.message,
    checks.poll?.notes,
    checks.connection?.notes,
    checks.gateway?.notes
  ].filter(Boolean);
  return {
    symptom: c.overview?.symptom || '',
    text: textParts.join(' | ').toLowerCase(),
    choices: {
      paperwork: checks.paperwork?.result || '',
      uploads: checks.uploads?.result || '',
      poll: checks.poll?.result || '',
      connection: checks.connection?.result || '',
      gateway: checks.gateway?.result || ''
    },
    evidence,
    gt: {
      previous: toNumber(evidence.gt_previous_ending),
      beginning: toNumber(evidence.gt_current_beginning),
      ending: toNumber(evidence.gt_current_ending),
      skipped: toNumber(evidence.skipped_close_amount)
    }
  };
}

export function evaluatePatterns(caseData, patterns = []) {
  const facts = buildFacts(caseData);
  const results = patterns.map(pattern => scorePattern(pattern, facts))
    .filter(result => result.score >= Math.min(result.pattern.possible_score ?? Infinity, result.pattern.strong_score ?? Infinity))
    .sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length || a.pattern.name.localeCompare(b.pattern.name));
  return results;
}

export function scorePattern(pattern, facts) {
  let score = 0;
  const reasons = [];
  for (const rule of pattern.match_rules || []) {
    const match = evaluateRule(rule, facts);
    if (!match.matched) continue;
    score += Number(rule.weight || 0);
    if (rule.weight > 0) reasons.push(match.label || describeRule(rule));
  }
  score = Math.max(0, score);
  let confidence = 'none';
  if (score >= (pattern.strong_score ?? Infinity)) confidence = 'strong';
  else if (score >= (pattern.possible_score ?? Infinity)) confidence = 'possible';
  return { pattern, score, confidence, reasons };
}

export function chooseNextEvidenceField(caseData, results, schema) {
  const fields = schema?.fields || [];
  const byId = Object.fromEntries(fields.map(f => [f.id, f]));
  const evidence = caseData?.evidence || {};
  const skipped = new Set(caseData?.workflow?.skippedEvidence || []);
  const top = results?.[0]?.pattern;
  const preferred = top?.recommended_fields || [];
  for (const fieldId of preferred) {
    const field = byId[fieldId];
    if (field && !skipped.has(fieldId) && isMissing(field, evidence[fieldId])) return field;
  }
  const fallback = ['store_close_status','poll_files_status','host_status','paperwork_lock_status','xmlgateway_status'];
  for (const fieldId of fallback) {
    const field = byId[fieldId];
    if (field && !skipped.has(fieldId) && isMissing(field, evidence[fieldId])) return field;
  }
  return null;
}

function isMissing(field, value) {
  if (field.type === 'text') return !String(value || '').trim();
  if (field.type === 'money' || field.type === 'datetime') return value === '' || value === null || value === undefined;
  return !value || value === 'unknown';
}

function evaluateRule(rule, facts) {
  switch (rule.type) {
    case 'text_any': {
      const hit = (rule.values || []).find(v => facts.text.includes(String(v).toLowerCase()));
      return { matched: Boolean(hit), label: hit ? `Case notes mention “${hit}”` : '' };
    }
    case 'symptom_any': {
      const hit = (rule.values || []).find(v => normalized(facts.symptom) === normalized(v));
      return { matched: Boolean(hit), label: hit ? `Symptom is ${facts.symptom}` : '' };
    }
    case 'choice_any': {
      const actual = facts.choices?.[rule.step] || '';
      const hit = (rule.values || []).find(v => normalized(actual) === normalized(v));
      return { matched: Boolean(hit), label: hit ? `${pretty(rule.step)} result: ${actual}` : '' };
    }
    case 'field_equals': {
      const actual = facts.evidence?.[rule.field];
      return { matched: normalized(actual) === normalized(rule.value), label: rule.label || `${pretty(rule.field)} = ${pretty(rule.value)}` };
    }
    case 'gt_rule': return evaluateGtRule(rule, facts.gt);
    case 'timing_rule': return evaluateTimingRule(rule, facts.evidence || {});
    default: return { matched: false, label: '' };
  }
}

function evaluateGtRule(rule, gt) {
  if (rule.rule === 'current_beginning_equals_twice_previous_ending') {
    const matched = valid(gt.previous, gt.beginning) && approx(gt.beginning, gt.previous * 2);
    return { matched, label: matched ? 'Affected-day GT Beginning ≈ 2 × previous-day GT Ending' : '' };
  }
  if (rule.rule === 'skipped_close_equals_previous_ending') {
    const matched = valid(gt.previous, gt.skipped) && approx(gt.skipped, gt.previous);
    return { matched, label: matched ? 'Skipped Close ≈ previous-day GT Ending' : '' };
  }
  return { matched: false, label: '' };
}

function evaluateTimingRule(rule, evidence) {
  if (rule.rule !== 'poll_before_latest_file') return { matched: false, label: '' };
  const poll = dateValue(evidence.poll_time);
  const latest = dateValue(evidence.latest_file_time);
  const matched = poll && latest && poll < latest;
  return { matched: Boolean(matched), label: matched ? 'Poll Day occurred before the latest Passport file timestamp' : '' };
}

function dateValue(v) { const t = Date.parse(v || ''); return Number.isFinite(t) ? t : null; }
function toNumber(v) { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(/[$,]/g,'')); return Number.isFinite(n) ? n : null; }
function valid(...nums) { return nums.every(n => typeof n === 'number' && Number.isFinite(n)); }
function approx(a,b) { const scale = Math.max(1, Math.abs(a), Math.abs(b)); return Math.abs(a-b) <= Math.max(EPSILON, scale * 0.000001); }
function normalized(v) { return String(v ?? '').trim().toLowerCase(); }
function pretty(v) { return String(v || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()); }
function describeRule(rule) { return rule.label || rule.type.replace(/_/g,' '); }
