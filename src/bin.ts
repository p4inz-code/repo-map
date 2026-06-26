#!/usr/bin/env node

import { run } from './index.js';

let interrupted = false;

process.on('SIGINT', () => {
  if (interrupted) {
    process.stderr.write('\nForce exiting...\n');
    process.exit(130);
  }
  interrupted = true;
  process.stderr.write('\nInterrupted. Press Ctrl+C again to force exit.\n');
});

run(process.argv)
  .then((output) => {
    process.stdout.write(output);
  })
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    const errorCode =
      err && typeof err === 'object' && 'code' in err
        ? (err as NodeJS.ErrnoException).code
        : undefined;
    const errno =
      err && typeof err === 'object' && 'errno' in err
        ? (err as NodeJS.ErrnoException).errno
        : undefined;

    // Known application errors (from src/index.ts)
    if (
      message.includes('Path does not exist') ||
      message.includes('Path is not a directory')
    ) {
      process.stderr.write(`Error: ${message}\n`);
      process.exit(1);
    }

    // Permission errors
    if (errorCode === 'EACCES' || errorCode === 'EPERM' || errno === -13) {
      process.stderr.write(
        `Error: Permission denied while scanning the directory.\n` +
          `Try running with elevated permissions or scanning a directory you have access to.\n`,
      );
      process.exit(1);
    }

    // Filesystem errors
    if (errorCode === 'ENOENT' || errno === -2) {
      process.stderr.write(
        `Error: Cannot read directory or file. The path may not exist or may be a broken symlink.\n`,
      );
      process.exit(1);
    }

    // Filesystem full
    if (errorCode === 'ENOSPC') {
      process.stderr.write(
        `Error: No space left on device. Free up disk space and try again.\n`,
      );
      process.exit(1);
    }

    // File too large
    if (errorCode === 'EFBIG') {
      process.stderr.write(
        `Error: File too large to read. The scanner encountered an oversized file.\n`,
      );
      process.exit(1);
    }

    // Invalid argument / malformed path
    if (errorCode === 'EINVAL') {
      process.stderr.write(
        `Error: Invalid path or argument. Check the provided path and options.\n`,
      );
      process.exit(1);
    }

    // Premature exit (e.g., process killed externally)
    if (message.includes('Premature close') || message.includes('closed')) {
      process.exit(1);
    }

    // Fallback for unexpected errors
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  });
