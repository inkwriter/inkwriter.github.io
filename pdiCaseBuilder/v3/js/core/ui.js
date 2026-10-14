export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
export function fmtDate(value) {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[2])}/${Number(m[3])}/${m[1]}` : value;
}
export function fmtMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) : '';
}
export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove('show'), 2200);
}
export function showModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalBackdrop').classList.remove('hidden');
}
export function closeModal() { document.getElementById('modalBackdrop').classList.add('hidden'); }
export function safeName(value) {
  return String(value || 'Untitled').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Untitled';
}
export function readValue(id) { return document.getElementById(id)?.value?.trim?.() ?? ''; }
export function safetyLabel(key) {
  return ({read_only:'Read Only',changes_something:'Changes Something',advanced:'Advanced'})[key] || 'Read Only';
}
