import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const srcDir = join(root, 'src');

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
      continue;
    }
    if (entry.isFile() && /\.(ts|tsx|js|jsx|md)$/.test(entry.name)) {
      files.push(full);
    }
  }

  return files;
}

describe('architecture cleanliness', () => {
  test('does not reintroduce Directus runtime references', () => {
    const offenders = walkFiles(srcDir)
      .filter((file) => !file.endsWith('architecture-cleanliness.test.ts'))
      .filter((file) => /\bdirectus\b/i.test(readFileSync(file, 'utf8')));

    assert.deepEqual(offenders, []);
  });

  test('keeps admin feature imports out of legacy wrapper files', () => {
    const adminDir = join(srcDir, 'components', 'admin');
    assert.equal(statSync(adminDir).isDirectory(), true);

    const legacyWrappers = readdirSync(adminDir).filter((name) =>
      /^Admin(?:Dashboard|ContentManager|PubPanel|RolesPanel|ShopPanel|ThemePanel|UsersPanel)\.tsx$/.test(name),
    );

    assert.deepEqual(legacyWrappers, []);
  });

  test('keeps the shared public component layer available', () => {
    for (const file of [
      'site-page.tsx',
      'site-header.tsx',
      'site-panel.tsx',
      'site-button.tsx',
      'site-empty-state.tsx',
    ]) {
      assert.equal(existsSync(join(srcDir, 'components', 'site', file)), true);
    }
  });
});
