import { describe, it, expect } from 'vitest';
import { detectFrameworksFromConfigs } from '../../../src/analyzer/detectors/framework-detector.js';

describe('detectFrameworksFromConfigs', () => {
  describe('package.json (JSON.parse)', () => {
    it('detects React from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { react: '^18.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({
          name: 'React',
          category: 'framework',
          version: '^18.0.0',
        }),
      );
    });

    it('detects Next.js from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { next: '^14.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Next.js' }),
      );
    });

    it('detects frameworks from devDependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          devDependencies: { '@nestjs/core': '^10.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'NestJS' }),
      );
    });

    it('returns empty array for empty dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: {},
          devDependencies: {},
        },
      });
      expect(result).toEqual([]);
    });

    it('returns empty array for no matching dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { lodash: '^4.0.0', chalk: '^5.0.0' },
        },
      });
      expect(result).toEqual([]);
    });

    it('handles missing dependencies and devDependencies fields', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: { name: 'test' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('Cargo.toml (string matching)', () => {
    it('detects Actix from Cargo.toml', () => {
      const result = detectFrameworksFromConfigs({
        cargoToml: '[dependencies]\nactix-web = "4"',
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Actix' }),
      );
    });

    it('returns empty array for no matching dependencies', () => {
      const result = detectFrameworksFromConfigs({
        cargoToml: '[dependencies]\nserde = "1"',
      });
      expect(result).toEqual([]);
    });
  });

  describe('go.mod (string matching)', () => {
    it('detects Gin from go.mod', () => {
      const result = detectFrameworksFromConfigs({
        goMod: 'require github.com/gin-gonic/gin v1.9.0',
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Gin' }),
      );
    });
  });

  describe('requirements.txt (regex matching)', () => {
    it('detects Django from requirements.txt', () => {
      const result = detectFrameworksFromConfigs({
        requirementsTxt: 'django==4.2.0\nrequests==2.31.0',
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Django' }),
      );
    });

    it('detects Flask with version constraint', () => {
      const result = detectFrameworksFromConfigs({
        requirementsTxt: 'flask>=2.3.0',
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Flask' }),
      );
    });

    it('does not match substrings', () => {
      const result = detectFrameworksFromConfigs({
        requirementsTxt: 'django-crispy-forms==1.14.0',
      });
      // django-crispy-forms is a different package, not Django itself
      expect(result.find((r) => r.name === 'Django')).toBeUndefined();
    });
  });

  describe('multiple config sources', () => {
    it('detects across different config files simultaneously', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
        },
        cargoToml: '[dependencies]\nactix-web = "4"',
      });
      const names = result.map((r) => r.name);
      expect(names).toContain('React');
      expect(names).toContain('Next.js');
      expect(names).toContain('Actix');
    });
  });

  describe('evidence format', () => {
    it('includes evidence string for detected frameworks', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { express: '^4.18.0' },
        },
      });
      expect(result[0].evidence).toBeTruthy();
      expect(typeof result[0].evidence).toBe('string');
    });
  });
});
