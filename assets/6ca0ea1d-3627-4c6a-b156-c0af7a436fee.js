/* ============================================================
   LOVABLE CMS — content: articles, categories, TOP page, settings
   ============================================================ */
const { I: CI, strokeFix: CF, toast: ctoast, Thumb: CThumb, go: cgo, S: CS } = window.AdminCore;

/* ---------- tiny markdown renderer ---------- */
function md(src) {
  if (!src) return "";
  let h = src
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  // images & links
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // headings
  h = h.replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h2>$1</h2>");
  // bold/italic
  h = h.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/\*([^*]+)\*/g,"<em>$1</em>");
  // lists
  h = h.replace(/(?:^- .*(?:\n|$))+/gm, (m)=>"<ul>"+m.trim().split("\n").map(l=>"<li>"+l.replace(/^- /,"")+"</li>").join("")+"</ul>");
  // paragraphs
  h = h.split(/\n{2,}/).map(b => /^\s*<(h\d|ul|img|blockquote)/.test(b.trim()) ? b : (b.trim()?"<p>"+b.trim().replace(/\n/g,"<br>")+"</p>":"")).join("\n");
  return h;
}

/* ---------- ARTICLE LIST ---------- */
function ArticleList() {
  window.AdminCore.useStore();
  const [q,setQ]=useState("");
  let rows = CS.allArticles();
  if(q.trim()) rows = rows.filter(a=>(a.title+(a.type||"")).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="content">
      <div className="toolbar">
        <div className="search-in">{React.cloneElement(CI.search,CF)}<input className="in" placeholder="記事タイトルで検索" value={q} onChange={e=>setQ(e.target.value)} /></div>
        <button className="b b--p" onClick={()=>cgo("articles/new")}>{React.cloneElement(CI.plus,CF)} 記事を作成</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>記事</th><th className="tbl__hide">種類</th><th className="tbl__hide">紐づく商品</th><th>状態</th><th style={{textAlign:"right"}}>操作</th></tr></thead>
          <tbody>
            {rows.map(a=>(
              <tr key={a.id}>
                <td>
                  <div className="tbl__name">
                    <div className="tbl__thumb" style={{background:a.cover?`center/cover url(${a.cover})`:(a.coverGrad||"var(--a-line-2)")}}></div>
                    <div><div className="tbl__t1" onClick={()=>cgo("articles/"+a.id)}>{a.title}</div><div className="tbl__t2">{a.kicker||""} · {a.read||""}</div></div>
                  </div>
                </td>
                <td className="tbl__hide"><span className="tbl__t2">{a.type||"記事"}</span></td>
                <td className="tbl__hide"><span className="tbl__t2">{(a.items||[]).length}点</span></td>
                <td><span className={"badge badge--dot "+(a.status==="published"?"badge--pub":"badge--draft")}>{a.status==="published"?"公開":"下書き"}</span></td>
                <td><div className="tbl__act">
                  <button className="icon-b" onClick={()=>cgo("articles/"+a.id)}>{React.cloneElement(CI.edit,CF)}</button>
                  <button className="icon-b" onClick={()=>{CS.duplicateArticle(a.id);ctoast("複製しました");}}>{React.cloneElement(CI.copy,CF)}</button>
                  <button className="icon-b icon-b--d" onClick={()=>{if(confirm("削除しますか？")){CS.deleteArticle(a.id);ctoast("削除しました");}}}>{React.cloneElement(CI.trash,CF)}</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length===0 && <div className="empty-state">{React.cloneElement(CI.doc,CF)}<div>記事がありません</div></div>}
      </div>
    </div>
  );
}

/* ---------- ARTICLE EDITOR ---------- */
const ARTICLE_TYPES = ["購入品記事","ランキング記事","比較記事","レビュー記事","韓国旅行記事","美容記事","ファッション記事","Vlog紹介記事"];
function ArticleEditor({ id }) {
  const isNew = id==="new";
  const blank = { title:"", type:ARTICLE_TYPES[0], kicker:"", excerpt:"", body:"## 見出し\n\nここに本文を書きます。\n\n- ポイント1\n- ポイント2\n\n![代替テキスト](画像URL)\n\n[商品を見る](リンクURL)", cover:null, coverGrad:CS.GRAD[CS.GRAD_KEYS[0]], items:[], read:"5 min", status:"draft", seo:{title:"",desc:"",ogimg:""} };
  const [a,setA]=useState(()=> isNew?blank:JSON.parse(JSON.stringify(CS.getArticle(id)||blank)));
  const f=(k,v)=>setA(s=>({...s,[k]:v}));
  const fseo=(k,v)=>setA(s=>({...s,seo:{...s.seo,[k]:v}}));
  const coverRef = useRef();
  const products = CS.allProducts();

  const save=(status)=>{ if(!a.title.trim()){ctoast("タイトルを入力してください");return;} CS.saveArticle({...a,status:status||a.status}); ctoast(status==="published"?"公開しました":"保存しました"); cgo("articles"); };
  const setCover=(files)=>{ const file=[...files].find(f=>f.type.startsWith("image/")); if(!file)return; const r=new FileReader(); r.onload=()=>window.compress(r.result,(c)=>f("cover",c),1400); r.readAsDataURL(file); };
  const insert=(snippet)=>f("body",(a.body||"")+"\n"+snippet);

  return (
    <div className="content">
      <div className="editor">
        <div className="ed-main">
          <div className="card">
            <label className="fld"><span>記事タイトル <em>（必須）</em></span>
              <input className="in" style={{fontSize:18,fontWeight:600}} value={a.title} onChange={e=>f("title",e.target.value)} placeholder="例）買ってよかった美容アイテム" /></label>
            <div className="row3">
              <label className="fld"><span>記事の種類</span>
                <select className="sel" value={a.type} onChange={e=>f("type",e.target.value)}>{ARTICLE_TYPES.map(t=><option key={t}>{t}</option>)}</select></label>
              <label className="fld"><span>カテゴリラベル</span><input className="in" value={a.kicker||""} onChange={e=>f("kicker",e.target.value)} placeholder="例）BEAUTY EDIT" /></label>
              <label className="fld"><span>読了目安</span><input className="in" value={a.read||""} onChange={e=>f("read",e.target.value)} placeholder="例）6 min" /></label>
            </div>
            <label className="fld" style={{marginBottom:0}}><span>リード文（抜粋）</span>
              <textarea className="ta" style={{minHeight:64}} value={a.excerpt} onChange={e=>f("excerpt",e.target.value)} placeholder="記事一覧やカードに表示される短い導入文。" /></label>
          </div>

          <div className="card">
            <h3>本文（Markdown対応）</h3>
            <div className="md-toolbar">
              <button onClick={()=>insert("## 見出し")}>見出し</button>
              <button onClick={()=>insert("**太字**")}>太字</button>
              <button onClick={()=>insert("- リスト項目")}>リスト</button>
              <button onClick={()=>insert("![説明](画像URL)")}>画像</button>
              <button onClick={()=>insert("[リンク文字](URL)")}>リンク</button>
            </div>
            <div className="md-wrap">
              <textarea className="ta md-ed" value={a.body} onChange={e=>f("body",e.target.value)} />
              <div className="md-prev" dangerouslySetInnerHTML={{__html:md(a.body)}}></div>
            </div>
          </div>

          <div className="card">
            <h3>紐づける商品 <em style={{fontWeight:400,color:"var(--a-muted)"}}>（記事内・関連で表示）</em></h3>
            <div className="hint" style={{marginBottom:12}}>チェックした商品が記事に関連商品として表示されます。</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:230,overflow:"auto"}}>
              {products.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 8px",borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" className="chk" checked={(a.items||[]).includes(p.id)} onChange={()=>f("items",(a.items||[]).includes(p.id)?a.items.filter(x=>x!==p.id):[...(a.items||[]),p.id])} />
                  <CThumb p={p} className="tbl__thumb" />
                  <span style={{fontSize:12.5,fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>SEO設定</h3>
            <label className="fld"><span>SEOタイトル</span><input className="in" value={a.seo?.title||""} onChange={e=>fseo("title",e.target.value)} placeholder="検索結果に出るタイトル（空欄なら記事タイトル）" /></label>
            <label className="fld" style={{marginBottom:0}}><span>メタディスクリプション</span><textarea className="ta" style={{minHeight:60}} value={a.seo?.desc||""} onChange={e=>fseo("desc",e.target.value)} placeholder="検索結果に出る説明文（120字程度）" /></label>
          </div>
        </div>

        <div className="ed-side">
          <div className="card">
            <h3>公開設定</h3>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <button className="b b--p b--block" onClick={()=>save("published")}>公開する</button>
              <button className="b b--g" onClick={()=>save("draft")}>下書き</button>
            </div>
            <div className="hint">状態：<b>{a.status==="published"?"公開":"下書き"}</b></div>
            <button className="b b--g b--block" style={{marginTop:12}} onClick={()=>cgo("articles")}>キャンセル</button>
          </div>
          <div className="card">
            <h3>カバー画像</h3>
            <div className="img-cell" style={{aspectRatio:"16/10",marginBottom:10,cursor:"pointer"}} onClick={()=>coverRef.current.click()}>
              {a.cover ? <img src={a.cover} alt="" /> : <div style={{width:"100%",height:"100%",background:a.coverGrad}}></div>}
            </div>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={e=>setCover(e.target.files)} />
            <button className="b b--g b--block b--sm" onClick={()=>coverRef.current.click()}>画像をアップロード</button>
            <div className="hint" style={{margin:"12px 0 8px"}}>または背景グラデーション：</div>
            <div className="swatches">
              {CS.GRAD_KEYS.map(k=><button key={k} className={"sw"+(a.coverGrad===CS.GRAD[k]?" sw--on":"")} style={{background:CS.GRAD[k]}} onClick={()=>{f("coverGrad",CS.GRAD[k]);f("cover",null);}}></button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- CATEGORY MANAGER ----------
   Moved to admin-nav.jsx (full CMS: icon/color/visibility/lock/drag-reorder). */

/* ---------- TOP PAGE MANAGER ---------- */
const TOP_TEXT_KEYS = [
  "top.ranking.title", "top.ranking.eyebrow",
  "top.new.title", "top.new.eyebrow",
  "top.features.title", "top.features.eyebrow",
  "top.quote", "top.quote.eyebrow",
  "top.hero.tile1", "top.hero.tile2", "top.hero.tile3", "top.hero.tile4",
];
function TopTexts() {
  const REG = (window.LBContentRegistry && window.LBContentRegistry.byKey) || {};
  const dirty = TOP_TEXT_KEYS.filter(k => CS.isContentDirty(k));
  return (
    <div className="card">
      <h3>見出し・タイトル</h3>
      <div className="hint" style={{marginBottom:14}}>TOPページに出る見出しをここから変更できます。入力は自動で下書き保存され、下の「公開」を押すとサイトに反映されます。長めの文は<b>改行を入れた位置でそのまま改行</b>されます。</div>
      {TOP_TEXT_KEYS.map(k => {
        const e = REG[k]; if (!e) return null;
        return (
          <label key={k} className="fld">
            <span>{e.label} {CS.isContentDirty(k) && <em style={{color:"var(--a-warn,#b8860b)",fontWeight:600}}>（未公開）</em>}</span>
            {e.type === "textarea"
              ? <textarea className="ta" style={{minHeight:60}} value={CS.draftText(k)} onChange={ev=>CS.saveContentDraft(k, ev.target.value)} />
              : <input className="in" value={CS.draftText(k)} onChange={ev=>CS.saveContentDraft(k, ev.target.value)} />}
          </label>
        );
      })}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <button className="b b--p" disabled={dirty.length===0} onClick={()=>{TOP_TEXT_KEYS.forEach(k=>{ if(CS.isContentDirty(k)) CS.publishContent(k); }); ctoast("見出しを公開しました");}}>見出しを公開する{dirty.length?`（${dirty.length}）`:""}</button>
        <button className="b b--g" onClick={()=>cgo("content")}>他のテキストも編集 →</button>
      </div>
    </div>
  );
}
function TopManager() {
  window.AdminCore.useStore();
  const site = CS.site();
  const [s,setS]=useState(()=>JSON.parse(JSON.stringify(site)));
  const hero=s.hero||{};
  const fh=(k,v)=>setS(st=>({...st,hero:{...st.hero,[k]:v}}));
  const heroRef=useRef();
  const tileRefs=[useRef(),useRef(),useRef(),useRef()];
  const tiles=Array.isArray(hero.images)?hero.images:[null,null,null,null];
  const setTile=(i,files)=>{ const file=[...files].find(f=>f.type.startsWith("image/")); if(!file)return; const r=new FileReader(); r.onload=()=>window.compress(r.result,(c)=>{ const n=[0,1,2,3].map(x=>x===i?c:(tiles[x]||null)); fh("images",n); },1400); r.readAsDataURL(file); };
  const clearTile=(i)=>fh("images",[0,1,2,3].map(x=>x===i?null:(tiles[x]||null)));
  const products = CS.publishedProducts();
  const setHeroImg=(files)=>{ const file=[...files].find(f=>f.type.startsWith("image/")); if(!file)return; const r=new FileReader(); r.onload=()=>window.compress(r.result,(c)=>fh("image",c),1600); r.readAsDataURL(file); };
  const save=()=>{ CS.saveSite(s); ctoast("TOPページを更新しました"); };
  const toggleFeat=(id)=>setS(st=>({...st,featuredIds:(st.featuredIds||[]).includes(id)?st.featuredIds.filter(x=>x!==id):[...(st.featuredIds||[]),id]}));
  const showHome = s.showHomePage !== false;
  const setShowHome=(v)=>{ setS(st=>({...st,showHomePage:v})); CS.saveSite({showHomePage:v}); ctoast(v?"HOMEを表示します":"商品一覧(All)をTOPにしました"); };

  return (
    <div className="content">
      <div className="editor">
        <div className="ed-main">
          <div className="card">
            <h3>TOPページ表示 <em style={{fontWeight:400,color:"var(--a-muted)",fontSize:12}}>（"/" へのアクセス時の表示を切り替えます）</em></h3>
            <div className="homeswitch">
              <label className={"homeswitch__opt"+(showHome?" is-on":"")}>
                <input type="radio" name="showHome" checked={showHome} onChange={()=>setShowHome(true)} />
                <span className="homeswitch__dot" aria-hidden="true"></span>
                <span className="homeswitch__txt"><b>HOMEを表示する</b><em>Hero・ブランドコピー・カテゴリー紹介から始まる、これまでのTOPページ</em></span>
              </label>
              <label className={"homeswitch__opt"+(!showHome?" is-on":"")}>
                <input type="radio" name="showHome" checked={!showHome} onChange={()=>setShowHome(false)} />
                <span className="homeswitch__dot" aria-hidden="true"></span>
                <span className="homeswitch__txt"><b>商品一覧（All）をTOPにする</b><em>Heroやブランドコピーを表示せず、"/" で直接商品一覧を表示します。URLは変更されません</em></span>
              </label>
            </div>
          </div>

          <div className="card" style={{opacity:showHome?1:.45,pointerEvents:showHome?"auto":"none"}}>
            <h3>Heroセクション {!showHome && <em style={{fontWeight:400,color:"var(--a-muted)",fontSize:12}}>（現在非表示中）</em>}</h3>
            <label className="fld"><span>レイアウト</span>
              <div className="seg" style={{width:"fit-content"}}>
                {[["stack","中央（雑誌表紙風）"],["split","左右分割"],["editorial","全面ビジュアル"]].map(([v,l])=>(
                  <button key={v} className={hero.variant===v?"on":""} onClick={()=>fh("variant",v)}>{l}</button>
                ))}
              </div>
            </label>
            <label className="fld"><span>キャッチコピー <em>（改行で区切れます）</em></span><textarea className="ta" style={{minHeight:64,fontSize:16,fontWeight:600}} value={hero.copy||""} onChange={e=>fh("copy",e.target.value)} placeholder={"暮らしを整える\n小さな贅沢。"} /></label>
            <label className="fld"><span>キャッチコピーの文字サイズ <em>（{Number(hero.copySize)||70}px）</em></span>
              <input type="range" min="36" max="96" step="2" value={Number(hero.copySize)||70} onChange={e=>fh("copySize",Number(e.target.value))} style={{width:"100%",maxWidth:320}} />
            </label>
            <label className="fld"><span>サブコピー <em>（改行で複数行）</em></span><textarea className="ta" value={hero.sub||""} onChange={e=>fh("sub",e.target.value)} /></label>
            <label className="fld" style={{marginBottom:0}}><span>Hero画像 <em>（split / 全面レイアウトで表示）</em></span>
              <div className="img-cell" style={{aspectRatio:"16/9",margin:"4px 0 10px",cursor:"pointer"}} onClick={()=>heroRef.current.click()}>
                {hero.image ? <img src={hero.image} alt="" /> : <div style={{width:"100%",height:"100%",display:"grid",placeItems:"center",background:"var(--a-sink)",color:"var(--a-muted)",fontSize:13}}>クリックして画像を選択</div>}
              </div>
              <input ref={heroRef} type="file" accept="image/*" hidden onChange={e=>setHeroImg(e.target.files)} />
              {hero.image && <button className="b b--g b--sm" onClick={()=>fh("image",null)}>画像を削除</button>}
            </label>
            <div style={{marginTop:22}}>
              <span className="fld__lbl" style={{display:"block",fontSize:12.5,fontWeight:700,marginBottom:4}}>TOP画像（4枚・2×2の正方形）<em style={{fontWeight:400,color:"var(--a-muted)"}}>（中央レイアウトで表示）</em></span>
              <div className="hint" style={{marginBottom:10}}>クリックして各枠の画像を差し替えられます。ラベル文言は「サイトコンテンツ管理 → TOPページ」で変更できます。</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,maxWidth:360}}>
                {[0,1,2,3].map(i=>(
                  <div key={i}>
                    <div className="img-cell" style={{aspectRatio:"1/1",cursor:"pointer"}} onClick={()=>tileRefs[i].current.click()}>
                      {tiles[i] ? <img src={tiles[i]} alt="" /> : <div style={{width:"100%",height:"100%",display:"grid",placeItems:"center",background:"var(--a-sink)",color:"var(--a-muted)",fontSize:12}}>画像 {i+1}</div>}
                    </div>
                    <input ref={tileRefs[i]} type="file" accept="image/*" hidden onChange={e=>setTile(i,e.target.files)} />
                    {tiles[i] && <button className="b b--g b--sm b--block" style={{marginTop:6}} onClick={()=>clearTile(i)}>削除</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <TopTexts />

          <div className="card">
            <h3>おすすめ商品（特集ピックアップ）</h3>
            <div className="hint" style={{marginBottom:12}}>選んだ商品をTOPで強調表示できます。ランキングは各商品の「順位」で自動表示されます。</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,maxHeight:280,overflow:"auto"}}>
              {products.map(p=>(
                <label key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 8px",borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" className="chk" checked={(s.featuredIds||[]).includes(p.id)} onChange={()=>toggleFeat(p.id)} />
                  <CThumb p={p} className="tbl__thumb" />
                  <span style={{fontSize:12.5,fontWeight:600,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="ed-side">
          <div className="card">
            <h3>保存</h3>
            <button className="b b--p b--block" onClick={save}>TOPページを更新</button>
            <a className="b b--g b--block" style={{marginTop:10}} href={window.LB_SITE_URL||"index.html"} target="_blank" rel="noopener">サイトで確認 ↗</a>
            <button className="b b--g b--block" style={{marginTop:10}} onClick={()=>cgo("content")}>見出し・タイトルを編集 →</button>
          </div>
          <div className="card">
            <h3>テーマ</h3>
            <label className="fld"><span>トーン</span>
              <div className="seg" style={{width:"fit-content"}}>
                {[["light","アイボリー"],["dark","ダーク"]].map(([v,l])=><button key={v} className={s.theme===v?"on":""} onClick={()=>setS(st=>({...st,theme:v}))}>{l}</button>)}
              </div>
            </label>
            <label className="fld" style={{marginBottom:0}}><span>アクセントカラー</span>
              <div className="swatches">{["#6b4e34","#4d3722","#8a6a45","#a89c8a","#1a1a1a"].map(c=><button key={c} className={"sw"+(s.accent===c?" sw--on":"")} style={{background:c}} onClick={()=>setS(st=>({...st,accent:c}))}></button>)}</div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- SETTINGS ---------- */
function Settings({ onLogout }) {
  window.AdminCore.useStore();
  const site=CS.site();
  const [seo,setSeo]=useState(()=>({...site.seo}));
  const admin=CS.admins()[0]||{email:"",password:""};
  const [acc,setAcc]=useState({email:admin.email,password:""});
  const importRef=useRef();
  const logoRef=useRef();
  const [logo,setLogo]=useState(()=>({logo:site.logo||null,logoText:site.logoText||"",logoHeight:Number(site.logoHeight)||34}));
  const pickLogo=(files)=>{ const file=[...files].find(f=>f.type.startsWith("image/")); if(!file)return; const r=new FileReader(); r.onload=()=>window.compress(r.result,(c)=>setLogo(s=>({...s,logo:c})),800); r.readAsDataURL(file); };
  const saveLogo=()=>{ CS.saveSite({logo:logo.logo,logoText:logo.logoText,logoHeight:logo.logoHeight}); ctoast("ロゴを保存しました"); };

  const saveSeo=()=>{ CS.saveSite({seo}); ctoast("SEO設定を保存しました"); };
  const saveAcc=()=>{ if(!acc.email.trim()){ctoast("メールを入力してください");return;} CS.updateAdmin(acc.email, acc.password||admin.password); ctoast("アカウントを更新しました"); };
  const exportJSON=()=>{ const blob=new Blob([CS.exportJSON()],{type:"application/json"}); const u=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=u; a.download="lovable-cms-backup.json"; a.click(); URL.revokeObjectURL(u); };
  const importJSON=(files)=>{ const file=files[0]; if(!file)return; const r=new FileReader(); r.onload=()=>{ try{ CS.importJSON(r.result); ctoast("インポートしました"); }catch(e){ ctoast("読み込みに失敗しました"); } }; r.readAsText(file); };

  return (
    <div className="content" style={{maxWidth:720}}>
      <div className="card" style={{marginBottom:18}}>
        <h3>ロゴ</h3>
        <div className="hint" style={{marginBottom:14}}>ヘッダーとフッターに表示されるロゴです。画像を登録すると文字のロゴの代わりに使われます（背景透過のPNG / SVG推奨）。</div>
        <div className="img-cell" style={{aspectRatio:"auto",width:"100%",maxWidth:360,height:96,marginBottom:10,cursor:"pointer",display:"grid",placeItems:"center",padding:12}} onClick={()=>logoRef.current.click()}>
          {logo.logo ? <img src={logo.logo} alt="" style={{maxHeight:"100%",maxWidth:"100%",width:"auto",height:"auto",objectFit:"contain"}} /> : <span style={{color:"var(--a-muted)",fontSize:13}}>クリックしてロゴ画像を選択</span>}
        </div>
        <input ref={logoRef} type="file" accept="image/*" hidden onChange={e=>pickLogo(e.target.files)} />
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
          <button className="b b--g b--sm" onClick={()=>logoRef.current.click()}>画像をアップロード</button>
          {logo.logo && <button className="b b--g b--sm" onClick={()=>setLogo(s=>({...s,logo:null}))}>画像を削除（文字ロゴに戻す）</button>}
        </div>
        <div className="row2">
          <label className="fld"><span>ロゴの高さ <em>（{logo.logoHeight}px）</em></span>
            <input type="range" min="20" max="72" step="2" value={logo.logoHeight} onChange={e=>setLogo(s=>({...s,logoHeight:Number(e.target.value)}))} style={{width:"100%"}} /></label>
          <label className="fld"><span>文字ロゴ <em>（画像未登録のときに表示・空欄はLOVABLE）</em></span>
            <input className="in" value={logo.logoText} onChange={e=>setLogo(s=>({...s,logoText:e.target.value}))} placeholder="LOVABLE" /></label>
        </div>
        <button className="b b--p" onClick={saveLogo}>ロゴを保存</button>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <h3>サイト全体のSEO</h3>
        <label className="fld"><span>サイトタイトル</span><input className="in" value={seo.title||""} onChange={e=>setSeo(s=>({...s,title:e.target.value}))} /></label>
        <label className="fld"><span>メタディスクリプション</span><textarea className="ta" value={seo.desc||""} onChange={e=>setSeo(s=>({...s,desc:e.target.value}))} /></label>
        <label className="fld"><span>OGP画像URL</span><input className="in" value={seo.ogimg||""} onChange={e=>setSeo(s=>({...s,ogimg:e.target.value}))} placeholder="https://…" /></label>
        <button className="b b--p" onClick={saveSeo}>SEO設定を保存</button>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <h3>管理者アカウント</h3>
        <div className="row2">
          <label className="fld"><span>メールアドレス</span><input className="in" value={acc.email} onChange={e=>setAcc(s=>({...s,email:e.target.value}))} /></label>
          <label className="fld"><span>新しいパスワード <em>（変更時のみ）</em></span><input className="in" type="password" value={acc.password} onChange={e=>setAcc(s=>({...s,password:e.target.value}))} placeholder="••••••" /></label>
        </div>
        <button className="b b--p" onClick={saveAcc}>アカウントを更新</button>
      </div>

      <div className="card" style={{marginBottom:18}}>
        <h3>データのバックアップ</h3>
        <div className="hint" style={{marginBottom:14}}>商品・記事・設定をまとめてJSONで書き出し／読み込みできます。本番（Supabase）移行時のデータ移送にも使えます。</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="b b--g" onClick={exportJSON}>{React.cloneElement(CI.up,CF)} エクスポート</button>
          <button className="b b--g" onClick={()=>importRef.current.click()}>インポート</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={e=>importJSON(e.target.files)} />
          <button className="b b--d" onClick={()=>{
            if(!confirm("⚠️ 初期データに戻します。\n\n削除した商品・追加した商品・カテゴリ/ナビゲーションの変更・記事など、すべてのCMSデータが失われ、サンプルデータの状態に戻ります。この操作は取り消せません。\n\n本当に実行しますか？")) return;
            if(prompt("よろしければ「RESET」と入力してください（誤操作防止）") !== "RESET") { ctoast("キャンセルしました"); return; }
            CS.resetToSeed(); ctoast("初期データに戻しました");
          }}>⚠️ 初期データに戻す（すべて削除）</button>
        </div>
        <div className="hint" style={{marginTop:10}}>この操作でしか商品・カテゴリ・削除履歴は失われません。通常の商品削除やCMS編集でデータが自動的に失われることはありません。</div>
      </div>

      <div className="card">
        <h3>Next.js / Supabase 本番化について</h3>
        <div className="hint">この管理画面は本番スキーマ（products / articles / categories / site / admins）をそのまま再現しています。各保存操作はSupabaseのテーブル更新に1:1で対応します。「エクスポート」したJSONを初期データとして投入すれば、そのまま移行できます。</div>
      </div>
    </div>
  );
}

Object.assign(window, { ArticleList, ArticleEditor, TopManager, Settings, md });
