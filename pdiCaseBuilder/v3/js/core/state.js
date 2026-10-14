import { APP_VERSION, PATTERN_LIBRARY_VERSION, EVIDENCE_SCHEMA_VERSION } from '../config.js';

export function localDateISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function uid(prefix = 'case') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyCase() {
  return {
    schemaVersion: '3.0',
    id: uid(),
    appVersion: APP_VERSION,
    patternLibraryVersion: PATTERN_LIBRARY_VERSION,
    evidenceSchemaVersion: EVIDENCE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDemo: false,
    workflow: {
      currentStep: 'intake',
      mode: 'guided',
      skippedEvidence: []
    },
    overview: {
      store: '',
      site: '',
      ticket: '',
      businessDate: localDateISO(),
      symptom: '',
      reportedIssue: ''
    },
    checks: {
      paperwork: { result: '', notes: '' },
      uploads: { result: '', notes: '' },
      poll: { result: '', message: '', notes: '' },
      connection: { result: '', notes: '' },
      gateway: { result: '', notes: '' }
    },
    evidence: {
      store_close_status: 'unknown',
      poll_files_status: 'unknown',
      reports_status: 'unknown',
      incomplete_data_submitted: 'unknown',
      host_status: 'unknown',
      xmlgateway_status: 'unknown',
      usb_adapter_status: 'unknown',
      paperwork_lock_status: 'unknown',
      lock_owner: '',
      power_event: 'unknown',
      sco_activity_during_close: 'unknown',
      close_count: 'unknown',
      poll_time: '',
      latest_file_time: '',
      gt_previous_ending: '',
      gt_current_beginning: '',
      gt_current_ending: '',
      skipped_close_amount: ''
    },
    screenshots: {
      intake: [], paperwork: [], uploads: [], poll: [], connection: [], gateway: [], gt: [], resolution: []
    },
    patternMatch: {
      evaluatedAt: null,
      patternId: '',
      patternName: '',
      confidence: 'none',
      score: 0,
      reasons: [],
      alternatives: []
    },
    resolution: {
      rootCauseCategory: '',
      confidence: 'Unknown',
      rootCause: '',
      fix: '',
      verificationNotes: '',
      verificationChecks: [],
      preventable: 'Unknown',
      repeatIssue: 'Unknown',
      suggestionAccuracy: 'Unknown',
      documentationUpdate: 'No',
      resolved: 'No',
      newLearning: '',
      tags: []
    },
    timeline: []
  };
}

class CaseStore extends EventTarget {
  constructor() {
    super();
    this.caseData = createEmptyCase();
    this.patterns = [];
    this.evidenceSchema = null;
    this.demoCases = [];
  }
  getCase() { return this.caseData; }
  setCase(data, silent = false) {
    this.caseData = normalizeCase(data);
    if (!silent) this.emit('case');
  }
  patch(path, value, { timeline = null } = {}) {
    const parts = path.split('.');
    let target = this.caseData;
    while (parts.length > 1) {
      const key = parts.shift();
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    }
    target[parts[0]] = value;
    this.caseData.updatedAt = new Date().toISOString();
    if (timeline) this.addTimeline(timeline.source, timeline.text, false);
    this.emit('case');
  }
  addTimeline(source, text, emit = true) {
    if (!text) return;
    const last = this.caseData.timeline.at(-1);
    if (last?.source === source && last?.text === text) return;
    this.caseData.timeline.push({ ts: new Date().toISOString(), source, text });
    if (emit) this.emit('case');
  }
  setPatterns(patterns) { this.patterns = patterns || []; this.emit('patterns'); }
  setEvidenceSchema(schema) { this.evidenceSchema = schema; this.emit('schema'); }
  setDemoCases(cases) { this.demoCases = cases || []; this.emit('demos'); }
  newCase() { this.caseData = createEmptyCase(); this.emit('case'); }
  subscribe(event, fn) { this.addEventListener(event, fn); return () => this.removeEventListener(event, fn); }
  emit(event) { this.dispatchEvent(new CustomEvent(event, { detail: this.caseData })); }
}

export function normalizeCase(raw) {
  const base = createEmptyCase();
  if (!raw || typeof raw !== 'object') return base;
  const merged = globalThis.structuredClone ? globalThis.structuredClone(base) : JSON.parse(JSON.stringify(base));
  deepMerge(merged, raw);
  merged.schemaVersion = '3.0';
  merged.appVersion ||= APP_VERSION;
  merged.patternLibraryVersion ||= PATTERN_LIBRARY_VERSION;
  merged.evidenceSchemaVersion ||= EVIDENCE_SCHEMA_VERSION;
  merged.overview ||= base.overview;
  merged.checks ||= base.checks;
  merged.evidence ||= base.evidence;
  merged.screenshots ||= base.screenshots;
  merged.patternMatch ||= base.patternMatch;
  merged.resolution ||= base.resolution;
  merged.timeline ||= [];
  merged.workflow ||= base.workflow;
  if (!Array.isArray(merged.workflow.skippedEvidence)) merged.workflow.skippedEvidence = [];
  return merged;
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

export const caseStore = new CaseStore();
