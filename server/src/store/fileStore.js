import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS, DEFAULT_AUTOMATIONS } from './defaults.js';

const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

// JSON-file-backed store. Zero-dependency persistence for local dev and the
// default deploy; the Postgres store implements the same interface.
export class FileStore {
  constructor(file = STATE_FILE) {
    this.file = file;
    this.state = this.#load();
  }

  #load() {
    try {
      return JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      return {
        settings: structuredClone(DEFAULT_SETTINGS),
        automations: structuredClone(DEFAULT_AUTOMATIONS),
        candidates: [],
        automationLog: [],
        alerts: [],
        seq: 1,
      };
    }
  }

  #save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2));
  }

  async init() { return this; }

  nextId(prefix) { return `${prefix}-${this.state.seq++}`; }

  // ── settings ──
  async getSettings() {
    return { ...structuredClone(DEFAULT_SETTINGS), ...this.state.settings };
  }
  async updateSettings(patch) {
    this.state.settings = { ...this.state.settings, ...patch };
    this.#save();
    return this.getSettings();
  }

  // ── automations ──
  async listAutomations() { return this.state.automations; }
  async setAutomation(id, patch) {
    const a = this.state.automations.find((x) => x.id === id);
    if (!a) return null;
    Object.assign(a, patch);
    this.#save();
    return a;
  }

  // ── automation log ──
  async appendLog(entry) {
    const row = { id: this.nextId('log'), at: new Date().toISOString(), ...entry };
    this.state.automationLog.unshift(row);
    this.state.automationLog = this.state.automationLog.slice(0, 500);
    this.#save();
    return row;
  }
  async listLog(limit = 100) { return this.state.automationLog.slice(0, limit); }

  // ── research candidates ──
  async listCandidates() { return this.state.candidates; }
  async addCandidate(candidate) {
    const row = { id: this.nextId('cand'), savedAt: new Date().toISOString(), notes: '', ...candidate };
    this.state.candidates.unshift(row);
    this.#save();
    return row;
  }
  async updateCandidate(id, patch) {
    const c = this.state.candidates.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    this.#save();
    return c;
  }
  async removeCandidate(id) {
    const before = this.state.candidates.length;
    this.state.candidates = this.state.candidates.filter((x) => x.id !== id);
    this.#save();
    return this.state.candidates.length < before;
  }

  // ── alerts (deduped on `key`) ──
  async upsertAlert(alert) {
    const existing = this.state.alerts.find((a) => a.key === alert.key && !a.resolvedAt);
    if (existing) {
      Object.assign(existing, { ...alert, lastSeenAt: new Date().toISOString() });
      this.#save();
      return { alert: existing, created: false };
    }
    const row = { id: this.nextId('al'), createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), resolvedAt: null, ...alert };
    this.state.alerts.unshift(row);
    this.state.alerts = this.state.alerts.slice(0, 200);
    this.#save();
    return { alert: row, created: true };
  }
  async listAlerts({ includeResolved = false } = {}) {
    return this.state.alerts.filter((a) => includeResolved || !a.resolvedAt);
  }
  async resolveAlert(id) {
    const a = this.state.alerts.find((x) => x.id === id);
    if (!a) return null;
    a.resolvedAt = new Date().toISOString();
    this.#save();
    return a;
  }
}
