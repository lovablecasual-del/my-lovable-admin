/* ============================================================
   LOVABLE CMS — サイトコンテンツ管理
   Key-based text editor for every page/section string in the
   registry (content-registry.js). Draft-first: edits save to
   contentDraft immediately (tx()-safe, never lost), but the live
   site only shows them once "公開する" is pressed — publishContent()
   snapshots the outgoing published value into history first, so
   every key can always be reverted to a prior published version.
   ============================================================ */
const { I: TI, strokeFix: TF, toast: ttoast, go: tgo, S: TS } = window.AdminCore;

function SiteContentManager() {
  window.AdminCore.useStore();
  const REG = (window.LBContentRegistry && window.LBContentRegistry.REGISTRY) || [];
  const PAGE_LABELS = (window.LBContentRegistry && window.LBContentRegistry.PAGE_LABELS) || {};
  const pages = [...new Set(REG.map(e => e.page))];
  const [activePage, setActivePage] = useState(pages[0]);
  const [q, setQ] = useState("");
  const [historyKey, setHistoryKey] = useState(null);

  const dirtyCount = TS.dirtyContentKeys().length;

  const visibleEntries = REG.filter(e => e.page === activePage)
    .filter(e => !q.trim() || (e.label + e.key).toLowerCase().includes(q.toLowerCase()));

  const onChange = (key, value) => TS.saveContentDraft(key, value);
  const onRevertOne = (key) => { TS.revertContentDraft(key); ttoast("下書きを取り消しました"); };
  const onPublishOne = (key) => { TS.publishContent(key); ttoast("公開しました"); };
  const onPublishAll = () => { TS.publishContent(); ttoast("すべての変更を公開しました"); };
  const openPreview = () => window.open("index.html?cms_preview=1", "_blank");

  return (
    <div className="content">
      <div className="editor">
        <div className="ed-side" style={{ order: -1 }}>
          <div className="card">
            <h3>ページ / セクション</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {pages.map(pg => {
                const dirtyOnPage = REG.filter(e => e.page === pg).filter(e => TS.isContentDirty(e.key)).length;
                return (
                  <button key={pg}
                    className={"b b--sm b--block" + (activePage === pg ? " b--p" : " b--g")}
                    style={{ justifyContent: "space-between", display: "flex" }}
                    onClick={() => setActivePage(pg)}>
                    <span>{PAGE_LABELS[pg] || pg}</span>
                    {dirtyOnPage > 0 && <span className="nav-i__count">{dirtyOnPage}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3>公開</h3>
            <div className="hint" style={{ marginBottom: 12 }}>
              {dirtyCount > 0
                ? <>未公開の変更が <b>{dirtyCount}件</b> あります。</>
                : "未公開の変更はありません。"}
            </div>
            <button className="b b--g b--block" style={{ marginBottom: 8 }} onClick={openPreview}>プレビュー（下書きを確認） ↗</button>
            <button className="b b--p b--block" disabled={dirtyCount === 0} onClick={onPublishAll}>
              変更をすべて公開する{dirtyCount > 0 ? `（${dirtyCount}）` : ""}
            </button>
          </div>
          <div className="card">
            <h3>仕組み</h3>
            <div className="hint">
              サイト内のテキストはすべて「キー」で管理されています（例：<code>top.hero.ctaRanking</code>）。
              編集は自動的に下書きとして保存され、「公開する」を押すまで実際のサイトには反映されません。
              各項目は履歴から過去の公開内容に戻せます。
            </div>
          </div>
        </div>

        <div className="ed-main">
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <div className="search-in">{React.cloneElement(TI.search, TF)}<input className="in" placeholder="項目を検索" value={q} onChange={e => setQ(e.target.value)} /></div>
          </div>
          <div className="card">
            <h3>{PAGE_LABELS[activePage] || activePage}</h3>
            {visibleEntries.map(e => {
              const draftVal = TS.draftText(e.key);
              const dirty = TS.isContentDirty(e.key);
              const hist = TS.contentHistory(e.key);
              return (
                <div key={e.key} className="fld" style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--a-line)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <b>{e.label}</b>
                    <em style={{ fontWeight: 400, color: "var(--a-muted)", fontSize: 11.5 }}>{e.key}</em>
                    {dirty && <span className="badge badge--dot badge--draft" style={{ fontSize: 10.5 }}>未公開の変更あり</span>}
                  </span>
                  {e.type === "textarea"
                    ? <textarea className="ta" value={draftVal} onChange={ev => onChange(e.key, ev.target.value)} />
                    : <input className="in" value={draftVal} onChange={ev => onChange(e.key, ev.target.value)} />}
                  <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {dirty && <button className="b b--g b--sm" onClick={() => onRevertOne(e.key)}>下書きを取り消す</button>}
                    {dirty && <button className="b b--p b--sm" onClick={() => onPublishOne(e.key)}>この項目だけ公開</button>}
                    {hist.length > 0 && (
                      <button className="b b--g b--sm" onClick={() => setHistoryKey(historyKey === e.key ? null : e.key)}>
                        履歴（{hist.length}）
                      </button>
                    )}
                  </div>
                  {historyKey === e.key && (
                    <div style={{ marginTop: 10, background: "var(--a-sink)", borderRadius: 8, padding: 10 }}>
                      {hist.map((h, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "6px 4px", fontSize: 12.5 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ color: "var(--a-muted)", fontSize: 11 }}>{new Date(h.at).toLocaleString("ja-JP")} · {h.by}</div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 380 }}>{h.value || <em>（空）</em>}</div>
                          </div>
                          <button className="b b--g b--sm" onClick={() => { TS.restoreContentHistoryToDraft(e.key, i); ttoast("下書きに復元しました。内容を確認して公開してください"); }}>
                            下書きに戻す
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {visibleEntries.length === 0 && <div className="empty-state">該当する項目がありません</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SiteContentManager });
