#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const needPath = path.resolve(__dirname, '..', 'need.json');
const need = JSON.parse(fs.readFileSync(needPath, 'utf8'));
const previousVersion = String(need.site?.version ?? '0.0.0');
const [major, minor, patch] = previousVersion.split('.').map(Number);
const nextVersion = `${major}.${minor}.${patch + 1}`;

console.log(`🚀 Version bumped: ${previousVersion} → ${nextVersion}`);

need.site.version = nextVersion;
fs.writeFileSync(needPath, JSON.stringify(need, null, 2) + '\n');

execSync('git add need.json', { stdio: 'inherit' });
execSync(`git commit --no-verify -m "chore: bump version to ${nextVersion}"`, { stdio: 'inherit' });
