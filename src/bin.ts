#!/usr/bin/env node

import { run } from './index.js';
import { createUISession } from './ui/index.js';

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

    // Create a minimal UISession for error display
    const ui = createUISession({ color: process.env.NO_COLOR !== '1' });

    // Known application errors (from src/index.ts)
    if (
      message.includes('Path does not exist') ||
      message.includes('Path is not a directory')
    ) {
      ui.reportError('Path Error', message);
      ui.close();
      process.exit(1);
    }

    // Permission errors
    if (errorCode === 'EACCES' || errorCode === 'EPERM' || errno === -13) {
      ui.reportError(
        'Permission Denied',
        'Permission denied while scanning the directory.',
        'Try running with elevated permissions or scanning a directory you have access to.',
      );
      ui.close();
      process.exit(1);
    }

    // Filesystem errors
    if (errorCode === 'ENOENT' || errno === -2) {
      ui.reportError(
        'Filesystem Error',
        'Cannot read directory or file. The path may not exist or may be a broken symlink.',
      );
      ui.close();
      process.exit(1);
    }

    // Filesystem full
    if (errorCode === 'ENOSPC') {
      ui.reportError(
        'Disk Full',
        'No space left on device.',
        'Free up disk space and try again.',
      );
      ui.close();
      process.exit(1);
    }

    // File too large
    if (errorCode === 'EFBIG') {
      ui.reportError(
        'File Too Large',
        'The scanner encountered an oversized file.',
      );
      ui.close();
      process.exit(1);
    }

    // Invalid argument / malformed path
    if (errorCode === 'EINVAL') {
      ui.reportError(
        'Invalid Argument',
        'Invalid path or argument.',
        'Check the provided path and options.',
      );
      ui.close();
      process.exit(1);
    }

    // Fallback for unexpected errors
    ui.reportError('Error', message);
    ui.close();
    process.exit(1);
  });
