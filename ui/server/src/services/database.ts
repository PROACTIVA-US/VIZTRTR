/**
 * SQLite database for storing projects and runs
 */

import Database from 'better-sqlite3';
import path from 'path';
import type { Project, Run } from '../types';

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
        workspacePath TEXT NOT NULL,
        frontendUrl TEXT NOT NULL,
        targetScore REAL DEFAULT 8.5,
        maxIterations INTEGER DEFAULT 5,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        hasProductSpec INTEGER DEFAULT 0,
        synthesizedPRD TEXT,
        projectType TEXT,
        analysisConfidence REAL,
        status TEXT DEFAULT 'created'
      )
    `);

    // Migrate existing tables (add columns if they don't exist)
    const migrations = [
      { column: 'synthesizedPRD', type: 'TEXT' },
      { column: 'projectType', type: 'TEXT' },
      { column: 'analysisConfidence', type: 'REAL' },
      { column: 'status', type: 'TEXT', default: "'created'" },
    ];

    for (const migration of migrations) {
      try {
        const sql = migration.default
          ? `ALTER TABLE projects ADD COLUMN ${migration.column} ${migration.type} DEFAULT ${migration.default}`
          : `ALTER TABLE projects ADD COLUMN ${migration.column} ${migration.type}`;
        this.db.exec(sql);
        console.log(`✓ Migration: Added ${migration.column} column to projects table`);
      } catch (e) {
        // Column already exists (safe to ignore)
      }
    }

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
        workspacePath TEXT,
        FOREIGN KEY(projectId) REFERENCES projects(id)
      )
    `);

    // Create iterations table for approval tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS iterations (
        id TEXT PRIMARY KEY,
        runId TEXT NOT NULL,
        iterationNum INTEGER NOT NULL,
        status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'archived')) DEFAULT 'pending',
        approvedAt TEXT,
        rejectedAt TEXT,
        rejectionReason TEXT,
        filesModified TEXT,
        screenshotBefore TEXT,
        screenshotAfter TEXT,
        evaluationJson TEXT,
        FOREIGN KEY(runId) REFERENCES runs(id)
      )
    `);

    // Create iteration_approvals table for human-in-the-loop workflow
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS iteration_approvals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id TEXT NOT NULL,
        iteration_id INTEGER NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('approve', 'reject', 'skip', 'modify')),
        feedback TEXT,
        reason TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(run_id, iteration_id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_runs_projectId ON runs(projectId);
      CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
      CREATE INDEX IF NOT EXISTS idx_iterations_runId ON iterations(runId);
      CREATE INDEX IF NOT EXISTS idx_iterations_status ON iterations(status);
      CREATE INDEX IF NOT EXISTS idx_approvals_runId ON iteration_approvals(run_id);
    `);
  }

  // Projects
  createProject(
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'workspacePath'>
  ): Project {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();

    // Create workspace path
    const workspacePath = path.join(process.cwd(), 'viztrtr-workspaces', id);

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, projectPath, workspacePath, frontendUrl, targetScore, maxIterations, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      project.name,
      project.projectPath,
      workspacePath,
      project.frontendUrl,
      project.targetScore || 8.5,
      project.maxIterations || 5,
      now,
      now
    );

    return {
      id,
      ...project,
      workspacePath,
      targetScore: project.targetScore || 8.5,
      maxIterations: project.maxIterations || 5,
      createdAt: now,
      updatedAt: now,
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
        .map(([k, v]) => {
          // Convert boolean to integer for SQLite (0/1)
          if (k === 'hasProductSpec' && typeof v === 'boolean') {
            return v ? 1 : 0;
          }
          return v;
        });

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
      startedAt: now,
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
      error: row.error || undefined,
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
      error: row.error || undefined,
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
