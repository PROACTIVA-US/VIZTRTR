/**
 * SQLite database for storing projects and runs
 */

import Database from 'better-sqlite3';
import path from 'path';
import type { Project, Run } from '../types.js';

export class VIZTRTRDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './viztritr.db') {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        projectPath TEXT NOT NULL,
        frontendUrl TEXT NOT NULL,
        targetScore REAL DEFAULT 8.5,
        maxIterations INTEGER DEFAULT 5,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    // Create runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        status TEXT NOT NULL,
        currentIteration INTEGER DEFAULT 0,
        maxIterations INTEGER DEFAULT 5,
        startedAt TEXT NOT NULL,
        completedAt TEXT,
        error TEXT,
        resultJson TEXT,
        FOREIGN KEY(projectId) REFERENCES projects(id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_runs_projectId ON runs(projectId);
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    `);
  }

  // Projects
  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, projectPath, frontendUrl, targetScore, maxIterations, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      project.name,
      project.projectPath,
      project.frontendUrl,
      project.targetScore || 8.5,
      project.maxIterations || 5,
      now,
      now
    );

    return {
      id,
      ...project,
      targetScore: project.targetScore || 8.5,
      maxIterations: project.maxIterations || 5,
      createdAt: now,
      updatedAt: now
    };
  }

  getProject(id: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    return stmt.get(id) as Project | null;
  }

  listProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC');
    return stmt.all() as Project[];
  }

  updateProject(id: string, updates: Partial<Project>): void {
    const now = new Date().toISOString();
    const fields = Object.keys(updates)
      .filter(k => k !== 'id' && k !== 'createdAt')
      .map(k => `${k} = ?`)
      .join(', ');

    if (fields) {
      const values = Object.entries(updates)
        .filter(([k]) => k !== 'id' && k !== 'createdAt')
        .map(([, v]) => v);

      const stmt = this.db.prepare(`
        UPDATE projects SET ${fields}, updatedAt = ? WHERE id = ?
      `);

      stmt.run(...values, now, id);
    }
  }

  deleteProject(id: string): void {
    // Delete associated runs first
    const deleteRuns = this.db.prepare('DELETE FROM runs WHERE projectId = ?');
    deleteRuns.run(id);

    // Delete project
    const deleteProject = this.db.prepare('DELETE FROM projects WHERE id = ?');
    deleteProject.run(id);
  }

  // Runs
  createRun(projectId: string, maxIterations: number): Run {
    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO runs (id, projectId, status, currentIteration, maxIterations, startedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, projectId, 'queued', 0, maxIterations, now);

    return {
      id,
      projectId,
      status: 'queued',
      currentIteration: 0,
      maxIterations,
      startedAt: now
    };
  }

  getRun(id: string): Run | null {
    const stmt = this.db.prepare('SELECT * FROM runs WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      projectId: row.projectId,
      status: row.status,
      currentIteration: row.currentIteration,
      maxIterations: row.maxIterations,
      startedAt: row.startedAt,
      completedAt: row.completedAt || undefined,
      error: row.error || undefined
    };
  }

  listRuns(projectId?: string): Run[] {
    const stmt = projectId
      ? this.db.prepare('SELECT * FROM runs WHERE projectId = ? ORDER BY startedAt DESC')
      : this.db.prepare('SELECT * FROM runs ORDER BY startedAt DESC');

    const rows = projectId ? stmt.all(projectId) : stmt.all();

    return (rows as any[]).map(row => ({
      id: row.id,
      projectId: row.projectId,
      status: row.status,
      currentIteration: row.currentIteration,
      maxIterations: row.maxIterations,
      startedAt: row.startedAt,
      completedAt: row.completedAt || undefined,
      error: row.error || undefined
    }));
  }

  updateRun(id: string, updates: Partial<Run>): void {
    const fields = Object.keys(updates)
      .filter(k => k !== 'id')
      .map(k => `${k} = ?`)
      .join(', ');

    if (fields) {
      const values = Object.entries(updates)
        .filter(([k]) => k !== 'id')
        .map(([, v]) => v);

      const stmt = this.db.prepare(`UPDATE runs SET ${fields} WHERE id = ?`);
      stmt.run(...values, id);
    }
  }

  saveRunResult(runId: string, result: any): void {
    const stmt = this.db.prepare(`
      UPDATE runs SET resultJson = ? WHERE id = ?
    `);
    stmt.run(JSON.stringify(result), runId);
  }

  getRunResult(runId: string): any | null {
    const stmt = this.db.prepare('SELECT resultJson FROM runs WHERE id = ?');
    const row = stmt.get(runId) as any;
    return row?.resultJson ? JSON.parse(row.resultJson) : null;
  }

  close(): void {
    this.db.close();
  }
}
