import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_PATH = path.join(__dirname, '../../data/viztrtr.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('✅ Database initialized');
}

// Helper to generate IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Project operations
export interface Project {
  id: string;
  name: string;
  description?: string;
  projectPath: string;
  frontendUrl: string;
  projectType: 'teleprompter' | 'web-builder' | 'control-panel' | 'general';
  targetScore: number;
  maxIterations: number;
  status: 'idle' | 'analyzing' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  config?: string;
  focusAreas?: string;
  avoidAreas?: string;
}

export interface Run {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startingScore?: number;
  currentScore?: number;
  finalScore?: number;
  targetScore: number;
  improvement?: number;
  currentIteration: number;
  maxIterations: number;
  targetReached: boolean;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  outputDir?: string;
  error?: string;
}

export const projectQueries = {
  create: db.prepare(`
    INSERT INTO projects (id, name, description, projectPath, frontendUrl, projectType,
                          targetScore, maxIterations, status, createdAt, updatedAt, config, focusAreas, avoidAreas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  findAll: db.prepare('SELECT * FROM projects ORDER BY updatedAt DESC'),

  findById: db.prepare('SELECT * FROM projects WHERE id = ?'),

  update: db.prepare(`
    UPDATE projects
    SET name = ?, description = ?, projectPath = ?, frontendUrl = ?, projectType = ?,
        targetScore = ?, maxIterations = ?, status = ?, updatedAt = ?, config = ?, focusAreas = ?, avoidAreas = ?
    WHERE id = ?
  `),

  updateStatus: db.prepare('UPDATE projects SET status = ?, updatedAt = ? WHERE id = ?'),

  updateLastRun: db.prepare('UPDATE projects SET lastRunAt = ?, updatedAt = ? WHERE id = ?'),

  delete: db.prepare('DELETE FROM projects WHERE id = ?'),
};

export const runQueries = {
  create: db.prepare(`
    INSERT INTO runs (id, projectId, status, targetScore, currentIteration, maxIterations, targetReached, startedAt, outputDir)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  findByProject: db.prepare('SELECT * FROM runs WHERE projectId = ? ORDER BY startedAt DESC'),

  findById: db.prepare('SELECT * FROM runs WHERE id = ?'),

  updateStatus: db.prepare('UPDATE runs SET status = ?, completedAt = ?, duration = ? WHERE id = ?'),

  updateProgress: db.prepare(`
    UPDATE runs
    SET currentIteration = ?, currentScore = ?, status = ?
    WHERE id = ?
  `),

  complete: db.prepare(`
    UPDATE runs
    SET status = ?, finalScore = ?, improvement = ?, targetReached = ?, completedAt = ?, duration = ?
    WHERE id = ?
  `),
};
