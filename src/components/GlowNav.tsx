"use client";
import { useEffect, useRef } from "react";

type Props = {
  tabs: string[];
  active: number;
  onChange: (i: number) => void;
};

const INK = "#B49BC6";
const BG1 = "#3A1556";
const BG2 = "#26103A";

export function GlowNav({ tabs, active, onChange }: Props) {
  const navRef  = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef  = useRef<SVGSVGElement>(null);

  // onChange em ref para não re-disparar o efeito quando o pai re-renderiza
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const state = useRef({
    Lx: 0, Rx: 0, vL: 0, vR: 0, laid: false,
    rects: [] as { left: number; right: number; top: number; height: number }[],
    navH: 56, active,
    dragging: false,
  });

  // mantém aba alvo sincronizada
  state.current.active = active;

  useEffect(() => {
    const nav = navRef.current;
    const svg = svgRef.current;
    if (!nav || !svg) return;

    /* ---------- medição ---------- */
    const measure = () => {
      const nr = nav.getBoundingClientRect();
      const rects = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-tab]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left - nr.left, right: r.right - nr.left, top: r.top - nr.top, height: r.height };
      });
      state.current.rects = rects;
      state.current.navH = nr.height;
      svg.setAttribute("viewBox", `0 0 ${nr.width} ${nr.height}`);
      if (!state.current.laid && rects[active]) {
        state.current.Lx = rects[active].left;
        state.current.Rx = rects[active].right;
        state.current.laid = true;
      }
    };
    measure();
    window.addEventListener("resize", measure);

    /* ---------- utilitário: cor das abas ---------- */
    const paintTabs = (idx: number) => {
      nav.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((el, i) => {
        el.style.color = i === idx ? "#fff" : INK;
      });
    };

    /* ---------- drag ---------- */
    const dragMove = (e: PointerEvent) => {
      const nr = nav.getBoundingClientRect();
      const x = e.clientX - nr.left;
      const rects = state.current.rects;

      // aba sob o dedo
      let idx = rects.findIndex((t) => x >= t.left && x <= t.right);
      if (idx < 0) {
        const centers = rects.map((t) => (t.left + t.right) / 2);
        idx = x < centers[0] ? 0 : rects.length - 1;
      }

      if (idx !== state.current.active) {
        state.current.active = idx;
        paintTabs(idx);
      }

      // puxa o facho para o dedo (efeito elástico)
      if (rects[idx]) {
        const half = (rects[idx].right - rects[idx].left) / 2;
        state.current.Lx = x - half;
        state.current.Rx = x + half;
        state.current.vL = 0;
        state.current.vR = 0;
      }
    };

    const onDown = (e: PointerEvent) => {
      state.current.dragging = true;
      nav.setPointerCapture(e.pointerId);
      dragMove(e);
    };
    const onMove = (e: PointerEvent) => { if (state.current.dragging) dragMove(e); };
    const onUp   = () => {
      if (!state.current.dragging) return;
      state.current.dragging = false;
      onChangeRef.current(state.current.active);
    };

    nav.addEventListener("pointerdown", onDown);
    nav.addEventListener("pointermove", onMove);
    nav.addEventListener("pointerup",   onUp);
    nav.addEventListener("pointercancel", onUp);

    /* ---------- loop de física (mola) ---------- */
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const s = state.current;

      if (!s.dragging && s.rects[s.active]) {
        const t = s.rects[s.active];
        const curC = (s.Lx + s.Rx) / 2, tgtC = (t.left + t.right) / 2;
        const right = tgtC > curC;
        const kLead = 430, dLead = 34, kTrail = 150, dTrail = 24;
        const kR = right ? kLead : kTrail, dR = right ? dLead : dTrail;
        const kL = right ? kTrail : kLead, dL = right ? dTrail : dLead;
        s.vL += (-kL * (s.Lx - t.left)  - dL * s.vL) * dt; s.Lx += s.vL * dt;
        s.vR += (-kR * (s.Rx - t.right) - dR * s.vR) * dt; s.Rx += s.vR * dt;
      }

      const path = pathRef.current;
      const t = s.rects[s.active];
      if (path && t) {
        const rad = t.height / 2 + 2, cy = t.top + t.height / 2;
        const left = Math.min(s.Lx, s.Rx), rightX = Math.max(s.Lx, s.Rx);
        const x = left, w = Math.max(rad * 2, rightX - left), span = rightX - left;
        const y = cy - rad, r = rad, x2 = x + w;
        path.setAttribute("d", `M ${x+r} ${y} L ${x2-r} ${y} A ${r} ${r} 0 0 1 ${x2-r} ${y+2*r} L ${x+r} ${y+2*r} A ${r} ${r} 0 0 1 ${x+r} ${y} Z`);
        path.setAttribute("stroke-width", (2.2 + Math.min(span / 120, 1) * 1.5).toFixed(2));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      nav.removeEventListener("pointerdown",   onDown);
      nav.removeEventListener("pointermove",   onMove);
      nav.removeEventListener("pointerup",     onUp);
      nav.removeEventListener("pointercancel", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div
      ref={navRef}
      style={{
        position: "relative", display: "flex", gap: 4, padding: 6, borderRadius: 999,
        background: `linear-gradient(160deg,${BG1},${BG2})`,
        border: "1px solid rgba(166,212,90,.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.06),0 12px 30px -16px rgba(42,14,63,.8)",
        touchAction: "none",
      }}
    >
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 1 }}>
        <defs>
          <linearGradient id="glowlit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0"  stopColor="#7B3FB0" />
            <stop offset=".5" stopColor="#A6D45A" />
            <stop offset="1"  stopColor="#7B3FB0" />
          </linearGradient>
        </defs>
        <path
          ref={pathRef}
          fill="none"
          stroke="url(#glowlit)"
          strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 3px rgba(166,212,90,.9)) drop-shadow(0 0 9px rgba(123,63,176,.85))" }}
        />
      </svg>

      {tabs.map((label, i) => (
        <button
          key={label}
          data-tab
          aria-selected={i === active}
          onClick={() => onChangeRef.current(i)}
          style={{
            position: "relative", zIndex: 2, flex: 1, border: "none", background: "transparent",
            color: i === active ? "#fff" : INK, fontSize: 12.5, fontWeight: 700,
            padding: "11px 6px", borderRadius: 999, cursor: "pointer",
            transition: "color .3s", whiteSpace: "nowrap", userSelect: "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
