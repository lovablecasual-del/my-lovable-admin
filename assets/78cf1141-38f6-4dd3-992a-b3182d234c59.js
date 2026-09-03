/* ============================================================
   LOVABLE CMS — core: auth, layout, router, dashboard
   ============================================================ */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const S = window.LBStore;
const AUTH_KEY = "lovable.admin.auth";

/* ---------- icons ---------- */
const I = {
  dash:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  box:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 8l-9-5-9 5 9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>,
  img:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="M21 16l-5-5-7 7"/></svg>,
  doc:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M9 13h6M9 17h6"/></svg>,
  home:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  tag:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7v5l9 9 7-7-9-9H3Z"/><circle cx="7.5" cy="7.5" r="1.3"/></svg>,
  cog:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3.2"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2l-.3-2.5H10l-.3 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12a7 7 0 0 0 .1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.3 2.5h4l.3-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5A7 7 0 0 0 19 12Z"/></svg>,
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14"/></svg>,
  edit:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/></svg>,
  copy:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>,
  search:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  eye:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  up:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/></svg>,
  menu:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M4 12h16M4 17h16"/></svg>,
  out:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>,
};
const strokeFix = { strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

/* ---------- toast ---------- */
let _toast;
function Toaster() {
  const [msg, setMsg] = useState(null);
  useEffect(() => { _toast = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2200); }; }, []);
  return <div className={"toast" + (msg ? " toast--on" : "")}>{msg && <>✓ {msg}</>}</div>;
}
const toast = (m) => _toast && _toast(m);

/* ---------- placeholder thumb ---------- */
function Thumb({ p, className }) {
  const src = p && p.imgs && p.imgs[0];
  if (src) return <img className={className} src={src} alt="" loading="lazy" />;
  return <div className={className} style={{ background: (p && p.grad) || "var(--a-line-2)" }}></div>;
}

/* ---------- LOGIN ---------- */
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await S.checkLogin(email, pw);
    setBusy(false);
    if (ok) {
      sessionStorage.setItem(AUTH_KEY, "1");
      localStorage.setItem(AUTH_KEY, email);
      onLogin();
    } else setErr("メールアドレスまたはパスワードが正しくありません。");
  };
  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">LOV<b>A</b>BLE</div>
        <div className="login__sub">Admin · Content Studio</div>
        {err && <div className="login__err">{err}</div>}
        <div className="login__field">
          <label>メールアドレス</label>
          <input className="in" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" />
        </div>
        <div className="login__field">
          <label>パスワード</label>
          <input className="in" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <button className="b b--p b--block" style={{marginTop:8,padding:"13px"}} disabled={busy}>{busy?"ログイン中…":"ログイン"}</button>

      </form>
    </div>
  );
}

/* ---------- router (hash) ---------- */
function useAdminRoute() {
  const parse = () => {
    const h = window.location.hash.replace(/^#\/?/, "");
    const [p, id] = h.split("/");
    return { page: p || "dashboard", id: id || null };
  };
  const [r, setR] = useState(parse);
  useEffect(() => {
    const h = () => setR(parse());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  return r;
}
const go = (path) => { window.location.hash = "/" + path; };

/* ---------- live store hook ---------- */
function useStore() {
  const [, set] = useState(0);
  useEffect(() => S.subscribe(() => set(x => x + 1)), []);
  return S;
}

/* ---------- sidebar ---------- */
function Sidebar({ route, open, onClose }) {
  const counts = {
    products: S.allProducts().length,
    articles: S.allArticles().length,
    media: S.allMedia().length,
  };
  const Item = ({ id, icon, label, count }) => (
    <div className={"nav-i" + (route.page === id ? " nav-i--on" : "")}
         onClick={() => { go(id); onClose(); }}>
      {React.cloneElement(icon, strokeFix)}<span>{label}</span>
      {count != null && <span className="nav-i__count">{count}</span>}
    </div>
  );
  return (
    <>
      {open && <div className="scrim" onClick={onClose}></div>}
      <aside className={"side" + (open ? " side--open" : "")}>
        <div className="side__logo">LOV<b>A</b>BLE<small>Content Studio</small></div>
        <nav className="side__nav">
          <Item id="dashboard" icon={I.dash} label="ダッシュボード" />
          <div className="side__sec">販売・商品</div>
          <Item id="products" icon={I.box} label="商品管理" count={counts.products} />
          <Item id="categories" icon={I.tag} label="カテゴリー" />
          <Item id="navigation" icon={I.menu} label="ナビゲーション" />
          <Item id="media" icon={I.img} label="メディア" count={counts.media} />
          <div className="side__sec">コンテンツ</div>
          <Item id="articles" icon={I.doc} label="記事・特集" count={counts.articles} />
          <Item id="top" icon={I.home} label="TOPページ" />
          <Item id="content" icon={I.doc} label="サイトコンテンツ管理" />
          <div className="side__sec">システム</div>
          <Item id="settings" icon={I.cog} label="設定・SEO" />
        </nav>
        <div className="side__foot">
          <span>運営者モード</span>
          <a href={window.LB_SITE_URL||"index.html"} target="_blank" rel="noopener" style={{marginLeft:"auto"}}>サイトを見る ↗</a>
        </div>
      </aside>
    </>
  );
}

/* ---------- DASHBOARD ---------- */
function Dashboard() {
  const products = S.allProducts();
  const published = products.filter(p => p.status === "published");
  const drafts = products.filter(p => p.status === "draft");
  const cats = S.allCategories();
  const arts = S.allArticles();
  const pubArts = arts.filter(a => a.status === "published");
  const ranked = published.filter(p => p.rank).sort((a,b)=>a.rank-b.rank).slice(0,5);
  const recent = [...products].sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0)).slice(0,5);

  const Stat = ({ label, num, unit, foot }) => (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__num">{num}<small> {unit}</small></div>
      {foot && <div className="stat__foot">{foot}</div>}
    </div>
  );
  return (
    <div className="content">
      <div className="stats">
        <Stat label="総商品数" num={products.length} unit="点" foot={`公開 ${published.length} ・ 下書き ${drafts.length}`} />
        <Stat label="カテゴリー数" num={cats.length} unit="件" foot={cats.map(c=>c.en).slice(0,3).join(" / ")} />
        <Stat label="公開記事数" num={pubArts.length} unit="記事" foot={`全 ${arts.length} 記事`} />
        <Stat label="アフィリンク設定済" num={published.filter(p=>p.links&&Object.values(p.links).some(Boolean)).length} unit="点" foot="送客リンクあり" />
      </div>
      <div className="dash-grid">
        <div className="panel">
          <div className="panel__head"><h3>おすすめランキング</h3><a onClick={()=>go("products")}>商品管理へ →</a></div>
          <div className="panel__body">
            {ranked.length ? ranked.map((p)=>(
              <div className="mini" key={p.id} onClick={()=>go("products/"+p.id)}>
                <span className="mini__rank">{String(p.rank).padStart(2,"0")}</span>
                <Thumb p={p} className="mini__img" />
                <div className="mini__b"><div className="mini__name">{p.name}</div><div className="mini__meta">{p.brand} · ★{p.rating}</div></div>
                <span className="mini__price">¥{(p.price||0).toLocaleString()}</span>
              </div>
            )) : <div className="empty-state">ランキング商品がありません</div>}
          </div>
        </div>
        <div className="panel">
          <div className="panel__head"><h3>最近追加した商品</h3><a onClick={()=>go("products")}>すべて →</a></div>
          <div className="panel__body">
            {recent.map((p)=>(
              <div className="mini" key={p.id} onClick={()=>go("products/"+p.id)}>
                <Thumb p={p} className="mini__img" />
                <div className="mini__b"><div className="mini__name">{p.name}</div>
                  <div className="mini__meta">{cats.find(c=>c.key===p.cat)?.en || p.cat} · {p.sub}</div></div>
                <span className={"badge badge--dot " + (p.status==="published"?"badge--pub":"badge--draft")}>{p.status==="published"?"公開":"下書き"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel" style={{marginTop:20}}>
        <div className="panel__head"><h3>クイックアクション</h3></div>
        <div className="panel__body" style={{display:"flex",gap:10,padding:16,flexWrap:"wrap"}}>
          <button className="b b--p" onClick={()=>go("products/new")}>{React.cloneElement(I.plus,strokeFix)} 商品を追加</button>
          <button className="b b--g" onClick={()=>go("articles/new")}>{React.cloneElement(I.doc,strokeFix)} 記事を書く</button>
          <button className="b b--g" onClick={()=>go("media")}>{React.cloneElement(I.up,strokeFix)} 画像をアップロード</button>
          <button className="b b--g" onClick={()=>go("top")}>{React.cloneElement(I.home,strokeFix)} TOPページを編集</button>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  dashboard:"ダッシュボード", products:"商品管理", categories:"カテゴリー管理",
  navigation:"ナビゲーション管理",
  media:"メディアライブラリ", articles:"記事・特集", top:"TOPページ管理", content:"サイトコンテンツ管理", settings:"設定・SEO",
};

/* ---------- shell ---------- */
function Admin() {
  useStore();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === "1");
  const route = useAdminRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!authed) return <><Login onLogin={()=>setAuthed(true)} /><Toaster /></>;

  const logout = () => { sessionStorage.removeItem(AUTH_KEY); setAuthed(false); go("dashboard"); };

  let body, title = PAGE_TITLES[route.page] || "";
  if (route.page === "dashboard") body = <Dashboard />;
  else if (route.page === "products" && route.id) body = <ProductEditor id={route.id} />;
  else if (route.page === "products") body = <ProductList />;
  else if (route.page === "categories") body = <CategoryManager />;
  else if (route.page === "navigation") body = <NavManager />;
  else if (route.page === "media") body = <MediaLibrary />;
  else if (route.page === "articles" && route.id) body = <ArticleEditor id={route.id} />;
  else if (route.page === "articles") body = <ArticleList />;
  else if (route.page === "top") body = <TopManager />;
  else if (route.page === "content") body = <SiteContentManager />;
  else if (route.page === "settings") body = <Settings onLogout={logout} />;
  else body = <Dashboard />;

  if (route.page === "products" && route.id) title = route.id === "new" ? "商品を追加" : "商品を編集";
  if (route.page === "articles" && route.id) title = route.id === "new" ? "記事を作成" : "記事を編集";

  return (
    <div className="app">
      <Sidebar route={route} open={menuOpen} onClose={()=>setMenuOpen(false)} />
      <div className="main">
        <header className="top">
          <button className="menu-btn" onClick={()=>setMenuOpen(true)}>{React.cloneElement(I.menu,strokeFix)}</button>
          <div>
            <div className="top__title">{title}</div>
          </div>
          <div className="top__actions">
            <a className="b b--g b--sm" href={window.LB_SITE_URL||"index.html"} target="_blank" rel="noopener">{React.cloneElement(I.eye,strokeFix)} サイト確認</a>
            <button className="b b--g b--sm" onClick={logout}>{React.cloneElement(I.out,strokeFix)} ログアウト</button>
          </div>
        </header>
        {body}
      </div>
      <Toaster />
    </div>
  );
}

window.AdminCore = { I, strokeFix, toast, Thumb, go, useStore, S };
Object.assign(window, { Admin, Login, Dashboard });
