import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const TEXT_EXTENSIONS = new Set(['.md', '.mdc', '.json', '.sh', '.yml', '.yaml']);

const TODO_TARGETS = new Set([
  'maister-development',
  'maister-init',
  'maister-migration',
  'maister-performance',
  'maister-product-design',
  'maister-research',
  'maister-standards-discover',
]);

const SKILL_REFERENCE_REPLACEMENTS = [
  ['skill: "requirements-critic"', 'skill: "maister-requirements-critic"'],
  ['skill: "transcript-critic"', 'skill: "maister-transcript-critic"'],
  ['skill: "problem-classifier"', 'skill: "maister-problem-classifier"'],
  ['skill: "test-strategy-reviewer"', 'skill: "maister-test-strategy-reviewer"'],
  ['skill: "linguistic-boundary-verifier"', 'skill: "maister-linguistic-boundary-verifier"'],
  ['skill: "metaprogram-classifier"', 'skill: "maister-metaprogram-classifier"'],
  ['skill: "context-distiller"', 'skill: "maister-context-distiller"'],
  ['skill: "aggregate-designer"', 'skill: "maister-aggregate-designer"'],
  ['skill: "codebase-analyzer"', 'skill: "maister-codebase-analyzer"'],
  ['skill: "implementation-plan-executor"', 'skill: "maister-implementation-plan-executor"'],
  ['skill: "implementation-verifier"', 'skill: "maister-implementation-verifier"'],
  ['skill: "docs-manager"', 'skill: "maister-docs-manager"'],
  ['skill: "quick-dev"', 'skill: "maister-quick-dev"'],
  ['skill: "quick-plan"', 'skill: "maister-quick-plan"'],
  ['skill: "quick-bugfix"', 'skill: "maister-quick-bugfix"'],
  ['skill `requirements-critic`', 'skill `maister-requirements-critic`'],
  ['skill `transcript-critic`', 'skill `maister-transcript-critic`'],
  ['skill `problem-classifier`', 'skill `maister-problem-classifier`'],
  ['skill `test-strategy-reviewer`', 'skill `maister-test-strategy-reviewer`'],
  ['skill `linguistic-boundary-verifier`', 'skill `maister-linguistic-boundary-verifier`'],
  ['skill `metaprogram-classifier`', 'skill `maister-metaprogram-classifier`'],
  ['skill `context-distiller`', 'skill `maister-context-distiller`'],
  ['skill `aggregate-designer`', 'skill `maister-aggregate-designer`'],
  ['Invoke the `requirements-critic` skill', 'Invoke the `maister-requirements-critic` skill'],
  ['Invoke the `transcript-critic` skill', 'Invoke the `maister-transcript-critic` skill'],
  ['Invoke the `problem-classifier` skill', 'Invoke the `maister-problem-classifier` skill'],
  ['Invoke the `test-strategy-reviewer` skill', 'Invoke the `maister-test-strategy-reviewer` skill'],
  ['Invoke the `linguistic-boundary-verifier` skill', 'Invoke the `maister-linguistic-boundary-verifier` skill'],
  ['Invoke the `metaprogram-classifier` skill', 'Invoke the `maister-metaprogram-classifier` skill'],
  ['Invoke the `context-distiller` skill', 'Invoke the `maister-context-distiller` skill'],
  ['Invoke the `aggregate-designer` skill', 'Invoke the `maister-aggregate-designer` skill'],
  ['run `test-strategy-reviewer`', 'run `maister-test-strategy-reviewer`'],
  ['run `linguistic-boundary-verifier`', 'run `maister-linguistic-boundary-verifier`'],
  ['run `metaprogram-classifier`', 'run `maister-metaprogram-classifier`'],
  ['run `grill-me`', 'run `maister-grill-me`'],
  ['run `grill-with-docs`', 'run `maister-grill-with-docs`'],
  ['`grill-with-docs`', '`maister-grill-with-docs`'],
  ['`grill-me`', '`maister-grill-me`'],
  ['`context-distiller`', '`maister-context-distiller`'],
  ['`aggregate-designer`', '`maister-aggregate-designer`'],
  ['`linguistic-boundary-verifier`', '`maister-linguistic-boundary-verifier`'],
  ['run `problem-classifier`', 'run `maister-problem-classifier`'],
  ['run `context-distiller`', 'run `maister-context-distiller`'],
  ['run `aggregate-designer`', 'run `maister-aggregate-designer`'],
  ['run `thermos`', 'run `maister-thermos`'],
  ['/maister:standards-discover', '/maister-standards-discover'],
  ['/maister:standards-update', '/maister-standards-update'],
  ['/maister:init', '/maister-init'],
  ['standards-discover skill', 'maister-standards-discover skill'],
  ['standards-update skill', 'maister-standards-update skill'],
];

const TODO_REPLACEMENTS = [
  ['TaskCreate', 'TodoWrite'],
  ['TaskUpdate', 'TodoWrite'],
  ['addBlockedBy', 'ordering in todos array (merge: true)'],
  ['activeForm', 'activity description in content'],
  ['metadata: {skipped: true}', 'status: "cancelled"'],
  ['Task system', 'Todo list'],
  ['Task tracking', 'Todo tracking'],
  ['Create Task Items', 'Create Todo Items'],
  ['task items', 'todo items'],
  ['Create task items', 'Create todo items via TodoWrite'],
  ['Restore task items', 'Restore todo items via TodoWrite'],
  ['Task Progress', 'Todo Progress'],
  ['TaskCreate/TaskUpdate', 'TodoWrite'],
];

function replaceAllLiteral(value, from, to) {
  return value.split(from).join(to);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join('/'));
      else throw new Error(`Unsupported source entry: ${absolute}`);
    }
  }
  await visit(root);
  return files.sort();
}

async function treeFingerprint(root) {
  const hash = createHash('sha256');
  for (const relative of await listFiles(root)) {
    hash.update(relative);
    hash.update('\0');
    hash.update(await readFile(path.join(root, relative)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function applyCursorTransforms(buffer, targetRelative, transformationIds, observedTransformationIds = new Set()) {
  if (!TEXT_EXTENSIONS.has(path.extname(targetRelative))) return buffer;

  let value = buffer.toString('utf8');
  const applied = new Set();
  const apply = (id, from, to) => {
    if (value.includes(from)) {
      value = replaceAllLiteral(value, from, to);
      applied.add(id);
    }
  };

  apply('cursor-skill-name-v1', 'maister:', 'maister-');
  value = value.replace(/^name: (?!maister-)([^\r\n]+)$/m, (_match, name) => {
    applied.add('cursor-skill-name-v1');
    return `name: maister-${name}`;
  });
  apply('cursor-explore-agent-v1', 'subagent_type="Explore"', 'subagent_type="maister-explore"');
  apply('cursor-explore-agent-v1', 'subagent_type: "Explore"', 'subagent_type: "maister-explore"');
  apply('cursor-explore-agent-v1', 'subagent_type="explore"', 'subagent_type="maister-explore"');
  apply('cursor-explore-agent-v1', 'subagent_type: "explore"', 'subagent_type: "maister-explore"');
  apply('cursor-question-tool-v1', 'AskUserQuestion', 'AskQuestion');
  value = value.replace(/`EnterPlanMode`[^`]*`/g, (match) => {
    applied.add('cursor-plan-mode-v1');
    return '';
  });
  value = value.replace(/`ExitPlanMode`[^`]*`/g, (match) => {
    applied.add('cursor-plan-mode-v1');
    return '';
  });
  apply('cursor-plan-mode-v1', 'EnterPlanMode', 'structured planning flow');
  apply('cursor-plan-mode-v1', 'ExitPlanMode', 'plan approval gate');
  apply('cursor-project-instructions-v1', 'CLAUDE.md', 'AGENTS.md');
  apply('cursor-framework-path-v1', '../orchestrator-framework/', '../lib/orchestrator-framework/');
  apply('cursor-framework-path-v1', 'skills/orchestrator-framework/', 'lib/orchestrator-framework/');
  apply('cursor-framework-path-v1', '[plugin]/skills/orchestrator-framework/', '[plugin]/lib/orchestrator-framework/');

  for (const [from, to] of SKILL_REFERENCE_REPLACEMENTS) {
    apply('cursor-skill-references-v1', from, to);
  }

  const targetSkill = targetRelative.split('/')[0];
  if (TODO_TARGETS.has(targetSkill)) {
    for (const [from, to] of TODO_REPLACEMENTS) apply('cursor-todowrite-v1', from, to);
  }

  if (targetRelative === 'maister-init/SKILL.md') {
    apply(
      'cursor-init-rule-v1',
      'Verify AGENTS.md integration',
      'Verify AGENTS.md integration\n- Create `.cursor/rules/maister-docs.mdc` in project root if missing (copy from plugin `rules/maister-docs.mdc` template — read `.maister/docs/INDEX.md` first)',
    );
  }

  if (targetRelative.startsWith('maister-init/')) {
    apply('cursor-host-neutralization-v1', '.codex', '.host-config');
    apply('cursor-host-neutralization-v1', 'Codex', 'host-native');
    apply('cursor-host-neutralization-v1', 'codex', 'native-host');
  }
  if (targetRelative.startsWith('maister-migration/references/')) {
    apply('cursor-host-neutralization-v1', 'Claude', 'the former host');
  }
  if (targetRelative === 'maister-standards-discover/references/docs-extractor-prompt.md') {
    apply('cursor-host-neutralization-v1', '.claude', '.the-former-host');
  }

  for (const id of applied) {
    if (!transformationIds.has(id)) {
      throw new Error(`Transformation ${id} is not allowlisted for ${targetRelative}`);
    }
    observedTransformationIds.add(id);
  }
  return Buffer.from(value);
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function projectCursorSkills({ repositoryRoot, check = false }) {
  const manifestPath = path.join(repositoryRoot, 'plugins/maister/overlays/cursor/skill-projection-v1.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.schema_version !== 1 || manifest.projection_version !== 'cursor-skill-projection-v1') {
    throw new Error(`Unsupported Cursor skill projection manifest: ${manifestPath}`);
  }

  const sourceRoot = path.join(repositoryRoot, manifest.source_root);
  const outputRoot = path.join(repositoryRoot, manifest.output_root);
  const transformationIds = new Set(manifest.transformations.map(({ id }) => id));
  const knownTransformationIds = new Set([
    'cursor-skill-name-v1', 'cursor-explore-agent-v1', 'cursor-question-tool-v1',
    'cursor-plan-mode-v1', 'cursor-project-instructions-v1', 'cursor-framework-path-v1',
    'cursor-skill-references-v1', 'cursor-todowrite-v1', 'cursor-init-rule-v1',
    'cursor-host-neutralization-v1',
  ]);
  for (const id of transformationIds) {
    if (!knownTransformationIds.has(id)) throw new Error(`Unknown allowlisted transformation: ${id}`);
  }

  const sourceDirectories = (await readdir(sourceRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const classifiedDirectories = [
    ...manifest.mappings.map(({ source }) => source),
    ...manifest.source_exclusions.map(({ source }) => source),
  ].sort();
  if (JSON.stringify(sourceDirectories) !== JSON.stringify(classifiedDirectories)) {
    throw new Error('Canonical skill inventory changed; update the projection manifest before regenerating');
  }

  const preserved = new Map(manifest.preserved_exceptions.map((entry) => [entry.target, entry]));
  const desired = new Map();
  const observedTransformationIds = new Set();
  for (const mapping of manifest.mappings) {
    const sourceDirectory = path.join(sourceRoot, mapping.source);
    const sourceFingerprint = await treeFingerprint(sourceDirectory);
    if (mapping.source_fingerprint !== sourceFingerprint) {
      throw new Error(`Canonical source drift for ${mapping.source}: expected ${mapping.source_fingerprint}, got ${sourceFingerprint}`);
    }
    for (const relative of await listFiles(sourceDirectory)) {
      const targetRelative = `${mapping.target}/${relative}`;
      const exception = preserved.get(targetRelative);
      if (exception) continue;
      const source = await readFile(path.join(sourceDirectory, relative));
      desired.set(targetRelative, applyCursorTransforms(source, targetRelative, transformationIds, observedTransformationIds));
    }
  }

  const unmatchedTransformationIds = [...transformationIds]
    .filter((id) => !observedTransformationIds.has(id));
  if (unmatchedTransformationIds.length > 0) {
    throw new Error(`Allowlisted transformations matched no canonical content: ${unmatchedTransformationIds.join(', ')}`);
  }

  for (const exception of manifest.preserved_exceptions) {
    const absolute = path.join(outputRoot, exception.target);
    if (!(await pathExists(absolute))) throw new Error(`Preserved exception is missing: ${exception.target}`);
    const content = await readFile(absolute);
    const actual = sha256(content);
    if (actual !== exception.sha256) {
      throw new Error(`Preserved exception drift for ${exception.target}: expected ${exception.sha256}, got ${actual}`);
    }
    desired.set(exception.target, content);
  }

  const desiredPaths = [...desired.keys()].sort();
  const currentPaths = (await pathExists(outputRoot)) ? await listFiles(outputRoot) : [];
  const differences = [];
  if (JSON.stringify(currentPaths) !== JSON.stringify(desiredPaths)) differences.push('file inventory');
  for (const relative of desiredPaths) {
    const absolute = path.join(outputRoot, relative);
    if (!(await pathExists(absolute)) || !(await readFile(absolute)).equals(desired.get(relative))) {
      differences.push(relative);
    }
  }

  if (check) {
    if (differences.length > 0) throw new Error(`Cursor skill projection is stale: ${differences.join(', ')}`);
    return { mode: 'check', files: desired.size, changed: 0 };
  }

  await rm(outputRoot, { recursive: true, force: true });
  for (const [relative, content] of [...desired.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const absolute = path.join(outputRoot, relative);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
  }
  return { mode: 'write', files: desired.size, changed: differences.length };
}

export { applyCursorTransforms, treeFingerprint };
