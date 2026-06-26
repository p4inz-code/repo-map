import type { Technology, FileEntry } from '../../types.js';

export interface Detector {
  name: string;
  detect(files: FileEntry[], rootPath: string): Promise<Technology[]>;
}
