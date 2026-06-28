# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.2.x   | Yes       |
| < 2.2   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in repo-map, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email: https://github.com/p4inz-code/repo-map/issues

Include the following in your report:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- Acknowledgment within 48 hours
- Initial assessment within 1 week
- Fix or mitigation within 2 weeks for critical issues

## Security Considerations

### Filesystem Access

repo-map reads the local filesystem only. It does not:

- Make network requests during a scan
- Upload or transmit any data
- Modify, create, or delete files
- Execute arbitrary code from scanned repositories

### Binary Handling

- Files over 50 MB are automatically skipped to prevent memory exhaustion
- Binary files are detected via extension and null-byte heuristic
- Symlinks are followed but cycles are detected and broken

### Dependency Policy

repo-map maintains minimal dependencies:

- `commander` — CLI argument parsing
- `ignore` — `.gitignore` pattern matching

Both are well-maintained, widely-used packages with established security track records.

### Output Safety

- Output is plain text or JSON. No HTML, no script injection vectors.
- Terminal output uses ANSI escape codes for styling only
- No user-controlled data is embedded in executable contexts

## Scope

This security policy covers the `@p4inz-code/repo-map` npm package and the GitHub repository. It does not cover:

- Third-party integrations or extensions
- Forks or derivative works
- Usage in environments outside the intended scope (local filesystem scanning)
