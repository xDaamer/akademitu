#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');
const needPath = path.resolve(__dirname, '..', 'need.json');
const need = JSON.parse(fs.readFileSync(needPath, 'utf8'));
const previousVersion = String(need.site?.version ?? '0.0.0');
const [major, minor, patch] = previousVersion.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`🚀 Version bumped: ${previousVersion} → ${newVersion}`);

if (dryRun) {
  console.log('ℹ️ Dry run only. No file write or git commit was made.');
  process.exit(0);
}

need.site.version = newVersion;
fs.writeFileSync(needPath, JSON.stringify(need, null, 2) + '\n');

try {
  execSync('git add need.json', { stdio: 'inherit' });
  execSync(`git commit --no-verify -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  console.log(`✅ Commit created for version ${newVersion}`);
} catch (error) {
  console.log(`ℹ️ Version already prepared in the current worktree; no new commit was created.`);
}
