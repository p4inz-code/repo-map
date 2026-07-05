import type { DependencyAnalysis, DependencyGroup } from './types.js';

/**
 * Analyzes dependencies from package.json.
 * Pure function — operates on parsed package data only.
 *
 * Uses heuristic-based approaches for identifying possible unused packages
 * and outdated architecture warnings. These are heuristics, not guarantees.
 */
export function analyzeDependencies(
  packageJson: Record<string, unknown> | null,
): DependencyAnalysis {
  if (!packageJson) {
    return {
      runtimeCount: 0,
      devCount: 0,
      totalCount: 0,
      largestGroups: [],
      possibleUnused: [],
      outdatedWarnings: [],
    };
  }

  const deps = (packageJson.dependencies as Record<string, string>) ?? {};
  const devDeps = (packageJson.devDependencies as Record<string, string>) ?? {};
  const peerDeps = (packageJson.peerDependencies as Record<string, string>) ?? {};
  const allDeps = { ...deps, ...devDeps, ...peerDeps };

  const runtimeCount = Object.keys(deps).length;
  const devCount = Object.keys(devDeps).length + Object.keys(peerDeps).length;
  const totalCount = Object.keys(allDeps).length;

  // Group dependencies by category
  const groups = new Map<string, string[]>();

  const categoryPatterns: Record<string, RegExp[]> = {
    'UI / Frontend': [/^react/, /^vue/, /^angular/, /^svelte/, /^next/, /^nuxt/, /^@angular/, /^@sveltejs/, /^@remix/, /^@astrojs/, /^tailwindcss/, /^bootstrap/, /^antd/, /^@mui/, /^@chakra/, /^@emotion/, /^styled-components/, /^css/, /^postcss/, /^sass/, /^less/],
    'Backend / Server': [/^express/, /^@nestjs/, /^fastify/, /^hono/, /^koa/, /^socket\.io/, /^passport/, /^helmet/, /^cors/, /^body-parser/, /^morgan/, /^compression/],
    'Database / ORM': [/^prisma/, /^typeorm/, /^drizzle/, /^mongoose/, /^sequelize/, /^knex/, /^pg$/, /^mysql/, /^sqlite/, /^redis/, /^ioredis/, /^mongodb/, /^@prisma/],
    'Testing': [/^vitest/, /^jest/, /^cypress/, /^playwright/, /^mocha/, /^chai/, /^ava$/, /^supertest/, /^@testing-library/, /^sinon/, /^nock/],
    'Build / Bundler': [/^vite/, /^webpack/, /^rollup/, /^parcel/, /^esbuild/, /^tsup/, /^babel/, /^@babel/, /^swc/, /^@swc/],
    'Linting / Formatting': [/^eslint/, /^prettier/, /^@typescript-eslint/, /^stylelint/, /^commitlint/, /^husky/, /^lint-staged/],
    'CLI / Utilities': [/^commander/, /^yargs/, /^inquirer/, /^chalk/, /^ora$/, /^figlet/, /^cli/, /^meow/],
    'TypeScript / Types': [/^typescript/, /^@types\//, /^ts-node/, /^tsx$/, /^tslib/],
    'Auth / Security': [/^next-auth/, /^@auth/, /^jsonwebtoken/, /^bcrypt/, /^argon2/, /^helmet/, /^cors/],
    'HTTP / API': [/^axios/, /^got/, /^node-fetch/, /^superagent/, /^graphql/, /^@graphql/, /^apollo/, /^trpc/, /^@trpc/],
    'State Management': [/^redux/, /^zustand/, /^jotai/, /^recoil/, /^mobx/, /^valtio/, /^pinia/, /^vuex/],
    'Date / Time': [/^date-fns/, /^dayjs/, /^luxon/, /^moment/],
    'Validation': [/^zod/, /^yup/, /^joi/, /^class-validator/, /^ajv/],
    'File / Storage': [/^multer/, /^sharp/, /^aws-sdk/, /^@aws/, /^firebase/, /^gcs/, /^@azure/],
  };

  for (const [pkgName] of Object.entries(allDeps)) {
    let categorized = false;
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some((p) => p.test(pkgName))) {
        const list = groups.get(category) || [];
        list.push(pkgName);
        groups.set(category, list);
        categorized = true;
        break;
      }
    }
    if (!categorized) {
      const list = groups.get('Other') || [];
      list.push(pkgName);
      groups.set('Other', list);
    }
  }

  // Build largest groups
  const largestGroups: DependencyGroup[] = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([name, packages]) => ({
      name,
      count: packages.length,
      packages: packages.slice(0, 10), // Show top 10
    }));

  // Possible unused packages (heuristic: known legacy/potentially unused patterns)
  const possibleUnused: string[] = [];
  const devDepNames = Object.keys(devDeps);
  const depNames = Object.keys(deps);

  // ts-node is often unused when tsx/vite are present
  if (devDepNames.includes('ts-node') && (devDepNames.includes('tsx') || depNames.includes('vite'))) {
    possibleUnused.push('ts-node — tsx or Vite may be replacing it');
  }

  // Outdated architecture warnings
  const outdatedWarnings: string[] = [];
  if (devDepNames.includes('tslint')) {
    outdatedWarnings.push('TSLint is deprecated — migrate to ESLint with typescript-eslint');
  }
  if (depNames.includes('moment')) {
    outdatedWarnings.push('moment.js is a legacy library — consider date-fns or dayjs (smaller, tree-shakeable)');
  }
  if (depNames.includes('redux') && !depNames.some((d) => d.startsWith('@reduxjs/toolkit'))) {
    outdatedWarnings.push('Redux without @reduxjs/toolkit — consider migrating to Redux Toolkit (RTK)');
  }
  if (depNames.includes('request')) {
    outdatedWarnings.push('The "request" package is deprecated — use node-fetch, got, or axios instead');
  }
  if (devDepNames.includes('enzyme')) {
    outdatedWarnings.push('Enzyme is no longer actively maintained — consider @testing-library/react');
  }
  if (depNames.includes('lodash') && depNames.some((d) => d.startsWith('@types/lodash'))) {
    outdatedWarnings.push('Lodash is often unnecessary with modern JavaScript (ES6+ includes many lodash features natively)');
  }
  if (devDepNames.includes('gulp')) {
    outdatedWarnings.push('Gulp is largely superseded by modern bundlers (Vite, esbuild, SWC)');
  }

  return {
    runtimeCount,
    devCount,
    totalCount,
    largestGroups,
    possibleUnused,
    outdatedWarnings,
  };
}
