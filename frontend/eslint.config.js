import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // CLAUDE.md 3.2절: 토큰을 브라우저 저장소에 두는 코드를 금지한다.
      // 리뷰에서 놓치기 쉬운 항목이라 린트로 막는다.
      'no-restricted-globals': [
        'error',
        {
          name: 'localStorage',
          message: '토큰·인증 정보를 저장할 수 없습니다. 세션은 HttpOnly 쿠키로만 유지합니다 (CLAUDE.md 3.2절).',
        },
        {
          name: 'sessionStorage',
          message: '토큰·인증 정보를 저장할 수 없습니다. 세션은 HttpOnly 쿠키로만 유지합니다 (CLAUDE.md 3.2절).',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: '토큰·인증 정보를 저장할 수 없습니다 (CLAUDE.md 3.2절).',
        },
        {
          object: 'window',
          property: 'sessionStorage',
          message: '토큰·인증 정보를 저장할 수 없습니다 (CLAUDE.md 3.2절).',
        },
      ],
    },
  },
  {
    // src/api 는 백엔드 통신을 담당하므로 fetch 사용이 허용된 유일한 위치다.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/api/**'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: '백엔드 통신은 src/api 레이어를 경유해야 합니다 (frontend/CLAUDE.md).',
        },
        {
          name: 'localStorage',
          message: '토큰·인증 정보를 저장할 수 없습니다 (CLAUDE.md 3.2절).',
        },
        {
          name: 'sessionStorage',
          message: '토큰·인증 정보를 저장할 수 없습니다 (CLAUDE.md 3.2절).',
        },
      ],
    },
  },
);
