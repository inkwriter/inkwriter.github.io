import { DB_NAME, DB_VERSION, CASE_STORE } from '../config.js';
import { normalizeCase } from './state.js';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CASE_STORE)) {
        const store = db.createObjectStore(CASE_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCase(caseData) {
  const db = await openDb();
  const data = normalizeCase(caseData);
  data.updatedAt = new Date().toISOString();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readwrite');
    tx.objectStore(CASE_STORE).put(data);
    tx.oncomplete = () => resolve(data);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCases() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readonly');
    const req = tx.objectStore(CASE_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).map(normalizeCase));
    req.onerror = () => reject(req.error);
  });
}

export async function getCase(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readonly');
    const req = tx.objectStore(CASE_STORE).get(id);
    req.onsuccess = () => resolve(req.result ? normalizeCase(req.result) : null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCase(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CASE_STORE, 'readwrite');
    tx.objectStore(CASE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function importCases(items) {
  const list = Array.isArray(items) ? items : [];
  for (const item of list) await saveCase(normalizeCase(item));
  return list.length;
}
