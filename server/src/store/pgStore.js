import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS, DEFAULT_AUTOMATIONS } from './defaults.js';

const SCHEMA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

// Postgres-backed store — same interface as FileStore.
export class PgStore {
  constructor(databaseUrl) {
    this.pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  }

  async init() {
    await this.pool.query(fs.readFileSync(SCHEMA, 'utf8'));
    await this.pool.query(
      `INSERT INTO settings (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(DEFAULT_SETTINGS)],
    );
    for (const a of DEFAULT_AUTOMATIONS) {
      await this.pool.query(
        `INSERT INTO automations (id, name, description, enabled, interval_minutes)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.name, a.description, a.enabled, a.intervalMinutes],
      );
    }
    return this;
  }

  async getSettings() {
    const { rows } = await this.pool.query(`SELECT data FROM settings WHERE id = 1`);
    return { ...DEFAULT_SETTINGS, ...(rows[0]?.data ?? {}) };
  }

  async updateSettings(patch) {
    await this.pool.query(
      `UPDATE settings SET data = data || $1::jsonb, updated_at = now() WHERE id = 1`,
      [JSON.stringify(patch)],
    );
    return this.getSettings();
  }

  async listAutomations() {
    const { rows } = await this.pool.query(`SELECT * FROM automations ORDER BY id`);
    return rows.map((r) => ({
      id: r.id, name: r.name, description: r.description, enabled: r.enabled,
      intervalMinutes: r.interval_minutes, lastRunAt: r.last_run_at, lastStatus: r.last_status,
    }));
  }

  async setAutomation(id, patch) {
    const { rows } = await this.pool.query(
      `UPDATE automations SET
         enabled = COALESCE($2, enabled),
         last_run_at = COALESCE($3, last_run_at),
         last_status = COALESCE($4, last_status)
       WHERE id = $1 RETURNING *`,
      [id, patch.enabled ?? null, patch.lastRunAt ?? null, patch.lastStatus ?? null],
    );
    return rows[0] ?? null;
  }

  async appendLog(entry) {
    const { rows } = await this.pool.query(
      `INSERT INTO automation_log (automation_id, action, outcome, detail)
       VALUES ($1,$2,$3,$4) RETURNING id, at`,
      [entry.automationId ?? null, entry.action, entry.outcome, JSON.stringify(entry.detail ?? {})],
    );
    return { ...entry, id: String(rows[0].id), at: rows[0].at };
  }

  async listLog(limit = 100) {
    const { rows } = await this.pool.query(
      `SELECT * FROM automation_log ORDER BY at DESC LIMIT $1`, [limit],
    );
    return rows.map((r) => ({
      id: String(r.id), at: r.at, automationId: r.automation_id,
      action: r.action, outcome: r.outcome, detail: r.detail,
    }));
  }

  async listCandidates() {
    const { rows } = await this.pool.query(`SELECT * FROM research_candidates ORDER BY saved_at DESC`);
    return rows.map((r) => ({ id: String(r.id), savedAt: r.saved_at, name: r.name, category: r.category, notes: r.notes, ...r.data }));
  }

  async addCandidate({ name, category, notes = '', ...data }) {
    const { rows } = await this.pool.query(
      `INSERT INTO research_candidates (name, category, notes, data)
       VALUES ($1,$2,$3,$4) RETURNING id, saved_at`,
      [name, category ?? null, notes, JSON.stringify(data)],
    );
    return { id: String(rows[0].id), savedAt: rows[0].saved_at, name, category, notes, ...data };
  }

  async updateCandidate(id, patch) {
    const { notes, ...data } = patch;
    const { rows } = await this.pool.query(
      `UPDATE research_candidates SET
         notes = COALESCE($2, notes),
         data = data || $3::jsonb
       WHERE id = $1 RETURNING *`,
      [id, notes ?? null, JSON.stringify(data)],
    );
    const r = rows[0];
    return r ? { id: String(r.id), savedAt: r.saved_at, name: r.name, category: r.category, notes: r.notes, ...r.data } : null;
  }

  async removeCandidate(id) {
    const { rowCount } = await this.pool.query(`DELETE FROM research_candidates WHERE id = $1`, [id]);
    return rowCount > 0;
  }

  async upsertAlert(alert) {
    const { rows } = await this.pool.query(
      `INSERT INTO alerts (key, severity, kind, message, data)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (key) WHERE resolved_at IS NULL
       DO UPDATE SET last_seen_at = now(), message = EXCLUDED.message, data = EXCLUDED.data
       RETURNING *, (xmax = 0) AS created`,
      [alert.key, alert.severity, alert.kind, alert.message, JSON.stringify(alert.data ?? {})],
    );
    const r = rows[0];
    return { alert: { ...alert, id: String(r.id), createdAt: r.created_at, lastSeenAt: r.last_seen_at, resolvedAt: r.resolved_at }, created: r.created };
  }

  async listAlerts({ includeResolved = false } = {}) {
    const { rows } = await this.pool.query(
      `SELECT * FROM alerts ${includeResolved ? '' : 'WHERE resolved_at IS NULL'} ORDER BY created_at DESC LIMIT 200`,
    );
    return rows.map((r) => ({
      id: String(r.id), key: r.key, severity: r.severity, kind: r.kind, message: r.message,
      data: r.data, createdAt: r.created_at, lastSeenAt: r.last_seen_at, resolvedAt: r.resolved_at,
    }));
  }

  async resolveAlert(id) {
    const { rows } = await this.pool.query(
      `UPDATE alerts SET resolved_at = now() WHERE id = $1 RETURNING id`, [id],
    );
    return rows[0] ?? null;
  }
}
