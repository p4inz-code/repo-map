# Contributing to repo-map

Thank you for your interest in contributing to repo-map. This document provides guidelines and information for contributors.

## Development Setup

```bash
git clone https://github.com/p4inz-code/repo-map.git
cd repo-map
npm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run the full test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Run ESLint |
| `npm run build` | Compile TypeScript |
| `npm run dev -- [path]` | Run in development mode |
| `npm run format` | Format code with Prettier |
| `npm run benchmark` | Run performance benchmarks |

## Code Standards

### TypeScript

- Strict TypeScript with no `any` types
- ESM-first with `.js` extensions in imports
- All exports must have explicit type annotations
- No type assertions unless absolutely necessary (document why)

### Testing

- 862+ automated tests must pass before merge
- Unit tests for each detector and utility
- Integration tests for scanner and analyzer
- End-to-end tests for the full pipeline
- UI screens require tests for both normal and narrow terminal widths
- Animation components require tests for frame coalescing and disposal

### Architecture

- Pure functions preferred (no side effects beyond filesystem reads)
- Single responsibility per module
- No scope expansion without discussion
- Minimal dependencies (currently: `commander`, `ignore` only)

### UI Changes

All UI changes must conform to the Product Identity specification:

- [docs/design/PRODUCT_IDENTITY_V2.2.md](docs/design/PRODUCT_IDENTITY_V2.2.md)

Key rules:

- Every screen answers exactly one question (CLI Law 1)
- Consistency over creativity (CLI Law 9)
- No emoji, no exclamation marks, no celebration (CLI Law 15)
- Graceful degradation for narrow terminals (CLI Law 17)
- Accessible by default (CLI Law 18)

## Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes following the code standards above
3. Add or update tests for any new functionality
4. Ensure all tests pass (`npm test`)
5. Ensure linting passes (`npm run lint`)
6. Update documentation if your change affects user-facing behavior
7. Submit a pull request with a clear description of the change

### Commit Messages

Use clear, descriptive commit messages:

- `feat: add new detection for XYZ framework`
- `fix: correct health score calculation for empty projects`
- `docs: update CLI reference with --suggest flag`
- `test: add edge case tests for narrow terminal rendering`
- `refactor: extract shared label-value pattern to utility`

## Architecture Documentation

For detailed system design, see:

- [docs/architecture.md](docs/architecture.md)

## Running repo-map on Itself

```bash
npx tsx scripts/analyze-self.ts
```

This scans the repo-map repository with repo-map, which is useful for validating the analysis pipeline.

## Reporting Issues

When reporting bugs, please include:

- Node.js version (`node --version`)
- Operating system
- repo-map version (`repo-map --version`)
- Steps to reproduce
- Expected behavior
- Actual behavior

## License

By contributing to repo-map, you agree that your contributions will be licensed under the MIT License.
