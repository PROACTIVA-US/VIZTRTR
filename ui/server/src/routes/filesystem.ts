/**
 * Filesystem browsing endpoints
 */
import express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const router = express.Router();

/**
 * GET /api/filesystem/browse
 * Browse directories on the server filesystem
 */
router.get('/browse', async (req, res) => {
  try {
    const dirPath = (req.query.path as string) || os.homedir();

    // Security: prevent directory traversal attacks
    const resolvedPath = path.resolve(dirPath);

    // Read directory contents
    const entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true });

    // Filter to only show directories
    const directories = entries
      .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(resolvedPath, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Get parent directory
    const parent = path.dirname(resolvedPath);

    res.json({
      currentPath: resolvedPath,
      parent: parent !== resolvedPath ? parent : null,
      directories,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to browse directory',
    });
  }
});

/**
 * GET /api/filesystem/home
 * Get user's home directory
 */
router.get('/home', (req, res) => {
  res.json({ path: os.homedir() });
});

export default router;
