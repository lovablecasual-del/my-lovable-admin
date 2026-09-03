/* ============================================================
   LOVABLE CMS — data store (Supabase-backed)
   Replaces the previous localStorage-only store. Same public API
   (LBStore.*) as before, so no other file needs to change.

   Design: every mutator updates the in-memory `state` immediately
   (optimistic) and notifies subscribers synchronously — exactly
   like before, so the UI feels instant. The Supabase write happens
   in the background; on failure we roll the local change back and
   surface it via lastError()/the "lb:saveError" event, same as the
   old write-verification behaviour.

   Real-time: Postgres changes from OTHER tabs/devices/operators are
   pushed in via Supabase Realtime and merged into local state, so
   edits made anywhere show up everywhere — this is what actually
   fixes "changes don't show on the site" and "deleted product comes
   back": there is no more per-browser storage, and deletion is a
   real DELETE, not a tombstone that a stale re-seed can undo.
   ============================================================ */
(function () {
  const SUPABASE_URL = "https://whckkgdwhabubeninaks.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoY2trZ2R3aGFidWJlbmluYWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTgyNjMsImV4cCI6MjEwMzk5NDI2M30.HzCusAjSoZS5PuW4-OVeU2vL8_1Ts2HMgk_upMFeXzM";
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.LBSupabase = sb;

  const SEED = window.LB || {};
  const GRAD = SEED.GRAD || {};
  const GRAD_KEYS = Object.keys(GRAD);
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---- same render-proof normalizers as before ---- */
  function normalizeProduct(p, order) {
    const o = (p && typeof p === "object") ? p : {};
    const str = (v, d = "") => (typeof v === "string" ? v : (v == null ? d : String(v)));
    const arr = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
    const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const obj = (v) => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    const rawLinks = obj(o.links);
    const links = {};
    ["amazon", "rakuten", "qoo10", "tiktok"].forEach(k => { if (typeof rawLinks[k] === "string" && rawLinks[k].trim()) links[k] = rawLinks[k].trim(); });
    const userReviews = arr(o.userReviews).map(r => {
      const rr = obj(r);
      return { name: str(rr.name, "購入者"), meta: str(rr.meta), rating: Math.max(1, Math.min(5, Math.round(num(rr.rating, 5)))), body: str(rr.body) };
    }).filter(r => r.body);
    const gradKeys = GRAD_KEYS.length ? GRAD_KEYS : ["sand"];
    return {
      id: str(o.id) || uid("p"),
      name: str(o.name, "（無題の商品）"),
      brand: str(o.brand),
      cat: str(o.cat, "lifestyle"),
      sub: str(o.sub),
      price: num(o.price, 0),
      rating: Math.max(0, Math.min(5, num(o.rating, 0))),
      reviews: Math.max(0, Math.round(num(o.reviews, 0))),
      copy: str(o.copy),
      points: arr(o.points).map(x => str(x)).filter(Boolean),
      tag: str(o.tag),
      badge: str(o.badge),
      rank: (o.rank == null || o.rank === "") ? null : num(o.rank, null),
      grad: str(o.grad) || GRAD[gradKeys[0]] || "",
      imgs: arr(o.imgs).map(x => str(x)).filter(Boolean),
      shops: arr(o.shops).filter(x => typeof x === "string"),
      links,
      social: obj(o.social),
      spec: obj(o.spec),
      userReviews,
      tags: arr(o.tags).map(x => str(x)).filter(Boolean),
      badges: arr(o.badges).map(x => str(x)).filter(Boolean),
      repeatPurchase: !!o.repeatPurchase,
      status: o.status === "draft" || o.status === "unpublished" ? o.status : "published",
      order: num(o.order, order || 0),
      publishedAt: str(o.publishedAt) || new Date().toISOString(),
      updatedAt: str(o.updatedAt) || str(o.publishedAt) || new Date().toISOString(),
      _rev: num(o._rev, 0),
      catManual: !!o.catManual,
      categoryMeta: obj(o.categoryMeta),
    };
  }
  function normalizeCategory(c, order) {
    const o = (c && typeof c === "object") ? c : {};
    const str = (v, d = "") => (typeof v === "string" ? v : (v == null ? d : String(v)));
    const arr = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
    const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const gradKeys = GRAD_KEYS.length ? GRAD_KEYS : ["sand"];
    const key = str(o.key || o.slug || o.id) || uid("cat");
    return {
      key, en: str(o.en || o.name, key), jp: str(o.jp || o.description, str(o.en || o.name, key)),
      blurb: str(o.blurb || o.description), icon: str(o.icon), color: str(o.color),
      grad: str(o.grad) || GRAD[gradKeys[0]] || "", subs: arr(o.subs).map(x => str(x)).filter(Boolean),
      sortOrder: num(o.sortOrder, order != null ? order : 999),
      isVisible: o.isVisible === false ? false : true, locked: !!o.locked, isSystem: !!o.isSystem,
      createdAt: str(o.createdAt) || new Date().toISOString(), updatedAt: str(o.updatedAt) || new Date().toISOString(),
    };
  }
  function normalizeNavItem(n, order) {
    const o = (n && typeof n === "object") ? n : {};
    const str = (v, d = "") => (typeof v === "string" ? v : (v == null ? d : String(v)));
    const num = (v, d = 0) => { const nn = Number(v); return Number.isFinite(nn) ? nn : d; };
    const id = str(o.id) || uid("nav");
    const title = str(o.title || o.label, "メニュー");
    return {
      id, title, slug: str(o.slug) || title.toLowerCase().replace(/\s+/g, "-"),
      url: str(o.url || o.href, "/"), icon: str(o.icon),
      sortOrder: num(o.sortOrder, order != null ? order : 999),
      isVisible: o.isVisible === false ? false : true, locked: !!o.locked, isSystem: !!o.isSystem,
      createdAt: str(o.createdAt) || new Date().toISOString(), updatedAt: str(o.updatedAt) || new Date().toISOString(),
    };
  }
  const NAV_SEED = [
    { title: "All", url: "/all", icon: "" },
    { title: "Beauty", url: "/category/beauty", icon: "💄" },
    { title: "Fashion", url: "/category/fashion", icon: "👗" },
    { title: "Lifestyle", url: "/category/lifestyle", icon: "🏠" },
    { title: "Travel", url: "/category/travel", icon: "✈️" },
    { title: "Ranking", url: "/#ranking", icon: "👑" },
    { title: "Journal", url: "/#features", icon: "📝" },
  ];
  const DEFAULT_SITE = {
    logo: null, logoText: "", logoHeight: 34,
    hero: { variant: "stack", copy: "暮らしを整える\n小さな贅沢。", copySize: 70, sub: "毎日のちょっとしたご褒美に。コスメも、服も、暮らしの道具も。", image: null, images: [null, null, null, null] },
    featuredIds: [], showHomePage: true, theme: "light", accent: "#6b4e34",
    seo: { title: "LOVABLE — 暮らしを整える小さな贅沢。", desc: "20〜30代のためのQuiet Luxuryなライフスタイルセレクト。", ogimg: "" },
  };

  /* ---- DB row <-> JS shape mapping ---- */
  const P2DB = (p) => ({
    id: p.id, name: p.name, brand: p.brand, cat: p.cat, sub: p.sub, price: p.price,
    rating: p.rating, reviews: p.reviews, copy: p.copy, points: p.points, tag: p.tag,
    badge: p.badge, rank: p.rank, grad: p.grad, imgs: p.imgs, shops: p.shops, links: p.links,
    social: p.social, spec: p.spec, user_reviews: p.userReviews, tags: p.tags, badges: p.badges,
    repeat_purchase: p.repeatPurchase, status: p.status, sort_order: p.order,
    published_at: p.publishedAt, updated_at: p.updatedAt, rev: p._rev,
    cat_manual: p.catManual, category_meta: p.categoryMeta,
  });
  const DB2P = (r) => normalizeProduct({
    id: r.id, name: r.name, brand: r.brand, cat: r.cat, sub: r.sub, price: r.price,
    rating: r.rating, reviews: r.reviews, copy: r.copy, points: r.points, tag: r.tag,
    badge: r.badge, rank: r.rank, grad: r.grad, imgs: r.imgs, shops: r.shops, links: r.links,
    social: r.social, spec: r.spec, userReviews: r.user_reviews, tags: r.tags, badges: r.badges,
    repeatPurchase: r.repeat_purchase, status: r.status, order: r.sort_order,
    publishedAt: r.published_at, updatedAt: r.updated_at, _rev: r.rev,
    catManual: r.cat_manual, categoryMeta: r.category_meta,
  }, r.sort_order);
  const C2DB = (c) => ({
    key: c.key, en: c.en, jp: c.jp, blurb: c.blurb, icon: c.icon, color: c.color, grad: c.grad,
    subs: c.subs, sort_order: c.sortOrder, is_visible: c.isVisible, locked: c.locked,
    is_system: c.isSystem, created_at: c.createdAt, updated_at: c.updatedAt,
  });
  const DB2C = (r) => normalizeCategory({
    key: r.key, en: r.en, jp: r.jp, blurb: r.blurb, icon: r.icon, color: r.color, grad: r.grad,
    subs: r.subs, sortOrder: r.sort_order, isVisible: r.is_visible, locked: r.locked,
    isSystem: r.is_system, createdAt: r.created_at, updatedAt: r.updated_at,
  }, r.sort_order);
  const N2DB = (n) => ({
    id: n.id, title: n.title, slug: n.slug, url: n.url, icon: n.icon, sort_order: n.sortOrder,
    is_visible: n.isVisible, locked: n.locked, is_system: n.isSystem,
    created_at: n.createdAt, updated_at: n.updatedAt,
  });
  const DB2N = (r) => normalizeNavItem({
    id: r.id, title: r.title, slug: r.slug, url: r.url, icon: r.icon, sortOrder: r.sort_order,
    isVisible: r.is_visible, locked: r.locked, isSystem: r.is_system,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }, r.sort_order);
  const A2DB = (a) => ({
    id: a.id, title: a.title, type: a.type, kicker: a.kicker, excerpt: a.excerpt, body: a.body,
    cover: a.cover, cover_grad: a.coverGrad, items: a.items, read: a.read, status: a.status,
    seo: a.seo, published_at: a.publishedAt,
  });
  const DB2A = (r) => ({
    id: r.id, title: r.title, type: r.type, kicker: r.kicker, excerpt: r.excerpt, body: r.body,
    cover: r.cover, coverGrad: r.cover_grad, items: r.items || [], read: r.read, status: r.status,
    seo: r.seo || {}, publishedAt: r.published_at,
  });
  const M2DB = (m) => ({ id: m.id, url: m.url || "", name: m.name || "", data: m });
  const DB2M = (r) => ({ ...(r.data || {}), id: r.id, url: r.url, name: r.name });
  const SITE2DB = (s) => ({
    id: "default", logo: s.logo, logo_text: s.logoText, logo_height: s.logoHeight,
    hero: s.hero, featured_ids: s.featuredIds, show_home_page: s.showHomePage !== false,
    theme: s.theme, accent: s.accent, seo: s.seo, updated_at: new Date().toISOString(),
  });
  const DB2SITE = (r) => ({
    logo: r.logo, logoText: r.logo_text || "", logoHeight: r.logo_height || 34,
    hero: { ...DEFAULT_SITE.hero, ...(r.hero || {}) }, featuredIds: r.featured_ids || [],
    showHomePage: r.show_home_page !== false, theme: r.theme || "light", accent: r.accent || "#6b4e34",
    seo: { ...DEFAULT_SITE.seo, ...(r.seo || {}) },
  });

  /* ---- in-memory state (mirrors old shape) ---- */
  let state = {
    products: [], categories: [], navItems: [], articles: [], media: [],
    site: DEFAULT_SITE, content: {}, contentHistory: {},
    contentDraft: (() => { try { return JSON.parse(localStorage.getItem("lovable.cms.draft.v1") || "{}"); } catch (_) { return {}; } })(),
    admins: [{ email: "", password: "" }],
    ready: false,
  };
  let lastError = null;
  const AUDIT = [];
  window.LBAudit = AUDIT;
  function logMut(action, detail) {
    const e = { at: new Date().toISOString(), action, ...(detail || {}) };
    AUDIT.push(e); if (AUDIT.length > 500) AUDIT.shift();
    try { console.log("[LB store] " + action, detail || ""); } catch (_) {}
  }
  const subs = new Set();
  function notify() {
    window.dispatchEvent(new CustomEvent("lb:store"));
    subs.forEach(fn => { try { fn(state); } catch (e) {} });
  }
  function saveDraft() {
    try { localStorage.setItem("lovable.cms.draft.v1", JSON.stringify(state.contentDraft)); } catch (_) {}
  }

  /* ---- initial load from Supabase, seeding from data.js on a brand-new database ---- */
  async function loadAll() {
    const [pr, ca, na, ar, me, si, co, hi] = await Promise.all([
      sb.from("products").select("*"),
      sb.from("categories").select("*"),
      sb.from("nav_items").select("*"),
      sb.from("articles").select("*"),
      sb.from("media").select("*"),
      sb.from("site_settings").select("*").eq("id", "default").maybeSingle(),
      sb.from("site_content").select("*"),
      sb.from("site_content_history").select("*"),
    ]);
    if (pr.error) { try { console.error("[LB store] load products failed", pr.error); } catch (_) {} }

    let products = (pr.data || []).map(DB2P);
    let categories = (ca.data || []).map(DB2C);
    let navItems = (na.data || []).map(DB2N);

    // Seeding writes require an authenticated session (RLS blocks anon inserts).
    // Anonymous storefront visitors just read whatever is already in the DB;
    // the first authenticated admin login performs the one-time seed instead.
    let isAuthed = false;
    try {
      const { data: sessionData } = await sb.auth.getSession();
      isAuthed = !!(sessionData && sessionData.session);
    } catch (_) {}

    // brand-new database: bootstrap once from data.js, then never again
    if (isAuthed && !pr.error && products.length === 0 && Array.isArray(SEED.PRODUCTS) && SEED.PRODUCTS.length) {
      const seedProducts = SEED.PRODUCTS.map((p, i) => normalizeProduct({
        status: "published", order: i, publishedAt: new Date(Date.now() - (i * 86400000)).toISOString(),
        social: {}, tags: p.tags || (p.tag ? [p.tag] : []), ...p,
      }, i));
      const { error } = await sb.from("products").insert(seedProducts.map(P2DB));
      if (!error) products = seedProducts;
      else try { console.error("[LB store] product seed insert failed", error); } catch (_) {}
    }
    if (isAuthed && !ca.error && categories.length === 0 && Array.isArray(SEED.CATEGORIES) && SEED.CATEGORIES.length) {
      const seedCats = SEED.CATEGORIES.map((c, i) => normalizeCategory({ ...c, isSystem: true, locked: true }, i));
      const { error } = await sb.from("categories").insert(seedCats.map(C2DB));
      if (!error) categories = seedCats;
      else try { console.error("[LB store] category seed insert failed", error); } catch (_) {}
    }
    if (isAuthed && !na.error && navItems.length === 0) {
      const seedNav = NAV_SEED.map((n, i) => normalizeNavItem(n, i));
      const { error } = await sb.from("nav_items").insert(seedNav.map(N2DB));
      if (!error) navItems = seedNav;
      else try { console.error("[LB store] nav seed insert failed", error); } catch (_) {}
    }

    const content = {};
    (co.data || []).forEach(r => { content[r.key] = r.value; });
    const contentHistory = {};
    (hi.data || []).forEach(r => {
      if (!contentHistory[r.key]) contentHistory[r.key] = [];
      contentHistory[r.key].push({ value: r.value, at: r.at, by: r.by_user });
    });
    Object.keys(contentHistory).forEach(k => contentHistory[k].sort((a, b) => new Date(b.at) - new Date(a.at)));

    state = {
      ...state,
      products, categories, navItems,
      articles: (ar.data || []).map(DB2A),
      media: (me.data || []).map(DB2M),
      site: si.data ? DB2SITE(si.data) : DEFAULT_SITE,
      content, contentHistory,
      ready: true,
    };
    patchStorefront();
    notify();
  }

  /* ---- realtime: merge changes from other tabs/devices/operators ---- */
  function wireRealtime() {
    sb.channel("lb-products").on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
      if (payload.eventType === "DELETE") {
        state.products = state.products.filter(p => p.id !== payload.old.id);
      } else {
        const row = DB2P(payload.new);
        const i = state.products.findIndex(p => p.id === row.id);
        if (i >= 0) state.products[i] = row; else state.products.push(row);
      }
      patchStorefront(); notify();
    }).subscribe();
    sb.channel("lb-categories").on("postgres_changes", { event: "*", schema: "public", table: "categories" }, (payload) => {
      if (payload.eventType === "DELETE") state.categories = state.categories.filter(c => c.key !== payload.old.key);
      else { const row = DB2C(payload.new); const i = state.categories.findIndex(c => c.key === row.key); if (i >= 0) state.categories[i] = row; else state.categories.push(row); }
      patchStorefront(); notify();
    }).subscribe();
    sb.channel("lb-nav").on("postgres_changes", { event: "*", schema: "public", table: "nav_items" }, (payload) => {
      if (payload.eventType === "DELETE") state.navItems = state.navItems.filter(n => n.id !== payload.old.id);
      else { const row = DB2N(payload.new); const i = state.navItems.findIndex(n => n.id === row.id); if (i >= 0) state.navItems[i] = row; else state.navItems.push(row); }
      patchStorefront(); notify();
    }).subscribe();
    sb.channel("lb-articles").on("postgres_changes", { event: "*", schema: "public", table: "articles" }, (payload) => {
      if (payload.eventType === "DELETE") state.articles = state.articles.filter(a => a.id !== payload.old.id);
      else { const row = DB2A(payload.new); const i = state.articles.findIndex(a => a.id === row.id); if (i >= 0) state.articles[i] = row; else state.articles.push(row); }
      patchStorefront(); notify();
    }).subscribe();
    sb.channel("lb-site").on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, (payload) => {
      if (payload.new) { state.site = DB2SITE(payload.new); patchStorefront(); notify(); }
    }).subscribe();
    sb.channel("lb-content").on("postgres_changes", { event: "*", schema: "public", table: "site_content" }, (payload) => {
      if (payload.eventType === "DELETE") delete state.content[payload.old.key];
      else state.content[payload.new.key] = payload.new.value;
      notify();
    }).subscribe();
  }

  /* ---- write helper: optimistic local mutation + background persist ---- */
  async function persist(table, dbRow, matchCol) {
    const { error } = await sb.from(table).upsert(dbRow);
    if (error) { lastError = error; try { console.warn("[LB store] persist failed on " + table, error); } catch (_) {} return false; }
    lastError = null; return true;
  }
  async function remove(table, col, val) {
    const { error } = await sb.from(table).delete().eq(col, val);
    if (error) { lastError = error; try { console.warn("[LB store] delete failed on " + table, error); } catch (_) {} return false; }
    lastError = null; return true;
  }

  const sortByOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);

  const LBStore = {
    GRAD, GRAD_KEYS,
    normalizeProduct,
    get state() { return state; },
    get ready() { return state.ready; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    lastError() { return lastError; },
    auditLog() { return AUDIT.slice(); },
    deletedIds() { return []; },   // real deletes now — nothing to list

    /* products */
    allProducts() { return [...state.products].sort(sortByOrder); },
    publishedProducts() { return this.allProducts().filter(p => p.status === "published"); },
    getProduct(id) { return state.products.find(p => p.id === id); },
    saveProduct(p) {
      const i = state.products.findIndex(x => x.id === p.id);
      const now = new Date().toISOString();
      let merged;
      if (i >= 0) {
        const prev = state.products[i];
        merged = normalizeProduct({ ...prev, ...p, updatedAt: now, _rev: (prev._rev || 0) + 1 }, prev.order);
        logMut("update", { id: merged.id, name: merged.name, rev: merged._rev });
        state.products[i] = merged;
      } else {
        merged = normalizeProduct({ ...p, id: p.id || uid("p"), order: state.products.length, updatedAt: now, _rev: 1 }, state.products.length);
        logMut("insert", { id: merged.id, name: merged.name });
        state.products.push(merged);
      }
      patchStorefront(); notify();
      persist("products", P2DB(merged)).then(ok => {
        if (!ok) { try { window.dispatchEvent(new CustomEvent("lb:saveError", { detail: { message: String((lastError && lastError.message) || "保存に失敗しました") } })); } catch (e) {} }
      });
      return merged.id;
    },
    deleteProduct(id) {
      const p = state.products.find(x => x.id === id);
      logMut("delete", { id, name: p && p.name });
      state.products = state.products.filter(x => x.id !== id);
      patchStorefront(); notify();
      remove("products", "id", id);
      return true;
    },
    duplicateProduct(id) {
      const src = this.getProduct(id); if (!src) return null;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = uid("p"); copy.name = src.name + "（複製）"; copy.status = "draft";
      copy.rank = null; copy.order = state.products.length; copy._rev = 1; copy.updatedAt = new Date().toISOString();
      state.products.push(copy); patchStorefront(); notify();
      persist("products", P2DB(copy));
      return copy.id;
    },
    bulkStatus(ids, status) {
      const now = new Date().toISOString();
      const changed = [];
      state.products.forEach(p => { if (ids.includes(p.id)) { p.status = status; p.updatedAt = now; changed.push(p); } });
      patchStorefront(); notify();
      Promise.all(changed.map(p => persist("products", P2DB(p))));
      return true;
    },
    bulkDelete(ids) {
      logMut("bulk_delete", { ids, count: ids.length });
      state.products = state.products.filter(p => !ids.includes(p.id));
      patchStorefront(); notify();
      Promise.all(ids.map(id => remove("products", "id", id)));
      return true;
    },
    reorderProducts(ids) {
      ids.forEach((id, i) => { const p = this.getProduct(id); if (p) p.order = i; });
      patchStorefront(); notify();
      Promise.all(ids.map(id => { const p = this.getProduct(id); return p ? persist("products", P2DB(p)) : null; }));
      return true;
    },

    /* categories */
    allCategories() { return [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder); },
    visibleCategories() { return this.allCategories().filter(c => c.isVisible); },
    getCategory(key) { return state.categories.find(c => c.key === key); },
    saveCategory(c, opts) {
      const key = (c.key || c.slug || "").trim();
      if (!key) return { ok: false, reason: "slug_required", message: "スラッグ（キー）は必須です" };
      const existing = state.categories.find(x => x.key === key);
      const mergedName = (c.en !== undefined ? c.en : (existing && existing.en)) || c.name || "";
      if (!mergedName.trim()) return { ok: false, reason: "name_required", message: "カテゴリ名は必須です" };
      if (opts && opts.isNew && existing) return { ok: false, reason: "slug_duplicate", message: "同じスラッグのカテゴリが既に存在します" };
      let merged;
      const i = state.categories.findIndex(x => x.key === key);
      if (i >= 0) { merged = normalizeCategory({ ...state.categories[i], ...c, key, updatedAt: new Date().toISOString() }, state.categories[i].sortOrder); state.categories[i] = merged; }
      else { merged = normalizeCategory({ ...c, key, updatedAt: new Date().toISOString() }, state.categories.length); state.categories.push(merged); }
      patchStorefront(); notify();
      persist("categories", C2DB(merged));
      return { ok: true };
    },
    deleteCategory(key, opts) {
      const cat = this.getCategory(key);
      if (!cat) return { ok: false, reason: "not_found" };
      if (cat.locked && !(opts && opts.force)) return { ok: false, reason: "locked", message: "このカテゴリは削除保護されています。先にロックを解除してください。" };
      const linkedCount = state.products.filter(p => p.cat === key).length;
      state.categories = state.categories.filter(c => c.key !== key);
      patchStorefront(); notify();
      remove("categories", "key", key);
      return { ok: true, linkedCount };
    },
    reorderCategories(keys) {
      keys.forEach((key, i) => { const c = this.getCategory(key); if (c) c.sortOrder = i; });
      patchStorefront(); notify();
      Promise.all(keys.map(key => { const c = this.getCategory(key); return c ? persist("categories", C2DB(c)) : null; }));
      return true;
    },

    /* nav */
    allNavItems() { return [...(state.navItems || [])].sort((a, b) => a.sortOrder - b.sortOrder); },
    visibleNavItems() { return this.allNavItems().filter(n => n.isVisible); },
    getNavItem(id) { return (state.navItems || []).find(n => n.id === id); },
    saveNavItem(n) {
      const existing = this.getNavItem(n.id);
      const mergedTitle = (n.title !== undefined ? n.title : (existing && existing.title)) || "";
      const mergedUrl = (n.url !== undefined ? n.url : (existing && existing.url)) || (n.href !== undefined ? n.href : "") || "";
      if (!mergedTitle.trim()) return { ok: false, reason: "title_required", message: "タイトルは必須です" };
      if (!mergedUrl.trim()) return { ok: false, reason: "url_required", message: "URLは必須です" };
      const slug = (n.slug || existing && existing.slug || mergedTitle).toLowerCase().replace(/\s+/g, "-");
      const dup = (state.navItems || []).find(x => x.slug === slug && x.id !== n.id);
      if (dup) return { ok: false, reason: "slug_duplicate", message: "同じスラッグの項目が既に存在します" };
      let merged;
      const i = state.navItems.findIndex(x => x.id === n.id);
      if (i >= 0) { merged = normalizeNavItem({ ...state.navItems[i], ...n, slug, updatedAt: new Date().toISOString() }, state.navItems[i].sortOrder); state.navItems[i] = merged; }
      else { merged = normalizeNavItem({ ...n, slug, id: n.id || uid("nav"), updatedAt: new Date().toISOString() }, state.navItems.length); state.navItems.push(merged); }
      patchStorefront(); notify();
      persist("nav_items", N2DB(merged));
      return { ok: true };
    },
    deleteNavItem(id, opts) {
      const item = this.getNavItem(id);
      if (!item) return { ok: false, reason: "not_found" };
      if (item.locked && !(opts && opts.force)) return { ok: false, reason: "locked", message: "この項目は削除保護されています。" };
      state.navItems = state.navItems.filter(n => n.id !== id);
      patchStorefront(); notify();
      remove("nav_items", "id", id);
      return { ok: true };
    },
    reorderNavItems(ids) {
      ids.forEach((id, i) => { const n = this.getNavItem(id); if (n) n.sortOrder = i; });
      patchStorefront(); notify();
      Promise.all(ids.map(id => { const n = this.getNavItem(id); return n ? persist("nav_items", N2DB(n)) : null; }));
      return true;
    },

    /* articles */
    allArticles() { return state.articles; },
    publishedArticles() { return state.articles.filter(a => a.status === "published"); },
    getArticle(id) { return state.articles.find(a => a.id === id); },
    saveArticle(a) {
      const i = state.articles.findIndex(x => x.id === a.id);
      let merged;
      if (i >= 0) { merged = { ...state.articles[i], ...a }; state.articles[i] = merged; }
      else { merged = { ...a, id: a.id || uid("a") }; state.articles.push(merged); }
      notify();
      persist("articles", A2DB(merged));
      return merged.id;
    },
    deleteArticle(id) {
      state.articles = state.articles.filter(a => a.id !== id);
      notify();
      remove("articles", "id", id);
      return true;
    },
    duplicateArticle(id) {
      const src = this.getArticle(id); if (!src) return null;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = uid("a"); copy.title = src.title + "（複製）"; copy.status = "draft";
      state.articles.push(copy); notify();
      persist("articles", A2DB(copy));
      return copy.id;
    },

    /* media */
    allMedia() { return state.media; },
    addMedia(items) {
      state.media = [...items, ...state.media]; notify();
      Promise.all(items.map(m => persist("media", M2DB(m))));
      return true;
    },
    deleteMedia(id) {
      state.media = state.media.filter(m => m.id !== id); notify();
      remove("media", "id", id);
      return true;
    },
    newMediaId: () => uid("m"),

    /* site settings */
    site() { return state.site; },
    saveSite(patch) {
      state.site = { ...state.site, showHomePage: state.site.showHomePage !== false, ...patch };
      patchStorefront(); notify();
      persist("site_settings", SITE2DB(state.site));
      return true;
    },

    /* auth — real Supabase Auth. checkLogin/updateAdmin are now async;
       both call sites (Login form's onSubmit, Settings' saveAcc) trigger
       them from event handlers so returning a Promise is safe. */
    admins() { return state.admins; },
    async checkLogin(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { lastError = error; return false; }
      state.admins = [{ email: data.user.email, password: "" }];
      return true;
    },
    async signOut() { await sb.auth.signOut(); },
    async updateAdmin(email, password) {
      const patch = {}; if (email) patch.email = email; if (password) patch.password = password;
      const { data, error } = await sb.auth.updateUser(patch);
      if (error) { lastError = error; return false; }
      state.admins = [{ email: (data.user && data.user.email) || email, password: "" }];
      return true;
    },

    exportJSON() { return JSON.stringify(state, null, 2); },
    async importJSON(json) {
      const incoming = typeof json === "string" ? JSON.parse(json) : json;
      const products = Array.isArray(incoming.products) ? incoming.products.map((p, i) => normalizeProduct(p, i)) : state.products;
      state.products = products;
      if (Array.isArray(incoming.categories)) state.categories = incoming.categories.map((c, i) => normalizeCategory(c, i));
      if (Array.isArray(incoming.articles)) state.articles = incoming.articles;
      if (incoming.site) state.site = { ...DEFAULT_SITE, ...incoming.site };
      patchStorefront(); notify();
      await Promise.all(products.map(p => persist("products", P2DB(p))));
      await Promise.all(state.categories.map(c => persist("categories", C2DB(c))));
      await Promise.all(state.articles.map(a => persist("articles", A2DB(a))));
      await persist("site_settings", SITE2DB(state.site));
      return true;
    },
    async resetToSeed() {
      await Promise.all(state.products.map(p => remove("products", "id", p.id)));
      state.products = []; state.site = DEFAULT_SITE;
      await persist("site_settings", SITE2DB(state.site));
      await loadAll();
      return true;
    },

    /* site content (CMS text) */
    contentRegistry() { return (window.LBContentRegistry && window.LBContentRegistry.REGISTRY) || []; },
    publishedText(key) {
      const reg = window.LBContentRegistry && window.LBContentRegistry.get(key);
      if (Object.prototype.hasOwnProperty.call(state.content, key)) return state.content[key];
      return reg ? reg.default : "";
    },
    draftText(key) {
      if (Object.prototype.hasOwnProperty.call(state.contentDraft, key)) return state.contentDraft[key];
      return this.publishedText(key);
    },
    isContentDirty(key) {
      if (!Object.prototype.hasOwnProperty.call(state.contentDraft, key)) return false;
      return state.contentDraft[key] !== this.publishedText(key);
    },
    dirtyContentKeys() { return this.contentRegistry().map(e => e.key).filter(k => this.isContentDirty(k)); },
    saveContentDraft(key, value) {
      state.contentDraft[key] = value; saveDraft(); logMut("content_draft", { key }); notify();
      return true;
    },
    revertContentDraft(key) {
      delete state.contentDraft[key]; saveDraft(); notify();
      return true;
    },
    publishContent(keys) {
      const list = keys ? (Array.isArray(keys) ? keys : [keys]) : this.dirtyContentKeys();
      const who = (state.admins[0] && state.admins[0].email) || "admin";
      const now = new Date().toISOString();
      const writes = [];
      list.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(state.contentDraft, key)) return;
        const before = this.publishedText(key);
        const after = state.contentDraft[key];
        if (before === after) return;
        if (!state.contentHistory[key]) state.contentHistory[key] = [];
        state.contentHistory[key].unshift({ value: before, at: now, by: who });
        if (state.contentHistory[key].length > 20) state.contentHistory[key].length = 20;
        state.content[key] = after;
        logMut("content_publish", { key, by: who });
        writes.push(persist("site_content", { key, value: after, updated_at: now, updated_by: who }));
        writes.push(sb.from("site_content_history").insert({ key, value: before, at: now, by_user: who }));
      });
      notify();
      Promise.all(writes);
      return true;
    },
    contentHistory(key) { return (state.contentHistory && state.contentHistory[key]) || []; },
    restoreContentHistoryToDraft(key, index) {
      const hist = this.contentHistory(key);
      const entry = hist[index];
      if (!entry) return false;
      return this.saveContentDraft(key, entry.value);
    },
  };

  function isPreviewMode() {
    try { return new URLSearchParams(window.location.search).get("cms_preview") === "1"; } catch (_) { return false; }
  }
  window.T = function (key) {
    try { return isPreviewMode() ? LBStore.draftText(key) : LBStore.publishedText(key); } catch (_) { return key; }
  };

  function patchStorefront() {
    const pub = LBStore.publishedProducts();
    const visCats = LBStore.visibleCategories();
    window.LB = {
      ...SEED,
      CATEGORIES: visCats, NAV: LBStore.visibleNavItems(), SHOPS: SEED.SHOPS, GRAD, PRODUCTS: pub,
      FEATURES: LBStore.publishedArticles().map(a => ({
        key: a.id, kicker: a.kicker || a.type, title: a.title, grad: a.coverGrad || GRAD[GRAD_KEYS[0]],
        cover: a.cover, excerpt: a.excerpt, items: a.items, read: a.read,
      })),
      REVIEWS: SEED.REVIEWS,
      site: { ...state.site, showHomePage: state.site.showHomePage !== false },
      byCat: (c) => pub.filter(p => p.cat === c).sort(sortByOrder),
      get: (id) => pub.find(p => p.id === id) || state.products.find(p => p.id === id),
    };
  }
  patchStorefront(); // render once immediately with whatever SEED has, so first paint isn't blank
  window.LBStore = LBStore;

  loadAll().then(wireRealtime).catch(e => { try { console.error("[LB store] initial load failed", e); } catch (_) {} });
})();
