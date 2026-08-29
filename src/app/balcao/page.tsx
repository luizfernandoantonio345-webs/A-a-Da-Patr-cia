"use client";
import { StaffGate } from "@/components/StaffGate";
import { useEffect, useRef, useState } from "react";
import { Check, ScanLine, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl, C } from "@/lib/format";
import type { Order } from "@/lib/types";

/* ── sons ─────────────────────────────────────────────────── */
function chime() {
  try {
    const AudioCtx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.24;
    master.connect(ctx.destination);

    const tone = (freq: number, startAt: number, dur: number) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.connect(env); env.connect(master);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + startAt;
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + 0.018);
      env.gain.setValueAtTime(1, t + dur - 0.06);
      env.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    };

    tone(523.25, 0,    0.18);  // C5
    tone(659.25, 0.16, 0.18);  // E5
    tone(783.99, 0.32, 0.32);  // G5 — mais longo, nota final
  } catch { /* ignore */ }
}

/* ── utilidades ── */
function elapsed(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  return `${m} min`;
}

function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const fmt = () =>
      setT(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    fmt();
    const id = setInterval(fmt, 10000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ── componente interno ── */
function BalcaoInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab]       = useState<"fila" | "comandas">("fila");
  const prevNovos = useRef(0);
  const clock = useClock();

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, order_item_options(*)), comanda:comandas(number,status)")
      .not("status", "eq", "entregue")
      .order("created_at");
    const open = ((data || []) as unknown as Order[]).filter(
      (o) => o.comanda?.status !== "fechada"
    );
    const novos = open.filter((o) => o.status === "novo").length;
    if (novos > prevNovos.current) chime();
    prevNovos.current = novos;
    setOrders(open);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("balcao")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
  };
  const fechar = async (comandaId: string) => {
    await supabase.from("comandas")
      .update({ status: "fechada", closed_at: new Date().toISOString() })
      .eq("id", comandaId);
  };

  const novos      = orders.filter((o) => o.status === "novo").length;
  const preparando = orders.filter((o) => o.status === "preparando").length;
  const prontos    = orders.filter((o) => o.status === "pronto").length;

  const comandas = Object.values(
    orders.reduce((m: Record<string, { id: string; number: number; total: number; n: number; ord: number }>, o) => {
      const k = o.comanda_id;
      (m[k] ||= { id: k, number: o.comanda?.number ?? 0, total: 0, n: 0, ord: 0 });
      m[k].total += Number(o.total);
      m[k].n += o.order_items.reduce((a, l) => a + l.qty, 0);
      m[k].ord += 1;
      return m;
    }, {})
  );

  const stColor: Record<string, { bg: string; border: string; label: string }> = {
    novo:       { bg: "rgba(34,100,48,.18)", border: "rgba(47,185,78,.6)",  label: "Novo"       },
    preparando: { bg: "rgba(120,80,10,.18)", border: "rgba(216,155,30,.6)", label: "Preparando" },
    pronto:     { bg: "rgba(91,42,136,.18)", border: "rgba(155,87,208,.6)", label: "Pronto"     },
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0D0820", display:"flex", flexDirection:"column" }}>

      {/* ── header ── */}
      <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:10, padding:"12px 16px",
        background:"#080514", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display:"grid", placeItems:"center", borderRadius:12, width:36, height:36,
          background:C.lime, flexShrink:0 }}>
          <ScanLine size={18} color={C.acaiDeep} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="disp" style={{ color:"#fff", fontWeight:800, fontSize:16, letterSpacing:"-.01em", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            Balcão · Açaí da Patrícia
          </div>
          <div style={{ fontSize:11, color:"#8A72A0", marginTop:1 }}>Pedidos em tempo real</div>
        </div>
        {/* relógio */}
        <div className="balcao-clock" style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, fontWeight:700,
          color:"#6A5480" }}>
          <Clock size={13} color="#6A5480" />
          {clock}
        </div>
        {/* indicadores de fila */}
        <div className="balcao-badges" style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {novos > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700,
              padding:"5px 10px", borderRadius:8, background:"rgba(47,185,78,.15)",
              border:"1px solid rgba(47,185,78,.3)", color:"#47B94E" }}>
              <span className="pulseDot" style={{ width:7, height:7, borderRadius:"50%",
                background:"#47B94E", display:"inline-block" }} />
              {novos} novo{novos > 1 ? "s" : ""}
            </div>
          )}
          {preparando > 0 && (
            <div style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:8,
              background:"rgba(216,155,30,.15)", border:"1px solid rgba(216,155,30,.3)", color:"#D89B1E" }}>
              {preparando} prep.
            </div>
          )}
          {prontos > 0 && (
            <div style={{ fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:8,
              background:"rgba(155,87,208,.2)", border:"1px solid rgba(155,87,208,.35)", color:"#C09FD8" }}>
              {prontos} pronto{prontos > 1 ? "s" : ""}
            </div>
          )}
          {orders.length === 0 && (
            <div style={{ fontSize:11, fontWeight:600, padding:"5px 10px", borderRadius:8,
              background:"rgba(255,255,255,.05)", color:"#5A4470" }}>
              fila vazia
            </div>
          )}
        </div>
      </div>

      {/* ── tabs ── */}
      <div style={{ display:"flex", gap:8, padding:"12px 20px 0",
        borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        {(["fila", "comandas"] as const).map((t) => {
          const on = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} className="press"
              style={{ fontSize:12.5, fontWeight:700, padding:"9px 16px",
                borderRadius:"10px 10px 0 0",
                border: on ? "1px solid rgba(255,255,255,.08)" : "1px solid transparent",
                borderBottom: on ? "2px solid #9B57D0" : "1px solid transparent",
                background: on ? "rgba(155,87,208,.12)" : "transparent",
                color: on ? "#C09FD8" : "#5A4470" }}>
              {t === "fila" ? "Fila da cozinha" : "Comandas abertas"}
              {t === "fila" && novos > 0 && (
                <span style={{ marginLeft:6, background:"#47B94E", color:"#fff",
                  borderRadius:99, fontSize:10, fontWeight:800, padding:"1px 6px" }}>
                  {novos}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── conteúdo ── */}
      <div style={{ flex:1, padding:"20px", overflowY:"auto" }}>
        {tab === "fila" ? (
          orders.length === 0
            ? <Empty text="Nenhum pedido aberto no momento." />
            : (
              <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:14 }}>
                {orders.map((o, idx) => {
                  const sc = stColor[o.status] || stColor.novo;
                  const isNovo = o.status === "novo";
                  return (
                    <div key={o.id}
                      className={`orderIn ${isNovo ? "novoBorder" : ""}`}
                      style={{ borderRadius:18, overflow:"hidden",
                        background: sc.bg,
                        border:`1px solid ${sc.border}`,
                        boxShadow: isNovo
                          ? "0 12px 32px -12px rgba(47,185,78,.25)"
                          : "0 8px 24px -8px rgba(0,0,0,.5)",
                        animationDelay:`${idx * 40}ms` }}>

                      {/* card header */}
                      <div style={{ display:"flex", alignItems:"center",
                        justifyContent:"space-between", padding:"12px 14px",
                        borderBottom:"1px solid rgba(255,255,255,.07)",
                        background:"rgba(0,0,0,.25)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {isNovo && (
                            <span className="pulseDot" style={{ width:8, height:8, borderRadius:"50%",
                              background:"#47B94E", display:"inline-block", flexShrink:0 }} />
                          )}
                          <span className="disp" style={{ color:"#fff", fontWeight:800, fontSize:15 }}>
                            Comanda {o.comanda?.number}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:10, color:"#8A72A0" }}>
                            {elapsed(o.created_at)}
                          </span>
                          <span style={{ fontSize:10, fontWeight:800, letterSpacing:".06em",
                            padding:"3px 9px", borderRadius:6,
                            background: isNovo ? "rgba(47,185,78,.25)" : "rgba(0,0,0,.3)",
                            color: isNovo ? "#47B94E" : o.status === "preparando" ? "#D89B1E" : "#C09FD8",
                            border:`1px solid ${sc.border}` }}>
                            {sc.label.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* itens */}
                      <div style={{ padding:"10px 14px" }}>
                        {o.order_items.map((l) => (
                          <div key={l.id} style={{ marginBottom:7 }}>
                            <div style={{ fontSize:13, color:"#EDE0F5", fontWeight:700 }}>
                              <span style={{ color:"#fff", fontWeight:800 }}>{l.qty}×</span>{" "}
                              {l.name}
                            </div>
                            {l.order_item_options.length > 0 && (
                              <div style={{ fontSize:11, color:"#8A72A0", paddingLeft:16, marginTop:2, lineHeight:1.4 }}>
                                + {l.order_item_options.map((x) => x.name).join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* ação */}
                      <div style={{ padding:"0 12px 12px" }}>
                        {o.status === "novo" && (
                          <button className="press" onClick={() => setStatus(o.id, "preparando")}
                            style={{ width:"100%", padding:"10px", borderRadius:10, border:"none",
                              fontSize:12.5, fontWeight:800, color:C.acaiDeep,
                              background:"linear-gradient(120deg,#A6D45A,#7FB53E)",
                              boxShadow:"0 6px 18px -6px rgba(166,212,90,.5)" }}>
                            Iniciar preparo
                          </button>
                        )}
                        {o.status === "preparando" && (
                          <button className="press" onClick={() => setStatus(o.id, "pronto")}
                            style={{ width:"100%", padding:"10px", borderRadius:10, border:"none",
                              fontSize:12.5, fontWeight:800, color:"#fff",
                              background:"linear-gradient(120deg,#7B3FB0,#5B2A88)",
                              boxShadow:"0 6px 18px -6px rgba(91,42,136,.5)" }}>
                            Marcar pronto ✓
                          </button>
                        )}
                        {o.status === "pronto" && (
                          <button className="press" onClick={() => setStatus(o.id, "entregue")}
                            style={{ width:"100%", padding:"10px", borderRadius:10, border:"none",
                              fontSize:12.5, fontWeight:800, color:"#fff",
                              background:"linear-gradient(120deg,#47B94E,#2E7A34)",
                              boxShadow:"0 6px 18px -6px rgba(47,185,78,.45)" }}>
                            <Check size={14} style={{ display:"inline", marginRight:4 }} />
                            Confirmar entrega
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        ) : (
          comandas.length === 0
            ? <Empty text="Nenhuma comanda aberta." />
            : (
              <div style={{ display:"flex", flexDirection:"column", gap:12, maxWidth:600 }}>
                {comandas.map((cm) => (
                  <div key={cm.id} className="orderIn"
                    style={{ borderRadius:16, padding:"16px 20px", display:"flex",
                      alignItems:"center", gap:16,
                      background:"rgba(155,87,208,.08)",
                      border:"1px solid rgba(155,87,208,.22)",
                      boxShadow:"0 8px 24px -8px rgba(0,0,0,.5)" }}>
                    <div style={{ flex:1 }}>
                      <div className="disp" style={{ color:"#fff", fontWeight:800, fontSize:17 }}>
                        Comanda {cm.number}
                      </div>
                      <div style={{ fontSize:12, marginTop:3, color:"#8A72A0" }}>
                        {cm.n} iten{cm.n !== 1 ? "s" : ""} · {cm.ord} pedido{cm.ord !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="disp" style={{ fontSize:26, fontWeight:800, color:C.lime }}>
                      {brl(cm.total)}
                    </div>
                    <button className="press" onClick={() => fechar(cm.id)}
                      style={{ padding:"10px 18px", borderRadius:12, fontSize:13, fontWeight:800,
                        color:"#fff", border:"none",
                        background:"linear-gradient(120deg,#47B94E,#2E7A34)",
                        boxShadow:"0 6px 18px -6px rgba(47,185,78,.4)" }}>
                      Fechar · pago
                    </button>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign:"center", fontSize:14, marginTop:80,
      color:"#4A3460", fontWeight:600 }}>
      {text}
    </div>
  );
}

export default function Balcao() {
  return <StaffGate><BalcaoInner /></StaffGate>;
}
