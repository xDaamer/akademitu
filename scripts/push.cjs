#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

const NEED_JSON = './need.json';
const need = JSON.parse(fs.readFileSync(NEED_JSON, 'utf8'));

const [major, minor, patch] = need.site.version.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

need.site.version = newVersion;
fs.writeFileSync(NEED_JSON, JSON.stringify(need, null, 2) + '\n');

console.log(`🚀 Version bumped: ${major}.${minor}.${patch} → ${newVersion}`);

execSync('git add .', { stdio: 'inherit' });
execSync(`git commit --no-verify -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
execSync('git push --no-verify', { stdio: 'inherit' });
