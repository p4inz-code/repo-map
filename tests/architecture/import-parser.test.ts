import { describe, it, expect } from 'vitest';
import { parseImportsFromContent } from '../../src/architecture/import-parser.js';

describe('parseImportsFromContent', () => {
  it('parses TypeScript static imports', () => {
    const content = `import { Component } from 'react';\nimport { myFunc } from './utils/helper';\nimport type { Foo } from '../types';`;
    const result = parseImportsFromContent(content, 'src/app.ts');
    expect(result.internal).toContain('./utils/helper');
    expect(result.internal).toContain('../types');
    expect(result.external).toContain('react');
  });

  it('parses default imports', () => {
    const content = `import React from 'react';\nimport App from './App';`;
    const result = parseImportsFromContent(content, 'src/index.ts');
    expect(result.internal).toContain('./App');
    expect(result.external).toContain('react');
  });

  it('parses dynamic imports', () => {
    const content = `const module = await import('./lazy');\nconst ext = await import('lodash');`;
    const result = parseImportsFromContent(content, 'src/app.ts');
    expect(result.internal).toContain('./lazy');
    expect(result.external).toContain('lodash');
  });

  it('parses require calls', () => {
    const content = `const fs = require('fs');\nconst config = require('./config');`;
    const result = parseImportsFromContent(content, 'src/app.ts');
    expect(result.internal).toContain('./config');
    expect(result.external).toContain('fs');
  });

  it('handles empty content', () => {
    const result = parseImportsFromContent('', 'src/app.ts');
    expect(result.internal).toEqual([]);
    expect(result.external).toEqual([]);
  });

  it('handles content with no imports', () => {
    const content = 'const x = 1;\nconsole.log(x);';
    const result = parseImportsFromContent(content, 'src/app.ts');
    expect(result.internal).toEqual([]);
    expect(result.external).toEqual([]);
  });

  it('parses Python imports', () => {
    const content = 'import os\nimport sys\nfrom . import local_module\nfrom .utils import helper';
    const result = parseImportsFromContent(content, 'src/app.py');
    expect(result.external).toContain('os');
    expect(result.external).toContain('sys');
    expect(result.internal).toContain('.');
  });

  it('parses Go imports', () => {
    const content = 'import (\n\t"fmt"\n\t"github.com/gin-gonic/gin"\n\t"./internal/config"\n)';
    const result = parseImportsFromContent(content, 'src/server.go');
    expect(result.external.length).toBeGreaterThan(0);
    expect(result.internal).toContain('./internal/config');
  });

  it('parses Rust imports', () => {
    const content = 'use std::collections::HashMap;\nuse crate::models::User;\nuse super::helpers;';
    const result = parseImportsFromContent(content, 'src/main.rs');
    expect(result.external).toContain('std');
    expect(result.internal.some((i) => i.includes('crate'))).toBe(true);
    expect(result.internal.some((i) => i.includes('super'))).toBe(true);
  });

  it('deduplicates repeated imports', () => {
    const content = `import { A } from './utils';\nimport { B } from './utils';`;
    const result = parseImportsFromContent(content, 'src/app.ts');
    expect(result.internal.filter((i) => i === './utils').length).toBe(1);
  });
});
