import { useEffect, useRef } from "react";
import "./brand-transition.css";

const BRAND_TRANSITION_DURATION = 1400;

export default function BrandTransition({ mode = "entering", onComplete, duration = BRAND_TRANSITION_DURATION }) {
  const callbackRef = useRef(onComplete);

  useEffect(() => {
    callbackRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!callbackRef.current) return undefined;
    const timer = window.setTimeout(() => callbackRef.current?.(), duration);
    return () => window.clearTimeout(timer);
  }, [duration]);

  const exiting = mode === "exiting";
  return <main className={`brand-transition brand-transition--${exiting ? "exiting" : "entering"}`} role="status" aria-live="polite" aria-label={exiting ? "Encerrando sessão" : "Bem-vindo ao Cunha Finance"}>
    <div className="brand-transition__glow" aria-hidden="true" />
    <section className="brand-transition__content">
      <div className="brand-transition__mark" aria-hidden="true">CF</div>
      <h1>Cunha Finance</h1>
      <strong>Gestão Inteligente</strong>
      <p>Transformando dados em decisões.</p>
      <span>{exiting ? "Encerrando sessão..." : "Bem-vindo"}</span>
      <div className="brand-transition__progress" aria-hidden="true"><i /></div>
    </section>
  </main>;
}
