import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 포트가 점유되면 조용히 5174로 옮기지 말고 실패시킨다.
    // 구글 지도 키에 리퍼러 제한(localhost:5173)이 걸려 있어, 포트가 밀리면
    // RefererNotAllowedMapError로 지도만 안 뜨고 원인 찾기가 어렵다.
    strictPort: true,
  },
  test: {
    // 현재 테스트는 API 레이어 로직만 다루므로 DOM 환경이 필요 없다.
    // 컴포넌트 테스트를 추가할 때 jsdom과 testing-library를 함께 도입한다.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
