/* ============================================================
   LOVABLE CMS — Category management + Navigation management
   Both are fully DB-backed (LBStore.categories / LBStore.navItems).
   No hardcoded arrays anywhere: adding/removing entries here is
   the ONLY way to change what appears on the storefront.
   ============================================================ */
const { I: NI, strokeFix: NF, toast: ntoast, S: NS } = window.AdminCore;

/* ---------- tiny reusable drag-and-drop reorder list ----------
   HTML5 DnD with an up/down-arrow fallback (keyboard + touch safe). */
function DragList({ items, keyOf, onReorder, renderRow }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const move = (id, dir) => {
    const ids = items.map(keyOf);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onReorder(ids);
  };

  const onDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = items.map(keyOf);
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragId(null); setOverId(null);
  };

  return (
    <div className="draglist">
      {items.map((item, i) => {
        const id = keyOf(item);
        return (
          <div key={id}
            className={"dragrow" + (dragId === id ? " is-dragging" : "") + (overId === id ? " is-over" : "")}
            draggable
            onDragStart={() => setDragId(id)}
            onDragOver={(e) => { e.preventDefault(); if (overId !== id) setOverId(id); }}
            onDragLeave={() => setOverId((o) => (o === id ? null : o))}
            onDrop={(e) => { e.preventDefault(); onDrop(id); }}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
          >
            <span className="dragrow__handle" title="ドラッグして並び替え" aria-hidden="true">⠿</span>
            <div className="dragrow__body">{renderRow(item, i)}</div>
            <div className="dragrow__arrows">
              <button type="button" className="icon-b" disabled={i === 0} onClick={() => move(id, -1)} aria-label="上へ">{React.cloneElement(NI.up, NF)}</button>
              <button type="button" className="icon-b" disabled={i === items.length - 1} onClick={() => move(id, 1)} aria-label="下へ" style={{ transform: "rotate(180deg)" }}>{React.cloneElement(NI.up, NF)}</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- visibility toggle switch ---------- */
function VisSwitch({ on, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled}
      className={"vswitch" + (on ? " is-on" : "")}
      onClick={() => onChange(!on)} title={on ? "表示中（クリックで非表示）" : "非表示（クリックで表示）"}>
      <span className="vswitch__dot"></span>
    </button>
  );
}

/* ============================================================
   CATEGORY MANAGER
   ============================================================ */
function CategoryManager() {
  window.AdminCore.useStore();
  const cats = NS.allCategories();
  const [edit, setEdit] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const blank = { key: "", en: "", jp: "", blurb: "", icon: "", color: "", grad: NS.GRAD[NS.GRAD_KEYS[0]], subs: [], isVisible: true, locked: false };

  const askDelete = (c) => {
    const linked = NS.allProducts().filter(p => p.cat === c.key).length;
    setConfirmDel({ cat: c, linked });
  };
  const doDelete = (force) => {
    const r = NS.deleteCategory(confirmDel.cat.key, { force });
    if (r.ok) ntoast("削除しました");
    else ntoast(r.message || "削除できませんでした");
    setConfirmDel(null);
  };

  return (
    <div className="content">
      <div className="toolbar">
        <p className="hint" style={{ margin: 0, flex: 1 }}>表示・非表示、名称、並び順、アイコン、カラーを管理できます。ドラッグで並び替え可能です。</p>
        <button className="b b--p" onClick={() => setEdit({ ...blank, isNew: true })}>{React.cloneElement(NI.plus, NF)} カテゴリーを追加</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <DragList
          items={cats}
          keyOf={(c) => c.key}
          onReorder={(keys) => { NS.reorderCategories(keys); ntoast("並び順を保存しました"); }}
          renderRow={(c) => {
            const n = NS.allProducts().filter(p => p.cat === c.key).length;
            return (
              <div className="catrow">
                <div className="catrow__thumb" style={{ background: c.color || c.grad }}>
                  {c.icon && <span className="catrow__icon">{c.icon}</span>}
                </div>
                <div className="catrow__info">
                  <div className="catrow__name">{c.en} <span className="catrow__jp">{c.jp}</span>{c.locked && <span className="lockchip" title="削除保護">🔒</span>}</div>
                  <div className="catrow__meta">{(c.subs || []).join(" / ") || "サブカテゴリ未設定"} ・ 商品{n}点 ・ /category/{c.key}</div>
                </div>
                <VisSwitch on={c.isVisible} onChange={(v) => { NS.saveCategory({ key: c.key, isVisible: v }); ntoast(v ? "表示にしました" : "非表示にしました"); }} />
                <div className="tbl__act">
                  <button className="icon-b" onClick={() => setEdit({ ...c })}>{React.cloneElement(NI.edit, NF)}</button>
                  <button className="icon-b icon-b--d" onClick={() => askDelete(c)}>{React.cloneElement(NI.trash, NF)}</button>
                </div>
              </div>
            );
          }}
        />
      </div>

      {edit && <CategoryModal cat={edit} onClose={() => setEdit(null)} />}
      {confirmDel && (
        <div className="scrim" style={{ display: "grid", placeItems: "center", zIndex: 90 }} onClick={() => setConfirmDel(null)}>
          <div className="card" style={{ width: "min(420px,92vw)" }} onClick={(e) => e.stopPropagation()}>
            <h3>「{confirmDel.cat.en}」を削除しますか？</h3>
            {confirmDel.linked > 0 && (
              <p className="hint" style={{ color: "var(--a-warn,#a2681e)" }}>
                このカテゴリには <b>{confirmDel.linked}件</b> の商品が紐付いています。削除しても商品データは残りますが、カテゴリ表示が失われます。
              </p>
            )}
            {confirmDel.cat.locked && <p className="hint">🔒 削除保護が有効です。削除するには保護を解除してください。</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {confirmDel.cat.locked ? (
                <button className="b b--g b--block" onClick={() => { NS.saveCategory({ key: confirmDel.cat.key, locked: false }); ntoast("保護を解除しました。もう一度削除してください"); setConfirmDel(null); }}>保護を解除する</button>
              ) : (
                <button className="b b--block" style={{ background: "#c0392b", color: "#fff" }} onClick={() => doDelete(false)}>削除する</button>
              )}
              <button className="b b--g" onClick={() => setConfirmDel(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryModal({ cat, onClose }) {
  const [c, setC] = useState(cat);
  const [err, setErr] = useState("");
  const isNew = !!cat.isNew;
  const f = (k, v) => setC(s => ({ ...s, [k]: v }));
  const save = () => {
    if (!c.en.trim()) { setErr("英字名を入力してください"); return; }
    const key = isNew ? (c.key || c.en).toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/^-+|-+$/g, "") : c.key;
    if (!key) { setErr("スラッグを入力してください"); return; }
    const r = NS.saveCategory({ ...c, key }, { isNew });
    if (!r.ok) { setErr(r.message || "保存できませんでした"); return; }
    ntoast("保存しました"); onClose();
  };
  return (
    <div className="scrim" style={{ display: "grid", placeItems: "center", zIndex: 80 }} onClick={onClose}>
      <div className="card" style={{ width: "min(520px,92vw)", maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <h3>{isNew ? "カテゴリーを追加" : "カテゴリーを編集"}</h3>
        {err && <div className="login__err" style={{ marginBottom: 12 }}>{err}</div>}
        <div className="row2">
          <label className="fld"><span>英字名（表示）</span><input className="in" value={c.en} onChange={e => f("en", e.target.value)} placeholder="Cafe" /></label>
          <label className="fld"><span>日本語名</span><input className="in" value={c.jp} onChange={e => f("jp", e.target.value)} placeholder="カフェ" /></label>
        </div>
        {isNew && (
          <label className="fld"><span>スラッグ（URL用・空欄で自動生成） <em>/category/…</em></span>
            <input className="in" value={c.key} onChange={e => f("key", e.target.value)} placeholder="cafe" />
          </label>
        )}
        <label className="fld"><span>紹介文</span><textarea className="ta" style={{ minHeight: 56 }} value={c.blurb} onChange={e => f("blurb", e.target.value)} /></label>
        <label className="fld"><span>サブカテゴリー</span><TagsInput tags={c.subs} onChange={v => f("subs", v)} /></label>
        <div className="row2">
          <label className="fld"><span>アイコン <em>（絵文字・任意）</em></span><input className="in" value={c.icon || ""} onChange={e => f("icon", e.target.value)} placeholder="☕" maxLength={4} /></label>
          <label className="fld"><span>カラー <em>（任意・空欄で画像色を使用）</em></span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={c.color || "#6b4e34"} onChange={e => f("color", e.target.value)} style={{ width: 40, height: 38, border: "1px solid var(--a-line)", borderRadius: 8, padding: 2, background: "none" }} />
              <input className="in" value={c.color || ""} onChange={e => f("color", e.target.value)} placeholder="未設定" />
            </div>
          </label>
        </div>
        <label className="fld"><span>イメージ画像色</span>
          <div className="swatches">{NS.GRAD_KEYS.map(k => <button key={k} type="button" className={"sw" + (c.grad === NS.GRAD[k] ? " sw--on" : "")} style={{ background: NS.GRAD[k] }} onClick={() => f("grad", NS.GRAD[k])}></button>)}</div>
        </label>
        <label className="badgeflag" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={!!c.locked} onChange={e => f("locked", e.target.checked)} />
          <span className="badgeflag__box" aria-hidden="true"></span>
          <span className="badgeflag__txt"><b>🔒 削除保護する</b><em>誤って削除しないようロックします（後で解除できます）</em></span>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="b b--p b--block" onClick={save}>保存</button>
          <button className="b b--g" onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION MANAGER (header / menu)
   ============================================================ */
function NavManager() {
  window.AdminCore.useStore();
  const items = NS.allNavItems();
  const [edit, setEdit] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const blank = { title: "", url: "", icon: "", isVisible: true, locked: false };

  return (
    <div className="content">
      <div className="toolbar">
        <p className="hint" style={{ margin: 0, flex: 1 }}>ヘッダー・モバイルメニューに表示するナビゲーションを管理します。表示ON/OFF・名称・URL・アイコン・並び順を自由に変更できます。</p>
        <button className="b b--p" onClick={() => setEdit({ ...blank, isNewItem: true })}>{React.cloneElement(NI.plus, NF)} 項目を追加</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {items.length === 0 && <div className="empty-state">ナビゲーション項目がありません</div>}
        <DragList
          items={items}
          keyOf={(n) => n.id}
          onReorder={(ids) => { NS.reorderNavItems(ids); ntoast("並び順を保存しました"); }}
          renderRow={(n) => (
            <div className="catrow">
              <div className="navrow__icon">{n.icon || "•"}</div>
              <div className="catrow__info">
                <div className="catrow__name">{n.title}{n.locked && <span className="lockchip" title="削除保護">🔒</span>}</div>
                <div className="catrow__meta">{n.url}</div>
              </div>
              <VisSwitch on={n.isVisible} onChange={(v) => { NS.saveNavItem({ id: n.id, isVisible: v }); ntoast(v ? "表示にしました" : "非表示にしました"); }} />
              <div className="tbl__act">
                <button className="icon-b" onClick={() => setEdit({ ...n })}>{React.cloneElement(NI.edit, NF)}</button>
                <button className="icon-b icon-b--d" onClick={() => setConfirmDel(n)}>{React.cloneElement(NI.trash, NF)}</button>
              </div>
            </div>
          )}
        />
      </div>

      {edit && <NavModal item={edit} onClose={() => setEdit(null)} />}
      {confirmDel && (
        <div className="scrim" style={{ display: "grid", placeItems: "center", zIndex: 90 }} onClick={() => setConfirmDel(null)}>
          <div className="card" style={{ width: "min(400px,92vw)" }} onClick={(e) => e.stopPropagation()}>
            <h3>「{confirmDel.title}」を削除しますか？</h3>
            {confirmDel.locked && <p className="hint">🔒 削除保護が有効です。削除するには保護を解除してください。</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              {confirmDel.locked ? (
                <button className="b b--g b--block" onClick={() => { NS.saveNavItem({ id: confirmDel.id, locked: false }); ntoast("保護を解除しました。もう一度削除してください"); setConfirmDel(null); }}>保護を解除する</button>
              ) : (
                <button className="b b--block" style={{ background: "#c0392b", color: "#fff" }}
                  onClick={() => { const r = NS.deleteNavItem(confirmDel.id); ntoast(r.ok ? "削除しました" : (r.message || "削除できませんでした")); setConfirmDel(null); }}>削除する</button>
              )}
              <button className="b b--g" onClick={() => setConfirmDel(null)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavModal({ item, onClose }) {
  const [n, setN] = useState(item);
  const [err, setErr] = useState("");
  const isNew = !!item.isNewItem;
  const f = (k, v) => setN(s => ({ ...s, [k]: v }));
  const save = () => {
    const r = NS.saveNavItem(n);
    if (!r.ok) { setErr(r.message || "保存できませんでした"); return; }
    ntoast("保存しました"); onClose();
  };
  return (
    <div className="scrim" style={{ display: "grid", placeItems: "center", zIndex: 80 }} onClick={onClose}>
      <div className="card" style={{ width: "min(440px,92vw)" }} onClick={e => e.stopPropagation()}>
        <h3>{isNew ? "ナビゲーションを追加" : "ナビゲーションを編集"}</h3>
        {err && <div className="login__err" style={{ marginBottom: 12 }}>{err}</div>}
        <label className="fld"><span>タイトル</span><input className="in" value={n.title} onChange={e => f("title", e.target.value)} placeholder="Cafe" /></label>
        <label className="fld"><span>遷移先URL</span><input className="in" value={n.url} onChange={e => f("url", e.target.value)} placeholder="/category/cafe" /></label>
        <label className="fld"><span>アイコン <em>（絵文字・任意）</em></span><input className="in" value={n.icon || ""} onChange={e => f("icon", e.target.value)} placeholder="☕" maxLength={4} /></label>
        <label className="badgeflag" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={!!n.locked} onChange={e => f("locked", e.target.checked)} />
          <span className="badgeflag__box" aria-hidden="true"></span>
          <span className="badgeflag__txt"><b>🔒 削除保護する</b><em>誤って削除しないようロックします</em></span>
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="b b--p b--block" onClick={save}>保存</button>
          <button className="b b--g" onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CategoryManager, CategoryModal, NavManager, NavModal, DragList, VisSwitch });
