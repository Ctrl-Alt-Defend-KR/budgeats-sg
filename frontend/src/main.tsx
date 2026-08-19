import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './hooks/useAuth';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root 엘리먼트를 찾을 수 없습니다.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider><App /></AuthProvider>
  </StrictMode>,
);
