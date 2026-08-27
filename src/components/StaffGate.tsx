"use client";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr("E-mail ou senha inválidos.");
    setBusy(false);
  };

  /* ─── loading ─────────────────────────────────────────────── */
  if (!ready) return (
    <div style={bg}>
      <style>{css}</style>
      <div style={spinner} />
    </div>
  );

  /* ─── autenticado ─────────────────────────────────────────── */
  if (session) return (
    <>
      {children}
      <button onClick={() => supabase.auth.signOut()} style={sairBtn}>Sair</button>
    </>
  );

  /* ─── login ───────────────────────────────────────────────── */
  return (
    <div style={bg}>
      <style>{css}</style>

      {/* mini-header */}
      <div style={headerRow}>
        <div style={avatar}>A</div>
        <span style={appName}>Açaí da Patrícia</span>
      </div>

      {/* card */}
      <div style={card}>
        {/* topo */}
        <p style={label}>PAINEL DA LOJA</p>
        <h1 style={title}>Bem-vinda de volta<br/>💜</h1>
        <p style={sub}>Acesse para gerenciar pedidos e cardápio.</p>

        {/* e-mail */}
        <div style={fieldWrap}>
          <label style={fieldLabel}>E-MAIL</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            style={input}
            onFocus={e => (e.target.style.borderColor = "#A6D45A")}
            onBlur={e  => (e.target.style.borderColor = "rgba(255,255,255,.14)")}
          />
        </div>

        {/* senha */}
        <div style={fieldWrap}>
          <label style={fieldLabel}>SENHA</label>
          <div style={{ position:"relative" }}>
            <input
              value={pass}
              onChange={e => setPass(e.target.value)}
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              onKeyDown={e => e.key === "Enter" && login()}
              style={{ ...input, paddingRight:70 }}
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
            <span style={{ color:"#C4B2D8", fontSize:12.5, marginLeft:6 }}>Manter conectada</span>
          </label>
          <span style={forgotLink}>Esqueci a senha</span>
        </div>

        {err && (
          <div style={errBox}>{err}</div>
        )}

        {/* botão */}
        <button onClick={login} disabled={busy} style={{
          ...loginBtn,
          background: busy ? "rgba(91,42,136,.4)" : "linear-gradient(120deg,#5B2A88,#7B3FB0 60%,#9B57D0)",
          boxShadow:  busy ? "none" : "0 8px 28px -8px rgba(91,42,136,.65)",
          cursor: busy ? "not-allowed" : "pointer",
        }}>
          {busy ? "Entrando…" : "Entrar"}
        </button>

        {/* rodapé */}
        <p style={footer}>
          Acesso exclusivo da equipe · Açaí da Patrícia · Ibiritê–MG
        </p>
      </div>
    </div>
  );
}

/* ─── estilos ─────────────────────────────────────────────────── */
const bg: React.CSSProperties = {
  minHeight:"100vh",
  display:"flex", flexDirection:"column",
  alignItems:"center", justifyContent:"center",
  padding:"24px 16px",
  backgroundImage:"url(/images/patricia-bg.jpg)",
  backgroundSize:"cover", backgroundPosition:"center top",
  backgroundColor:"#1A0930",
  position:"relative",
};

const card: React.CSSProperties = {
  position:"relative", width:"100%", maxWidth:360,
  background:"rgba(18,6,34,.72)",
  border:"1px solid rgba(255,255,255,.10)",
  backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
  borderRadius:24, padding:"28px 24px 20px",
  boxShadow:"0 24px 60px -16px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.07)",
};

const headerRow: React.CSSProperties = {
  display:"flex", alignItems:"center", gap:8,
  marginBottom:18, position:"relative",
};

const avatar: React.CSSProperties = {
  width:32, height:32, borderRadius:8,
  background:"#D4A017", color:"#fff",
  display:"grid", placeItems:"center",
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontWeight:800, fontSize:15,
};

const appName: React.CSSProperties = {
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontWeight:700, fontSize:15, color:"#fff",
};

const label: React.CSSProperties = {
  fontSize:10, fontWeight:700, letterSpacing:".12em",
  textTransform:"uppercase", color:"#9B6EC8", marginBottom:8,
};

const title: React.CSSProperties = {
  fontFamily:"'Bricolage Grotesque',sans-serif",
  fontSize:26, fontWeight:800, color:"#fff",
  lineHeight:1.2, marginBottom:8,
};

const sub: React.CSSProperties = {
  fontSize:13, color:"#9B8AAE", lineHeight:1.5, marginBottom:22,
};

const fieldWrap: React.CSSProperties = { marginBottom:14 };

const fieldLabel: React.CSSProperties = {
  display:"block", fontSize:10, fontWeight:700,
  letterSpacing:".1em", textTransform:"uppercase",
  color:"#7E6698", marginBottom:6,
};

const input: React.CSSProperties = {
  width:"100%", padding:"13px 16px", borderRadius:13,
  background:"rgba(255,255,255,.06)",
  border:"1px solid rgba(255,255,255,.14)",
  color:"#fff", fontSize:14, outline:"none",
  boxSizing:"border-box", transition:"border-color .2s",
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
  width:"100%", padding:"14px", borderRadius:14,
  border:"none", color:"#fff", fontWeight:700, fontSize:15,
  letterSpacing:".01em", transition:"opacity .2s, box-shadow .2s",
  fontFamily:"'Bricolage Grotesque',sans-serif",
};

const footer: React.CSSProperties = {
  textAlign:"center", fontSize:11, color:"#5A426C",
  marginTop:16, lineHeight:1.6,
};

const spinner: React.CSSProperties = {
  width:40, height:40, borderRadius:"50%",
  border:"3px solid rgba(166,212,90,.25)",
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
  body { font-family:'DM Sans',system-ui,sans-serif }
  input::placeholder { color:rgba(255,255,255,.22) }
  input { caret-color:#A6D45A }
`;
