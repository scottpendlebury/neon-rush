// Neon Rush - Budget Check Script
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LIMITS = {
  gitTracked: 100 * 1024 * 1024,    // 100 MB
  buildSize: 50 * 1024 * 1024,       // 50 MB
  initialDownload: 10 * 1024 * 1024  // 10 MB
};

function getDirSize(dir) {
  if (!fs.existsSync(dir)) return 0;
  let size = 0;
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  return size;
}

function getGitTrackedSize() {
  try {
    const output = execSync('git ls-files -z', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const files = output.split('\0').filter(f => f);
    let total = 0;
    for (const file of files) {
      if (fs.existsSync(file)) {
        total += fs.statSync(file).size;
      }
    }
    return total;
  } catch (e) {
    console.warn('Could not get git tracked size:', e.message);
    return 0;
  }
}

function checkNodeModulesIgnored() {
  try {
    execSync('git check-ignore -q node_modules', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

console.log('🔍 Neon Rush - Budget Check');
console.log('=' .repeat(40));

let passed = true;

// Check 1: Git tracked size
const gitSize = getGitTrackedSize();
console.log(`\n📦 Git tracked size: ${formatBytes(gitSize)}`);
if (gitSize > LIMITS.gitTracked) {
  console.log(`   ❌ EXCEEDS LIMIT: ${formatBytes(LIMITS.gitTracked)}`);
  passed = false;
} else {
  console.log(`   ✅ Within limit: ${formatBytes(LIMITS.gitTracked)}`);
}

// Check 2: node_modules ignored
const ignored = checkNodeModulesIgnored();
console.log(`\n📁 node_modules gitignored: ${ignored ? '✅ Yes' : '❌ No'}`);
if (!ignored) passed = false;

// Check 3: Build size
const buildSize = getDirSize('dist');
console.log(`\n🏗️  Build size (dist/): ${formatBytes(buildSize)}`);
if (buildSize > LIMITS.buildSize) {
  console.log(`   ❌ EXCEEDS LIMIT: ${formatBytes(LIMITS.buildSize)}`);
  passed = false } else {
  console.log(`   ✅ Within limit: ${formatBytes(LIMITS.buildSize)}`);
}

// Check 4: Initial download (assets in dist)
const assetsSize = getDirSize('dist/assets') || getDirSize('dist');
console.log(`\n📥 Initial download estimate: ${formatBytes(assetsSize)}`);
if (assetsSize > LIMITS.initialDownload) {
  console.log(`   ❌ EXCEEDS LIMIT: ${formatBytes(LIMITS.initialDownload)}`);
  passed = false;
} else {
  console.log(`   ✅ Within limit: ${formatBytes(LIMITS.initialDownload)}`);
}

// Summary
console.log('\n' + '='.repeat(40));
if (passed) {
  console.log('✅ ALL CHECKS PASSED');
  process.exit(0);
} else {
  console.log('❌ BUDGET CHECK FAILED');
  process.exit(1);
}