import { DetectorRegistry } from './registry.js';
import { LanguageDetector } from './language-detector.js';
import { FrameworkDetector } from './framework-detector.js';
import { ToolDetector } from './tool-detector.js';

/**
 * Creates the default registry with all built-in detectors.
 *
 * Registration order matters for deduplication:
 * 1. language-detector — broad extension matching
 * 2. framework-detector — specific config-based detection
 * 3. tool-detector — infrastructure / CI detection
 */
export function createDefaultRegistry(): DetectorRegistry {
  const registry = new DetectorRegistry();
  registry.register(new LanguageDetector());
  registry.register(new FrameworkDetector());
  registry.register(new ToolDetector());
  return registry;
}
