import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('core source files exist', () => {
  for (const f of ['src/bot.js', 'src/tasks.js', 'src/student.js']) {
    assert.ok(fs.existsSync(f));
  }
});
