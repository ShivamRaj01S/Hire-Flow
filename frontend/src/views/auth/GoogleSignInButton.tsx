import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

type Props = {
  onCredential: (idToken: string) => void;
};

let scriptLoading: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google script failed.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google script failed."));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

export function GoogleSignInButton({ onCredential }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId || !ref.current) return;

    loadGoogleScript()
      .then(() => {
        if (!window.google || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            if (response?.credential) onCredential(response.credential);
          }
        });
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 220
        });
      })
      .catch(() => undefined);
  }, [onCredential]);

  return <div ref={ref} />;
}
