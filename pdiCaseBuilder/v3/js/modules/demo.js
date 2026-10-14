import { escapeHtml } from '../core/ui.js';
import { createEmptyCase, normalizeCase } from '../core/state.js';

export function renderDemoList(container,cases,onLoad){container.innerHTML=(cases||[]).map(d=>`<div class="demo-case"><div><b>${escapeHtml(d.name)}</b><p>${escapeHtml(d.description)}</p></div><button class="btn small secondary" data-demo="${escapeHtml(d.id)}">Load Demo</button></div>`).join('');container.querySelectorAll('[data-demo]').forEach(btn=>btn.addEventListener('click',()=>onLoad?.(makeDemo(cases.find(x=>x.id===btn.dataset.demo)))))}
export function makeDemo(def){const base=createEmptyCase();const merged=normalizeCase({...base,...(def?.case||{})});merged.id=`demo-${Date.now()}`;merged.isDemo=true;merged.createdAt=new Date().toISOString();merged.updatedAt=new Date().toISOString();return merged}
