"use client";
import { useId } from "react";

/* Logo SVG da Açaí da Patrícia — berries glossy + wordmark */
export function BrandLogo({ scale = 1 }: { scale?: number }) {
  const uid = useId().replace(/:/g, "");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * scale }}>
      {/* ---- Ícone de berries ---- */}
      <div style={{ position: "relative", flex: "none" }}>
        {/* glow por trás */}
        <div style={{
          position: "absolute", inset: -10 * scale,
          background: "radial-gradient(circle at 45% 40%, rgba(166,212,90,0.28) 0%, rgba(123,63,176,0.18) 45%, transparent 70%)",
          filter: `blur(${8 * scale}px)`,
          pointerEvents: "none",
        }} />
        <svg width={64 * scale} height={68 * scale} viewBox="0 0 64 68" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Berry 1 — grande, roxo→lima (destaque da marca) */}
            <radialGradient id={`${uid}b1`} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
              <stop offset="0%"  stopColor="#C4E870" />
              <stop offset="38%" stopColor="#8B3FC8" />
              <stop offset="100%" stopColor="#2A0E3F" />
            </radialGradient>
            {/* Berry 2 — médio, roxo */}
            <radialGradient id={`${uid}b2`} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
              <stop offset="0%"  stopColor="#A468D8" />
              <stop offset="100%" stopColor="#2A0E3F" />
            </radialGradient>
            {/* Berry 3 — pequeno, roxo escuro */}
            <radialGradient id={`${uid}b3`} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
              <stop offset="0%"  stopColor="#7848B0" />
              <stop offset="100%" stopColor="#1A0828" />
            </radialGradient>
            {/* Folha */}
            <linearGradient id={`${uid}lf`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#C4E870" />
              <stop offset="100%" stopColor="#5A9E28" />
            </linearGradient>
          </defs>

          {/* Berry 1 — grande, esquerda */}
          <circle cx="20" cy="44" r="19" fill={`url(#${uid}b1)`} />
          {/* Berry 2 — topo direita */}
          <circle cx="42" cy="24" r="16" fill={`url(#${uid}b2)`} />
          {/* Berry 3 — baixo direita */}
          <circle cx="50" cy="52" r="13" fill={`url(#${uid}b3)`} />

          {/* Folha */}
          <path d="M 48 6 Q 62 0 64 14 Q 50 12 48 6Z" fill={`url(#${uid}lf)`} />
          {/* Caule */}
          <path d="M 50 8 C 48 12 44 16 42 20" stroke="#7FB53E" strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* Brilhos (reflex esférico) */}
          <circle cx="14" cy="36" r="5.5" fill="white" opacity="0.22" />
          <circle cx="36" cy="17" r="4"   fill="white" opacity="0.2" />
          <circle cx="44" cy="46" r="3.5" fill="white" opacity="0.16" />

          {/* Mini-reflexo secundário */}
          <circle cx="18" cy="39" r="2.5" fill="white" opacity="0.12" />
          <circle cx="40" cy="20" r="1.8" fill="white" opacity="0.1" />
        </svg>
      </div>

      {/* ---- Wordmark ---- */}
      <div>
        <div className="disp" style={{
          fontWeight: 800,
          fontSize: 26 * scale,
          lineHeight: 1.05,
          color: "#fff",
          letterSpacing: "-0.025em",
        }}>
          Açaí da<br />Patrícia
        </div>
        <div style={{
          fontWeight: 700,
          fontSize: 9.5 * scale,
          letterSpacing: "0.22em",
          color: "#A6D45A",
          marginTop: 5 * scale,
          textTransform: "uppercase",
        }}>
          Ibirité · MG
        </div>
      </div>
    </div>
  );
}

/* Versão compacta para o header colapsado */
export function BrandLogoMini() {
  const uid = useId().replace(/:/g, "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width={28} height={30} viewBox="0 0 64 68" fill="none">
        <defs>
          <radialGradient id={`${uid}m1`} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <stop offset="0%"  stopColor="#C4E870" />
            <stop offset="38%" stopColor="#8B3FC8" />
            <stop offset="100%" stopColor="#2A0E3F" />
          </radialGradient>
          <radialGradient id={`${uid}m2`} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <stop offset="0%"  stopColor="#A468D8" />
            <stop offset="100%" stopColor="#2A0E3F" />
          </radialGradient>
          <radialGradient id={`${uid}m3`} cx="38%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
            <stop offset="0%"  stopColor="#7848B0" />
            <stop offset="100%" stopColor="#1A0828" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="44" r="19" fill={`url(#${uid}m1)`} />
        <circle cx="42" cy="24" r="16" fill={`url(#${uid}m2)`} />
        <circle cx="50" cy="52" r="13" fill={`url(#${uid}m3)`} />
        <path d="M 48 6 Q 62 0 64 14 Q 50 12 48 6Z" fill="#A6D45A" />
        <circle cx="14" cy="36" r="5" fill="white" opacity="0.22" />
        <circle cx="36" cy="17" r="3.5" fill="white" opacity="0.18" />
      </svg>
      <span className="disp" style={{ fontWeight: 800, fontSize: 15, color: "#fff", letterSpacing: "-0.01em" }}>
        Açaí da Patrícia
      </span>
    </div>
  );
}
