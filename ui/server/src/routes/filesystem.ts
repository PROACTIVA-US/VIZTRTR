/**
 * Filesystem browsing endpoints
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { BrowseResponse, HomeResponse, ErrorResponse } from '../../shared/src/api-types';

const router = express.Router();

/**
 * Rate limiter for filesystem endpoints
 * Prevents abuse and filesystem reconnaissance attacks
 */
const filesystemLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many filesystem requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Forbidden directories that should not be browsable
 */
const FORBIDDEN_DIRS = [
  '/etc',
  '/var',
  '/usr',
  '/bin',
  '/sbin',
  '/System',
  '/private',
  path.join(os.homedir(), '.ssh'),
  path.join(os.homedir(), '.aws'),
  path.join(os.homedir(), '.config/gcloud'),
];

/**
 * GET /api/filesystem/browse
 * Browse directories on the server filesystem
 */
router.get('/browse', filesystemLimiter, async (req, res) => {
  try {
    const dirPath = (req.query.path as string) || os.homedir();

    // Security: prevent directory traversal attacks
    const resolvedPath = path.resolve(dirPath);

    // Security: prevent access to system and sensitive directories
    const isForbidden = FORBIDDEN_DIRS.some(forbidden => {
      const resolvedForbidden = path.resolve(forbidden);
      return (
        resolvedPath === resolvedForbidden || resolvedPath.startsWith(resolvedForbidden + path.sep)
      );
    });

    if (isForbidden) {
      return res.status(403).json<ErrorResponse>({
        error: 'Access denied to system directories',
      });
    }

    // Read directory contents
    let entries;
    try {
      entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
    } catch (error) {
      // Handle permission errors specifically
      if (error instanceof Error && 'code' in error) {
        const fsError = error as NodeJS.ErrnoException;
        if (fsError.code === 'EACCES' || fsError.code === 'EPERM') {
          return res.status(403).json<ErrorResponse>({
            error: 'Permission denied',
          });
        }
        if (fsError.code === 'ENOENT') {
          return res.status(404).json<ErrorResponse>({
            error: 'Directory not found',
          });
        }
      }
      throw error;
    }

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

    res.json<BrowseResponse>({
      currentPath: resolvedPath,
      parent: parent !== resolvedPath ? parent : null,
      directories,
    });
  } catch (error) {
    // Generic error handler - sanitize error messages
    console.error('Filesystem browse error:', error);
    res.status(500).json<ErrorResponse>({
      error: 'Failed to browse directory',
    });
  }
});

/**
 * GET /api/filesystem/home
 * Get user's home directory
 */
router.get('/home', filesystemLimiter, (req, res) => {
  res.json<HomeResponse>({ path: os.homedir() });
});

export default router;
