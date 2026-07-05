import { describe, it, expect } from 'vitest';
import { parseImportsFromContent } from '../../src/architecture/import-parser.js';

// =================================================================
// C / C++ include parsing
// =================================================================

describe('C/C++ includes', () => {
  it('parses #include with quotes (local relative path)', () => {
    const content = '#include "foo.h"\n#include "../bar/baz.hpp"\n#include <vector>';
    const result = parseImportsFromContent(content, 'src/main.cpp');
    expect(result.internal).toContain('./foo.h');
    expect(result.internal).toContain('../bar/baz.hpp');
    expect(result.external).toContain('vector');
  });

  it('parses #include with explicit relative prefix', () => {
    const content = '#include "./utils/helpers.h"\n#include "../config.h"';
    const result = parseImportsFromContent(content, 'src/main.cpp');
    expect(result.internal).toContain('./utils/helpers.h');
    expect(result.internal).toContain('../config.h');
  });

  it('parses system includes as external', () => {
    const content = '#include <iostream>\n#include <string>\n#include <boost/shared_ptr.hpp>';
    const result = parseImportsFromContent(content, 'src/main.cpp');
    expect(result.external).toContain('iostream');
    expect(result.external).toContain('string');
    expect(result.external).toContain('boost/shared_ptr.hpp');
    expect(result.internal).toEqual([]);
  });

  it('parses mixed local and system includes', () => {
    const content = [
      '#include <iostream>',
      '#include "myheader.h"',
      '#include "../common/defs.hpp"',
      '#include <vector>',
      '',
      'int main() { return 0; }',
    ].join('\n');
    const result = parseImportsFromContent(content, 'src/main.cpp');
    expect(result.external).toContain('iostream');
    expect(result.external).toContain('vector');
    expect(result.internal).toContain('./myheader.h');
    expect(result.internal).toContain('../common/defs.hpp');
  });

  it('handles C files (.c extension)', () => {
    const content = '#include "myheader.h"\n#include <stdio.h>';
    const result = parseImportsFromContent(content, 'src/main.c');
    expect(result.internal).toContain('./myheader.h');
    expect(result.external).toContain('stdio.h');
  });

  it('ignores #define and other preprocessor directives', () => {
    const content = [
      '#define MY_CONSTANT 42',
      '#include "header.h"',
      '#ifdef DEBUG',
      '#include "debug.h"',
      '#endif',
    ].join('\n');
    const result = parseImportsFromContent(content, 'src/main.cpp');
    expect(result.internal).toContain('./header.h');
    expect(result.internal).toContain('./debug.h');
  });

  it('handles empty C file', () => {
    const result = parseImportsFromContent('// just a comment\nint x = 0;\n', 'src/main.c');
    expect(result.internal).toEqual([]);
    expect(result.external).toEqual([]);
  });

  it('handles C++ headers (.hpp, .hxx, .hh)', () => {
    const result1 = parseImportsFromContent('#include "helper.hpp"', 'src/main.cpp');
    expect(result1.internal).toContain('./helper.hpp');

    const result2 = parseImportsFromContent('#include "utils.hxx"', 'src/main.cpp');
    expect(result2.internal).toContain('./utils.hxx');

    const result3 = parseImportsFromContent('#include "common.hh"', 'src/main.cpp');
    expect(result3.internal).toContain('./common.hh');
  });

  it('does not parse #include in non-C/C++ files', () => {
    const content = '#include "malicious"';
    const result = parseImportsFromContent(content, 'src/app.ts');
    expect(result.internal).toEqual([]);
    expect(result.external).toEqual([]);
  });
});

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
