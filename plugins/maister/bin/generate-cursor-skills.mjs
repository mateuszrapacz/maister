#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectCursorSkills } from '../lib/distribution/cursor-skill-projector.mjs';

const argumentsSet = new Set(process.argv.slice(2));
const unknown = [...argumentsSet].filter((argument) => argument !== '--check');
if (unknown.length > 0) {
  console.error(`Unknown argument(s): ${unknown.join(', ')}`);
  process.exitCode = 2;
} else {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  try {
    const result = await projectCursorSkills({ repositoryRoot, check: argumentsSet.has('--check') });
    console.log(`Cursor skill projection ${result.mode} passed: ${result.files} files, ${result.changed} change(s)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
