/* ============================================================
   LOVABLE CMS — products: list, editor, media library
   ============================================================ */
const { I: PI, strokeFix: PF, toast: ptoast, Thumb: PThumb, go: pgo, S: PS } = window.AdminCore;

/* ---------- PRODUCT LIST ---------- */
function ProductList() {
  window.AdminCore.useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState([]);
  const cats = PS.allCategories();

  let rows = PS.allProducts();
  if (cat !== "all") rows = rows.filter(p => p.cat === cat);
  if (status !== "all") rows = rows.filter(p => (p.status||"published") === status);
  if (q.trim()) {
    const k = q.toLowerCase();
    rows = rows.filter(p => (p.name+p.brand+(p.sub||"")+(p.tags||[]).join("")).toLowerCase().includes(k));
  }

  const allSel = rows.length > 0 && sel.length === rows.length;
  const toggleAll = () => setSel(allSel ? [] : rows.map(r=>r.id));
  const toggle = (id) => setSel(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);

  const bulk = (fn, msg) => { fn(); setSel([]); ptoast(msg); };

  return (
    <div className="content">
      <div className="toolbar">
        <div className="search-in">{React.cloneElement(PI.search,PF)}<input className="in" placeholder="商品名・ブランド・タグで検索" value={q} onChange={e=>setQ(e.target.value)} /></div>
        <select className="sel" style={{width:"auto"}} value={cat} onChange={e=>setCat(e.target.value)}>
          <option value="all">全カテゴリー</option>
          {cats.map(c=><option key={c.key} value={c.key}>{c.en} / {c.jp}</option>)}
        </select>
        <div className="seg">
          {[["all","すべて"],["published","公開"],["draft","下書き"]].map(([v,l])=>(
            <button key={v} className={status===v?"on":""} onClick={()=>setStatus(v)}>{l}</button>
          ))}
        </div>
        <button className="b b--p" onClick={()=>pgo("products/new")}>{React.cloneElement(PI.plus,PF)} 商品を追加</button>
      </div>

      {sel.length > 0 && (
        <div className="bulkbar">
          <span>{sel.length}件を選択中</span>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button className="b b--g" onClick={()=>bulk(()=>PS.bulkStatus(sel,"published"), "公開しました")}>公開</button>
            <button className="b b--g" onClick={()=>bulk(()=>PS.bulkStatus(sel,"draft"), "下書きにしました")}>下書き</button>
            <button className="b b--g" onClick={()=>{ if(confirm(sel.length+"件を削除しますか？")) bulk(()=>PS.bulkDelete(sel), "削除しました"); }}>削除</button>
            <button className="b b--g" onClick={()=>setSel([])}>選択解除</button>
          </div>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{width:40}}><input type="checkbox" className="chk" checked={allSel} onChange={toggleAll} /></th>
              <th>商品</th>
              <th className="tbl__hide">カテゴリー</th>
              <th className="tbl__hide">価格</th>
              <th className="tbl__hide">リンク</th>
              <th>状態</th>
              <th style={{textAlign:"right"}}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const linkN = p.links ? Object.values(p.links).filter(Boolean).length : 0;
              return (
                <tr key={p.id}>
                  <td><input type="checkbox" className="chk" checked={sel.includes(p.id)} onChange={()=>toggle(p.id)} /></td>
                  <td>
                    <div className="tbl__name">
                      <PThumb p={p} className="tbl__thumb" />
                      <div>
                        <div className="tbl__t1" onClick={()=>pgo("products/"+p.id)}>{p.name} {p.rank && <span style={{color:"var(--a-brand)"}}>★{p.rank}位</span>}</div>
                        <div className="tbl__t2">{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="tbl__hide"><span className="tbl__t2">{cats.find(c=>c.key===p.cat)?.en || p.cat}<br/>{p.sub}</span></td>
                  <td className="tbl__hide"><b>¥{(p.price||0).toLocaleString()}</b></td>
                  <td className="tbl__hide"><span className="tbl__t2">{linkN}/4 設定</span></td>
                  <td><span className={"badge badge--dot " + ((p.status||"published")==="published"?"badge--pub":"badge--draft")}>{(p.status||"published")==="published"?"公開":"下書き"}</span></td>
                  <td>
                    <div className="tbl__act">
                      <button className="icon-b" title="編集" onClick={()=>pgo("products/"+p.id)}>{React.cloneElement(PI.edit,PF)}</button>
                      <button className="icon-b" title="複製" onClick={()=>{ PS.duplicateProduct(p.id); ptoast("複製しました"); }}>{React.cloneElement(PI.copy,PF)}</button>
                      <button className="icon-b icon-b--d" title="削除" onClick={()=>{ if(confirm("「"+p.name+"」を削除しますか？")){ PS.deleteProduct(p.id); ptoast("削除しました"); } }}>{React.cloneElement(PI.trash,PF)}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-state">{React.cloneElement(PI.box,PF)}<div>該当する商品がありません</div></div>}
      </div>
    </div>
  );
}

/* ---------- repeater (points etc.) ---------- */
function Repeater({ items, onChange, placeholder }) {
  const set = (i,v) => { const n=[...items]; n[i]=v; onChange(n); };
  const add = () => onChange([...(items||[]), ""]);
  const rm = (i) => onChange(items.filter((_,x)=>x!==i));
  return (
    <div>
      {(items||[]).map((it,i)=>(
        <div className="rep-row" key={i}>
          <input className="in" value={it} placeholder={placeholder} onChange={e=>set(i,e.target.value)} />
          <button className="icon-b icon-b--d" onClick={()=>rm(i)}>{React.cloneElement(PI.trash,PF)}</button>
        </div>
      ))}
      <button className="add-row" onClick={add}>{React.cloneElement(PI.plus,PF)} 追加</button>
    </div>
  );
}

/* ---------- reviews (口コミ) editor ---------- */
function ReviewsEditor({ reviews, onChange }) {
  const set = (i, k, v) => { const n = reviews.map((r, x) => x === i ? { ...r, [k]: v } : r); onChange(n); };
  const add = () => onChange([...(reviews || []), { name: "", meta: "", rating: 5, body: "" }]);
  const rm = (i) => onChange(reviews.filter((_, x) => x !== i));
  const [revUrl, setRevUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const importFromUrl = async () => {
    const u = revUrl.trim(); if (!u) return;
    setLoading(true); setMsg("");
    const html = await fetchReviewHTML(u);
    if (!html) { setLoading(false); setMsg("⚠ ページを取得できませんでした。下のフォームから手動で追加してください。"); return; }
    const got = parseReviews(html);
    if (!got.length) { setLoading(false); setMsg("⚠ このページからは口コミを自動抽出できませんでした。手動で追加してください。"); return; }
    onChange([...(reviews || []), ...got]);
    setRevUrl(""); setLoading(false); setMsg("✓ " + got.length + "件の口コミを取り込みました。内容を確認・編集してください。");
  };
  return (
    <div>
      <div style={{display:"flex",gap:"8px",marginBottom:"6px"}}>
        <input className="in" value={revUrl} placeholder="楽天レビューページ等のURL（review.rakuten.co.jp …）"
          onChange={e=>setRevUrl(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); importFromUrl(); } }} />
        <button className="b b--g" disabled={loading} onClick={importFromUrl} style={{minWidth:"120px"}}>{loading?"取得中…":"口コミを取り込む"}</button>
      </div>
      {msg && <div className="hint" style={{marginBottom:"12px"}}>{msg}</div>}
      {(reviews || []).map((r, i) => (
        <div key={i} style={{border:"1px solid var(--a-line)",borderRadius:"var(--a-r)",padding:"12px",marginBottom:"10px"}}>
          <div className="row3" style={{marginBottom:"8px"}}>
            <input className="in" value={r.name||""} placeholder="投稿者名（例：@ikkun）" onChange={e=>set(i,"name",e.target.value)} />
            <input className="in" value={r.meta||""} placeholder="属性（例：30代・乾燥肌）" onChange={e=>set(i,"meta",e.target.value)} />
            <select className="sel" value={r.rating||5} onChange={e=>set(i,"rating",+e.target.value)}>
              {[5,4,3,2,1].map(n=><option key={n} value={n}>★{n}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
            <textarea className="ta" style={{minHeight:"60px"}} value={r.body||""} placeholder="口コミ本文" onChange={e=>set(i,"body",e.target.value)} />
            <button className="icon-b icon-b--d" onClick={()=>rm(i)}>{React.cloneElement(PI.trash,PF)}</button>
          </div>
        </div>
      ))}
      <button className="add-row" onClick={add}>{React.cloneElement(PI.plus,PF)} 口コミを追加</button>
    </div>
  );
}

/* ---------- tags input ---------- */
function TagsInput({ tags, onChange }) {
  const [v, setV] = useState("");
  const add = () => { const t=v.trim(); if(t && !(tags||[]).includes(t)){ onChange([...(tags||[]),t]); } setV(""); };
  return (
    <div className="tags-in">
      {(tags||[]).map(t=>(
        <span className="tag-chip" key={t}>{t}<button onClick={()=>onChange(tags.filter(x=>x!==t))}>×</button></span>
      ))}
      <input value={v} onChange={e=>setV(e.target.value)} placeholder="タグを入力 + Enter"
        onKeyDown={e=>{ if(e.key==="Enter"||e.key===","){ e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

/* ---------- image manager (per product) ---------- */
function ImageManager({ imgs, onChange }) {
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const fileRef = useRef();

  const readFiles = (files) => {
    const arr = [...files].filter(f=>f.type.startsWith("image/"));
    let done = 0; const out = [];
    arr.forEach(f => {
      const r = new FileReader();
      r.onload = () => { compress(r.result, (c)=>{ out.push(c); if(++done===arr.length) onChange([...(imgs||[]),...out]); }); };
      r.readAsDataURL(f);
    });
  };
  const onDrop = (e) => { e.preventDefault(); setOver(false); readFiles(e.dataTransfer.files); };

  return (
    <div>
      <div className={"dz"+(over?" dz--over":"")}
        onClick={()=>fileRef.current.click()}
        onDragOver={e=>{e.preventDefault();setOver(true);}}
        onDragLeave={()=>setOver(false)} onDrop={onDrop}>
        {React.cloneElement(PI.up,PF)}
        <div><b>クリック</b>または画像をドラッグ＆ドロップ</div>
        <div style={{fontSize:12,marginTop:4}}>JPG / PNG / WebP（自動で圧縮されます）</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>readFiles(e.target.files)} />
      </div>
      <div className="img-url-row">
        <input className="in" placeholder="または画像URLを貼り付け（楽天など）" value={url} onChange={e=>setUrl(e.target.value)} />
        <button className="b b--g" onClick={()=>{ if(url.trim()){ onChange([...(imgs||[]),url.trim()]); setUrl(""); } }}>追加</button>
      </div>
      {(imgs||[]).length>1 && (
        <button className="b b--g b--sm" style={{marginTop:8}} disabled={cleaning}
          onClick={async()=>{ setCleaning(true); try{ const kept=await keepRealPhotos(imgs); onChange(kept); ptoast((imgs.length-kept.length)+"枚のアイコンを除去しました"); }catch(e){} setCleaning(false); }}>
          {cleaning?"確認中…":"🧹 アイコン画像を自動除去"}
        </button>
      )}
      {(imgs||[]).length>0 && (
        <div className="img-grid">
          {imgs.map((src,i)=>(
            <div className="img-cell" key={i}>
              <img src={src} alt="" />
              {i===0 && <span className="img-cell__main">サムネイル</span>}
              <div className="img-cell__bar">
                {i!==0 && <button className="img-cell__b" title="サムネイルにする" onClick={()=>{ const n=[...imgs]; n.splice(i,1); n.unshift(src); onChange(n); }}>{React.cloneElement(PI.up,PF)}</button>}
                <button className="img-cell__b" title="削除" onClick={()=>onChange(imgs.filter((_,x)=>x!==i))}>{React.cloneElement(PI.trash,PF)}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* compress dataURL via canvas */
function compress(dataUrl, cb, max=1000, q=0.82) {
  const img = new Image();
  img.onload = () => {
    let { width:w, height:h } = img;
    if (w > max || h > max) { const s = max/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
    const c = document.createElement("canvas"); c.width=w; c.height=h;
    c.getContext("2d").drawImage(img,0,0,w,h);
    try { cb(c.toDataURL("image/jpeg", q)); } catch(e){ cb(dataUrl); }
  };
  img.onerror = () => cb(dataUrl);
  img.src = dataUrl;
}

/* ---------- PRODUCT EDITOR ---------- */
const SHOP_META = {
  tiktok:{name:"TikTok Shop",c:"#111"}, rakuten:{name:"楽天市場",c:"#bf2d2d"},
  amazon:{name:"Amazon",c:"#7a5a2e"}, qoo10:{name:"Qoo10",c:"#b3492d"},
};

/* ---------- auto-import from a product URL ---------- */
/* ============================================================
   PROVIDER REGISTRY
   Each shop is one declarative entry. To support a new platform
   (Yahoo!ショッピング, ZOZO, SHOPLIST …) add ONE object here —
   no other code changes. Each provider declares:
     id        — internal key + links{} key
     name      — display name
     match     — (hostname) => bool   : URL → platform detection
     short     — short link hosts to expand first (optional)
     canonical — (resolvedUrl) => fetchUrl | null  (clean URL to fetch)
     fetch     — async (fetchUrl) => html | null   (fetch strategy)
   parse()/normalize() are shared (parseProduct + AI refine) so every
   provider yields the SAME Product shape.
   ============================================================ */
const PROVIDERS = [
  {
    id: "amazon", name: "Amazon",
    match: (h) => /amazon|amzn/.test(h),
    canonical: (u) => amazonCanonical(u) || normalizeImportUrl(u, "amazon"),
    fetch: (u) => fetchAmazonHTML(u),               // jina HTML reader (bypasses CAPTCHA)
  },
  {
    id: "rakuten", name: "楽天市場",
    match: (h) => /rakuten|r10s|room\.rakuten/.test(h),
    canonical: (u) => normalizeImportUrl(u, "rakuten"),
    fetch: (u) => fetchRichHTML(u),                 // HTML reader → preserves og:image (product image)
  },
  {
    id: "qoo10", name: "Qoo10",
    match: (h) => /qoo10|gmkt|image-gmkt/.test(h),
    canonical: (u) => normalizeImportUrl(u, "qoo10"),
    fetch: (u) => fetchPageHTML(u),
  },
  {
    id: "tiktok", name: "TikTok Shop",
    match: (h) => /tiktok/.test(h),
    canonical: (u) => normalizeImportUrl(u, "tiktok"),
    fetch: (u) => fetchReviewHTML(u),               // TikTok is JS-rendered → jina first
  },
  /* ── To add Yahoo!ショッピング / ZOZO / SHOPLIST, append here ──
  { id:"yahoo", name:"Yahoo!ショッピング", match:(h)=>/yahoo|shopping\.yahoo/.test(h),
    canonical:(u)=>normalizeImportUrl(u,"yahoo"), fetch:(u)=>fetchPageHTML(u) },
  */
];
function getProvider(url) {
  try { const h = new URL(url).hostname.toLowerCase(); return PROVIDERS.find(p => p.match(h)) || null; }
  catch (e) { return null; }
}
function detectStore(url) { const p = getProvider(url); return p ? p.id : null; }
/* normalize the URL we FETCH (not the affiliate link we store) so Amazon returns Japanese */
function normalizeImportUrl(url, store) {
  try {
    const u = new URL(url);
    if (store === "amazon") {
      // force the Japanese marketplace + Japanese language
      if (/amazon\.[a-z.]+$/i.test(u.hostname) && !/amazon\.co\.jp$/i.test(u.hostname)) {
        u.hostname = u.hostname.replace(/amazon\.[a-z.]+$/i, "amazon.co.jp");
      }
      u.searchParams.set("language", "ja_JP");
    }
    return u.href;
  } catch (e) { return url; }
}
/* expand a short link (amzn.to, a.co, bit.ly …) to its real destination URL */
async function resolveShortLink(url) {
  try {
    if (!/(amzn\.to|amzn\.asia|a\.co|bit\.ly|tinyurl|t\.co|rakuten\.co\.jp\/gold|r10\.to|qoo10\.to)/i.test(url)) return url;
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`https://unshorten.me/json/${encodeURIComponent(url)}`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = JSON.parse(await r.text());
    return (j && j.success && j.resolved_url) ? j.resolved_url : url;
  } catch (e) { return url; }
}
/* build a clean canonical Amazon /dp/ASIN URL (best for fetching; bypasses short-link captcha) */
function amazonCanonical(url) {
  try {
    const asin = (url.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/i) || url.match(/[\/?&]asin=([A-Z0-9]{10})/i) || [])[1];
    if (asin) return `https://www.amazon.co.jp/dp/${asin.toUpperCase()}?language=ja_JP`;
  } catch (e) {}
  return null;
}
function cleanTitle(t) {
  let s = (t || "").split(/[|｜]/)[0]
    .replace(/【[^】]*】/g, "")
    .replace(/Amazon\.co\.jp|Amazon|楽天市場|Qoo10|公式(?:ショップ|ストア)?|送料無料/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:：|｜\-―、,]+/, "")
    .replace(/\s*[:：]\s*[^:：]{1,10}$/, "")
    .trim();
  return s.slice(0, 60);
}
function cleanImgs(list, anchor) {
  let imgs = (list || []).map(u => { try { return new URL(u, "https://x.x").href; } catch (e) { return u; } })
    .filter(u => /^https?:\/\//i.test(u))
    .map(u => u.replace(/^https:\/\/x\.x\//, ""));
  // must end in a real raster image extension (allow query string after)
  imgs = imgs.filter(u => /\.(jpe?g|png|webp)(\?|$|&|;)/i.test(u));
  // reject anything that smells like UI chrome / icons / tracking, not a product photo
  const bad = /(icon|logo|sprite|spacer|blank|1x1|pixel|button|btn[_\-]|arrow|star|rank|ranking|badge|banner|bnr|loading|noimage|no_image|now_printing|common|cmn|parts|assets|navi|header|footer|favicon|profile|avatar|user|point|coupon|campaign|\.svg|\.gif|sns|share|payment|shoplogo|shop_logo|check|verified|guarant|anshin|hosho|hoshou|seal|stamp|ribbon|medal|trust|secure|safe|free_?ship|soryo|送料|安心|保証|認証|正規|無料|mark_|_mark|chien|review)/i;
  imgs = imgs.filter(u => !bad.test(u));
  // known product-image CDNs/paths get priority; otherwise require a "cabinet/item/image" style path
  const goodHost = /(r10s\.jp|image\.rakuten\.co\.jp|tshop\.r10s|media-amazon\.com|images-na\.ssl-images-amazon|gmkt\.jp|gd\.image-gmkt|qoo10|p16-oec|tiktokcdn|shopifycdn|cdn\.shopify)/i;
  const looksProduct = /(cabinet|\/item\/|\/items\/|\/image|\/img\/goods|\/upload|\/products?\/|\/g\/|_main|_l\.|_o\.|large|zoom)/i;
  imgs = imgs.filter(u => goodHost.test(u) || looksProduct.test(u));
  // drop obviously tiny thumbnails when a size hint is present (e.g. _ex=64x64, /128x128/, ?w=80)
  imgs = imgs.filter(u => {
    const m = u.match(/(?:_ex=|[\/_])(\d{2,4})x(\d{2,4})/i) || u.match(/[?&](?:w|width)=(\d{2,4})/i);
    if (!m) return true;
    const w = parseInt(m[1], 10);
    return !(w && w < 150);
  });
  // normalize rakuten thumbnails to a larger size
  imgs = imgs.map(u => u.replace(/_ex=\d+x\d+/i, "_ex=500x500").replace(/thumbnail\.image\.rakuten\.co\.jp\/@0_mall\//, "image.rakuten.co.jp/"));
  // Amazon: drop obvious tiny thumbnails (both media-amazon & ssl-images hosts), tracking/social, then strip the size token to get full-res original
  imgs = imgs.filter(u => !/(?:media-amazon|ssl-images-amazon)\.com\/images\/I\/.*\._(?:SS|SX|SY|US|AC_US|AC_SS|AC_UL|AC_SR|UL|UX|UY|SR|CR)\d{1,3}/i.test(u));
  imgs = imgs.filter(u => !/\/images\/G\/|social_share|_CB\d+|sprite|gno\/|nav[_\-]|consumables\/|kaigo\/|traffic\//i.test(u));
  imgs = imgs.filter(u => !/media-amazon\.com\/images\/I\/[0-9A-Za-z]{1,3}\./i.test(u)); // 1px/junk ids
  // Amazon /images/I/ product photos are .jpg; a .png there is almost always a grey placeholder/sash
  imgs = imgs.filter(u => !/(?:media-amazon|ssl-images-amazon)\.com\/images\/I\/[A-Za-z0-9%\-]+\.png/i.test(u));
  imgs = imgs.map(u => /(?:media-amazon|ssl-images-amazon)\.com\/images\/I\//i.test(u)
    ? u.replace(/(\/images\/I\/[A-Za-z0-9%\-]+)\.[^/]*?(\.(?:jpe?g|png))$/i, "$1$2")
    : u);
  imgs = [...new Set(imgs)];
  // ★ image-product cohesion: for Rakuten/ROOM (seller storefront pages bundle many
  //   unrelated shop/related/banner images), keep ONLY images that share the anchor
  //   (og:image) product-code stem. Guarantees we never show a different product's photo.
  imgs = cohereRakutenImages(imgs, anchor);
  return imgs.slice(0, 8);
}
/* filename without path/extension/query */
function imgFilename(u) { try { return (u.split("?")[0].split("/").pop() || "").replace(/\.(jpe?g|png|webp)$/i, ""); } catch (e) { return ""; } }
/* derive a product-code stem by stripping trailing view-suffixes (_gt01, _sz01, _a_01, _1 …) */
function imgStem(name) {
  let s = name;
  for (let i = 0; i < 3; i++) { const n = s.replace(/_(?:[a-z]{1,3}\d{0,3}|\d{1,3})$/i, ""); if (n === s) break; s = n; }
  return s;
}
/* Rakuten cabinet images carry the item code in the filename. Anchor on the og:image's
   stem and drop anything that doesn't belong to the same product. Non-Rakuten: pass through. */
function cohereRakutenImages(imgs, anchor) {
  const isRk = (u) => /r10s\.jp|image\.rakuten\.co\.jp|room\.r10s/i.test(u);
  const deco = /(info|banner|bnr|cart-|_cart|guide|step|attention|caution|chui|coupon|campaign|point|gift|present|review|ranking|sns|share|footer|header|logo|free|soryo|spec_|_spec|size_guide|measure)/i;
  const rkCount = imgs.filter(isRk).length;
  if (!anchor || !isRk(anchor)) {
    // No trustworthy anchor. If these are Rakuten storefront images we CANNOT prove
    // they belong to one product (different sellers/related items) → drop them all so a
    // foreign product photo is never shown. Non-Rakuten images pass through.
    if (rkCount >= 2) return imgs.filter(u => !isRk(u));
    return imgs;
  }
  const stem = imgStem(imgFilename(anchor));
  if (stem.length < 5) return [anchor];
  const same = imgs.filter(u => isRk(u) && !deco.test(u) && imgFilename(u).startsWith(stem));
  const others = imgs.filter(u => !isRk(u));
  const ordered = [...new Set([anchor, ...same, ...others])];
  return ordered.length ? ordered : [anchor];
}
/* load an image to read its real pixel size (works cross-origin) */
function measureImg(url) {
  return new Promise((res) => {
    const im = new Image();
    let done = false;
    const finish = (w, h) => { if (!done) { done = true; clearTimeout(t); res({ url, w, h }); } };
    const t = setTimeout(() => finish(0, 0), 8000);
    im.onload = () => finish(im.naturalWidth, im.naturalHeight);
    im.onerror = () => finish(0, 0);
    im.src = url;
  });
}
/* keep only images that are actually large enough to be product photos
   (filters out small badge/check/icon graphics that slip through by name) */
async function keepRealPhotos(urls) {
  if (!urls || !urls.length) return [];
  const measured = await Promise.all(urls.map(measureImg));
  const kept = measured.filter(m => {
    if (!m.w || !m.h) return true;                       // couldn't measure → keep (user can delete)
    const short = Math.min(m.w, m.h);
    const ratio = Math.max(m.w, m.h) / short;
    if (short < 280) return false;                       // too small → icon/badge
    if (short < 360 && ratio < 1.12) return false;       // small & perfectly square → likely a badge
    return true;
  }).map(m => m.url);
  return kept.length ? kept : urls.slice(0, 1);          // never wipe everything
}
function cleanPoints(list, desc) {
  // noise we never want as a selling point (logistics, store ops, legal, shipping…)
  const junk = /(楽天|amazon|qoo10|ログイン|カート|お気に入り|ランキング|送料|ポイント\s*\d|返品|交換|キャンセル|配送|発送|お届け|在庫|入荷|予約|営業日|クーポン|セール|値引き|お問い合わせ|会社概要|プライバシー|利用規約|ストアトップ|フォロー|シェア|レビューを書く|参考になった|注文|決済|支払|代引|のし|ラッピング無料|メール便|宅配|日時指定|ギフト対応|店舗|当店|まとめ買い|円\s*[（(]税|％OFF|%OFF|セット販売|単品|品番|JANコード|広告文責|区分|製造|輸入|販売元|©|Copyright)/i;
  // words that signal a genuine product benefit / appeal
  const appeal = /(おすすめ|人気|定番|上品|高級感|きれい|綺麗|美しい|可愛|かわいい|華奢|軽い|軽やか|なめらか|しっとり|うるおい|保湿|ツヤ|つや|くすみ|肌|毛穴|エイジング|引き締|スタイルアップ|脚長|着回し|合わせやすい|シルエット|落ち感|とろみ|快適|使いやすい|持ち|長持ち|時短|簡単|香り|柔らか|やわらか|心地|上質|質感|素材|シンプル|洗練|大人|韓国|名品|名作|映え|サラサラ|ふんわり|ナチュラル|ボリューム|速乾|大容量|コンパクト|軽量|プチプラ|コスパ|高見え|こなれ|垢抜け|盛れ|フィット)/;
  const score = (t) => {
    let s = 0;
    if (appeal.test(t)) s += 3;
    if (/[。！]$/.test(t)) s += 1;          // looks like a complete sentence
    if (t.length >= 12 && t.length <= 40) s += 2; // ideal length
    else if (t.length <= 50) s += 1;
    if (/[ぁ-ん]/.test(t)) s += 1;          // natural Japanese (has hiragana)
    if (/[0-9]{4,}|[A-Za-z]{6,}/.test(t)) s -= 2; // codes / long english
    return s;
  };
  const norm = (t) => jaOnly((t || "").replace(/\s+/g, " ").trim());

  // candidate pool: list items + description split into clauses
  let cands = (list || []).map(norm);
  if (desc) cands = cands.concat(String(desc).split(/[。！\n・／]/).map(s => norm(s + (/[！]/.test(s) ? "" : "。"))));
  cands = cands
    .map(t => t.replace(/[。、,]+$/, m => m.includes("。") ? "。" : ""))
    .filter(t => t.length >= 8 && t.length <= 52)
    .filter(t => /[ぁ-んァ-ン一-龯]/.test(t))
    .filter(t => !junk.test(t));
  cands = [...new Set(cands)];

  // keep only appealing ones; if too few, fall back to best-scoring clauses
  let good = cands.filter(t => appeal.test(t)).sort((a, b) => score(b) - score(a));
  if (good.length < 3) {
    const extra = cands.filter(t => !good.includes(t)).sort((a, b) => score(b) - score(a));
    good = [...good, ...extra];
  }
  // dedup near-duplicates by first 10 chars
  const seen = new Set();
  good = good.filter(t => { const k = t.slice(0, 10); if (seen.has(k)) return false; seen.add(k); return true; });
  return good.slice(0, 4);
}
/* has Japanese kana (cleanly excludes English-only text) */
function hasJa(s) { return /[ぁ-んァ-ン]/.test(s || ""); }
/* keep only Japanese sentences (drop English fragments) */
function jaOnly(s) {
  if (!s) return "";
  const chunks = String(s)
    .replace(/([。！？!?])/g, "$1\u0001")
    .replace(/([.!?])\s/g, "$1\u0001")
    .split(/[\u0001\n]/).map(x => x.trim()).filter(Boolean);
  const keep = chunks.filter(c => /[ぁ-んァ-ン一-龯]/.test(c)).map(c =>
    c.replace(/^[A-Za-z0-9 ,.'"&()\-:;!?\/]+/, "")
     .replace(/[A-Za-z0-9 ,.'"&()\-:;!?\/]+$/, "")
     .trim()
  ).filter(Boolean);
  const joined = keep.join(" ").replace(/\s+/g, " ").trim();
  return joined || (/[ぁ-んァ-ン一-龯]/.test(s) ? String(s).trim() : "");
}
/* pick the best Japanese product description from candidates */
function pickJaDesc(cands, primary) {
  const junk = /(楽天|ログイン|カート|クーポン|ポイント|送料|レビューを書く|利用規約|プライバシー|Copyright|©|ランキング|お気に入り|ストアトップ|当店|営業日|配送|返品)/;
  let best = "";
  for (const c of (cands || [])) {
    const s = (c || "").replace(/\s+/g, " ").trim();
    if (s.length < 24 || s.length > 500 || !hasJa(s) || junk.test(s)) continue;
    if (s.length > best.length) best = s;
  }
  const p = (primary || "").replace(/\s+/g, " ").trim();
  if (hasJa(p) && p.length >= 20) {
    if (best && best.length > p.length * 1.6 && best.length >= 80) return best.slice(0, 300);
    return p.slice(0, 300);
  }
  return (best || p).slice(0, 300);
}
async function fetchViaProxies(url, order) {
  const P = {
    allorigins: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    corsproxy:  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    codetabs:   (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
    jina:       (u) => `https://r.jina.ai/${u}`,
  };
  for (const k of order) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000); // never hang on a dead proxy
      const res = await fetch(P[k](url), { redirect: "follow", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const txt = await res.text();
      if (txt && txt.length > 300) return txt;
    } catch (e) {}
  }
  return null;
}
// product pages: prefer raw HTML (OGP/JSON-LD); review pages: prefer jina (renders JS)
async function fetchPageHTML(url) { return fetchViaProxies(url, ["allorigins", "corsproxy", "codetabs", "jina"]); }
async function fetchReviewHTML(url) { return fetchViaProxies(url, ["jina", "allorigins", "codetabs", "corsproxy"]); }
/* Rakuten/ROOM: use the HTML reader (preserves og:image = the real product image).
   The jina *markdown* route drops og and yields a soup of unrelated sellers' thumbnails. */
async function fetchRichHTML(url) {
  for (let i = 0; i < 2; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 11000);
      const res = await fetch(`https://r.jina.ai/${url}`, { redirect: "follow", signal: ctrl.signal,
        headers: { "X-Return-Format": "html" } });
      clearTimeout(t);
      if (res.ok) {
        const txt = await res.text();
        if (txt && /og:image/i.test(txt) && !/アクセスが集中/.test(txt)) return txt;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1200));
  }
  // fallback to raw proxy HTML (also carries og:image)
  return fetchPageHTML(url);
}
/* Amazon blocks raw CORS proxies with a CAPTCHA, but jina's reader can return the
   full rendered HTML (productTitle, data-a-dynamic-image, feature-bullets) when asked.
   Retries because Amazon throttles intermittently. */
async function fetchAmazonHTML(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 11000);
      const res = await fetch(`https://r.jina.ai/${url}`, { redirect: "follow", signal: ctrl.signal,
        headers: { "X-Return-Format": "html" } });
      clearTimeout(t);
      if (res.ok) {
        const txt = await res.text();
        // accept only if the real product DOM is present (not a bare CAPTCHA shell)
        if (txt && (/id=["']productTitle["']/.test(txt) || /data-a-dynamic-image/.test(txt) || /media-amazon\.com\/images\/I\//.test(txt))) return txt;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1400));
  }
  return null;
}
async function _legacyFetchPageHTML(url) {
  // Reads the page through public CORS proxies so the browser can parse OGP tags.
  // (In a Next.js build this is a server-side /api/import route instead.)
  const proxies = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (u) => `https://r.jina.ai/${u}`,
  ];
  for (const make of proxies) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000); // never hang on a dead proxy
      const res = await fetch(make(url), { redirect: "follow", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const txt = await res.text();
      if (txt && txt.length > 300) return txt;
    } catch (e) {}
  }
  return null;
}
/* scan raw HTML/JSON for product-CDN image URLs regardless of how they're embedded
   (data attributes, JSON blobs, escaped slashes). Returns hi-res-leaning candidates. */
function rawImgScan(html) {
  if (!html) return [];
  const text = html.replace(/\\\//g, "/").replace(/&amp;/g, "&");
  const out = [];
  // Amazon hi-res product images: m.media-amazon.com/images/I/<id>._..._.jpg
  for (const m of text.matchAll(/https?:\/\/[a-z0-9.\-]*media-amazon\.com\/images\/I\/[A-Za-z0-9%._\-]+\.(?:jpe?g|png)/gi)) out.push(m[0]);
  for (const m of text.matchAll(/https?:\/\/images-[a-z]+\.ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9%._\-]+\.(?:jpe?g|png)/gi)) out.push(m[0]);
  // Rakuten / Qoo10 / generic shopping CDNs
  for (const m of text.matchAll(/https?:\/\/[^"'\s)\\]*(?:r10s\.jp|image\.rakuten\.co\.jp|gd\.image-gmkt\.com|gmkt\.jp)[^"'\s)\\]*\.(?:jpe?g|png|webp)(?:\?[^"'\s)\\]*)?/gi)) out.push(m[0]);
  return out;
}
/* Refine messy scraped data into a clean, on-brand product name / description / points
   using the built-in Claude helper. Best-effort: returns null if unavailable or it fails. */
async function refineProductAI(raw) {
  try {
    if (!(window.claude && typeof window.claude.complete === "function")) return null;
    const src = {
      name: (raw.title || "").slice(0, 200),
      brand: (raw.site || "").slice(0, 80),
      description: (raw.desc || "").slice(0, 900),
      bulletPoints: (raw.points || []).slice(0, 12),
      category: raw.cat || "",
    };
    const prompt =
`あなたは「LOVABLE」という、20〜30代女性向けの上品で洗練された(Quiet Luxury)ライフスタイル・セレクトショップの日本語コピーライターです。
ECサイトから雑に抽出した商品情報（英語混じり・冗長・ノイズあり）を渡します。これを、サイト掲載用のきれいな日本語に整えてください。

# 入力（生データ）
${JSON.stringify(src, null, 2)}

# 出力ルール
- 必ず日本語のみ。英語の型番・ノイズ・キャッチ記号・店舗名(Amazon/楽天等)・送料/在庫/配送/正規品管理の話は除去。
- name: 簡潔で分かりやすい商品名（16〜34文字目安。ブランド名は残し、容量・型番・キャッチ・重複ワードなど冗長な装飾は削る）。
- copy: 商品の魅力が伝わる、上品で柔らかい紹介文を1〜2文（60〜130文字目安）。誇大表現や絵文字は使わない。
- points: 実際の特長・魅力が伝わる箇条書きを3〜4個（各12〜34文字、体言止めか「〜。」で）。
  ・description や bulletPoints に魅力が乏しい場合は、商品名(name)に含まれる客観的な属性（例：成分・容量・タイプ・産地・個包装・素材など）から、事実に基づくポイントを作ってよい。
  ・配送・店舗・価格・「正規品」管理の話は入れない。事実として言えないことは書かない（効果効能の誇張・捏造は禁止）。
- 情報が本当に乏しい項目のみ空文字 "" / 空配列 [] を返す。

# 出力フォーマット（JSONのみ。前後に文章を付けない）
{"name":"...","copy":"...","points":["...","..."]}`;
    const out = await window.claude.complete(prompt);
    if (!out) return null;
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    const clean = (s) => jaOnly(String(s || "").replace(/\s+/g, " ").trim());
    const name = clean(j.name).slice(0, 48);
    const copy = clean(j.copy).slice(0, 200);
    let pts = Array.isArray(j.points) ? j.points.map(clean).filter(t => t && t.length >= 6 && t.length <= 48) : [];
    pts = [...new Set(pts)].slice(0, 4);
    return { name, copy, points: pts };
  } catch (e) { return null; }
}
function parseProduct(html) {
  let title = "", desc = "", site = "", price = 0, imgs = [], points = [], descCands = [], doc = null, ogAnchor = "";
  const looksJina = /^(Title:|URL Source:)/m.test(html) && !/<\/?html/i.test(html);
  try {
    if (!looksJina) {
      doc = new DOMParser().parseFromString(html, "text/html");
      const m = (sel) => { const el = doc.querySelector(sel); return el ? (el.getAttribute("content") || "").trim() : ""; };
      const txtOf = (sel) => { const el = doc.querySelector(sel); return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; };
      // Amazon's real product name lives in #productTitle; prefer it over og/<title>
      title = txtOf("#productTitle") || txtOf("#title") || m('meta[property="og:title"]') || m('meta[name="twitter:title"]') || (doc.querySelector("title")?.textContent || "").trim();
      desc  = m('meta[property="og:description"]') || m('meta[name="description"]');
      site  = m('meta[property="og:site_name"]');
      const og = [...doc.querySelectorAll('meta[property="og:image"],meta[property="og:image:url"],meta[name="twitter:image"]')].map(e => e.getAttribute("content"));
      ogAnchor = (og.find(Boolean) || "").trim();
      const body = [...doc.querySelectorAll("img")].map(im =>
        im.getAttribute("src") || im.getAttribute("data-src") ||
        im.getAttribute("data-old-hires") || im.getAttribute("data-a-hires") ||
        im.getAttribute("data-lazy") || im.getAttribute("data-image") || im.getAttribute("data-zoom-image"));
      // Amazon: main image candidates live in a JSON map inside data-a-dynamic-image
      const dyn = [...doc.querySelectorAll("[data-a-dynamic-image]")]
        .flatMap(el => { try { return Object.keys(JSON.parse(el.getAttribute("data-a-dynamic-image"))); } catch (e) { return []; } });
      // last resort: scan raw HTML for any product-CDN image URL (covers JSON blobs, lazy attrs, escaped slashes)
      const raw = rawImgScan(html);
      imgs = [...og, ...dyn, ...body, ...raw].filter(Boolean);
      // Amazon "この商品について" bullets are the best selling points; prefer them
      const fb = [...doc.querySelectorAll("#feature-bullets li, #feature-bullets span.a-list-item, #productFactsDesktopExpander li")].map(e => e.textContent);
      points = (fb.length ? fb : [...doc.querySelectorAll("li")].map(li => li.textContent));
      // richer description candidates from common product-description containers
      descCands = [desc,
        ...[...doc.querySelectorAll('#productDescription, .productDescription, [itemprop="description"], #feature-bullets, #feature-bullets li, .item_desc, .item-description, .sale_desc, .mainText, .item_explanation, .ProductDetail, .product-detail, p')]
          .map(e => e.textContent)];
    } else {
      const txt = html.replace(/^Title:.*$/m, "").replace(/^URL Source:.*$/m, "").replace(/^Markdown Content:.*$/m, "");
      title = (html.match(/^Title:[ \t]*(.+)$/m) || [])[1] || (txt.match(/^#{1,3}\s+(.+)/m) || [])[1] || "";
      if (/^URL Source:/i.test(title) || /^https?:\/\//i.test(title)) title = (txt.match(/^#{1,3}\s+(.+)/m) || [])[1] || "";
      desc  = (txt.match(/^\s*([^\n#!\[|>*\-].{20,})$/m) || [])[1] || "";
      imgs  = [...txt.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map(x => x[1])
              .concat([...txt.matchAll(/https?:\/\/\S+?\.(?:jpe?g|png|webp)/gi)].map(x => x[0]));
      ogAnchor = (html.match(/og:image["']\s+content=["']([^"']+)/i) || html.match(/"og:image"\s*content="([^"]+)/i) || [])[1] || "";
      points = [...txt.matchAll(/^[\-\*・●■▼]\s*(.+)$/gm)].map(x => x[1]);
      descCands = [desc, ...txt.split(/\n{1,}/)];
    }
  } catch (e) {}
  // ACTUAL selling price (buy-box) — DOM-priority, JSON, then conservative text
  price = extractPrice(doc, html);
  // never use the marketplace itself as a brand name
  if (/amazon|rakuten|楽天|qoo10|tiktok/i.test(site)) site = "";
  // ---- category signals (公式データ最優先で拾えるだけ拾う) ----
  const catSig = extractCategorySignals(doc, html);
  desc = jaOnly(pickJaDesc(descCands, desc));
  const rr = extractRatings(html);
  return { title: cleanTitle(title), desc, site, price, imgs: cleanImgs(imgs, ogAnchor), ogImage: ogAnchor, points: cleanPoints(points, desc),
           rating: rr.rating, reviews: rr.reviews, userReviews: rr.userReviews, catSignals: catSig };
}
/* Pull whatever official category signals a page exposes: 楽天ジャンルID・パンくず・
   JSON-LDカテゴリ・ROOMカテゴリ・キーワード。無い項目は空でOK（mapper が段階処理）。 */
function extractCategorySignals(doc, html) {
  const sig = { genreId: "", breadcrumb: [], roomCategory: "", genreName: "", officialName: "", categoryId: "" };
  try {
    // 楽天ジャンルID（ページ埋め込みJSON/スクリプトに現れる）
    sig.genreId = (html.match(/genre_?[iI]d["'\s:=]+["']?(\d{4,})/i) || html.match(/"genreId"\s*:\s*"?(\d{4,})/i) || [])[1] || "";
    // JSON-LD / OG category
    sig.officialName = (html.match(/"category"\s*:\s*"([^"]{2,60})"/i) || [])[1] || "";
    // breadcrumb（JSON-LD BreadcrumbList または DOM）
    const bc = [...html.matchAll(/"itemListElement"[\s\S]{0,4000}?"name"\s*:\s*"([^"]{1,40})"/gi)].map(m => m[1]);
    if (doc) {
      const domBc = [...doc.querySelectorAll('[class*="breadcrumb" i] a, nav[aria-label*="pan" i] a, .breadcrumb a, #wayfinding-breadcrumbs_feature_div a')].map(a => a.textContent.trim()).filter(Boolean);
      if (domBc.length) sig.breadcrumb = domBc.slice(0, 8);
    }
    if (!sig.breadcrumb.length && bc.length) sig.breadcrumb = [...new Set(bc)].slice(0, 8);
    // keywords meta（ジャンル名の代替）
    sig.genreName = (html.match(/"keywords"\s*:\s*"([^"]{2,120})"/i) || html.match(/name=["']keywords["']\s+content=["']([^"']{2,120})/i) || [])[1] || "";
    // ROOM: item.rakuten.co.jp/<shop>/ から shop 名を拾う（属性判定の補助）
    const shopSlug = (html.match(/item\.rakuten\.co\.jp\/([a-z0-9_\-]+)\//i) || [])[1] || "";
    if (shopSlug) sig.shopName = shopSlug;
  } catch (e) {}
  return sig;
}
/* Extract the ACTUAL selling price (buy-box), not a list/strikethrough/variant/points value.
   DOM-priority for Amazon & Rakuten, then JSON, then conservative text patterns. */
function extractPrice(doc, html) {
  const toNum = (s) => { const n = parseInt(String(s || "").replace(/[^0-9]/g, ""), 10); return Number.isFinite(n) ? n : 0; };
  const sane = (n) => n >= 50 && n <= 3000000;   // reject points/ids/garbage
  if (doc) {
    // Amazon buy-box price (most reliable): the accessible price text inside the "price to pay" block
    const amazonSel = [
      "#corePrice_feature_div .a-price[data-a-color='base'] .a-offscreen",
      "#corePrice_feature_div .priceToPay .a-offscreen",
      ".priceToPay .a-offscreen",
      "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
      "#corePrice_feature_div .a-offscreen",
      "#apex_offerDisplay_desktop .a-offscreen",
      "#price_inside_buybox",
      "#tp_price_block_total_price_ww .a-offscreen",
    ];
    for (const sel of amazonSel) {
      const el = doc.querySelector(sel);
      if (el) { const n = toNum(el.textContent); if (sane(n)) return n; }
    }
    // Rakuten / generic itemprop price
    const ip = doc.querySelector('[itemprop="price"]');
    if (ip) { const n = toNum(ip.getAttribute("content") || ip.textContent); if (sane(n)) return n; }
    const rk = doc.querySelector(".price2, .price--3zUvT, #priceCalculationConfig, [class*='priceValue'], .item_price");
    if (rk) { const n = toNum(rk.getAttribute("data-price") || rk.textContent); if (sane(n)) return n; }
  }
  // JSON embedded prices (Amazon priceAmount / JSON-LD)
  const jsonPats = [
    /"priceAmount"\s*:\s*([0-9]+(?:\.[0-9]+)?)/i,
    /"price"\s*:\s*"?([0-9][0-9,]{1,})/i,
    /"lowPrice"\s*:\s*"?([0-9][0-9,]{1,})/i,
    /"displayPrice"\s*:\s*"[^0-9]*([0-9][0-9,]{1,})/i,
  ];
  for (const re of jsonPats) { const m = html.match(re); if (m) { const n = toNum(m[1]); if (sane(n)) return n; } }
  // conservative text patterns — require an explicit price marker so we don't grab points/coupons
  const textPats = [
    /([0-9][0-9,]{2,})\s*円\s*(?:[（(]?税込)/,          // 2,007円（税込）
    /(?:税込|販売価格|価格)[：:\s]*[¥￥]?\s*([0-9][0-9,]{2,})\s*円?/,
    /[¥￥]\s?([0-9][0-9,]{3,})/,                        // ¥2,007 (4+ digits preferred)
  ];
  for (const re of textPats) { const m = html.match(re); if (m) { const n = toNum(m[1]); if (sane(n)) return n; } }
  return 0;
}
/* rating ・ review count ・ 口コミ from JSON-LD + text fallbacks */
function extractRatings(html) {
  let rating = 0, reviews = 0, userReviews = [];
  try {
    const blocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    for (const b of blocks) {
      let data; try { data = JSON.parse(b.trim()); } catch (e) { continue; }
      const nodes = Array.isArray(data) ? data : (data["@graph"] ? data["@graph"] : [data]);
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const ag = node.aggregateRating;
        if (ag) {
          rating = rating || parseFloat(ag.ratingValue) || 0;
          reviews = reviews || parseInt(String(ag.reviewCount || ag.ratingCount || "").replace(/[^0-9]/g, ""), 10) || 0;
        }
        const rv = node.review;
        if (rv) {
          const list = Array.isArray(rv) ? rv : [rv];
          for (const r of list) {
            const body = String(r.reviewBody || r.description || "").replace(/\s+/g, " ").trim();
            if (!body) continue;
            const au = r.author;
            userReviews.push({
              name: (au && (au.name || au)) || "購入者",
              meta: "",
              rating: Math.round(parseFloat(r.reviewRating && r.reviewRating.ratingValue) || rating || 5),
              body: body.slice(0, 160),
            });
          }
        }
      }
    }
  } catch (e) {}
  if (!rating) {
    const m = html.match(/5つ星のうち\s?([0-5](?:\.[0-9])?)/) || html.match(/"ratingValue"\s*:\s*"?([0-5](?:\.[0-9])?)/)
      || html.match(/★\s?([0-5](?:\.[0-9])?)\s*\//) || html.match(/評価[：:\s]*([0-5](?:\.[0-9])?)\s*\/?\s*5/)
      || html.match(/([0-5]\.[0-9])\s*点/) || html.match(/平均\s*([0-5]\.[0-9])/) || html.match(/star-?rating[^0-9]{0,12}([0-5]\.[0-9])/i);
    if (m) rating = parseFloat(m[1]);
  }
  if (!reviews) {
    const m = html.match(/([0-9,]+)\s*(?:個の評価|件のレビュー|件の評価|個のレビュー|件の口コミ|レビュー件数)/)
      || html.match(/"reviewCount"\s*:\s*"?([0-9,]+)/) || html.match(/"ratingCount"\s*:\s*"?([0-9,]+)/)
      || html.match(/レビュー\s*[（(]\s*([0-9,]+)/) || html.match(/([0-9,]+)\s*reviews?/i) || html.match(/クチコミ\s*([0-9,]+)\s*件/);
    if (m) reviews = parseInt(m[1].replace(/,/g, ""), 10) || 0;
  }
  rating = rating ? Math.min(5, Math.round(rating * 10) / 10) : 0;
  // Japanese reviews only, keep the BEST ones (quality-ranked), dedup by body
  userReviews = pickGoodReviews(userReviews, 4);
  return { rating, reviews, userReviews };
}
/* score a 口コミ by quality so we surface the BEST ones, not just the first few.
   rewards: positive sentiment, concrete product detail, ideal length, high rating.
   penalizes: complaints, shipping/store gripes, too-short or too-long, all-caps noise. */
function reviewScore(r) {
  const t = (r.body || "");
  let s = 0;
  // rating weight
  s += (Number(r.rating) || 0) * 2;          // 5★ → +10
  // positive / appealing sentiment
  const pos = /(良い|よい|よかった|最高|大満足|満足|お気に入り|愛用|リピート|また買|おすすめ|可愛|かわいい|綺麗|きれい|上品|高見え|使いやすい|しっとり|うるおい|ツヤ|つや|サラサラ|軽い|心地|香りがいい|いい香り|買ってよかった|期待以上|コスパ|ちょうどいい|肌に合|届くのが早|丁寧|質感|気に入)/g;
  const pm = t.match(pos); if (pm) s += Math.min(pm.length * 3, 9);
  // concrete, helpful detail (specifics make a review trustworthy)
  if (/(身長|cm|サイズ|着|肌|髪|色|質感|使って|使用|匂い|香り|テクスチャ|伸び|容量|形|シルエット)/.test(t)) s += 3;
  if (/[。！♡♪]/.test(t)) s += 1;
  // ideal length band
  const L = t.length;
  if (L >= 30 && L <= 160) s += 4; else if (L >= 20 && L <= 220) s += 2; else if (L < 14) s -= 4;
  // negative / off-topic penalties
  if (/(残念|最悪|がっかり|不良|壊れ|破れ|返品|交換|届かない|遅い|misleading|思って|想像|期待外れ|二度と|買わない|高い|においが苦手|きつい|合わなかった|くる|小さすぎ|大きすぎ)/.test(t)) s -= 7;
  if (/(発送|配送|梱包|ショップ|店|対応|クーポン|ポイント|送料)/.test(t)) s -= 3;
  return s;
}
/* keep only good reviews, ranked best-first, deduped */
function pickGoodReviews(list, limit) {
  const seen = new Set();
  return (list || [])
    .filter(r => r && hasJa(r.body) && r.body.replace(/\s+/g, "").length >= 12)
    .filter(r => Math.round(Number(r.rating) || 0) >= 5)   // ★5の口コミのみ反映
    .filter(r => { const k = r.body.slice(0, 30); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(r => ({ r, sc: reviewScore(r) }))
    .filter(x => x.sc >= 6)                       // drop weak / negative reviews
    .sort((a, b) => b.sc - a.sc)
    .map(x => ({ ...x.r, rating: 5 }))
    .slice(0, limit || 4);
}
/* parse a REVIEW page (e.g. review.rakuten.co.jp) into 口コミ entries */
function parseReviews(html) {
  let out = [];
  // 1) JSON-LD review[]
  try {
    const blocks = [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
    for (const b of blocks) {
      let d; try { d = JSON.parse(b.trim()); } catch (e) { continue; }
      const nodes = Array.isArray(d) ? d : (d["@graph"] || [d]);
      for (const n of nodes) {
        const rv = n && n.review; if (!rv) continue;
        (Array.isArray(rv) ? rv : [rv]).forEach(r => {
          const body = String(r.reviewBody || r.description || "").replace(/\s+/g, " ").trim();
          if (body) out.push({ name: (r.author && (r.author.name || r.author)) || "購入者", meta: "", rating: Math.round(parseFloat(r.reviewRating && r.reviewRating.ratingValue) || 5), body: body.slice(0, 220) });
        });
      }
    }
  } catch (e) {}
  // 2) Rakuten / generic review markup
  if (!out.length) {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const sels = ["dd.revRvwUserEntryCmt", ".revRvwUserEntryCmt", ".revUserComment", ".revRvwUserSec", "[itemprop='review'] [itemprop='reviewBody']", ".review-comment", ".comment-body", ".review_comment"];
      for (const sel of sels) {
        const els = [...doc.querySelectorAll(sel)];
        if (els.length) {
          els.forEach(el => { const body = el.textContent.replace(/\s+/g, " ").trim(); if (body.length >= 12) out.push({ name: "購入者", meta: "", rating: 5, body: body.slice(0, 220) }); });
          if (out.length) break;
        }
      }
    } catch (e) {}
  }
  // 3) plain-text / markdown heuristic (jina proxy output)
  if (!out.length) {
    const junk = /(楽天|ログイン|カート|送料|ポイント|ランキング|クーポン|利用規約|プライバシー|お問い合わせ|レビューを書く|参考になった|不適切|このレビュー|並び替え|絞り込み|http|ショップ|販売者|注文|配送|発送)/;
    const lines = html.replace(/<[^>]+>/g, " ").split(/\n+/).map(s => s.replace(/\s+/g, " ").trim());
    for (const ln of lines) {
      if (ln.length >= 20 && ln.length <= 260 && /[。！!♡♪、]/.test(ln) && !junk.test(ln)) out.push({ name: "購入者", meta: "", rating: 5, body: ln.slice(0, 220) });
      if (out.length >= 6) break;
    }
  }
  const seen = new Set();
  // keep only ★5 Japanese reviews, ranked by quality (no fallback to lower ratings)
  const cleaned = out.filter(r => hasJa(r.body))
    .filter(r => { const k = r.body.slice(0, 30); if (seen.has(k)) return false; seen.add(k); return true; });
  return pickGoodReviews(cleaned, 6);
}
function ProductEditor({ id }) {
  const isNew = id === "new";
  const cats = PS.allCategories();
  const blank = {
    name:"", brand:"", cat:cats[0]?.key||"beauty", sub:"", price:0, rating:4.5, reviews:0,
    copy:"", points:[""], tags:[], tag:"", badge:"", rank:null, grad:PS.GRAD[PS.GRAD_KEYS[0]],
    imgs:[], shops:["rakuten","amazon","qoo10","tiktok"],
    catManual:false, categoryMeta:null,
    badges:[], repeatPurchase:false,
    links:{tiktok:"",rakuten:"",amazon:"",qoo10:""},
    social:{ig:"",tiktok:"",youtube:""}, status:"draft",
  };
  const [p, setP] = useState(() => isNew ? blank : JSON.parse(JSON.stringify(PS.getProduct(id) || blank)));
  const f = (k,v) => setP(s=>({...s,[k]:v}));
  const fl = (k,v) => setP(s=>({...s,links:{...s.links,[k]:v}}));
  const fs = (k,v) => setP(s=>({...s,social:{...s.social,[k]:v}}));
  const cat = cats.find(c=>c.key===p.cat);

  const [imp, setImp] = useState({ url:"", loading:false, msg:"", ok:false });
  const doImport = async () => {
    const url = imp.url.trim();
    if (!url) return;
    const provider = getProvider(url);
    const store = provider ? provider.id : null;
    setImp(s=>({...s, loading:true, msg:"", ok:false }));
    if (store) setP(s=>({...s, links:{...s.links,[store]:url}}));   // store the ORIGINAL affiliate link

    // resolve short links (amzn.to, a.co …) and build the best URL to FETCH (provider-driven)
    let fetchUrl = url;
    try {
      setImp(s=>({...s, msg:"リンクを解決しています…"}));
      const resolved = await resolveShortLink(url);
      fetchUrl = (provider && provider.canonical(resolved)) || normalizeImportUrl(resolved, store);
    } catch (e) {}

    // each provider declares its own fetch strategy (Amazon→jina HTML, others→raw HTML)
    let html;
    setImp(s=>({...s, msg:"商品情報を取得しています…"}));
    if (provider) { try { html = await provider.fetch(fetchUrl); } catch (e) {} }
    else { html = await fetchPageHTML(fetchUrl); }
    if (!html) {
      setImp(s=>({...s, loading:false, ok:false,
        msg: store
          ? `リンクを「${SHOP_META[store].name}」に設定しました。${store==="amazon" ? "Amazonが自動取得を一時的にブロックしました。少し時間をおいて再度「読み込む」を押すと取得できる場合があります。取得できない場合は" : "サイト側が自動取得をブロックしたため、"}商品名・画像・ポイントは手入力をお願いします（本番環境のサーバー取得では安定して自動入力されます）。`
          : "このURLからストアを判定できませんでした。リンク欄に直接貼り付けてください。" }));
      ptoast(store ? "リンクを設定しました" : "読み込めませんでした");
      return;
    }
    const o = parseProduct(html);
    // price/rating often live in JS-rendered DOM → fetch the rendered text and re-scan
    if (!o.price || !o.rating || !o.reviews) {
      try {
        const txt = await fetchViaProxies(fetchUrl, ["jina"]);
        if (txt) {
          const r2 = parseProduct(txt);
          if (!o.price && r2.price) o.price = r2.price;
          if (!o.rating && r2.rating) o.rating = r2.rating;
          if (!o.reviews && r2.reviews) o.reviews = r2.reviews;
          if ((!o.userReviews || !o.userReviews.length) && r2.userReviews && r2.userReviews.length) o.userReviews = r2.userReviews;
        }
      } catch (e) {}
    }
    let imgs = o.imgs;
    try { imgs = await keepRealPhotos(o.imgs); } catch (e) {}
    // ⑦ diagnostic log: trace exactly where images come from (image-product cohesion)
    try {
      console.log("[LB import] 画像取得ログ", {
        商品ID: store, ROOM_URL: url, 取得URL: fetchUrl,
        取得方法: store === "amazon" ? "jina-html" : "proxy-html",
        取得元タイトル: o.title, OG画像_anchor: o.ogImage,
        cohesion適用後の画像: imgs, 最終画像URL: imgs[0] || "(placeholder)",
      });
    } catch (e) {}
    // refine name / description / points into clean, on-brand Japanese (best-effort)
    let ai = null;
    try {
      setImp(s=>({...s, msg:"内容をAIで整えています…"}));
      ai = await refineProductAI({ title:o.title, site:o.site, desc:o.desc, points:o.points, cat:p.cat });
    } catch (e) {}
    if (ai) {
      if (ai.name) o.title = ai.name;
      if (ai.copy) o.desc = ai.copy;
      if (ai.points && ai.points.length) o.points = ai.points;
    }
    setP(s=>{
      const n = {...s};
      if (o.title && !s.name) n.name = o.title;
      if (o.site && !s.brand) n.brand = o.site;
      if (o.desc && !s.copy) n.copy = o.desc;
      if (o.price) n.price = o.price;                 // link price always wins
      if (imgs.length) n.imgs = [...new Set([...(s.imgs||[]), ...imgs])].slice(0,8);
      if (o.points.length && (!s.points || s.points.filter(Boolean).length===0)) n.points = o.points;
      if (o.rating) n.rating = o.rating;              // link rating always wins
      if (o.reviews) n.reviews = o.reviews;           // link review count always wins
      if (o.userReviews.length && (!s.userReviews || s.userReviews.length===0)) n.userReviews = o.userReviews;
      if (store) n.links = {...s.links,[store]:url};
      // ---- カテゴリ自動判定（公式データ最優先）。手動修正済みなら尊重して上書きしない ----
      if (!s.catManual && window.LBCategory) {
        const cls = window.LBCategory.classifyCategory(store, {
          ...(o.catSignals||{}),
          title: o.title || s.name, desc: o.desc || s.copy,
          brand: o.site || s.brand, tags: s.tags,
        });
        n.cat = cls.cat; n.sub = cls.sub;
        n.categoryMeta = {
          common: cls.common, source: cls.source, confidence: cls.confidence,
          originalCategory: cls.originalCategory, originalCategoryId: cls.originalCategoryId,
          shopCategory: cls.shopCategory, mappedAt: cls.mappedAt, auto: true,
        };
        n.catManual = false;
      }
      return n;
    });
    const got = [o.title&&"商品名", imgs.length&&`画像${imgs.length}枚`, o.desc&&"説明", o.price&&"価格",
                 o.rating&&"評価", o.reviews&&"レビュー数", o.userReviews.length&&`口コミ${o.userReviews.length}件`,
                 o.points.length&&`ポイント${o.points.length}件`, (!p.catManual)&&"カテゴリ"].filter(Boolean).join("・");
    setImp(s=>({...s, loading:false, ok:true,
      msg: (got ? `${got}を自動入力しました。` : "リンクを設定しました。")
        + (ai ? " 商品名・説明・ポイントはAIで読みやすく整えました。" : "")
        + (!o.price ? " ⚠ 価格は自動取得できませんでした（右の「価格」欄に手入力してください）。" : "")
        + (!o.rating && o.price ? " 評価は取得できませんでした。" : "") }));
    ptoast("自動入力しました");
  };

  const save = (status) => {
    if (!p.name.trim()) { ptoast("商品名を入力してください"); return; }
    const data = {...p, status: status||p.status};
    if (data.rank==="" ) data.rank=null;
    const nid = PS.saveProduct(data);
    if (!nid) {
      const e = PS.lastError && PS.lastError();
      const quota = e && /quota|read-back|exceeded/i.test(String(e.message||e));
      ptoast(quota ? "保存できません：画像が大きすぎて容量超過です。画像を減らして再保存してください" : "保存に失敗しました。もう一度お試しください");
      return;   // stay on the editor so the operator does not lose their edits
    }
    ptoast(status==="published"?"公開しました":"保存しました");
    pgo("products");
  };

  return (
    <div className="content">
      <div className="editor">
        <div className="ed-main">
          <div className="card" style={{borderColor:"var(--a-brand)",background:"linear-gradient(180deg,var(--a-brand-soft),var(--a-surface) 60%)"}}>
            <h3><span className="num">★</span>URLから自動入力</h3>
            <div className="hint" style={{marginBottom:12}}>商品ページや楽天ROOMのURLを貼って「読み込む」を押すと、<b>ストアを判定してアフィリリンクを設定</b>し、<b>商品名・画像・説明・価格</b>を自動で読み込みます。</div>
            <div style={{display:"flex",gap:8}}>
              <input className="in" value={imp.url}
                placeholder="https://item.rakuten.co.jp/… / https://room.rakuten.co.jp/… / Amazon・Qoo10・TikTok"
                onChange={e=>setImp(s=>({...s,url:e.target.value}))}
                onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); doImport(); } }} />
              <button className="b b--p" disabled={imp.loading} onClick={doImport} style={{minWidth:108}}>
                {imp.loading ? "読み込み中…" : "読み込む"}
              </button>
            </div>
            {imp.msg && <div className="hint" style={{marginTop:10,borderColor:imp.ok?"var(--a-ok)":"var(--a-line-2)",color:imp.ok?"var(--a-ok)":"var(--a-muted)"}}>{imp.ok?"✓ ":""}{imp.msg}</div>}
          </div>

          <div className="card">
            <h3><span className="num">1</span>基本情報</h3>
            <label className="fld"><span>商品名 <em>（必須）</em></span>
              <input className="in" value={p.name} onChange={e=>f("name",e.target.value)} placeholder="例）とろみシルク ブラウス" /></label>
            <div className="row2">
              <label className="fld"><span>ブランド</span>
                <input className="in" value={p.brand} onChange={e=>f("brand",e.target.value)} placeholder="例）ATELIER NOOR" /></label>
              <label className="fld"><span>バッジ <em>（任意）</em></span>
                <input className="in" value={p.badge||""} onChange={e=>f("badge",e.target.value)} placeholder="例）いっくんのお気に入り" /></label>
            </div>
            <label className="fld"><span>商品説明</span>
              <textarea className="ta" value={p.copy} onChange={e=>f("copy",e.target.value)} placeholder="この商品の魅力を、雑誌のレビューのように紹介しましょう。" /></label>
          </div>

          <div className="card">
            <h3><span className="num">2</span>分類・タグ
              {p.categoryMeta && p.categoryMeta.source && (
                <span className={"catbadge " + (p.catManual ? "catbadge--manual" : "catbadge--auto")}>
                  {p.catManual ? "手動修正" : "自動判定"}
                  {!p.catManual && p.categoryMeta.confidence && <em> · 確度{({high:"高",medium:"中",low:"低"})[p.categoryMeta.confidence]||p.categoryMeta.confidence}</em>}
                </span>
              )}
            </h3>
            {p.categoryMeta && p.categoryMeta.source && !p.catManual && (
              <p className="cathint">
                判定根拠：<b>{({["rakuten-genreId"]:"楽天ジャンルID",["rakuten-breadcrumb"]:"楽天パンくず",["room-category"]:"ROOMカテゴリ",["rakuten-genreName"]:"楽天ジャンル名",["amazon-breadcrumb"]:"Amazonパンくず",["amazon-department"]:"Amazon部門",["qoo10-breadcrumb"]:"Qoo10パンくず",["tiktok-category"]:"TikTokカテゴリ","attributes":"ブランド・ショップ属性","keyword-assist":"タイトル・説明の補助判定","fallback":"該当なし（既定）"})[p.categoryMeta.source]||p.categoryMeta.source}</b>
                {p.categoryMeta.originalCategory && <> ／ 取得元：{p.categoryMeta.originalCategory}</>}
                （共通カテゴリ：{p.categoryMeta.common}）
              </p>
            )}
            <div className="row2">
              <label className="fld"><span>カテゴリー</span>
                <select className="sel" value={p.cat} onChange={e=>{f("cat",e.target.value); f("catManual",true);}}>
                  {cats.map(c=><option key={c.key} value={c.key}>{c.en} / {c.jp}</option>)}
                </select></label>
              <label className="fld"><span>サブカテゴリー</span>
                <select className="sel" value={p.sub} onChange={e=>{f("sub",e.target.value); f("catManual",true);}}>
                  <option value="">選択してください</option>
                  {(cat?.subs||[]).map(s=><option key={s} value={s}>{s}</option>)}
                </select></label>
            </div>
            {p.catManual && p.categoryMeta && p.categoryMeta.source && (
              <button type="button" className="catreset" onClick={()=>f("catManual",false)}>自動判定に戻す</button>
            )}
            <label className="fld"><span>表示タグ <em>（カードに出る短いラベル / 例：新着・韓国）</em></span>
              <input className="in" value={p.tag||""} onChange={e=>f("tag",e.target.value)} placeholder="例）新着" /></label>
            <label className="fld" style={{marginBottom:0}}><span>検索タグ</span>
              <TagsInput tags={p.tags} onChange={v=>f("tags",v)} /></label>
          </div>

          <div className="card">
            <h3><span className="num">3</span>商品バッジ <em style={{fontWeight:400,color:"var(--a-muted)",fontSize:12}}>（カード・詳細に表示）</em></h3>
            <label className="badgeflag">
              <input type="checkbox" checked={!!p.repeatPurchase}
                onChange={e=>f("repeatPurchase", e.target.checked)} />
              <span className="badgeflag__box" aria-hidden="true"></span>
              <span className="badgeflag__txt"><b>💞 リピート購入商品</b><em>「何度も買っている愛用品」として目立たせます</em></span>
            </label>
            <div className="badgepick__label">その他のバッジ（複数選択可）</div>
            <div className="badgepick">
              {(window.LBBadges ? window.LBBadges.all() : []).filter(b=>b.key!=="repeat").map(b=>{
                const on = Array.isArray(p.badges) && p.badges.includes(b.key);
                return (
                  <button type="button" key={b.key}
                    className={"badgepick__opt badge badge--"+b.tone+(on?" is-on":"")}
                    aria-pressed={on}
                    onClick={()=>{
                      const cur = Array.isArray(p.badges)?p.badges:[];
                      f("badges", on ? cur.filter(k=>k!==b.key) : [...cur, b.key]);
                    }}>
                    <span className="badge__i" aria-hidden="true">{b.icon}</span>
                    <span className="badge__t">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3><span className="num">4</span>商品画像</h3>
            <ImageManager imgs={p.imgs} onChange={v=>f("imgs",v)} />
          </div>

          <div className="card">
            <h3><span className="num">5</span>いっくんのおすすめポイント</h3>
            <Repeater items={p.points} onChange={v=>f("points",v)} placeholder="例）とろみ素材で骨格ウェーブの上半身をすっきり" />
          </div>

          <div className="card">
            <h3><span className="num">6</span>アフィリエイトリンク</h3>
            <div className="hint" style={{marginBottom:16}}>各ストアの<b>あなたのアフィリエイトURL</b>を貼ってください。入れたストアだけがサイトで有効化されます。<b>TikTok Shop</b>は常に大きく表示されます。</div>
            {["tiktok","rakuten","amazon","qoo10"].map(s=>(
              <div className="lnk" key={s}>
                <div className="lnk__tag"><span className="lnk__dot" style={{background:SHOP_META[s].c}}>{s[0].toUpperCase()}</span>{SHOP_META[s].name}</div>
                <input className="in" value={(p.links&&p.links[s])||""} onChange={e=>fl(s,e.target.value)} placeholder={"https://… "+SHOP_META[s].name+"のリンク"} />
              </div>
            ))}
          </div>

          <div className="card">
            <h3><span className="num">7</span>SNS連携 <em style={{fontWeight:400,color:"var(--a-muted)"}}>（任意）</em></h3>
            <label className="fld"><span>Instagram投稿URL</span><input className="in" value={p.social?.ig||""} onChange={e=>fs("ig",e.target.value)} placeholder="https://www.instagram.com/p/…" /></label>
            <label className="fld"><span>TikTok投稿URL</span><input className="in" value={p.social?.tiktok||""} onChange={e=>fs("tiktok",e.target.value)} placeholder="https://www.tiktok.com/@…" /></label>
            <label className="fld" style={{marginBottom:0}}><span>YouTube URL</span><input className="in" value={p.social?.youtube||""} onChange={e=>fs("youtube",e.target.value)} placeholder="https://youtu.be/…" /></label>
          </div>
        </div>

        {/* sidebar */}
        <div className="ed-side">
          <div className="card">
            <h3>公開設定</h3>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <button className="b b--p b--block" onClick={()=>save("published")}>公開する</button>
              <button className="b b--g" onClick={()=>save("draft")}>下書き</button>
            </div>
            <div className="hint">状態：<b>{(p.status||"draft")==="published"?"公開":"下書き"}</b></div>
            <button className="b b--g b--block" style={{marginTop:12}} onClick={()=>pgo("products")}>キャンセル</button>
          </div>

          <div className="card">
            <h3>価格・評価</h3>
            <label className="fld"><span>価格（円）</span>
              <input className="in" type="number" value={p.price} onChange={e=>f("price",+e.target.value)} /></label>
            <div className="row2">
              <label className="fld"><span>評価（5段階）</span>
                <input className="in" type="number" step="0.1" min="0" max="5" value={p.rating} onChange={e=>f("rating",+e.target.value)} /></label>
              <label className="fld"><span>レビュー数</span>
                <input className="in" type="number" value={p.reviews} onChange={e=>f("reviews",+e.target.value)} /></label>
            </div>
            <label className="fld" style={{marginBottom:0}}><span>ランキング順位 <em>（任意・空欄でランク外）</em></span>
              <input className="in" type="number" min="1" value={p.rank||""} onChange={e=>f("rank",e.target.value?+e.target.value:null)} placeholder="例）1" /></label>
          </div>

          <div className="card">
            <h3>プレースホルダー色</h3>
            <div className="hint" style={{marginBottom:12}}>画像が無いとき、カードに表示される上品なグラデーション。</div>
            <div className="swatches">
              {PS.GRAD_KEYS.map(k=>(
                <button key={k} className={"sw"+(p.grad===PS.GRAD[k]?" sw--on":"")} style={{background:PS.GRAD[k]}} onClick={()=>f("grad",PS.GRAD[k])} title={k}></button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- MEDIA LIBRARY ---------- */
function MediaLibrary() {
  window.AdminCore.useStore();
  const [over, setOver] = useState(false);
  const fileRef = useRef();
  const media = PS.allMedia();

  const readFiles = (files) => {
    const arr = [...files].filter(f=>f.type.startsWith("image/"));
    let done=0; const out=[];
    if(!arr.length) return;
    arr.forEach(f=>{
      const r=new FileReader();
      r.onload=()=>compress(r.result,(c)=>{ out.push({id:PS.newMediaId(),src:c,name:f.name,date:new Date().toISOString()}); if(++done===arr.length){ PS.addMedia(out); ptoast(out.length+"枚を追加しました"); } });
      r.readAsDataURL(f);
    });
  };

  return (
    <div className="content">
      <div className={"dz"+(over?" dz--over":"")} style={{marginBottom:24}}
        onClick={()=>fileRef.current.click()}
        onDragOver={e=>{e.preventDefault();setOver(true);}} onDragLeave={()=>setOver(false)}
        onDrop={e=>{e.preventDefault();setOver(false);readFiles(e.dataTransfer.files);}}>
        {React.cloneElement(PI.up,PF)}
        <div><b>クリック</b>または画像をドラッグ＆ドロップしてアップロード</div>
        <div style={{fontSize:12,marginTop:4}}>複数枚OK・自動圧縮。商品編集・記事から再利用できます。</div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>readFiles(e.target.files)} />
      </div>
      {media.length ? (
        <div className="media-grid">
          {media.map(m=>(
            <div className="media-cell" key={m.id}>
              <div className="media-cell__img"><img src={m.src} alt={m.name} /></div>
              <div className="media-cell__foot">
                <span className="media-cell__name">{m.name||"image"}</span>
                <div style={{display:"flex",gap:4}}>
                  <button className="icon-b" title="URLをコピー" onClick={()=>{ navigator.clipboard?.writeText(m.src); ptoast("画像データをコピーしました"); }}>{React.cloneElement(PI.copy,PF)}</button>
                  <button className="icon-b icon-b--d" title="削除" onClick={()=>{ if(confirm("削除しますか？")){ PS.deleteMedia(m.id); ptoast("削除しました"); } }}>{React.cloneElement(PI.trash,PF)}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty-state">{React.cloneElement(PI.img,PF)}<div>まだ画像がありません。上のエリアからアップロードしてください。</div></div>}
    </div>
  );
}

Object.assign(window, { ProductList, ProductEditor, MediaLibrary, Repeater, TagsInput, ImageManager, compress });
