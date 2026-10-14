import { MAX_SCREENSHOT_DIMENSION, SCREENSHOT_JPEG_QUALITY } from '../config.js';
import { uid } from '../core/state.js';
import { escapeHtml, toast } from '../core/ui.js';

export async function addScreenshots(caseData, bucket, files) {
  const list = caseData.screenshots[bucket] ||= [];
  const accepted = Array.from(files || []).filter(f => f.type.startsWith('image/')).slice(0, 8);
  for (const file of accepted) {
    const image = await compressImage(file);
    list.push({ id: uid('shot'), name: file.name, caption: '', dataUrl: image.dataUrl, width: image.width, height: image.height, bytesApprox: image.bytesApprox, addedAt: new Date().toISOString() });
  }
  if (accepted.length) toast(`${accepted.length} screenshot${accepted.length === 1 ? '' : 's'} added`);
  return accepted.length;
}

export function screenshotGallery(caseData, bucket, { compact = false } = {}) {
  const shots = caseData.screenshots?.[bucket] || [];
  if (!shots.length) return '';
  return `<div class="shot-grid">${shots.map(s => `
    <div class="shot" data-shot-id="${escapeHtml(s.id)}" data-shot-bucket="${escapeHtml(bucket)}">
      <img src="${s.dataUrl}" alt="Troubleshooting screenshot">
      ${compact ? '' : `<input class="shot-caption" data-shot-id="${escapeHtml(s.id)}" data-shot-bucket="${escapeHtml(bucket)}" placeholder="Screenshot caption" value="${escapeHtml(s.caption || '')}">`}
      <div class="shot-footer"><span title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</span><button class="remove-shot" data-shot-id="${escapeHtml(s.id)}" data-shot-bucket="${escapeHtml(bucket)}" type="button" aria-label="Remove screenshot">×</button></div>
    </div>`).join('')}</div>`;
}

export function bindScreenshotGallery(root, caseData, onChange) {
  root.querySelectorAll('.shot-caption').forEach(input => input.addEventListener('input', () => {
    const shot = (caseData.screenshots[input.dataset.shotBucket] || []).find(s => s.id === input.dataset.shotId);
    if (shot) shot.caption = input.value;
    onChange?.();
  }));
  root.querySelectorAll('.remove-shot').forEach(btn => btn.addEventListener('click', () => {
    const bucket = btn.dataset.shotBucket;
    caseData.screenshots[bucket] = (caseData.screenshots[bucket] || []).filter(s => s.id !== btn.dataset.shotId);
    onChange?.({ rerender: true });
  }));
}

export function allScreenshots(caseData) {
  return Object.entries(caseData.screenshots || {}).flatMap(([bucket, shots]) => (shots || []).map(s => ({ ...s, bucket })));
}

async function compressImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_SCREENSHOT_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
  const out = canvas.toDataURL('image/jpeg', SCREENSHOT_JPEG_QUALITY);
  return { dataUrl: out, width, height, bytesApprox: Math.round((out.length - out.indexOf(',') - 1) * 0.75) };
}
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(file); }); }
function loadImage(src) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; }); }
