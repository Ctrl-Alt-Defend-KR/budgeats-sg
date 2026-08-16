import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    // 현재 테스트는 API 레이어 로직만 다루므로 DOM 환경이 필요 없다.
    // 컴포넌트 테스트를 추가할 때 jsdom과 testing-library를 함께 도입한다.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
