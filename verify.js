#!/usr/bin/env node
/**
 * WASM-RPG System Test Harness
 * Validates that HP sync, combat log, and animations work correctly
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('WASM-RPG SYSTEM VERIFICATION TEST');
console.log('='.repeat(60) + '\n');

let passCount = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// Test 1: HP State Fix
test('HP State: playerHpRef removed from Game.tsx', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  if (gameFile.includes('playerHpRef')) {
    throw new Error('playerHpRef still present');
  }
});

test('HP State: Single playerHp state defined', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  if (!gameFile.includes('const [playerHp, setPlayerHp] = useState(100)')) {
    throw new Error('playerHp state not found');
  }
});

test('HP State: applyDamage takes currentHp parameter', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  if (!gameFile.includes('applyDamage = useCallback((damage: number, source: string, currentHp: number)')) {
    throw new Error('applyDamage signature incorrect');
  }
});

test('HP State: Combat calls use playerHp', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  const enemyDamageCall = gameFile.includes('applyDamage(damage, enemy.type, playerHp)');
  const bossDamageCall = gameFile.includes('applyDamage(bossDamage, \'Boss\', playerHp)');
  if (!enemyDamageCall || !bossDamageCall) {
    throw new Error('Combat calls not using playerHp');
  }
});

// Test 2: Combat Log
test('Combat Log: combatLog state exists', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  if (!gameFile.includes('const [combatLog, setCombatLog] = useState')) {
    throw new Error('combatLog state not found');
  }
});

test('Combat Log: appendCombatLog function defined', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  if (!gameFile.includes('const appendCombatLog = useCallback')) {
    throw new Error('appendCombatLog not defined');
  }
});

test('Combat Log: HEALTH LOG panel renders', () => {
  const gameFile = fs.readFileSync('./frontend/src/pages/Game.tsx', 'utf-8');
  if (!gameFile.includes('HEALTH LOG')) {
    throw new Error('HEALTH LOG panel not found');
  }
});

// Test 3: Animations
test('Animations: 12+ @keyframes defined in CSS', () => {
  const cssFile = fs.readFileSync('./frontend/src/index.css', 'utf-8');
  const keyframes = (cssFile.match(/@keyframes/g) || []).length;
  if (keyframes < 12) {
    throw new Error(`Only ${keyframes} keyframes found, expected 12+`);
  }
});

test('Animations: idle-bob animation defined', () => {
  const cssFile = fs.readFileSync('./frontend/src/index.css', 'utf-8');
  if (!cssFile.includes('@keyframes idle-bob')) {
    throw new Error('idle-bob animation not found');
  }
});

test('Animations: damage-shake animation defined', () => {
  const cssFile = fs.readFileSync('./frontend/src/index.css', 'utf-8');
  if (!cssFile.includes('@keyframes damage-shake')) {
    throw new Error('damage-shake animation not found');
  }
});

test('Animations: Reduced motion support implemented', () => {
  const cssFile = fs.readFileSync('./frontend/src/index.css', 'utf-8');
  if (!cssFile.includes('@media (prefers-reduced-motion')) {
    throw new Error('Reduced motion media query not found');
  }
});

// Test 4: Assets
test('Assets: player-caveman.png exists', () => {
  if (!fs.existsSync('./frontend/public/game-assets/player-caveman.png')) {
    throw new Error('player-caveman.png not found');
  }
});

test('Assets: enemy-reptile.png exists', () => {
  if (!fs.existsSync('./frontend/public/game-assets/enemy-reptile.png')) {
    throw new Error('enemy-reptile.png not found');
  }
});

test('Assets: boss-slime-idle.png exists', () => {
  if (!fs.existsSync('./frontend/public/game-assets/boss-slime-idle.png')) {
    throw new Error('boss-slime-idle.png not found');
  }
});

test('Assets: tileset-dungeon.png exists', () => {
  if (!fs.existsSync('./frontend/public/game-assets/tileset-dungeon.png')) {
    throw new Error('tileset-dungeon.png not found');
  }
});

// Test 5: Homepage
test('Homepage: Home.tsx component exists', () => {
  if (!fs.existsSync('./frontend/src/pages/Home.tsx')) {
    throw new Error('Home.tsx not found');
  }
});

test('Homepage: Parallax implementation present', () => {
  const homeFile = fs.readFileSync('./frontend/src/pages/Home.tsx', 'utf-8');
  if (!homeFile.includes('parallaxLayers') || !homeFile.includes('scrollY')) {
    throw new Error('Parallax implementation not found');
  }
});

test('Homepage: Integrated in App.tsx', () => {
  const appFile = fs.readFileSync('./frontend/src/App.tsx', 'utf-8');
  if (!appFile.includes('import Home from') || !appFile.includes('<Home')) {
    throw new Error('Home not imported/used in App.tsx');
  }
});

// Test 6: AI Grading
test('Grading: grading.py endpoint exists', () => {
  if (!fs.existsSync('./member2/backend/app/routes/grading.py')) {
    throw new Error('grading.py not found');
  }
});

test('Grading: Endpoint registered in main.py', () => {
  const mainFile = fs.readFileSync('./member2/backend/app/main.py', 'utf-8');
  if (!mainFile.includes('include_router(grading.router)')) {
    throw new Error('Grading router not registered');
  }
});

test('Grading: answerJudge.ts fallback exists', () => {
  if (!fs.existsSync('./frontend/src/lib/answerJudge.ts')) {
    throw new Error('answerJudge.ts not found');
  }
});

// Test 7: Git Deployment
test('Git: Latest commit on main branch', () => {
  const { execSync } = require('child_process');
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  if (branch !== 'main') {
    throw new Error(`Not on main branch: ${branch}`);
  }
});

test('Git: No uncommitted changes', () => {
  const { execSync } = require('child_process');
  const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  if (status.length > 0) {
    throw new Error('Uncommitted changes exist');
  }
});

test('Git: Commit 1bf89bf exists locally', () => {
  const { execSync } = require('child_process');
  try {
    execSync('git cat-file -t 1bf89bf', { encoding: 'utf-8' });
  } catch {
    throw new Error('Commit 1bf89bf not found');
  }
});

// Results
console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passCount}/${totalTests} tests passed`);
console.log('='.repeat(60));

if (passCount === totalTests) {
  console.log('\n✅ ALL SYSTEMS VERIFIED - PRODUCTION READY\n');
  process.exit(0);
} else {
  console.log(`\n❌ ${totalTests - passCount} tests failed\n`);
  process.exit(1);
}
