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
  const bgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  /* ─── auth ─── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session); setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ─── parallax loop suave ─── */
  useEffect(() => {
    const ease = 0.06;
    const loop = () => {
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * ease;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * ease;
      if (bgRef.current) {
        bgRef.current.style.transform =
          `translate(${currentRef.current.x}px, ${currentRef.current.y}px) scale(1.12)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth: w, innerHeight: h } = window;
    /* mapeia mouse → deslocamento -18px … +18px */
    targetRef.current.x = ((e.clientX / w) - 0.5) * -36;
    targetRef.current.y = ((e.clientY / h) - 0.5) * -28;
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
      <div style={{ position:"relative", zIndex:1 }}><div style={spinner} /></div>
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

      {/* foto de fundo — div separado para filter não afetar card */}
      <div ref={bgRef} style={bgStyle} />

      {/* vinheta nas bordas */}
      <div style={vignette} />

      {/* conteúdo */}
      <div style={content}>

        {/* mini-header */}
        <div style={headerRow}>
          <div style={avatar}>A</div>
          <span style={appName}>Açaí da Patrícia</span>
        </div>

        {/* card */}
        <div style={card}>
          <p style={labelTop}>PAINEL DA LOJA</p>
          <h1 style={title}>Bem-vinda de volta<br /><span style={{ fontSize:26 }}>💜</span></h1>
          <p style={subtitle}>Acesse para gerenciar pedidos e cardápio.</p>

          {/* e-mail */}
          <div style={fieldWrap}>
            <label style={fieldLabel}>E-MAIL</label>
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              type="email" autoComplete="email" placeholder="seu@email.com"
              style={inp}
              onFocus={e => (e.target.style.borderColor = "#A6D45A")}
              onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,.14)")}
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
                style={{ ...inp, paddingRight:70 }}
                onFocus={e => (e.target.style.borderColor = "#A6D45A")}
                onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,.14)")}
              />
              <button onClick={() => setShow(s => !s)} style={showBtn}>
                {show ? "ocultar" : "mostrar"}
              </button>
            </div>
          </div>

          {/* manter + esqueci */}
          <div style={checkRow}>
            <label style={checkLabel}>
              <input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)}
                style={{ accentColor:"#7B3FB0", width:15, height:15, cursor:"pointer" }} />
              <span style={{ color:"#C4B2D8", fontSize:12.5, marginLeft:7 }}>Manter conectada</span>
            </label>
            <span style={forgotLink}>Esqueci a senha</span>
          </div>

          {err && <div style={errBox}>{err}</div>}

          <button onClick={login} disabled={busy} style={{
            ...loginBtn,
            background: busy
              ? "rgba(91,42,136,.4)"
              : "linear-gradient(120deg,#5B2A88,#7B3FB0 60%,#9B57D0)",
            boxShadow: busy ? "none" : "0 8px 28px -8px rgba(91,42,136,.65)",
            cursor: busy ? "not-allowed" : "pointer",
          }}>
            {busy ? "Entrando…" : "Entrar"}
          </button>

          <p style={footer}>
            Acesso exclusivo da equipe · Açaí da Patrícia · Ibiritê–MG
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── estilos ─────────────────────────────────────────────────── */
const root: React.CSSProperties = {
  position:"relative", minHeight:"100vh",
  overflow:"hidden", background:"#0C0512",
  display:"grid", placeItems:"center",
};

/* fundo com scale 1.12 para parallax não mostrar bordas */
const bgStyle: React.CSSProperties = {
  position:"absolute",
  /* -6% em cada lado para esconder bordas ao mover */
  inset:"-6%",
  zIndex:0,
  backgroundImage:"url(/images/patricia-bg.jpg)",
  backgroundSize:"cover",
  backgroundPosition:"center 30%",   /* foco no rosto/busto */
  backgroundColor:"#1A0930",
  filter:"brightness(.48) saturate(1.4)",
  willChange:"transform",
};

/* vinheta radial para dar profundidade */
const vignette: React.CSSProperties = {
  position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
  background:"radial-gradient(ellipse 70% 80% at 50% 50%, transparent 40%, rgba(0,0,0,.55) 100%)",
};

const content: React.CSSProperties = {
  position:"relative", zIndex:2,
  display:"flex", flexDirection:"column",
  alignItems:"center", padding:"24px 16px", width:"100%",
};

const card: React.CSSProperties = {
  width:"100%", maxWidth:370,
  background:"rgba(14,4,26,.80)",
  border:"1px solid rgba(255,255,255,.11)",
  backdropFilter:"blur(22px)", WebkitBackdropFilter:"blur(22px)",
  borderRadius:26, padding:"30px 26px 22px",
  boxShadow:"0 32px 72px -20px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.08)",
};

const headerRow: React.CSSProperties = {
  display:"flex", alignItems:"center", gap:9, marginBottom:20,
};

const avatar: React.CSSProperties = {
  width:34, height:34, borderRadius:9,
  background:"#D4A017", color:"#fff",
  display:"grid", placeItems:"center",
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontWeight:800, fontSize:16,
  boxShadow:"0 4px 12px rgba(212,160,23,.4)",
};

const appName: React.CSSProperties = {
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontWeight:700, fontSize:15.5, color:"#fff",
  letterSpacing:"-.01em",
};

const labelTop: React.CSSProperties = {
  fontSize:10, fontWeight:700, letterSpacing:".14em",
  textTransform:"uppercase", color:"#9B6EC8", marginBottom:7,
};

const title: React.CSSProperties = {
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontSize:27, fontWeight:800, color:"#fff",
  lineHeight:1.2, marginBottom:9,
};

const subtitle: React.CSSProperties = {
  fontSize:13, color:"#9B8AAE", lineHeight:1.55, marginBottom:22,
};

const fieldWrap: React.CSSProperties = { marginBottom:14 };

const fieldLabel: React.CSSProperties = {
  display:"block", fontSize:10, fontWeight:700,
  letterSpacing:".1em", textTransform:"uppercase",
  color:"#7E6698", marginBottom:6,
};

const inp: React.CSSProperties = {
  width:"100%", padding:"13px 16px", borderRadius:13,
  background:"rgba(255,255,255,.07)",
  border:"1px solid rgba(255,255,255,.14)",
  color:"#fff", fontSize:14, outline:"none",
  boxSizing:"border-box", transition:"border-color .18s",
  fontFamily:"inherit",
};

const showBtn: React.CSSProperties = {
  position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
  background:"none", border:"none", color:"#9B6EC8",
  cursor:"pointer", fontSize:12.5, fontWeight:700, padding:4,
};

const checkRow: React.CSSProperties = {
  display:"flex", alignItems:"center", justifyContent:"space-between",
  marginBottom:18, marginTop:2,
};

const checkLabel: React.CSSProperties = {
  display:"flex", alignItems:"center", cursor:"pointer",
};

const forgotLink: React.CSSProperties = {
  fontSize:12.5, fontWeight:700, color:"#A87ACA", cursor:"pointer",
};

const errBox: React.CSSProperties = {
  fontSize:12, fontWeight:600, color:"#F07BA0",
  background:"rgba(240,123,160,.1)", border:"1px solid rgba(240,123,160,.2)",
  borderRadius:10, padding:"8px 12px", marginBottom:14,
};

const loginBtn: React.CSSProperties = {
  width:"100%", padding:"14px", borderRadius:15,
  border:"none", color:"#fff", fontWeight:700, fontSize:15,
  letterSpacing:".01em", transition:"opacity .2s, box-shadow .2s",
  fontFamily:"'Bricolage Grotesque',sans-serif",
};

const footer: React.CSSProperties = {
  textAlign:"center", fontSize:11, color:"#5A426C",
  marginTop:17, lineHeight:1.6,
};

const spinner: React.CSSProperties = {
  width:42, height:42, borderRadius:"50%",
  border:"3px solid rgba(166,212,90,.2)",
  borderTopColor:"#A6D45A",
  animation:"spin .8s linear infinite",
};

const sairBtn: React.CSSProperties = {
  position:"fixed", top:10, right:12, zIndex:9999,
  padding:"6px 14px", borderRadius:10, border:"none",
  background:"rgba(0,0,0,.45)", backdropFilter:"blur(8px)",
  color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer",
};

const css = `
  @keyframes spin { to { transform: rotate(360deg) } }
  * { margin:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent }
  body { font-family:'DM Sans',system-ui,sans-serif; overflow:hidden }
  input::placeholder { color:rgba(255,255,255,.25) }
  input { caret-color:#A6D45A }
`;
