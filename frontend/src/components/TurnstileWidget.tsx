import { useEffect, useId, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (target: string, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface Props {
  resetKey: number;
  onToken: (token: string | null) => void;
}

export default function TurnstileWidget({ resetKey, onToken }: Props) {
  const reactId = useId();
  const elementId = `turnstile-${reactId.replace(/:/g, '')}`;
  const widgetId = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    const render = () => {
      if (!window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(`#${elementId}`, {
        sitekey: siteKey,
        action: 'review-create',
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-budgeats-turnstile]');
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener('load', render, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.budgeatsTurnstile = 'true';
      script.addEventListener('load', render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [elementId, onToken, siteKey]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    onToken(null);
  }, [resetKey, onToken]);

  if (!siteKey) return <p className="review-form-error">CAPTCHA site key가 설정되지 않았습니다.</p>;
  return <div id={elementId} className="review-form-turnstile" />;
}
