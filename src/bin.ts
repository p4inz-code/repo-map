#!/usr/bin/env node

import { run } from './index.js';

run(process.argv)
  .then((output) => {
    process.stdout.write(output);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
