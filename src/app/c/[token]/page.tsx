"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Minus, Check, ArrowLeft, ArrowRight, Trash2, ScanLine, ShoppingBag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl, C } from "@/lib/format";
import { Acai } from "@/components/AcaiVisual";
import { GlowNav } from "@/components/GlowNav";
import type { Category, Product, Comanda, Order, CartLine, OptionGroup } from "@/lib/types";

/* ---------- utilidades ---------- */
function haptic(ms = 12) { try { navigator.vibrate(ms); } catch { /* ignore */ } }

function fireConfetti(originY: number) {
  const colors = ["#A6D45A", "#7B3FB0", "#E24C86", "#F4D35E", "#ffffff"];
  for (let i = 0; i < 38; i++) {
    const el = document.createElement("div");
    el.className = "confettiPiece";
    const dx = (Math.random() - .5) * 320;
    const dy = 300 + Math.random() * 260;
    const rot = (Math.random() - .5) * 720;
    const dur = .9 + Math.random() * .6;
    const delay = Math.random() * .22;
    el.style.cssText = `left:${40 + Math.random()*20}%;top:${originY}px;background:${colors[i % colors.length]};--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;--dur:${dur}s;--delay:${delay}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay + .1) * 1000);
  }
}

/* ---------- skeleton de cards ---------- */
function SkeletonCard() {
  return (
    <div style={{ display:"flex", gap:16, padding:14, marginBottom:12, borderRadius:24, background:"#fff", border:`1px solid ${C.line}` }}>
      <div className="skeleton" style={{ width:96, height:96, borderRadius:24, flex:"none" }} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8, paddingTop:4 }}>
        <div className="skeleton" style={{ height:16, width:"60%", borderRadius:8 }} />
        <div className="skeleton" style={{ height:12, width:"80%", borderRadius:8 }} />
        <div className="skeleton" style={{ height:12, width:"40%", borderRadius:8, marginTop:4 }} />
      </div>
    </div>
  );
}

/* ---------- tela de boas-vindas ---------- */
function WelcomeScreen({ number, onDone }: { number: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})`, padding:32, gap:24 }}>
      <div className="pop" style={{ animationDelay:".1s" }}>
        <Acai toppings={["#E24C86","#F4D35E","#A6D45A","#7FB53E"]} fill={.82} w={110} />
      </div>
      <div className="wSlide" style={{ textAlign:"center", animationDelay:".28s" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2.5, color:"#C9AEE4", marginBottom:10 }}>AÇAÍ DA PATRÍCIA · IBIRITÉ</div>
        <div className="disp" style={{ fontSize:32, fontWeight:800, color:"#fff", lineHeight:1.1 }}>Bem-vindo! 🫐</div>
        <div style={{ fontSize:15, color:"#D5C0EA", marginTop:8 }}>Comanda <strong style={{ color:"#A6D45A" }}>Nº {number}</strong></div>
      </div>
      <div className="wFade" style={{ animationDelay:".6s", fontSize:12, color:"#8E72A8" }}>Preparando seu cardápio…</div>
    </div>
  );
}

/* ---------- página principal ---------- */
export default function ComandaPage() {
  const { token } = useParams<{ token: string }>();
  const [comanda, setComanda] = useState<Comanda | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);

  const [catId, setCatId] = useState<string>("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [screen, setScreen] = useState<"menu" | "cart" | "conta">("menu");
  const [buildProduct, setBuildProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState(false);
  const [readyToast, setReadyToast] = useState(false);
  const [sending, setSending] = useState(false);
  const [dir, setDir] = useState<"R" | "L">("R");
  const [scrolled, setScrolled] = useState(false);

  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const prevOrderStatuses = useRef<Record<string, string>>({});
  const sendBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: cm, error: e1 } = await supabase.from("comandas").select("*").eq("token", token).single();
      if (e1 || !cm) { setErr("Comanda não encontrada."); setLoading(false); return; }
      setComanda(cm as Comanda);
      const { data: cats } = await supabase.from("categories").select("*").eq("active", true).order("sort");
      const { data: prods } = await supabase
        .from("products")
        .select("*, groups:product_option_groups(sort, group:option_groups(id,name,min_pick,max_pick,required,sort, options(id,option_group_id,name,price,color,active,sort)))")
        .eq("active", true).order("sort");
      setCats((cats || []) as Category[]);
      setProducts((prods || []) as unknown as Product[]);
      if (cats && cats.length) setCatId(cats[0].id);
      setLoading(false);
      loadConta(cm.id);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadConta(comandaId: string) {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, order_item_options(*))")
      .eq("comanda_id", comandaId)
      .order("created_at");
    const fresh = (data || []) as unknown as Order[];

    // detecta pedido que ficou "pronto" para notificar o cliente
    fresh.forEach((o) => {
      const prev = prevOrderStatuses.current[o.id];
      if (prev && prev !== "pronto" && o.status === "pronto") {
        setReadyToast(true);
        haptic(80);
        setTimeout(() => setReadyToast(false), 4000);
      }
      prevOrderStatuses.current[o.id] = o.status;
    });
    setOrders(fresh);
  }

  useEffect(() => {
    if (!comanda) return;
    const ch = supabase
      .channel("conta-" + comanda.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `comanda_id=eq.${comanda.id}` },
        () => loadConta(comanda.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comanda]);

  // scroll do conteúdo -> glass header
  useEffect(() => {
    const el = document.getElementById("menu-scroll");
    if (!el) return;
    const fn = () => setScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", fn, { passive: true });
    return () => el.removeEventListener("scroll", fn);
  }, [screen]);

  const addItem = (l: Omit<CartLine, "uid">) => {
    haptic(12);
    setCart((c) => [...c, { ...l, uid: Math.random().toString(36).slice(2) }]);
    // pulsa badge
    const btn = cartBtnRef.current;
    if (btn) { btn.classList.remove("badgePop"); void btn.offsetWidth; btn.classList.add("badgePop"); }
  };
  const rm = (uid: string) => setCart((c) => c.filter((l) => l.uid !== uid));
  const qty = (uid: string, d: number) => setCart((c) => c.map((l) => l.uid === uid ? { ...l, qty: Math.max(1, l.qty + d) } : l));

  const activeIdx = Math.max(0, cats.findIndex((c) => c.id === catId));
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => s + l.unit_price * l.qty, 0);
  const contaItems = orders.flatMap((o) => o.order_items);
  const contaTotal = orders.reduce((s, o) => s + Number(o.total), 0);
  const items = products.filter((p) => p.category_id === catId);

  async function sendOrder() {
    if (!cart.length || !comanda || comanda.status === "fechada" || sending) return;
    setSending(true);

    if (comanda.status === "livre") {
      await supabase.from("comandas").update({ status: "aberta", opened_at: new Date().toISOString() }).eq("id", comanda.id);
      setComanda({ ...comanda, status: "aberta" });
    }

    const total = cart.reduce((s, l) => s + l.unit_price * l.qty, 0);
    const { data: order, error } = await supabase.from("orders")
      .insert({ comanda_id: comanda.id, total, status: "novo" }).select().single();
    if (error || !order) { alert("Não foi possível enviar. Tente de novo."); setSending(false); return; }
    for (const l of cart) {
      const { data: it } = await supabase.from("order_items")
        .insert({ order_id: order.id, product_id: l.product_id, name: l.name, unit_price: l.unit_price, qty: l.qty })
        .select().single();
      if (it && l.options.length) {
        await supabase.from("order_item_options").insert(l.options.map((o) => ({ order_item_id: it.id, name: o.name, price: o.price })));
      }
    }
    setCart([]);
    setScreen("menu");
    setToast(true);
    setTimeout(() => setToast(false), 2600);
    haptic(30);
    // confetti a partir do botão de enviar
    fireConfetti(window.innerHeight * 0.6);
    loadConta(comanda.id);
    setSending(false);
  }

  if (loading || (showWelcome && !err && comanda)) {
    if (loading) return (
      <div style={{ minHeight:"100vh", background:C.cream, maxWidth:460, margin:"0 auto" }}>
        <div style={{ background:`linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})`, padding:"20px 20px 22px" }}>
          <div className="skeleton" style={{ height:12, width:"50%", marginBottom:14 }} />
          <div className="skeleton" style={{ height:28, width:"70%", marginBottom:16 }} />
          <div className="skeleton" style={{ height:56, borderRadius:20 }} />
        </div>
        <div style={{ padding:"16px 16px" }}>
          <div className="skeleton" style={{ height:44, borderRadius:999, marginBottom:16 }} />
          {[0,1,2].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
    // comanda carregada mas ainda mostrando welcome
    return <WelcomeScreen number={comanda!.number} onDone={() => setShowWelcome(false)} />;
  }

  if (err) return <Center>{err}</Center>;

  if (comanda?.status === "fechada") return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      background:`linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})`, padding:32, textAlign:"center", gap:20 }}>
      <div className="pop" style={{ fontSize:64 }}>💜</div>
      <div className="wSlide" style={{ animationDelay:".2s" }}>
        <div className="disp" style={{ fontSize:28, fontWeight:800, color:"#fff", lineHeight:1.1 }}>Obrigada pela visita!</div>
        <p style={{ fontSize:14, color:"#C9AEE4", marginTop:10, lineHeight:1.6 }}>
          Foi um prazer atender você.<br/>Pague no caixa e volte sempre. 🫐
        </p>
      </div>
      {contaTotal > 0 && (
        <div className="wSlide" style={{ animationDelay:".4s", background:"rgba(255,255,255,.08)", borderRadius:20, padding:"14px 24px" }}>
          <div style={{ fontSize:11, color:"#C9AEE4", marginBottom:4 }}>TOTAL DA COMANDA</div>
          <div className="disp" style={{ fontSize:32, fontWeight:800, color:C.lime }}>{brl(contaTotal)}</div>
          <div style={{ fontSize:11, color:"#A6D45A", marginTop:4 }}>PIX ou cartão no caixa</div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.cream, maxWidth:460, margin:"0 auto", display:"flex", flexDirection:"column" }}>
      {screen === "menu" && <>
        {/* HERO com glassmorphism ao rolar */}
        <div style={{
          position:"sticky", top:0, zIndex:10,
          background: scrolled
            ? "rgba(42,14,63,0.88)"
            : `linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})`,
          backdropFilter: scrolled ? "blur(18px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(18px)" : "none",
          transition:"background .3s, backdrop-filter .3s",
        }}>
          <div style={{ position:"absolute", width:220, height:220, right:-70, top:-70,
            borderRadius:"50%", background:"radial-gradient(circle,#7B3FB0 0%,transparent 70%)", opacity:.45, pointerEvents:"none" }} />
          <div style={{ position:"relative", padding: scrolled ? "12px 20px" : "20px 20px 16px", transition:"padding .3s" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:2, color:"#C9AEE4" }}>AÇAÍ DA PATRÍCIA</div>
              <div style={{ fontSize:10.5, fontWeight:600, padding:"4px 8px", borderRadius:999, background:"rgba(255,255,255,.1)", color:"#E6D6F5" }}>Ibirité · MG</div>
            </div>
            {!scrolled && (
              <>
                <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginTop:12 }}>
                  <div className="disp" style={{ color:"#fff", fontWeight:800, fontSize:30, lineHeight:1.02, letterSpacing:"-.02em" }}>Monte seu<br />açaí perfeito</div>
                  <div className="pop"><Acai toppings={["#E24C86","#F4D35E","#B98B4E","#7FB53E"]} fill={.72} w={72} /></div>
                </div>
                <div style={{ marginTop:12, display:"flex", borderRadius:16, overflow:"hidden", background:C.sand }}>
                  <div style={{ display:"grid", placeItems:"center", padding:"0 14px", background:C.lime }}><ScanLine size={19} color={C.acaiDeep} /></div>
                  <div style={{ flex:1, padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", borderLeft:`2px dashed ${C.acaiDeep}22` }}>
                    <div>
                      <div style={{ fontSize:9.5, fontWeight:700, color:C.muted }}>SUA COMANDA</div>
                      <div className="disp" style={{ fontSize:24, fontWeight:800, lineHeight:1, color:C.acaiDeep }}>Nº {comanda?.number}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9.5, fontWeight:700, color:C.muted }}>PAGAMENTO</div>
                      <div style={{ fontSize:12, fontWeight:700, color:C.leaf }}>No caixa, ao sair</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* categorias */}
        <div style={{ padding:"12px 16px", background:C.cream }}>
          <GlowNav
            tabs={cats.map((c) => c.name)}
            active={activeIdx}
            onChange={(i) => { setDir(i >= activeIdx ? "R" : "L"); setCatId(cats[i].id); }}
          />
        </div>

        {/* itens */}
        <div id="menu-scroll" key={catId} className={`noscroll ${dir === "R" ? "navInR" : "navInL"}`}
          style={{ flex:1, overflowY:"auto", padding:"4px 16px 96px", background:C.cream }}>
          {items.map((it, idx) => (
            <div key={it.id} className="fu" style={{ display:"flex", gap:16, padding:14, marginBottom:12, alignItems:"center",
              borderRadius:24, background:"#fff", border:`1px solid ${C.line}`,
              boxShadow:"0 16px 34px -24px rgba(42,14,63,.6)",
              animationDelay:`${idx * 55}ms`, opacity:it.sold_out ? .55 : 1 }}>
              <Thumb kind={it.is_build ? "montar" : "fixo"} img={it.image_url} />
              <div style={{ flex:1, minWidth:0 }}>
                <h4 className="disp" style={{ fontSize:16, fontWeight:800, lineHeight:1.1, color:C.ink }}>{it.name}</h4>
                <p style={{ fontSize:12, lineHeight:1.35, marginTop:4, color:C.muted }}>{it.description}</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
                  <div className="disp" style={{ fontSize:16, fontWeight:800, color:C.acai }}>
                    {it.is_build && <span style={{ fontSize:11, fontWeight:600, color:C.muted }}>a partir de </span>}{brl(it.price)}
                  </div>
                  {it.sold_out
                    ? <span style={{ fontSize:11, fontWeight:700, color:C.berry }}>Esgotado</span>
                    : <button className="press" onClick={() => it.is_build
                        ? setBuildProduct(it)
                        : addItem({ product_id:it.id, name:it.name, unit_price:Number(it.price), qty:1, kind:"fixo", options:[] })}
                        style={{ display:"flex", alignItems:"center", gap:4, fontSize:12.5, fontWeight:700,
                          padding:"8px 14px 8px 10px", borderRadius:999, color:"#fff",
                          background:it.is_build ? `linear-gradient(120deg,${C.acai},${C.acaiDk2})` : C.acai }}>
                        <Plus size={15} />{it.is_build ? "Montar" : "Add"}
                      </button>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </>}

      {screen === "cart" && <CartView cart={cart} total={cartTotal} qty={qty} rm={rm} onBack={() => setScreen("menu")} onSend={sendOrder} sending={sending} />}
      {screen === "conta" && <ContaView orders={orders} items={contaItems} total={contaTotal} number={comanda?.number ?? 0} onBack={() => setScreen("menu")} />}

      {screen === "menu" && (
        <div style={{ position:"sticky", bottom:0, padding:"10px 12px", display:"flex", alignItems:"center", gap:10, background:"#fff", borderTop:`1px solid ${C.line}` }}>
          <button className="press" onClick={() => setScreen("conta")} style={{ display:"flex", alignItems:"center", gap:6, padding:"12px 14px", borderRadius:16, background:C.grapeSoft }}>
            <ScanLine size={15} color={C.acai} />
            <span className="disp" style={{ fontSize:13, fontWeight:800, color:C.acai }}>{brl(contaTotal)}</span>
          </button>
          <button ref={cartBtnRef} className="press" disabled={!count} onClick={() => count && setScreen("cart")}
            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px",
              borderRadius:16, color:"#fff", fontSize:14, fontWeight:700,
              background:count ? `linear-gradient(120deg,${C.acai},${C.acaiDk2})` : "#C9BDD4" }}>
            <ShoppingBag size={16} />{count ? `Ver pedido · ${count} · ${brl(cartTotal)}` : "Seu pedido está vazio"}
          </button>
        </div>
      )}

      {buildProduct && <Builder product={buildProduct} onClose={() => setBuildProduct(null)} onAdd={addItem} />}

      {/* toast: pedido enviado */}
      {toast && (
        <div className="toastUp" style={{ position:"fixed", left:"50%", bottom:88, display:"flex", alignItems:"center", gap:8,
          padding:"12px 18px", borderRadius:16, color:"#fff", fontSize:13, fontWeight:700, background:C.leaf, zIndex:50 }}>
          <Check size={16} /> Pedido enviado pra cozinha!
        </div>
      )}

      {/* toast: pedido pronto */}
      {readyToast && (
        <div className="toastUp" style={{ position:"fixed", left:"50%", bottom:88, display:"flex", alignItems:"center", gap:8,
          padding:"14px 20px", borderRadius:18, color:C.acaiDeep, fontSize:14, fontWeight:700,
          background:C.lime, zIndex:50, boxShadow:"0 8px 24px -8px rgba(42,14,63,.5)" }}>
          🎉 Seu açaí está pronto! Retire no balcão.
        </div>
      )}
    </div>
  );
}

/* ---------- builder ---------- */
function Builder({ product, onClose, onAdd }:
  { product: Product; onClose: () => void; onAdd: (l: Omit<CartLine, "uid">) => void }) {
  const groups: OptionGroup[] = useMemo(() =>
    (product.groups || []).map((g) => g.group).sort((a, b) => a.sort - b.sort)
      .map((g) => ({ ...g, options: [...g.options].sort((a, b) => a.sort - b.sort) })), [product]);
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Record<string, { id: string; name: string; price: number; color: string | null }[]>>({});
  const cur = groups[step];
  if (!cur) return null;
  const single = cur.max_pick === 1;
  const pick = (o: { id: string; name: string; price: number; color: string | null }) => {
    haptic(10);
    setSel((s) => {
      const arr = s[cur.id] || [];
      if (single) return { ...s, [cur.id]: [o] };
      const has = arr.find((x) => x.id === o.id);
      return { ...s, [cur.id]: has ? arr.filter((x) => x.id !== o.id) : [...arr, o] };
    });
  };
  const isSel = (id: string) => (sel[cur.id] || []).some((x) => x.id === id);
  const chosen = Object.values(sel).flat();
  const sizeGroup = groups.find((g) => g.max_pick === 1 && g.required);
  const size = sizeGroup ? (sel[sizeGroup.id]?.[0]) : null;
  const base = size ? size.price : Number(product.price);
  const total = base + chosen.filter((o) => o.id !== size?.id).reduce((s, o) => s + o.price, 0);
  const toppings = chosen.map((o) => o.color).filter((c): c is string => !!c && c !== "#5B2A88");
  const fill = size && sizeGroup ? Math.min(1, .42 + sizeGroup.options.findIndex((o) => o.id === size.id) * .16) : .55;
  const canNext = cur.required ? (sel[cur.id]?.length ?? 0) >= cur.min_pick : true;
  const last = step === groups.length - 1;
  return (
    <div className="sheet" style={{ position:"fixed", inset:0, zIndex:30, display:"flex", flexDirection:"column", background:C.cream, maxWidth:460, margin:"0 auto" }}>
      <div style={{ padding:"16px 20px 12px", background:`linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button className="press" onClick={onClose} style={{ color:"#fff" }}><ArrowLeft size={20} /></button>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"#C9AEE4" }}>MONTE SEU AÇAÍ</div>
          <div className="disp" style={{ color:"#fff", fontSize:18, fontWeight:800 }}>{brl(total)}</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8 }}>
          <div style={{ display:"grid", placeItems:"center", borderRadius:16, flex:"none", width:78, height:88, background:"rgba(255,255,255,.06)" }}>
            <Acai toppings={toppings} fill={fill} w={58} /></div>
          <div style={{ flex:1 }}>
            <div className="disp" style={{ color:"#fff", fontSize:18, fontWeight:800, lineHeight:1.1 }}>{cur.name}</div>
            <div style={{ fontSize:11.5, color:"#C9AEE4" }}>{cur.required ? `Escolha ${cur.min_pick}${cur.max_pick ? ` a ${cur.max_pick}` : "+"}` : "Opcional"}</div>
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              {groups.map((g, i) => (
                <button key={g.id} onClick={() => i < step && setStep(i)} style={{ height:6, borderRadius:999, flex:1, border:"none",
                  background:i <= step ? C.lime : "rgba(255,255,255,.2)" }} />))}
            </div>
          </div>
        </div>
      </div>
      <div key={step} className="stepin noscroll" style={{ flex:1, overflowY:"auto", padding:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {cur.options.filter((o) => o.active).map((o) => { const on = isSel(o.id); return (
            <button key={o.id} className="press" onClick={() => pick({ id:o.id, name:o.name, price:Number(o.price), color:o.color })}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"12px", borderRadius:16, textAlign:"left",
                background:on ? (o.price ? C.grapeSoft : C.limeSoft) : "#fff",
                border:`1.5px solid ${on ? (o.price ? C.acai : C.leaf) : C.line}` }}>
              <span style={{ width:32, height:32, borderRadius:"50%", flex:"none", display:"grid", placeItems:"center",
                background:o.color || C.acai, border:"1px solid #00000012" }}>
                {on && <Check size={15} color="#fff" />}</span>
              <span style={{ flex:1, minWidth:0 }}>
                <span style={{ display:"block", fontSize:13, fontWeight:700, lineHeight:1.1, color:C.ink }}>{o.name}</span>
                <span style={{ display:"block", fontSize:11, fontWeight:700, color:o.price ? C.acai : C.leaf }}>
                  {o.price ? "+ " + brl(o.price) : (single ? brl(o.price) : "grátis")}</span>
              </span>
            </button>); })}
        </div>
      </div>
      <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:10, background:"#fff", borderTop:`1px solid ${C.line}` }}>
        {step > 0 && <button className="press" onClick={() => setStep((s) => s - 1)}
          style={{ padding:"14px 16px", borderRadius:16, fontSize:14, fontWeight:700, background:C.grapeSoft, color:C.acai, border:"none" }}>Voltar</button>}
        <button className="press" disabled={!canNext}
          onClick={() => { if (last) { onAdd({ product_id:product.id, name:`Açaí${size ? " " + size.name : ""}`, unit_price:total, qty:1, kind:"montar",
            options:chosen.filter((o) => o.id !== size?.id).map((o) => ({ name:o.name, price:o.price })) }); onClose(); } else setStep((s) => s + 1); }}
          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:14, borderRadius:16,
            color:"#fff", fontSize:14, fontWeight:700, border:"none",
            background:canNext ? `linear-gradient(120deg,${last ? C.leaf : C.acai},${last ? "#256B2E" : C.acaiDk2})` : "#C9BDD4" }}>
          {last ? <>Adicionar · {brl(total)}</> : <>Próximo <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

/* ---------- carrinho ---------- */
function CartView({ cart, total, qty, rm, onBack, onSend, sending }:
  { cart: CartLine[]; total: number; qty: (u: string, d: number) => void; rm: (u: string) => void; onBack: () => void; onSend: () => void; sending: boolean }) {
  return (<>
    <div style={{ padding:"16px 16px 8px", display:"flex", alignItems:"center", gap:12, background:C.cream }}>
      <button className="press" onClick={onBack} style={{ color:C.acai }}><ArrowLeft size={20} /></button>
      <h3 className="disp" style={{ fontWeight:800, fontSize:18, color:C.acaiDeep }}>Seu pedido</h3>
    </div>
    <div className="noscroll" style={{ flex:1, overflowY:"auto", padding:"8px 16px", background:C.cream }}>
      {cart.map((l) => (
        <div key={l.uid} style={{ display:"flex", gap:12, padding:12, marginBottom:10, borderRadius:16, alignItems:"center", background:"#fff", border:`1px solid ${C.line}` }}>
          <Thumb kind={l.kind} />
          <div style={{ flex:1 }}>
            <h4 className="disp" style={{ fontSize:14, fontWeight:800, color:C.ink }}>{l.name}</h4>
            {l.options.length > 0 && <p style={{ fontSize:11, marginTop:2, color:C.muted }}>{l.options.map((o) => o.name).join(", ")}</p>}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
              <button className="press" onClick={() => qty(l.uid, -1)} style={btnSm}><Minus size={13} /></button>
              <span style={{ fontSize:14, fontWeight:700, width:20, textAlign:"center" }}>{l.qty}</span>
              <button className="press" onClick={() => qty(l.uid, 1)} style={btnSm}><Plus size={13} /></button>
              <button className="press" onClick={() => rm(l.uid)} style={{ marginLeft:4, color:C.muted, background:"none", border:"none" }}><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="disp" style={{ fontSize:14, fontWeight:800, color:C.ink }}>{brl(l.unit_price * l.qty)}</div>
        </div>
      ))}
    </div>
    <div style={{ padding:"12px 16px", background:"#fff", borderTop:`1px solid ${C.line}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:13, color:C.muted }}>Total deste pedido</span>
        <span className="disp" style={{ fontSize:20, fontWeight:800, color:C.acaiDeep }}>{brl(total)}</span>
      </div>
      <button className="press" onClick={onSend} disabled={sending}
        style={{ width:"100%", padding:14, borderRadius:16, color:"#fff", fontSize:14, fontWeight:700, border:"none",
          background:sending ? "#C9BDD4" : `linear-gradient(120deg,${C.leaf},#256B2E)` }}>
        {sending ? "Enviando…" : "Enviar para a cozinha"}
      </button>
      <p style={{ fontSize:10.5, textAlign:"center", marginTop:8, color:C.muted }}>Some tudo na comanda · pague no caixa ao sair 💜</p>
    </div>
  </>);
}

/* ---------- timeline de status ---------- */
const STATUS_STEPS = [
  { key:"novo",       label:"Recebido",   icon:"📥", color:C.leaf },
  { key:"preparando", label:"Preparando", icon:"👨‍🍳", color:"#C08A18" },
  { key:"pronto",     label:"Pronto! 🎉", icon:"✅", color:C.acai },
  { key:"entregue",   label:"Entregue",   icon:"🙌", color:"#888" },
];

function OrderTimeline({ order }: { order: Order }) {
  const cur = STATUS_STEPS.findIndex((s) => s.key === order.status);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginTop:8 }}>
      {STATUS_STEPS.map((s, i) => {
        const done = i <= cur;
        const active = i === cur;
        return (
          <div key={s.key} style={{ display:"flex", alignItems:"center", flex: i < STATUS_STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", display:"grid", placeItems:"center", fontSize:13,
                background:done ? s.color : "#EDE5F2",
                boxShadow:active ? `0 0 0 3px ${s.color}44` : "none",
                transition:"all .4s" }}>
                {done ? (i < cur ? <Check size={14} color="#fff" /> : s.icon) : "·"}
              </div>
              <span style={{ fontSize:9, fontWeight:700, color:done ? s.color : C.muted, whiteSpace:"nowrap" }}>{s.label}</span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ flex:1, height:2, margin:"0 4px 18px",
                background:done && i < cur ? s.color : "#EDE5F2",
                transition:"background .4s" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- conta ---------- */
function ContaView({ orders, items, total, number, onBack }:
  { orders: Order[]; items: { name: string; unit_price: number; qty: number; order_item_options: { name: string }[] }[]; total: number; number: number; onBack: () => void }) {
  return (<>
    <div style={{ padding:"16px 16px 8px", display:"flex", alignItems:"center", gap:12, background:C.cream }}>
      <button className="press" onClick={onBack} style={{ color:C.acai }}><ArrowLeft size={20} /></button>
      <h3 className="disp" style={{ fontWeight:800, fontSize:18, color:C.acaiDeep }}>Sua conta</h3>
    </div>
    <div className="noscroll" style={{ flex:1, overflowY:"auto", padding:"8px 16px", background:C.cream }}>
      {/* status dos pedidos */}
      {orders.length > 0 && (
        <div style={{ marginBottom:12 }}>
          {orders.map((o, i) => (
            <div key={o.id} className="fu" style={{ borderRadius:20, background:"#fff", border:`1px solid ${C.line}`, padding:"12px 14px", marginBottom:10, animationDelay:`${i*60}ms` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>Pedido {i + 1} · {new Date(o.created_at).toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" })}</span>
                <span className="disp" style={{ fontSize:13, fontWeight:800, color:C.acai }}>{brl(Number(o.total))}</span>
              </div>
              <OrderTimeline order={o} />
            </div>
          ))}
        </div>
      )}

      {/* resumo dos itens */}
      <div style={{ borderRadius:24, overflow:"hidden", background:"#fff", border:`1px solid ${C.line}` }}>
        <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", background:C.sand }}>
          <span className="disp" style={{ fontWeight:800, color:C.acaiDeep }}>Comanda Nº {number}</span>
          <span style={{ fontSize:10.5, fontWeight:700, color:C.muted }}>MESA</span>
        </div>
        <div style={{ padding:"8px 16px" }}>
          {items.length === 0 && <div style={{ textAlign:"center", fontSize:13, padding:"40px 0", color:C.muted }}>Nenhum pedido ainda.</div>}
          {items.map((l, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:i < items.length - 1 ? `1px dashed ${C.line}` : "none" }}>
              <div>
                <span style={{ fontSize:13, fontWeight:600, color:C.ink }}>{l.qty}× {l.name}</span>
                {l.order_item_options?.length > 0 && <p style={{ fontSize:11, color:C.muted }}>{l.order_item_options.map((o) => o.name).join(", ")}</p>}
              </div>
              <span className="disp" style={{ fontSize:13, fontWeight:700, color:C.ink }}>{brl(l.unit_price * l.qty)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div style={{ padding:16, background:`linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, color:"#fff", opacity:.8 }}>Total a pagar</span>
        <span className="disp" style={{ fontSize:30, fontWeight:800, color:"#fff" }}>{brl(total)}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:12, padding:12,
        borderRadius:16, fontSize:13, fontWeight:700, background:C.lime, color:C.acaiDeep }}>
        Pague no caixa · PIX ou cartão
      </div>
    </div>
  </>);
}

const btnSm: React.CSSProperties = { width:28, height:28, borderRadius:8, display:"grid", placeItems:"center", background:C.grapeSoft, color:C.acai, border:"none" };

function Thumb({ kind, img }: { kind: string; img?: string | null }) {
  if (img) return <img src={img} alt="" style={{ width:96, height:96, borderRadius:24, objectFit:"cover", flex:"none" }} />;
  const t = kind === "montar" ? ["#E24C86","#F4D35E","#B98B4E"] : ["#F4D35E","#7FB53E","#E24C86"];
  return (
    <div style={{ display:"grid", placeItems:"center", flex:"none", width:96, height:96, borderRadius:24, background:"linear-gradient(150deg,#7B3FB0,#2A0E3F)" }}>
      <Acai toppings={t} fill={.74} w={62} />
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24, textAlign:"center", color:C.muted, background:C.cream }}>{children}</div>;
}
