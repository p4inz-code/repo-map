import type { Detector } from './types.js';
import type { Technology, FileEntry } from '../../types.js';

/**
 * Registry of technology detectors.
 *
 * Detectors are run in registration order. The first detector to report
 * a technology name wins — subsequent detectors reporting the same name
 * are skipped. This means registration order matters:
 *   1. language-detector  (broad extension matching)
 *   2. framework-detector (specific config matching)
 *   3. tool-detector      (infrastructure / CI detection)
 *
 * If a new detector is added that could overlap, register it before the
 * existing one if its category is more specific.
 */
export class DetectorRegistry {
  private readonly detectors: Detector[] = [];

  register(detector: Detector): void {
    this.detectors.push(detector);
  }

  async detectAll(
    files: FileEntry[],
    rootPath: string,
  ): Promise<Technology[]> {
    const seen = new Set<string>();
    const results: Technology[] = [];

    for (const detector of this.detectors) {
      const technologies = await detector.detect(files, rootPath);
      for (const tech of technologies) {
        if (!seen.has(tech.name)) {
          seen.add(tech.name);
          results.push(tech);
        }
      }
    }

    return results;
  }
}
