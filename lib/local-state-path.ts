import path from 'node:path';

function getProjectRoot(): string {
  return /* turbopackIgnore: true */ process.cwd();
}

export function getLocalStatePath(fileName: string): string {
  return path.join(getProjectRoot(), '.clawlab', fileName);
}
