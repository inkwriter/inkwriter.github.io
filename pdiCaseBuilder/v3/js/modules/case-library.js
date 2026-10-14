import { escapeHtml, fmtDate } from '../core/ui.js';

export function renderCaseLibrary(container,cases,{query='',status='',onOpen,onDuplicate,onDelete,onExport}){
  const q=query.trim().toLowerCase();let list=(cases||[]).slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
  if(q)list=list.filter(c=>JSON.stringify(c).toLowerCase().includes(q));
  if(status==='open')list=list.filter(c=>c.resolution?.resolved!=='Yes');
  if(status==='resolved')list=list.filter(c=>c.resolution?.resolved==='Yes');
  container.innerHTML=list.length?list.map(card).join(''):`<div class="empty-state">No matching saved cases.</div>`;
  container.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>onOpen?.(b.dataset.open)));
  container.querySelectorAll('[data-duplicate]').forEach(b=>b.addEventListener('click',()=>onDuplicate?.(b.dataset.duplicate)));
  container.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>onDelete?.(b.dataset.delete)));
  container.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',()=>onExport?.(b.dataset.export)));
}
function card(c){const tags=(c.resolution?.tags||[]).slice(0,4);const state=c.resolution?.resolved==='Yes'?'Resolved':'Open';return `<div class="case-card"><div><b>${escapeHtml(c.overview?.store||'Untitled case')}${c.overview?.site?` #${escapeHtml(c.overview.site)}`:''}${c.isDemo?' • Demo':''}</b><div class="meta">${escapeHtml(fmtDate(c.overview?.businessDate)||'No date')}${c.overview?.ticket?` • ${escapeHtml(c.overview.ticket)}`:''} • ${escapeHtml(c.overview?.symptom||'Unclassified')}</div><div class="tags"><span class="tag">${state}</span>${c.patternMatch?.patternName?`<span class="tag">${escapeHtml(c.patternMatch.patternName)}</span>`:''}${tags.map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div></div><div class="case-actions"><button class="btn small" data-open="${escapeHtml(c.id)}">Open</button><button class="btn small" data-duplicate="${escapeHtml(c.id)}">Duplicate</button><button class="btn small" data-export="${escapeHtml(c.id)}">Export</button><button class="btn small danger" data-delete="${escapeHtml(c.id)}">Delete</button></div></div>`}
