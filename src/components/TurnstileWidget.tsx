import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        theme: 'light';
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
      }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string) => void;
}

const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>();
  const [loadFailed, setLoadFailed] = useState(false);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: 'light',
        callback: onTokenChange,
        'expired-callback': () => onTokenChange(''),
        'error-callback': () => {
          onTokenChange('');
          setLoadFailed(true);
        },
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (window.turnstile) {
      renderWidget();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderWidget);
    } else {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.addEventListener('load', renderWidget);
      script.addEventListener('error', () => setLoadFailed(true));
      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = undefined;
    };
  }, [onTokenChange, siteKey]);

  if (!siteKey) {
    return <p className="text-xs text-rose-700">Güvenlik doğrulaması yapılandırılmadı.</p>;
  }

  if (loadFailed) {
    return <p className="text-xs text-rose-700">Güvenlik doğrulaması yüklenemedi. Lütfen reklam engelleyiciyi kontrol edip tekrar deneyin.</p>;
  }

  return <div ref={containerRef} />;
}