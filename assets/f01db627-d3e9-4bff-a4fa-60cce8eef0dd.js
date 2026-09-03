/* ============================================================
   LOVABLE CMS — data store (localStorage)
   Seeds from data.js (window.LB), then becomes the single
   source of truth for BOTH the storefront and /admin.
   ------------------------------------------------------------
   Production note: this mirrors a Supabase/Postgres schema.
   Each method maps 1:1 to a table operation — see SCHEMA below.

   ------------------------------------------------------------
   DELETION INTEGRITY (root-caused + fixed):
   Previously only the "critical" product mutators (save/delete/
   duplicate/bulk) went through a reload-latest→mutate→verify-persist
   pipeline (tx()). Every OTHER mutator (categories, articles, media,
   site settings, admin, import) used a legacy `save(state)` shim that
   persisted the in-memory `state` closure AS-IS, with no reload first.

   That is the exact mechanism behind "delete a product, it comes back
   hours/a day later": if a tab/session had been open since BEFORE a
   deletion happened (in that same tab or another tab), its in-memory
   `state` still contains the pre-deletion product list. The next time
   ANY save happens in that stale tab — even something unrelated like
   editing site settings — the legacy shim wrote that stale full
   product list back to localStorage, silently erasing the tombstone
   and resurrecting the deleted product.

   Fix: every single mutator now goes through tx(), which (1) reloads
   the freshest persisted state first — cross-tab / cross-session safe,
   (2) mutates that fresh copy, (3) strips any tombstoned id as a final
   defense-in-depth guard (enforceTombstones), (4) verifies the write
   by reading it back, and (5) rolls back completely on any failure.
   No code path can persist a stale snapshot anymore.
   ============================================================ */
(function () {
  const KEY = "lovable.cms.v2";
  const SEED_VERSION = 13;            // bump whenever data.js content changes
  const SEED = window.LB || {};

  /* ------------------------------------------------------------
     STORAGE RESILIENCE LAYER
     Root cause (2nd occurrence): both "deleted product comes back"
     AND "newly added product vanishes" the next day, in the SAME
     tab/browser, on a plain refresh — with no reproducing app-level
     code path (no localStorage.clear/removeItem anywhere; the only
     reset is the operator-confirmed "RESET" button). That symmetric
     pattern (revert to exactly data.js's seed) only happens when
     load() finds localStorage EMPTY and reseeds from scratch — i.e.
     the browser evicted/partitioned the origin's storage between
     visits. This is expected browser behavior for a page rendered
     inside a third-party preview iframe (Safari ITP + Chrome storage
     partitioning both restrict persistent storage for embedded,
     cross-site frames) — not an app bug. Mitigations below add a
     second, independent storage (IndexedDB) as a write-through mirror
     and recovery source, and request persistent-storage status from
     the browser. They cannot help if the browser wipes the ENTIRE
     origin (both stores at once) — the only unconditional guarantee
     is a real server-side database (see nextjs-handoff/).
     ------------------------------------------------------------ */
  const IDB_NAME = "lovable_cms_mirror";
  const IDB_STORE = "kv";
  let idbReady = null;
  function idbOpenAt(version) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (v) => { if (settled) return; settled = true; resolve(v); };
      // safety valve: if another tab's open connection blocks this version
      // upgrade (the exact multi-tab situation this whole mirror exists to
      // guard against), don't hang forever un-diagnosed — degrade to "mirror
      // unavailable" after a short wait instead.
      const blockTimer = setTimeout(() => {
        try { console.warn("[LB store] IndexedDB open timed out (likely blocked by another tab) — mirror unavailable this session"); } catch (_) {}
        finish(null);
      }, 1500);
      try {
        const req = indexedDB.open(IDB_NAME, version);
        req.onupgradeneeded = () => { try { if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); } catch (_) {} };
        req.onblocked = () => {
          try { console.warn("[LB store] IndexedDB upgrade blocked by another open tab — mirror unavailable this session"); } catch (_) {}
          clearTimeout(blockTimer); finish(null);
        };
        req.onsuccess = () => { clearTimeout(blockTimer); finish(req.result); };
        req.onerror = () => { clearTimeout(blockTimer); finish(null); };
      } catch (_) { clearTimeout(blockTimer); finish(null); }
    });
  }
  function idbOpen() {
    if (idbReady) return idbReady;
    idbReady = (async () => {
      if (!('indexedDB' in window)) return null;
      let db = await idbOpenAt(undefined);   // open at current (or 1 if new) version
      if (!db) return null;
      // self-healing: if the "kv" store is missing (e.g. a prior open created
      // the DB at v1 without it), bump the version to force onupgradeneeded
      // to run again and create it — otherwise the mirror silently no-ops forever.
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const nextVersion = db.version + 1;
        db.close();
        db = await idbOpenAt(nextVersion);
        if (!db || !db.objectStoreNames.contains(IDB_STORE)) {
          try { console.warn("[LB store] IndexedDB mirror unavailable — \"" + IDB_STORE + "\" store could not be created; falling back to localStorage only"); } catch (_) {}
          return null;
        }
      }
      return db;
    })();
    return idbReady;
  }
  async function idbGet(key) {
    const db = await idbOpen(); if (!db) { try { console.warn("[LB store] idbGet skipped — mirror unavailable"); } catch (_) {} return null; }
    return new Promise((resolve) => {
      try {
        const tx2 = db.transaction(IDB_STORE, "readonly");
        const rq = tx2.objectStore(IDB_STORE).get(key);
        rq.onsuccess = () => resolve(rq.result || null);
        rq.onerror = () => resolve(null);
      } catch (_) { resolve(null); }
    });
  }
  async function idbPut(key, value) {
    const db = await idbOpen();
    if (!db) { try { console.warn("[LB store] idbPut skipped — mirror unavailable"); } catch (_) {} return false; }
    return new Promise((resolve) => {
      try {
        const tx2 = db.transaction(IDB_STORE, "readwrite");
        tx2.objectStore(IDB_STORE).put(value, key);
        tx2.oncomplete = () => resolve(true);
        tx2.onerror = () => { try { console.warn("[LB store] idbPut transaction error", tx2.error); } catch (_) {} resolve(false); };
      } catch (e) { try { console.warn("[LB store] idbPut threw", e); } catch (_) {} resolve(false); }
    });
  }
  function mirrorToIndexedDB(json, seq) {
    // fire-and-forget write-through; never blocks the sync localStorage path
    idbPut(KEY, json).then((ok) => {
      try { console.log(ok ? "[LB store] mirrored to IndexedDB, seq " + seq : "[LB store] IndexedDB mirror write did not complete (seq " + seq + ")"); } catch (_) {}
    });
  }
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((granted) => {
        try { console.log("[LB store] persistent storage " + (granted ? "granted" : "NOT granted (browser may evict data)")); } catch (_) {}
      });
    }
  } catch (_) {}
  const GRAD = SEED.GRAD || {};
  const GRAD_KEYS = Object.keys(GRAD);

  /* ---- SCHEMA (for Supabase handoff) -------------------------
     products(id, name, brand, cat, sub, price, rating, reviews,
              copy, points[], tag, badge, rank, grad, imgs[],
              shops[], links{}, social{ig,tiktok,youtube},
              spec{}, userReviews[], status, order, publishedAt,
              updatedAt, _rev)
     deleted_products(id, deletedAt, deletedBy)   -- tombstones (soft delete)
     categories(key, en, jp, blurb, grad, subs[])
     articles(id, title, type, kicker, excerpt, body, cover,
              items[], read, status, seo{title,desc,ogimg}, publishedAt)
     site(logo, logoText, logoHeight, hero{variant,copy,copySize,sub,image,images[4]}, featuredIds[],
          theme, accent, seo{title,desc,ogimg})
     admins(email, passwordHash)
     ----------------------------------------------------------- */

  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ------------------------------------------------------------
     normalizeProduct — the single guarantee that ONE bad product
     can never break the storefront or admin. Coerces every field
     to a safe, render-proof shape. Applied on seed, migrate, save,
     and read. Never throws.
     ------------------------------------------------------------ */
  function normalizeProduct(p, order) {
    const o = (p && typeof p === "object") ? p : {};
    const str = (v, d = "") => (typeof v === "string" ? v : (v == null ? d : String(v)));
    const arr = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
    const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const obj = (v) => (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    // links: keep only known shops with non-empty string URLs
    const rawLinks = obj(o.links);
    const links = {};
    ["amazon", "rakuten", "qoo10", "tiktok"].forEach(k => { if (typeof rawLinks[k] === "string" && rawLinks[k].trim()) links[k] = rawLinks[k].trim(); });
    // userReviews: array of {name, meta, rating, body}
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
      status: o.status === "draft" || o.status === "unpublished" ? o.status : (o.status === "published" ? "published" : "published"),
      order: num(o.order, order || 0),
      publishedAt: str(o.publishedAt) || new Date().toISOString(),
      updatedAt: str(o.updatedAt) || str(o.publishedAt) || new Date().toISOString(),
      _rev: num(o._rev, 0),
      _edited: !!o._edited,
      catManual: !!o.catManual,
      categoryMeta: obj(o.categoryMeta),
    };
  }

  /* ---- tombstone enforcement (defense-in-depth) ----
     Whatever else happens, a product whose id is in `deleted` must
     NEVER be present in `products`. Applied on every load, reload,
     cross-tab sync, and right before every persist. Returns the
     number of resurrection attempts it blocked (0 in the healthy path). */
  function enforceTombstones(s) {
    if (!s.deleted || typeof s.deleted !== "object") s.deleted = {};
    if (!Array.isArray(s.products)) { s.products = []; return 0; }
    const before = s.products.length;
    s.products = s.products.filter(p => !s.deleted[p.id]);
    const blocked = before - s.products.length;
    if (blocked > 0) {
      try { console.warn("[LB store] tombstone guard blocked " + blocked + " resurrection attempt(s)"); } catch (_) {}
    }
    return blocked;
  }

  /* ------------------------------------------------------------
     normalizeCategory / normalizeNavItem — same render-proof
     guarantee as normalizeProduct. CMS-managed, DB-backed (no more
     hardcoded category/nav arrays in the codebase).
     ------------------------------------------------------------ */
  function normalizeCategory(c, order) {
    const o = (c && typeof c === "object") ? c : {};
    const str = (v, d = "") => (typeof v === "string" ? v : (v == null ? d : String(v)));
    const arr = (v) => Array.isArray(v) ? v : (v == null ? [] : [v]);
    const num = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const gradKeys = GRAD_KEYS.length ? GRAD_KEYS : ["sand"];
    const key = str(o.key || o.slug || o.id) || uid("cat");
    return {
      key,                                  // slug / stable id
      en: str(o.en || o.name, key),
      jp: str(o.jp || o.description, str(o.en || o.name, key)),
      blurb: str(o.blurb || o.description),
      icon: str(o.icon),                    // optional emoji
      color: str(o.color),                  // optional hex accent (falls back to grad if empty)
      grad: str(o.grad) || GRAD[gradKeys[0]] || "",
      subs: arr(o.subs).map(x => str(x)).filter(Boolean),
      sortOrder: num(o.sortOrder, order != null ? order : 999),
      isVisible: o.isVisible === false ? false : true,
      locked: !!o.locked,                   // delete-protection toggle (admin can unlock)
      isSystem: !!o.isSystem,
      createdAt: str(o.createdAt) || new Date().toISOString(),
      updatedAt: str(o.updatedAt) || new Date().toISOString(),
    };
  }

  function normalizeNavItem(n, order) {
    const o = (n && typeof n === "object") ? n : {};
    const str = (v, d = "") => (typeof v === "string" ? v : (v == null ? d : String(v)));
    const num = (v, d = 0) => { const nn = Number(v); return Number.isFinite(nn) ? nn : d; };
    const id = str(o.id) || uid("nav");
    const title = str(o.title || o.label, "メニュー");
    return {
      id,
      title,
      slug: str(o.slug) || title.toLowerCase().replace(/\s+/g, "-"),
      url: str(o.url || o.href, "/"),
      icon: str(o.icon),                    // optional emoji, e.g. 💄 👗 🏠 ✈️ 👑 📝
      sortOrder: num(o.sortOrder, order != null ? order : 999),
      isVisible: o.isVisible === false ? false : true,
      locked: !!o.locked,
      isSystem: !!o.isSystem,
      createdAt: str(o.createdAt) || new Date().toISOString(),
      updatedAt: str(o.updatedAt) || new Date().toISOString(),
    };
  }

  /* default nav seed — mirrors what used to be hardcoded in header.jsx */
  const NAV_SEED = [
    { title: "All", url: "/all", icon: "" },
    { title: "Beauty", url: "/category/beauty", icon: "💄" },
    { title: "Fashion", url: "/category/fashion", icon: "👗" },
    { title: "Lifestyle", url: "/category/lifestyle", icon: "🏠" },
    { title: "Travel", url: "/category/travel", icon: "✈️" },
    { title: "Ranking", url: "/#ranking", icon: "👑" },
    { title: "Journal", url: "/#features", icon: "📝" },
  ];

  function seedState() {
    const products = (SEED.PRODUCTS || []).map((p, i) => normalizeProduct({
      status: "published",
      order: i,
      publishedAt: new Date(Date.now() - (i * 86400000)).toISOString(),
      social: {},
      tags: p.tags || (p.tag ? [p.tag] : []),
      ...p,
    }, i));
    const categories = (SEED.CATEGORIES || []).map((c, i) => normalizeCategory({ ...c, isSystem: true, locked: true }, i));
    const navItems = NAV_SEED.map((n, i) => normalizeNavItem(n, i));
    const articles = (SEED.FEATURES || []).map((f, i) => ({
      id: f.key || uid("a"),
      title: f.title,
      type: ["購入品記事","レビュー記事","韓国旅行記事","美容記事"][i % 4],
      kicker: f.kicker,
      excerpt: f.excerpt,
      body: `## ${f.title}\n\n${f.excerpt}\n\nここに本文をMarkdownで書けます。商品を紹介したり、写真を挿入したり、各ストアへのリンクを貼ったりできます。`,
      cover: null,
      coverGrad: f.grad,
      items: f.items || [],
      read: f.read || "5 min",
      status: "published",
      seo: { title: f.title, desc: f.excerpt, ogimg: "" },
      publishedAt: new Date(Date.now() - (i * 172800000)).toISOString(),
    }));
    return {
      products,
      categories,
      navItems,
      articles,
      media: [],
      site: {
        logo: null, logoText: "", logoHeight: 34,
        hero: { variant: "stack", copy: "暮らしを整える\n小さな贅沢。", copySize: 70, sub: "毎日のちょっとしたご褒美に。コスメも、服も、暮らしの道具も。", image: null, images: [null, null, null, null] },
        featuredIds: products.filter(p => p.rank).sort((a,b)=>a.rank-b.rank).slice(0,4).map(p=>p.id),
        showHomePage: true,   // false → "/" renders the All-products list instead of the HOME landing (URL unchanged)
        theme: "light",
        accent: "#6b4e34",
        seo: {
          title: "LOVABLE — 暮らしを整える小さな贅沢。",
          desc: "20〜30代のためのQuiet Luxuryなライフスタイルセレクト。コスメ・スキンケア・美容家電・ファッション・韓国アイテムを各ストアへ。",
          ogimg: "",
        },
      },
      admins: [{ email: "admin@lovable.jp", password: "lovable" }],
      deleted: {},            // tombstones: id → { at } — deleted items never resurrect
      content: {},            // published site-text overrides: key → value (sparse; unset = registry default)
      contentDraft: {},       // unpublished edits: key → value (sparse; unset = same as published)
      contentHistory: {},     // key → [{ value, at, by }] most-recent-first, for revert
      _v: 2,
      _seedV: SEED_VERSION,
      _mutationSeq: 0,
    };
  }

  /* wrap a raw data.js product into a CMS record */
  function wrapProduct(p, order) {
    return normalizeProduct({
      status: "published",
      order,
      publishedAt: new Date().toISOString(),
      social: {},
      tags: p.tags || (p.tag ? [p.tag] : []),
      ...p,
    }, order);
  }

  /* Merge fresh data.js content into an existing saved state WITHOUT
     destroying the operator's admin edits.
       • new seed products  → added
       • un-edited seed products → refreshed from data.js
       • admin-created / admin-edited products → kept as-is
       • deleted products (tombstoned) → NEVER re-added
       • site settings, articles, media, admins → kept as-is */
  function migrateSeed(s) {
    if (!Array.isArray(s.products)) s.products = [];
    if (!s.deleted || typeof s.deleted !== "object") s.deleted = {};
    const byId = new Map(s.products.map(p => [p.id, p]));
    (SEED.PRODUCTS || []).forEach((sp) => {
      // ★ never resurrect a product the operator deliberately deleted
      if (s.deleted[sp.id]) return;
      const ex = byId.get(sp.id);
      if (!ex) {
        s.products.push(wrapProduct(sp, s.products.length));
      } else if (!ex._edited) {
        // refresh data-driven fields ONLY for products the operator never edited;
        // preserve CMS bookkeeping so nothing the operator touched is lost
        const merged = normalizeProduct(Object.assign({}, ex, sp, {
          status: ex.status,
          order: ex.order,
          publishedAt: ex.publishedAt,
          updatedAt: ex.updatedAt,
          _rev: ex._rev,
          social: ex.social || {},
          tags: ex.tags && ex.tags.length ? ex.tags : (sp.tag ? [sp.tag] : []),
        }), ex.order);
        Object.assign(ex, merged);
      }
    });
    // refresh categories that the operator hasn't customized
    if (!s._catEdited && Array.isArray(SEED.CATEGORIES)) {
      const ckeys = new Set((s.categories || []).map(c => c.key));
      SEED.CATEGORIES.forEach((c, i) => { if (!ckeys.has(c.key)) s.categories.push(normalizeCategory({ ...c, isSystem: true, locked: true }, (s.categories||[]).length + i)); });
    }
    if (!Array.isArray(s.categories)) s.categories = [];
    s.categories = s.categories.map((c, i) => normalizeCategory(c, i));
    if (!Array.isArray(s.navItems) || !s.navItems.length) {
      s.navItems = NAV_SEED.map((n, i) => normalizeNavItem(n, i));
    } else {
      s.navItems = s.navItems.map((n, i) => normalizeNavItem(n, i));
    }
    s._seedV = SEED_VERSION;
    enforceTombstones(s);   // belt-and-suspenders: migration can never reintroduce a deleted id
    persistRaw(s, "migrate_seed");
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (!s.deleted || typeof s.deleted !== "object") s.deleted = {};
        if (!s.content || typeof s.content !== "object") s.content = {};
        if (!s.contentDraft || typeof s.contentDraft !== "object") s.contentDraft = {};
        if (!s.contentHistory || typeof s.contentHistory !== "object") s.contentHistory = {};
        // make every existing product render-proof (data may predate normalization)
        if (Array.isArray(s.products)) s.products = s.products.map((p, i) => normalizeProduct(p, i));
        if (Array.isArray(s.categories)) s.categories = s.categories.map((c, i) => normalizeCategory(c, i));
        if (Array.isArray(s.navItems)) s.navItems = s.navItems.map((n, i) => normalizeNavItem(n, i));
        else if ((s._seedV || 0) >= SEED_VERSION) s.navItems = NAV_SEED.map((n, i) => normalizeNavItem(n, i));  // upgrade older saves that predate nav mgmt
        enforceTombstones(s);   // defense-in-depth for localStorage written before this fix existed
        if ((s._seedV || 0) < SEED_VERSION) return migrateSeed(s);
        return s;
      }
    } catch (e) { console.warn("LBStore load failed, reseeding", e); }
    const s = seedState();
    persistRaw(s, "seed");
    return s;
  }

  /* ---- audit log (traceability for save/update/delete/sync) ---- */
  const AUDIT = [];
  window.LBAudit = AUDIT;
  let lastError = null;
  function logMut(action, detail) {
    const e = { at: new Date().toISOString(), action, ...(detail || {}) };
    AUDIT.push(e); if (AUDIT.length > 500) AUDIT.shift();
    try { console.log("[LB store] " + action, detail || ""); } catch (_) {}
  }

  /* ---- low-level persist with WRITE VERIFICATION (detects quota/partial writes) ----
     Used directly only by load()/migrateSeed() before `state` exists yet.
     Everything after init MUST go through tx() instead (see below). */
  function persistRaw(s, tag) {
    s._mutationSeq = (s._mutationSeq || 0) + 1;
    s._mutatedAt = new Date().toISOString();
    const json = JSON.stringify(s);
    try {
      localStorage.setItem(KEY, json);
      const back = localStorage.getItem(KEY);           // read-back to confirm it actually stored
      if (back !== json) throw new Error("read-back mismatch (quota?)");
      lastError = null;
      mirrorToIndexedDB(json, s._mutationSeq);          // redundant copy in a 2nd storage engine
      return true;
    } catch (e) {
      lastError = e;
      try { console.warn("LBStore persist failed (" + tag + ") — data NOT saved", e); } catch (_) {}
      return false;
    }
  }

  /* If localStorage came back empty at boot, check IndexedDB for a surviving
     mirror before accepting the fresh reseed as final. Async by nature (IDB
     has no sync API), so this runs AFTER load() has already returned a
     provisional (possibly reseeded) state, and swaps in the recovered data
     the moment it resolves — recovery is preferred only when the IDB copy
     actually reflects real admin activity (_mutationSeq > 0), so a genuinely
     fresh install never gets clobbered by a stale/irrelevant mirror. */
  async function attemptIndexedDBRecovery(localStorageWasEmpty) {
    if (!localStorageWasEmpty) return;
    try {
      const raw = await idbGet(KEY);
      if (!raw) { console.log("[LB store] no IndexedDB mirror found — reseed stands"); return; }
      const s = JSON.parse(raw);
      if (!(s && (s._mutationSeq || 0) > 0)) return;
      if (Array.isArray(s.products)) s.products = s.products.map((p, i) => normalizeProduct(p, i));
      if (!s.deleted || typeof s.deleted !== "object") s.deleted = {};
      enforceTombstones(s);
      console.warn("[LB store] localStorage was empty but IndexedDB mirror had data (seq " + s._mutationSeq + ") — RECOVERING instead of using reseed");
      state = s;
      persistRaw(state, "idb_recovery");
      patchStorefront(); notify();
    } catch (e) { try { console.warn("[LB store] IndexedDB recovery check failed", e); } catch (_) {} }
  }

  const subs = new Set();
  const _localStorageWasEmpty = !localStorage.getItem(KEY);
  let state = load();
  attemptIndexedDBRecovery(_localStorageWasEmpty);
  function notify() {
    window.dispatchEvent(new CustomEvent("lb:store"));
    subs.forEach(fn => { try { fn(state); } catch (e) {} });
  }

  /* pull in a newer state written by another tab/session, so we NEVER
     mutate on top of stale data. This is the core fix: every mutation
     starts from the freshest committed truth, not an old in-memory copy. */
  function reloadLatest() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if ((s._mutationSeq || 0) > (state._mutationSeq || 0)) {
        if (Array.isArray(s.products)) s.products = s.products.map((p, i) => normalizeProduct(p, i));
        if (!s.deleted || typeof s.deleted !== "object") s.deleted = {};
        if (!s.content || typeof s.content !== "object") s.content = {};
        if (!s.contentDraft || typeof s.contentDraft !== "object") s.contentDraft = {};
        if (!s.contentHistory || typeof s.contentHistory !== "object") s.contentHistory = {};
        enforceTombstones(s);
        state = s;
      }
    } catch (_) {}
  }

  /* ---- THE ONE MUTATION PIPELINE ----
     reload-latest → mutate → enforce tombstones → verify-persist → rollback on failure.
     ALL mutators (products, categories, articles, media, site, admin) go
     through this — no method is allowed to persist a raw stale `state`. */
  function tx(action, fn) {
    reloadLatest();
    const snapshot = JSON.stringify(state);
    let result;
    try {
      result = fn();
    } catch (e) {
      state = JSON.parse(snapshot);
      logMut(action + "_rollback", { message: String((e && e.message) || e) });
      patchStorefront(); notify();
      return { ok: false, error: e };
    }
    enforceTombstones(state);
    // route the actual write through persistRaw — this is the ONLY function
    // that mirrors to IndexedDB. tx() previously duplicated the localStorage
    // write inline, which meant every real mutation (delete, save, bulk...)
    // bypassed the mirror entirely and only load()/migrateSeed() ever fed it.
    if (!persistRaw(state, action)) {
      state = JSON.parse(snapshot);                   // rollback — no half-saved state
      logMut(action + "_save_failed", { message: String((lastError && lastError.message) || lastError) });
      patchStorefront(); notify();
      return { ok: false, error: lastError, result };
    }
    logMut(action, { seq: state._mutationSeq });
    patchStorefront(); notify();
    return { ok: true, result };
  }

  // cross-tab sync — always reconcile through the same tombstone guard
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      const s = JSON.parse(e.newValue);
      if (Array.isArray(s.products)) s.products = s.products.map((p, i) => normalizeProduct(p, i));
      if (!s.deleted || typeof s.deleted !== "object") s.deleted = {};
      if (!s.content || typeof s.content !== "object") s.content = {};
      if (!s.contentDraft || typeof s.contentDraft !== "object") s.contentDraft = {};
      if (!s.contentHistory || typeof s.contentHistory !== "object") s.contentHistory = {};
      enforceTombstones(s);
      if ((s._mutationSeq || 0) >= (state._mutationSeq || 0)) state = s;
      patchStorefront(); notify();
    } catch (_) {}
  });

  /* ---- helpers ---- */
  const sortByOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);

  /* ---- public API ---- */
  const LBStore = {
    KEY,
    GRAD, GRAD_KEYS,
    SHOPS: SEED.SHOPS,
    normalizeProduct,
    get state() { return state; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    lastError() { return lastError; },
    auditLog() { return AUDIT.slice(); },
    deletedIds() { return Object.keys(state.deleted || {}); },   // for admin diagnostics / "ゴミ箱"

    /* products */
    allProducts() { return [...state.products].sort(sortByOrder); },
    publishedProducts() { return this.allProducts().filter(p => p.status === "published"); },
    getProduct(id) { return state.products.find(p => p.id === id); },
    saveProduct(p) {
      let id = p.id;
      const r = tx("saveProduct", () => {
        const i = state.products.findIndex(x => x.id === p.id);
        const now = new Date().toISOString();
        if (i >= 0) {
          const prev = state.products[i];
          const merged = normalizeProduct({ ...prev, ...p, _edited: true, updatedAt: now, _rev: (prev._rev || 0) + 1 }, prev.order);
          logMut("update", { id: merged.id, name: merged.name, rev: merged._rev, before: { name: prev.name, cat: prev.cat, price: prev.price }, after: { name: merged.name, cat: merged.cat, price: merged.price } });
          state.products[i] = merged; id = merged.id;
        } else {
          const nid = p.id || uid("p");
          if (state.deleted && state.deleted[nid]) delete state.deleted[nid];   // re-adding a previously deleted id clears its tombstone (explicit operator action)
          const created = normalizeProduct({ ...p, id: nid, order: state.products.length, _edited: true, updatedAt: now, _rev: 1 }, state.products.length);
          logMut("insert", { id: created.id, name: created.name });
          state.products.push(created); id = created.id;
        }
      });
      if (!r.ok) { try { window.dispatchEvent(new CustomEvent("lb:saveError", { detail: { message: String((r.error && r.error.message) || "保存に失敗しました") } })); } catch (e) {} }
      return r.ok ? id : null;
    },
    deleteProduct(id) {
      return tx("delete", () => {
        const p = state.products.find(x => x.id === id);
        logMut("delete", { id, name: p && p.name, deletedAt: new Date().toISOString() });
        state.products = state.products.filter(x => x.id !== id);
        state.deleted[id] = { at: new Date().toISOString() };   // tombstone — never resurrects
      }).ok;
    },
    duplicateProduct(id) {
      const src = this.getProduct(id); if (!src) return null;
      let nid = null;
      const r = tx("duplicate", () => {
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = uid("p"); copy.name = src.name + "（複製）"; copy.status = "draft";
        copy.rank = null; copy.order = state.products.length;
        copy._edited = true; copy._rev = 1; copy.updatedAt = new Date().toISOString();
        state.products.push(copy); nid = copy.id;
      });
      return r.ok ? nid : null;
    },
    bulkStatus(ids, status) {
      return tx("bulkStatus", () => {
        const now = new Date().toISOString();
        state.products.forEach(p => { if (ids.includes(p.id)) { p.status = status; p._edited = true; p.updatedAt = now; } });
      }).ok;
    },
    bulkDelete(ids) {
      return tx("bulkDelete", () => {
        const now = new Date().toISOString();
        logMut("bulk_delete", { ids, count: ids.length });
        state.products.forEach(p => { if (ids.includes(p.id)) state.deleted[p.id] = { at: now }; });
        state.products = state.products.filter(p => !ids.includes(p.id));
      }).ok;
    },
    reorderProducts(ids) {
      return tx("reorder", () => { ids.forEach((id, i) => { const p = this.getProduct(id); if (p) p.order = i; }); }).ok;
    },

    /* categories — CMS-managed, no hardcoded arrays anywhere else in the app */
    allCategories() { return [...state.categories].sort((a, b) => a.sortOrder - b.sortOrder); },
    visibleCategories() { return this.allCategories().filter(c => c.isVisible); },
    getCategory(key) { return state.categories.find(c => c.key === key); },
    saveCategory(c, opts) {
      const key = (c.key || c.slug || "").trim();
      if (!key) return { ok: false, reason: "slug_required", message: "スラッグ（キー）は必須です" };
      const existing = state.categories.find(x => x.key === key);
      const mergedName = (c.en !== undefined ? c.en : (existing && existing.en)) || c.name || "";
      if (!mergedName.trim()) return { ok: false, reason: "name_required", message: "カテゴリ名は必須です" };
      const creatingNew = !!(opts && opts.isNew);
      if (creatingNew && existing) {
        return { ok: false, reason: "slug_duplicate", message: "同じスラッグのカテゴリが既に存在します" };
      }
      const r = tx("saveCategory", () => {
        const i = state.categories.findIndex(x => x.key === key);
        if (i >= 0) {
          state.categories[i] = normalizeCategory({ ...state.categories[i], ...c, key, updatedAt: new Date().toISOString() }, state.categories[i].sortOrder);
        } else {
          state.categories.push(normalizeCategory({ ...c, key, updatedAt: new Date().toISOString() }, state.categories.length));
        }
      });
      return r.ok ? { ok: true } : { ok: false, reason: "save_failed", message: "保存に失敗しました" };
    },
    deleteCategory(key, opts) {
      const cat = this.getCategory(key);
      if (!cat) return { ok: false, reason: "not_found" };
      if (cat.locked && !(opts && opts.force)) return { ok: false, reason: "locked", message: "このカテゴリは削除保護されています。先にロックを解除してください。" };
      const linkedCount = state.products.filter(p => p.cat === key).length;
      const r = tx("deleteCategory", () => {
        logMut("deleteCategory", { key, linkedProducts: linkedCount });
        state.categories = state.categories.filter(c => c.key !== key);
      });
      return r.ok ? { ok: true, linkedCount } : { ok: false, reason: "save_failed" };
    },
    reorderCategories(keys) {
      return tx("reorderCategories", () => {
        keys.forEach((key, i) => { const c = this.getCategory(key); if (c) c.sortOrder = i; });
      }).ok;
    },

    /* navigation — header/menu items, fully CMS-managed (no `const NAV = [...]` in code) */
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
      const r = tx("saveNavItem", () => {
        if (!Array.isArray(state.navItems)) state.navItems = [];
        const i = state.navItems.findIndex(x => x.id === n.id);
        if (i >= 0) {
          state.navItems[i] = normalizeNavItem({ ...state.navItems[i], ...n, slug, updatedAt: new Date().toISOString() }, state.navItems[i].sortOrder);
        } else {
          state.navItems.push(normalizeNavItem({ ...n, slug, id: n.id || uid("nav"), updatedAt: new Date().toISOString() }, state.navItems.length));
        }
      });
      return r.ok ? { ok: true } : { ok: false, reason: "save_failed" };
    },
    deleteNavItem(id, opts) {
      const item = this.getNavItem(id);
      if (!item) return { ok: false, reason: "not_found" };
      if (item.locked && !(opts && opts.force)) return { ok: false, reason: "locked", message: "この項目は削除保護されています。" };
      const r = tx("deleteNavItem", () => {
        logMut("deleteNavItem", { id, title: item.title });
        state.navItems = state.navItems.filter(n => n.id !== id);
      });
      return r.ok ? { ok: true } : { ok: false, reason: "save_failed" };
    },
    reorderNavItems(ids) {
      return tx("reorderNavItems", () => {
        ids.forEach((id, i) => { const n = this.getNavItem(id); if (n) n.sortOrder = i; });
      }).ok;
    },

    /* articles */
    allArticles() { return state.articles; },
    publishedArticles() { return state.articles.filter(a => a.status === "published"); },
    getArticle(id) { return state.articles.find(a => a.id === id); },
    saveArticle(a) {
      const r = tx("saveArticle", () => {
        const i = state.articles.findIndex(x => x.id === a.id);
        if (i >= 0) { state.articles[i] = { ...state.articles[i], ...a }; return a.id; }
        a.id = a.id || uid("a"); state.articles.push(a); return a.id;
      });
      return r.ok ? r.result : null;
    },
    deleteArticle(id) {
      return tx("deleteArticle", () => { state.articles = state.articles.filter(a => a.id !== id); }).ok;
    },
    duplicateArticle(id) {
      const src = this.getArticle(id); if (!src) return null;
      const r = tx("duplicateArticle", () => {
        const copy = JSON.parse(JSON.stringify(src));
        copy.id = uid("a"); copy.title = src.title + "（複製）"; copy.status = "draft";
        state.articles.push(copy); return copy.id;
      });
      return r.ok ? r.result : null;
    },

    /* media library */
    allMedia() { return state.media; },
    addMedia(items) { return tx("addMedia", () => { state.media = [...items, ...state.media]; }).ok; },
    deleteMedia(id) { return tx("deleteMedia", () => { state.media = state.media.filter(m => m.id !== id); }).ok; },
    newMediaId: () => uid("m"),

    /* site settings */
    site() { return state.site; },
    saveSite(patch) { return tx("saveSite", () => { state.site = { ...state.site, showHomePage: state.site.showHomePage !== false, ...patch }; }).ok; },

    /* auth (demo) */
    admins() { return state.admins; },
    checkLogin(email, password) {
      return state.admins.some(a => a.email.toLowerCase() === String(email).toLowerCase() && a.password === password);
    },
    updateAdmin(email, password) {
      return tx("updateAdmin", () => { state.admins = [{ email, password }]; }).ok;
    },

    exportJSON() { return JSON.stringify(state, null, 2); },

    /* import / export / reset
       importJSON is the highest-risk resurrection vector (restoring an
       older backup could otherwise wipe out tombstones + recent edits).
       It now MERGES rather than overwrites: tombstones are unioned so a
       restore can never resurrect something deleted either before or
       after the backup was taken, and the merged product list is run
       through the same tombstone guard as everything else. */
    importJSON(json) {
      const incoming = typeof json === "string" ? JSON.parse(json) : json;
      return tx("importJSON", () => {
        const mergedDeleted = { ...(state.deleted || {}), ...(incoming.deleted || {}) };
        const incomingProducts = Array.isArray(incoming.products)
          ? incoming.products.map((p, i) => normalizeProduct(p, i)).filter(p => !mergedDeleted[p.id])
          : state.products;
        const rejected = (incoming.products || []).length - incomingProducts.length;
        logMut("import_merge", { incomingCount: (incoming.products || []).length, acceptedCount: incomingProducts.length, tombstonesRespected: rejected });
        state = {
          ...state,
          ...incoming,
          products: incomingProducts,
          deleted: mergedDeleted,
          _mutationSeq: state._mutationSeq,   // tx() increments this itself
        };
      }).ok;
    },
    resetToSeed() {
      // explicit, intentional hard reset — clearing tombstones here is correct
      // (the operator is asking to discard all CMS state, not restore a backup)
      return tx("resetToSeed", () => { state = { ...seedState(), _mutationSeq: state._mutationSeq }; }).ok;
    },

    /* ---- Site Content (CMS-managed, key-based text for every page) ----
       Resolution order everywhere on the storefront: contentDraft (only in
       ?cms_preview=1) → content (published) → registry default. Nothing is
       ever hardcoded in a component — see content-registry.js for the catalog
       and window.T(key) for the resolver used by the storefront. */
    contentRegistry() { return (window.LBContentRegistry && window.LBContentRegistry.REGISTRY) || []; },
    publishedText(key) {
      const reg = window.LBContentRegistry && window.LBContentRegistry.get(key);
      if (state.content && Object.prototype.hasOwnProperty.call(state.content, key)) return state.content[key];
      return reg ? reg.default : "";
    },
    draftText(key) {
      if (state.contentDraft && Object.prototype.hasOwnProperty.call(state.contentDraft, key)) return state.contentDraft[key];
      return this.publishedText(key);
    },
    isContentDirty(key) {
      if (!state.contentDraft || !Object.prototype.hasOwnProperty.call(state.contentDraft, key)) return false;
      return state.contentDraft[key] !== this.publishedText(key);
    },
    dirtyContentKeys() {
      return this.contentRegistry().map(e => e.key).filter(k => this.isContentDirty(k));
    },
    saveContentDraft(key, value) {
      return tx("saveContentDraft", () => {
        if (!state.contentDraft) state.contentDraft = {};
        state.contentDraft[key] = value;
        logMut("content_draft", { key });
      }).ok;
    },
    revertContentDraft(key) {
      return tx("revertContentDraft", () => {
        if (state.contentDraft) delete state.contentDraft[key];
        logMut("content_draft_revert", { key });
      }).ok;
    },
    /* publish one key, N keys, or (if omitted) every currently-dirty key.
       Records the OUTGOING published value into history before overwriting,
       so "元に戻す" always has something to restore. */
    publishContent(keys) {
      const list = keys ? (Array.isArray(keys) ? keys : [keys]) : this.dirtyContentKeys();
      const who = (this.admins()[0] && this.admins()[0].email) || "admin";
      return tx("publishContent", () => {
        if (!state.content) state.content = {};
        if (!state.contentHistory) state.contentHistory = {};
        const now = new Date().toISOString();
        list.forEach((key) => {
          if (!state.contentDraft || !Object.prototype.hasOwnProperty.call(state.contentDraft, key)) return;
          const before = this.publishedText(key);
          const after = state.contentDraft[key];
          if (before === after) return;
          if (!state.contentHistory[key]) state.contentHistory[key] = [];
          state.contentHistory[key].unshift({ value: before, at: now, by: who });
          if (state.contentHistory[key].length > 20) state.contentHistory[key].length = 20;
          state.content[key] = after;
          logMut("content_publish", { key, by: who });
        });
      }).ok;
    },
    contentHistory(key) { return (state.contentHistory && state.contentHistory[key]) || []; },
    /* pull a historical value back into the DRAFT slot (review before re-publishing,
       never overwrites the live published site directly) */
    restoreContentHistoryToDraft(key, index) {
      const hist = this.contentHistory(key);
      const entry = hist[index];
      if (!entry) return false;
      return this.saveContentDraft(key, entry.value);
    },
  };

  /* ---- global text resolver used by every component instead of hardcoded copy ----
     Storefront pages call T("some.key") directly. Resolution order:
     draft (ONLY when ?cms_preview=1 is on the URL, for admin preview-before-publish)
     → published override → registry default → the key itself (visible fallback,
     never a blank string, if an operator ever references an unregistered key). */
  function isPreviewMode() {
    try { return new URLSearchParams(window.location.search).get("cms_preview") === "1"; } catch (_) { return false; }
  }
  window.T = function (key) {
    try {
      if (isPreviewMode()) return LBStore.draftText(key);
      return LBStore.publishedText(key);
    } catch (_) { return key; }
  };

  /* ---- patch window.LB so the storefront reads live data ---- */
  function patchStorefront() {
    const pub = LBStore.publishedProducts();
    const visCats = LBStore.visibleCategories();
    window.LB = {
      ...SEED,
      CATEGORIES: visCats,
      NAV: LBStore.visibleNavItems(),
      SHOPS: SEED.SHOPS,
      GRAD,
      PRODUCTS: pub,
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
  patchStorefront();

  window.LBStore = LBStore;
})();
