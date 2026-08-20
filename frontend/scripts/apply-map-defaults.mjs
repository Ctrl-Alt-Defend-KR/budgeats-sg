#!/usr/bin/env node
/**
 * 지도 기본값(시작 좌표·줌)을 각자의 .env.local 에 적용한다.
 *
 * 사용법:
 *   cd frontend
 *   node scripts/apply-map-defaults.mjs
 *
 * 왜 스크립트인가:
 *   .env.local 은 커밋되지 않으므로 git pull 로는 값이 전달되지 않는다.
 *   손으로 고치면 (1) 자기 API 키를 실수로 지우거나 (2) 같은 키가 중복되기 쉽다.
 *   이 스크립트는 아래 세 줄만 손대고 나머지는 건드리지 않는다.
 *
 * 여러 번 실행해도 안전하다(멱등). 수정 전 .env.local.bak 을 남긴다.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 적용할 값. 시작 지점은 마리나 베이 샌즈, 줌 15는 화면 세로 기준 반경 약 2km. */
const TARGET = {
  VITE_MAP_DEFAULT_LAT: '1.2834',
  VITE_MAP_DEFAULT_LNG: '103.8607',
  VITE_MAP_DEFAULT_ZOOM: '15',
};

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(frontendDir, '.env.local');
const examplePath = resolve(frontendDir, '.env.example');

if (!existsSync(envPath)) {
  if (!existsSync(examplePath)) {
    console.error('✗ .env.local 도 .env.example 도 없습니다. frontend 디렉토리에서 실행했는지 확인하세요.');
    process.exit(1);
  }
  copyFileSync(examplePath, envPath);
  console.log('· .env.local 이 없어 .env.example 을 복사했습니다.');
  console.log('  ⚠️  VITE_GOOGLE_MAPS_API_KEY 등 키 값은 직접 채워야 합니다.');
}

const original = readFileSync(envPath, 'utf8');
copyFileSync(envPath, `${envPath}.bak`);

/**
 * 파일이 쓰는 줄바꿈을 그대로 따라간다.
 * Windows 는 git 이 기본으로 CRLF 로 체크아웃하므로, 새 줄을 LF 로 붙이면
 * 한 파일 안에 두 방식이 섞인다. 동작은 하지만 이후 편집·diff 가 지저분해진다.
 */
const eol = original.includes('\r\n') ? '\r\n' : '\n';

let text = original;
const changes = [];

for (const [key, value] of Object.entries(TARGET)) {
  // 주석(#로 시작)은 건드리지 않고, 해당 키의 마지막 정의만 교체한다.
  const line = new RegExp(`^${key}=.*$`, 'm');

  if (line.test(text)) {
    const before = text.match(line)[0];
    if (before === `${key}=${value}`) {
      changes.push(`  = ${key} (이미 ${value})`);
      continue;
    }
    text = text.replace(line, `${key}=${value}`);
    changes.push(`  ↻ ${before}  →  ${key}=${value}`);
  } else {
    text = `${text.replace(/[\r\n]*$/, '')}${eol}${key}=${value}${eol}`;
    changes.push(`  + ${key}=${value} (새로 추가)`);
  }
}

if (text === original) {
  console.log('\n이미 최신 설정입니다. 변경 없음.\n');
  process.exit(0);
}

writeFileSync(envPath, text);

console.log('\n지도 기본값을 적용했습니다:\n');
console.log(changes.join('\n'));
console.log(`\n원본은 .env.local.bak 에 백업했습니다.`);
console.log('개발 서버가 떠 있으면 재시작해야 반영됩니다 (npm run dev).\n');
