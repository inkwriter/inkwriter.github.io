import { escapeHtml, safetyLabel } from '../core/ui.js';

export function renderKnownPatterns(container, patterns, query=''){
  const q=query.trim().toLowerCase();const filtered=(patterns||[]).filter(p=>!q||JSON.stringify(p).toLowerCase().includes(q));
  container.innerHTML=filtered.length?filtered.map(patternCard).join(''):`<div class="empty-state">No matching patterns.</div>`;
}
function patternCard(p){return `<article class="panel pattern-tile"><div class="pattern-top"><div><span class="eyebrow">${escapeHtml(p.category)}</span><h3>${escapeHtml(p.name)}</h3></div><span class="confidence ${p.support_level==='strong'?'strong':'possible'}">${escapeHtml(p.support_level)} support</span></div><p>${escapeHtml(p.summary)}</p><div class="pattern-meta"><span class="meta-chip ${p.safety}">${escapeHtml(safetyLabel(p.safety))}</span><span class="meta-chip">Pattern signal ≠ diagnosis</span></div><div class="why-box"><b>Next safe step</b><br>${escapeHtml(p.next_safe_step)}</div><details><summary>Why this pattern exists</summary><div class="pattern-detail"><p>${escapeHtml(p.why)}</p><b>Recommended evidence</b><ul>${(p.recommended_evidence||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><b>Guardrails</b><ul>${(p.guardrails||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div></details></article>`}
