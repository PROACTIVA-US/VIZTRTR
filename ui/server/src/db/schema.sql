-- VIZTRTR Projects Database Schema

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  projectPath TEXT NOT NULL,
  frontendUrl TEXT NOT NULL,
  projectType TEXT CHECK(projectType IN ('teleprompter', 'web-builder', 'control-panel', 'general')) DEFAULT 'general',
  targetScore REAL DEFAULT 8.5,
  maxIterations INTEGER DEFAULT 3,
  status TEXT CHECK(status IN ('idle', 'analyzing', 'running', 'completed', 'failed')) DEFAULT 'idle',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastRunAt TEXT,
  config TEXT, -- JSON serialized config
  focusAreas TEXT, -- JSON array
  avoidAreas TEXT  -- JSON array
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  status TEXT CHECK(status IN ('queued', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'queued',
  startingScore REAL,
  currentScore REAL,
  finalScore REAL,
  targetScore REAL,
  improvement REAL,
  currentIteration INTEGER DEFAULT 0,
  maxIterations INTEGER,
  targetReached BOOLEAN DEFAULT 0,
  startedAt TEXT,
  completedAt TEXT,
  duration INTEGER, -- milliseconds
  outputDir TEXT,
  error TEXT,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS iterations (
  id TEXT PRIMARY KEY,
  runId TEXT NOT NULL,
  iterationNum INTEGER NOT NULL,
  scoreBefore REAL,
  scoreAfter REAL,
  delta REAL,
  filesModified INTEGER DEFAULT 0,
  recommendationsCount INTEGER DEFAULT 0,
  implementedCount INTEGER DEFAULT 0,
  rollback BOOLEAN DEFAULT 0,
  startedAt TEXT NOT NULL,
  completedAt TEXT,
  duration INTEGER,
  designSpec TEXT, -- JSON
  changes TEXT,     -- JSON
  evaluation TEXT,  -- JSON
  FOREIGN KEY (runId) REFERENCES runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(projectId);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_iterations_run ON iterations(runId);
