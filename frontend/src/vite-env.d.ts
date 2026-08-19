/// <reference types="vite/client" />

// frontend/.env.example 과 짝을 이룬다. 새 환경변수를 추가하면 양쪽을 함께 갱신할 것.
// 주의: VITE_ 접두사가 붙은 값은 브라우저 번들에 그대로 포함된다. 시크릿을 넣지 말 것.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID: string;
  readonly VITE_MAP_DEFAULT_LAT: string;
  readonly VITE_MAP_DEFAULT_LNG: string;
  readonly VITE_MAP_DEFAULT_ZOOM: string;
  readonly VITE_MAP_DEBOUNCE_MS: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
