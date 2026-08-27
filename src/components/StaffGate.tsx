"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export function StaffGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady]     = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [err, setErr]         = useState<string | null>(null);
  const [busy, setBusy]       = useState(false);
  const [show, setShow]       = useState(false);
  const [keep, setKeep]       = useState(false);
  const bgRef      = useRef<HTMLDivElement>(null);
  const rafRef     = useRef<number>(0);
  const targetRef  = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  /* ─── auth ─── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ─── parallax suave ─── */
  useEffect(() => {
    const ease = 0.06;
    const loop = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * ease;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * ease;
      if (bgRef.current) {
        bgRef.current.style.transform =
          `translate(${currentRef.current.x}px, ${currentRef.current.y}px) scale(1.14)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth: w, innerHeight: h } = window;
    targetRef.current.x = ((e.clientX / w) - 0.5) * -30;
    targetRef.current.y = ((e.clientY / h) - 0.5) * -22;
  };

  const login = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr("E-mail ou senha inválidos.");
    setBusy(false);
  };

  /* ─── loading ─── */
  if (!ready) return (
    <div style={root} onMouseMove={onMouseMove}>
      <style>{css}</style>
      <div ref={bgRef} style={bgStyle} />
      <div style={overlay} />
      <div style={vignette} />
      <div style={{ position:"relative", zIndex:2 }}><div style={spinner} /></div>
    </div>
  );

  /* ─── autenticado ─── */
  if (session) return (
    <>
      {children}
      <button onClick={() => supabase.auth.signOut()} style={sairBtn}>Sair</button>
    </>
  );

  /* ─── login ─── */
  return (
    <div style={root} onMouseMove={onMouseMove}>
      <style>{css}</style>

      {/* foto de fundo — cover com foco em Patricia */}
      <div ref={bgRef} style={bgStyle} />

      {/* gradiente direcional — escurece borda direita */}
      <div style={overlay} />

      {/* vinheta radial suave */}
      <div style={vignette} />

      {/* conteúdo */}
      <div style={content}>

        {/* marca no topo */}
        <div style={brandRow}>
          <div style={brandDot}>A</div>
          <span style={brandName}>Açaí da Patrícia</span>
          <span style={brandCity}>Ibirité · MG</span>
        </div>

        {/* card principal */}
        <div style={card} className="cardIn">

          {/* topo do card */}
          <div style={cardTop}>
            <span style={labelTop}>PAINEL DA LOJA</span>
            <div style={glowBadge}>Staff</div>
          </div>

          <h1 style={title}>Bem-vinda de volta 💜</h1>
          <p style={subtitle}>Entre para gerenciar pedidos e cardápio.</p>

          {/* e-mail */}
          <div style={fieldWrap}>
            <label style={fieldLabel}>E-MAIL</label>
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              type="email" autoComplete="email" placeholder="seu@email.com"
              style={inp}
              onFocus={e => { e.target.style.borderColor="#9B6EC8"; e.target.style.boxShadow="0 0 0 3px rgba(123,63,176,.18)"; }}
              onBlur={e  => { e.target.style.borderColor="rgba(255,255,255,.13)"; e.target.style.boxShadow="none"; }}
            />
          </div>

          {/* senha */}
          <div style={fieldWrap}>
            <label style={fieldLabel}>SENHA</label>
            <div style={{ position:"relative" }}>
              <input
                value={pass} onChange={e => setPass(e.target.value)}
                type={show ? "text" : "password"}
                autoComplete="current-password" placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && login()}
                style={{ ...inp, paddingRight:74 }}
                onFocus={e => { e.target.style.borderColor="#9B6EC8"; e.target.style.boxShadow="0 0 0 3px rgba(123,63,176,.18)"; }}
                onBlur={e  => { e.target.style.borderColor="rgba(255,255,255,.13)"; e.target.style.boxShadow="none"; }}
              />
              <button onClick={() => setShow(s => !s)} style={showBtn} tabIndex={-1}>
                {show ? "ocultar" : "mostrar"}
              </button>
            </div>
          </div>

          {/* manter + esqueci */}
          <div style={checkRow}>
            <label style={checkLabel}>
              <input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)}
                style={{ accentColor:"#7B3FB0", width:15, height:15, cursor:"pointer" }} />
              <span style={{ color:"#B09CC8", fontSize:12.5, marginLeft:7 }}>Manter conectada</span>
            </label>
            <span style={forgotLink}>Esqueci a senha</span>
          </div>

          {err && <div style={errBox}>{err}</div>}

          <button
            onClick={login} disabled={busy}
            style={{
              ...loginBtn,
              opacity: busy ? .55 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>

          <div style={divider} />

          <p style={footer}>Acesso exclusivo da equipe · Açaí da Patrícia · Ibirité–MG</p>
        </div>
      </div>
    </div>
  );
}

/* ─── estilos ──────────────────────────────────────────────── */

const root: React.CSSProperties = {
  position:"relative", minHeight:"100vh", overflow:"hidden",
  background:"#080210",
  display:"grid", placeItems:"center",
};

/* cover + foco no lado esquerdo onde está Patricia */
const bgStyle: React.CSSProperties = {
  position:"absolute",
  inset:"-8%",
  zIndex:0,
  backgroundImage:"url(/images/patricia-bg.jpg)",
  backgroundSize:"cover",
  backgroundPosition:"28% center",
  filter:"brightness(.62) saturate(1.25)",
  willChange:"transform",
};

/* escurece bordas e lado direito (onde fica o texto promocional do banner) */
const overlay: React.CSSProperties = {
  position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
  background:[
    "linear-gradient(to right, rgba(5,1,14,.72) 0%, rgba(5,1,14,.08) 28%, rgba(5,1,14,.35) 60%, rgba(5,1,14,.90) 100%)",
    "linear-gradient(to bottom, rgba(5,1,14,.55) 0%, transparent 25%, transparent 75%, rgba(5,1,14,.7) 100%)",
  ].join(","),
};

/* vinheta radial para profundidade */
const vignette: React.CSSProperties = {
  position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
  background:"radial-gradient(ellipse 72% 82% at 50% 50%, transparent 35%, rgba(0,0,0,.52) 100%)",
};

const content: React.CSSProperties = {
  position:"relative", zIndex:2,
  display:"flex", flexDirection:"column",
  alignItems:"center", padding:"28px 16px", width:"100%",
};

/* ── marca ── */
const brandRow: React.CSSProperties = {
  display:"flex", alignItems:"center", gap:9,
  marginBottom:22,
};

const brandDot: React.CSSProperties = {
  width:34, height:34, borderRadius:9,
  background:"linear-gradient(135deg,#C49014,#E8B130)",
  color:"#fff", display:"grid", placeItems:"center",
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontWeight:800, fontSize:16,
  boxShadow:"0 4px 14px rgba(212,160,23,.45)",
  flexShrink:0,
};

const brandName: React.CSSProperties = {
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontWeight:700, fontSize:15.5, color:"#fff",
  letterSpacing:"-.01em",
};

const brandCity: React.CSSProperties = {
  fontSize:10.5, fontWeight:700, letterSpacing:".06em",
  color:"rgba(255,255,255,.38)", textTransform:"uppercase",
  marginLeft:4,
};

/* ── card ── */
const card: React.CSSProperties = {
  width:"100%", maxWidth:376,
  background:"rgba(10,3,22,.82)",
  border:"1px solid rgba(255,255,255,.09)",
  backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)",
  borderRadius:28, padding:"28px 26px 22px",
  boxShadow:[
    "0 40px 80px -24px rgba(0,0,0,.85)",
    "0 0 0 1px rgba(123,63,176,.22)",
    "inset 0 1px 0 rgba(255,255,255,.07)",
  ].join(","),
};

const cardTop: React.CSSProperties = {
  display:"flex", alignItems:"center",
  justifyContent:"space-between", marginBottom:14,
};

const labelTop: React.CSSProperties = {
  fontSize:10, fontWeight:700, letterSpacing:".15em",
  textTransform:"uppercase", color:"#7B5BA8",
};

const glowBadge: React.CSSProperties = {
  fontSize:10, fontWeight:800, letterSpacing:".08em",
  padding:"3px 9px", borderRadius:99,
  background:"rgba(123,63,176,.2)",
  border:"1px solid rgba(123,63,176,.35)",
  color:"#C09FD8",
};

const title: React.CSSProperties = {
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontSize:26, fontWeight:800, color:"#fff",
  lineHeight:1.2, marginBottom:8,
};

const subtitle: React.CSSProperties = {
  fontSize:13, color:"#8C7BAA", lineHeight:1.55, marginBottom:22,
};

const fieldWrap: React.CSSProperties = { marginBottom:14 };

const fieldLabel: React.CSSProperties = {
  display:"block", fontSize:9.5, fontWeight:700,
  letterSpacing:".12em", textTransform:"uppercase",
  color:"#6A5480", marginBottom:6,
};

const inp: React.CSSProperties = {
  width:"100%", padding:"13px 16px", borderRadius:13,
  background:"rgba(255,255,255,.055)",
  border:"1px solid rgba(255,255,255,.13)",
  color:"#fff", fontSize:14, outline:"none",
  boxSizing:"border-box", transition:"border-color .15s, box-shadow .15s",
  fontFamily:"inherit",
};

const showBtn: React.CSSProperties = {
  position:"absolute", right:13, top:"50%", transform:"translateY(-50%)",
  background:"none", border:"none", color:"#8B5FC8",
  cursor:"pointer", fontSize:12, fontWeight:700, padding:4, letterSpacing:".02em",
};

const checkRow: React.CSSProperties = {
  display:"flex", alignItems:"center", justifyContent:"space-between",
  marginBottom:18, marginTop:2,
};

const checkLabel: React.CSSProperties = {
  display:"flex", alignItems:"center", cursor:"pointer",
};

const forgotLink: React.CSSProperties = {
  fontSize:12.5, fontWeight:700, color:"#9B6EC8", cursor:"pointer",
  letterSpacing:".01em",
};

const errBox: React.CSSProperties = {
  fontSize:12, fontWeight:600, color:"#F07BA0",
  background:"rgba(240,123,160,.08)", border:"1px solid rgba(240,123,160,.2)",
  borderRadius:10, padding:"8px 12px", marginBottom:14,
};

const loginBtn: React.CSSProperties = {
  width:"100%", padding:"14px",
  borderRadius:14, border:"none", color:"#fff",
  fontWeight:800, fontSize:15, letterSpacing:".02em",
  background:"linear-gradient(120deg,#4A1E7A 0%,#7B3FB0 55%,#9B57D0 100%)",
  boxShadow:"0 10px 30px -10px rgba(91,42,136,.7), inset 0 1px 0 rgba(255,255,255,.15)",
  fontFamily:"'Bricolage Grotesque',sans-serif",
  transition:"opacity .2s",
};

const divider: React.CSSProperties = {
  height:1, margin:"18px 0 14px",
  background:"linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent)",
};

const footer: React.CSSProperties = {
  textAlign:"center", fontSize:11, color:"#40304E",
  lineHeight:1.6,
};

const spinner: React.CSSProperties = {
  width:44, height:44, borderRadius:"50%",
  border:"3px solid rgba(155,87,208,.18)",
  borderTopColor:"#9B57D0",
  animation:"spin .8s linear infinite",
};

const sairBtn: React.CSSProperties = {
  position:"fixed", top:10, right:12, zIndex:9999,
  padding:"6px 14px", borderRadius:10, border:"none",
  background:"rgba(0,0,0,.5)", backdropFilter:"blur(10px)",
  color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer",
};

const css = `
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes cardIn {
    from { opacity:0; transform:translateY(18px) scale(.98) }
    to   { opacity:1; transform:translateY(0)    scale(1)    }
  }
  .cardIn { animation: cardIn .45s cubic-bezier(.22,.68,0,1.2) both }
  * { margin:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent }
  body { font-family:'DM Sans',system-ui,sans-serif; overflow:hidden }
  input::placeholder { color:rgba(255,255,255,.22) }
  input { caret-color:#9B57D0 }
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 40px rgba(10,3,22,.98) inset !important;
    -webkit-text-fill-color: #fff !important;
    caret-color: #9B57D0;
  }
`;
