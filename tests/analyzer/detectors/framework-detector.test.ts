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

    it('detects Vue.js from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { vue: '^3.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Vue.js' }),
      );
    });

    it('detects Angular from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { '@angular/core': '^17.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Angular' }),
      );
    });

    it('detects Svelte from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { svelte: '^4.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Svelte' }),
      );
    });

    it('detects Astro from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { astro: '^4.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Astro' }),
      );
    });

    it('detects Electron from dependencies', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: { electron: '^28.0.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Electron' }),
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

    it('detects multiple frameworks simultaneously', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: {
            react: '^18.0.0',
            next: '^14.0.0',
            express: '^4.18.0',
          },
        },
      });
      const names = result.map((r) => r.name);
      expect(names).toContain('React');
      expect(names).toContain('Next.js');
      expect(names).toContain('Express');
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

    it('deduplicates Angular when multiple Angular packages present', () => {
      const result = detectFrameworksFromConfigs({
        packageJson: {
          dependencies: {
            '@angular/core': '^17.0.0',
            '@angular/router': '^17.0.0',
            '@angular/forms': '^17.0.0',
          },
        },
      });
      // Angular should appear only once
      expect(result.filter((r) => r.name === 'Angular')).toHaveLength(1);
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

    it('detects Fiber from go.mod', () => {
      const result = detectFrameworksFromConfigs({
        goMod: 'require github.com/gofiber/fiber/v2 v2.52.0',
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Fiber' }),
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

    it('detects FastAPI from requirements.txt', () => {
      const result = detectFrameworksFromConfigs({
        requirementsTxt: 'fastapi==0.104.0',
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'FastAPI' }),
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

  describe('composer.json (JSON.parse)', () => {
    it('detects Laravel from composer.json', () => {
      const result = detectFrameworksFromConfigs({
        composerJson: {
          require: { 'laravel/framework': '^10.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Laravel' }),
      );
    });

    it('detects Symfony from composer.json', () => {
      const result = detectFrameworksFromConfigs({
        composerJson: {
          require: { 'symfony/http-kernel': '^6.0' },
        },
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Symfony' }),
      );
    });
  });

  describe('Gemfile (regex matching)', () => {
    it('detects Rails from Gemfile', () => {
      const result = detectFrameworksFromConfigs({
        gemfile: "gem 'rails', '~> 7.0'",
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Rails' }),
      );
    });

    it('detects Sinatra from Gemfile', () => {
      const result = detectFrameworksFromConfigs({
        gemfile: "gem 'sinatra', '~> 3.0'",
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Sinatra' }),
      );
    });
  });

  describe('build.gradle (string matching)', () => {
    it('detects Spring Boot from build.gradle', () => {
      const result = detectFrameworksFromConfigs({
        gradleFile: "implementation 'org.springframework.boot:spring-boot-starter-web:3.0.0'",
      });
      expect(result).toContainEqual(
        expect.objectContaining({ name: 'Spring Boot' }),
      );
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
