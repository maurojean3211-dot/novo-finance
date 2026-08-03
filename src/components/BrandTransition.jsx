import { useEffect, useRef } from "react";
import "./brand-transition.css";

const BRAND_TRANSITION_DURATION = 1400;
const BRAND_TRANSITION_FALLBACK_DURATION = 2500;

export default function BrandTransition({
  mode = "entering",
  onComplete,
  onFallback,
  duration = BRAND_TRANSITION_DURATION,
  fallbackDuration = BRAND_TRANSITION_FALLBACK_DURATION,
}) {
  const callbackRef = useRef(onComplete);
  const fallbackRef = useRef(onFallback);
  const hasCompletionCallback = typeof onComplete === "function";

  useEffect(() => {
    callbackRef.current = onComplete;
    fallbackRef.current = onFallback;
  }, [onComplete, onFallback]);

  useEffect(() => {
    if (!hasCompletionCallback) return undefined;
    const timer = window.setTimeout(() => callbackRef.current?.(), duration);
    const fallbackTimer = window.setTimeout(() => fallbackRef.current?.(), fallbackDuration);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fallbackTimer);
    };
  }, [duration, fallbackDuration, hasCompletionCallback]);

  const exiting = mode === "exiting";
  const statusMessage = exiting
    ? "Encerrando sessão..."
    : mode === "loading"
      ? "Iniciando ambiente seguro..."
      : "Bem-vindo";

  return <main className={`brand-transition brand-transition--${mode}`} role="status" aria-live="polite" aria-label={statusMessage}>
    <div className="brand-transition__glow" aria-hidden="true" />
    <section className="brand-transition__content">
      <div className="brand-transition__mark" aria-hidden="true">CF</div>
      <h1>Cunha Finance</h1>
      <strong>Gestão Inteligente</strong>
      <p>Transformando dados em decisões.</p>
      <span>{statusMessage}</span>
      <div className="brand-transition__progress" aria-hidden="true"><i /></div>
    </section>
  </main>;
}
