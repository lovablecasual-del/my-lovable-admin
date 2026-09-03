/* ============================================================
   LOVABLE — Site Content Registry
   ------------------------------------------------------------
   The single catalog of every editable site-wide text string.
   Each entry is DB-shaped (mirrors a future `site_content` table):
     key         "home.hero.ctaRanking"  — dot-path, i18n-ready
                 (adding a locale later = new rows with the same
                 key + locale:"en"/"ko"; no code changes needed)
     page        which admin/section group it's shown under
     label       human label shown in the CMS editor
     type        "text" | "textarea"  (controls the input widget)
     default     the value used until an operator overrides it
                 (this is what ships today — nothing changes
                 visually until someone edits it in the CMS)
   Components never hardcode copy — they call T("some.key"),
   which resolves: draft (preview mode) → published override →
   this default. See store.js for the resolution + persistence.
   ============================================================ */
(function () {
  const REGISTRY = [
    // ---- header ----
    { key: "header.subtitle", page: "header", label: "ロゴ下のサブタイトル", type: "text", default: "Edit your everyday" },
    { key: "header.searchPlaceholder", page: "header", label: "検索プレースホルダー", type: "text", default: "探す — コスメ、バッグ、韓国…" },
    { key: "header.searchAriaLabel", page: "header", label: "検索ボタン（読み上げ用ラベル）", type: "text", default: "検索" },
    { key: "header.searchClose", page: "header", label: "検索：閉じるボタン", type: "text", default: "閉じる ✕" },
    { key: "header.searchHint", page: "header", label: "検索：人気キーワード見出し", type: "text", default: "人気のキーワード" },
    { key: "header.favBadgeAria", page: "header", label: "お気に入りボタン（読み上げ用ラベル）", type: "text", default: "お気に入り" },

    // ---- TOP page (hero copy itself is managed in TOPページ管理 already) ----
    { key: "top.hero.eyebrow.stack", page: "top", label: "Hero（中央）上部ラベル", type: "text", default: "Quiet Luxury Lifestyle Select" },
    { key: "top.hero.eyebrow.split", page: "top", label: "Hero（左右分割）上部ラベル", type: "text", default: "Lifestyle Select · Quiet Luxury" },
    { key: "top.hero.eyebrow.editorial", page: "top", label: "Hero（全面）上部ラベル", type: "text", default: "Issue 01 — Edit your everyday" },
    { key: "top.hero.tile1", page: "top", label: "Hero画像1：ラベル", type: "text", default: "Beauty" },
    { key: "top.hero.tile2", page: "top", label: "Hero画像2：ラベル", type: "text", default: "Fashion" },
    { key: "top.hero.tile3", page: "top", label: "Hero画像3：ラベル", type: "text", default: "Lifestyle" },
    { key: "top.hero.tile4", page: "top", label: "Hero画像4：ラベル", type: "text", default: "Travel" },
    { key: "top.hero.ctaRanking", page: "top", label: "Heroボタン：ランキングを見る", type: "text", default: "人気ランキングを見る" },
    { key: "top.hero.ctaBeauty", page: "top", label: "Heroボタン：Beautyから探す", type: "text", default: "Beautyから探す" },
    { key: "top.hero.ctaEditorial", page: "top", label: "Heroボタン：特集を読む", type: "text", default: "特集を読む →" },
    { key: "top.categories.eyebrow", page: "top", label: "カテゴリー見出し上部ラベル", type: "text", default: "Browse by mood" },
    { key: "top.categories.title", page: "top", label: "カテゴリー見出し", type: "text", default: "人気のカテゴリー" },
    { key: "top.categories.more", page: "top", label: "カテゴリー：もっと見るリンク", type: "text", default: "すべて見る" },
    { key: "top.ranking.eyebrow", page: "top", label: "ランキング見出し上部ラベル", type: "text", default: "Most saved this week" },
    { key: "top.ranking.title", page: "top", label: "ランキング見出し", type: "text", default: "おすすめランキング" },
    { key: "top.ranking.more", page: "top", label: "ランキング：もっと見るリンク", type: "text", default: "ランキングをもっと" },
    { key: "top.ranking.cta", page: "top", label: "ランキング1位カード：CTAボタン", type: "text", default: "詳しく見る" },
    { key: "top.new.eyebrow", page: "top", label: "新着見出し上部ラベル", type: "text", default: "Just in" },
    { key: "top.new.title", page: "top", label: "新着見出し", type: "text", default: "最近買ってよかったもの" },
    { key: "top.new.more", page: "top", label: "新着：もっと見るリンク", type: "text", default: "新着をすべて" },
    { key: "top.features.eyebrow", page: "top", label: "特集見出し上部ラベル", type: "text", default: "The Journal" },
    { key: "top.features.title", page: "top", label: "特集見出し", type: "text", default: "本音と感想文" },
    { key: "top.features.more", page: "top", label: "特集：記事一覧リンク", type: "text", default: "記事一覧" },
    { key: "top.quote", page: "top", label: "編集部からの一言（帯）― 改行で区切れます", type: "textarea", default: "買ってよかったものを少しずつ。" },
    { key: "top.quote.eyebrow", page: "top", label: "編集部の一言：上部ラベル", type: "text", default: "Our promise" },

    // ---- catalog (shared by category / all pages) ----
    { key: "catalog.sortLabel", page: "catalog", label: "並び替え：ラベル", type: "text", default: "並び替え" },
    { key: "catalog.sort.pop", page: "catalog", label: "並び替え：人気順", type: "text", default: "人気順" },
    { key: "catalog.sort.new", page: "catalog", label: "並び替え：新着順", type: "text", default: "新着順" },
    { key: "catalog.sort.low", page: "catalog", label: "並び替え：価格が安い", type: "text", default: "価格が安い" },
    { key: "catalog.sort.high", page: "catalog", label: "並び替え：価格が高い", type: "text", default: "価格が高い" },
    { key: "catalog.sort.rate", page: "catalog", label: "並び替え：評価が高い", type: "text", default: "評価が高い" },
    { key: "catalog.filterAll", page: "catalog", label: "絞り込み：すべて", type: "text", default: "すべて" },
    { key: "catalog.itemCountSuffix", page: "catalog", label: "件数表示：末尾テキスト", type: "text", default: "件のアイテム" },
    { key: "catalog.emptyMessage", page: "catalog", label: "該当0件メッセージ", type: "text", default: "該当するアイテムがありません。" },
    { key: "catalog.categoryEyebrow", page: "catalog", label: "カテゴリーページ：上部ラベル", type: "text", default: "Category" },
    { key: "catalog.breadcrumbHome", page: "catalog", label: "パンくず：ホーム表記", type: "text", default: "Home" },

    // ---- All items page ----
    { key: "all.eyebrowPrefix", page: "all", label: "上部ラベル（件数の前）", type: "text", default: "All items" },
    { key: "all.title", page: "all", label: "一覧タイトル", type: "text", default: "すべてのアイテム" },
    { key: "all.sub", page: "all", label: "一覧説明文", type: "textarea", default: "ジャンルを横断して、いま並んでいるものを一覧で。気になった順に、各ストアへ。" },

    // ---- Saved (favorites) page ----
    { key: "saved.eyebrow", page: "saved", label: "上部ラベル", type: "text", default: "Your closet" },
    { key: "saved.title", page: "saved", label: "タイトル", type: "text", default: "保存したお気に入り" },
    { key: "saved.sub", page: "saved", label: "説明文", type: "textarea", default: "気になったものを、あなただけのクローゼットに。" },
    { key: "saved.emptyTitle", page: "saved", label: "空の状態：見出し画像ラベル", type: "text", default: "まだ空っぽです" },
    { key: "saved.emptyBody", page: "saved", label: "空の状態：本文", type: "textarea", default: "気になるアイテムの♥を押すと、ここに集まります。" },
    { key: "saved.emptyCta", page: "saved", label: "空の状態：ボタン", type: "text", default: "アイテムを探す" },

    // ---- Product detail page ----
    { key: "pdp.notFound", page: "pdp", label: "商品が見つからない場合のメッセージ", type: "text", default: "商品が見つかりませんでした。" },
    { key: "pdp.buyboxLabel", page: "pdp", label: "購入ボックス見出し", type: "text", default: "お得なストアで見る" },
    { key: "pdp.affNote", page: "pdp", label: "アフィリエイト注意書き", type: "textarea", default: "※ 各ボタンからアフィリエイトリンクで各ストアへ遷移します。価格・在庫は遷移先をご確認ください。" },
    { key: "pdp.shopBtnCta", page: "pdp", label: "ショップボタン：通常テキスト", type: "text", default: "見る" },
    { key: "pdp.shopBtnFeatCta", page: "pdp", label: "ショップボタン：おすすめ枠テキスト", type: "text", default: "最安・話題はこちら" },
    { key: "pdp.shopBtnUnset", page: "pdp", label: "ショップボタン：未設定テキスト", type: "text", default: "リンク未設定" },
    { key: "pdp.recoForLabel", page: "pdp", label: "「こんな人におすすめ」見出し", type: "text", default: "こんな人におすすめ" },
    { key: "pdp.shareLabel", page: "pdp", label: "シェア見出し", type: "text", default: "この一品をシェア" },
    { key: "pdp.shareCopy", page: "pdp", label: "シェア：リンクをコピー", type: "text", default: "リンクをコピー" },
    { key: "pdp.shareCopied", page: "pdp", label: "シェア：コピー完了表示", type: "text", default: "コピーしました ✓" },
    { key: "pdp.pointsEyebrow", page: "pdp", label: "おすすめポイント：上部ラベル", type: "text", default: "Why we love it" },
    { key: "pdp.pointsTitle", page: "pdp", label: "おすすめポイント：見出し", type: "text", default: "いっくんのおすすめポイント" },
    { key: "pdp.specEyebrow", page: "pdp", label: "商品詳細：上部ラベル", type: "text", default: "Item detail" },
    { key: "pdp.specTitle", page: "pdp", label: "商品詳細：見出し", type: "text", default: "商品詳細・サイズ" },
    { key: "pdp.compareEyebrow", page: "pdp", label: "ストア比較：上部ラベル", type: "text", default: "Where to buy" },
    { key: "pdp.compareTitle", page: "pdp", label: "ストア比較：見出し", type: "text", default: "ストア比較表" },
    { key: "pdp.reviewsEyebrow", page: "pdp", label: "レビュー：上部ラベル", type: "text", default: "Real voices" },
    { key: "pdp.reviewsTitle", page: "pdp", label: "レビュー：見出し", type: "text", default: "いっくんの使用レビュー・口コミ" },
    { key: "pdp.relatedEyebrow", page: "pdp", label: "関連商品：上部ラベル", type: "text", default: "You may also like" },
    { key: "pdp.relatedTitle", page: "pdp", label: "関連商品：見出し", type: "text", default: "関連アイテム" },
    { key: "pdp.stickyCta", page: "pdp", label: "追従バー：購入ボタン", type: "text", default: "ストアを見る" },

    // ---- Footer ----
    { key: "footer.brandBlurb", page: "footer", label: "フッター：ブランド説明文", type: "textarea", default: "「このサイトを見ればセンスの良いものが見つかる」。雑誌のように眺めて、気になったものはそのまま各ストアへ。" },
    { key: "footer.colShop", page: "footer", label: "フッター列見出し：Shop", type: "text", default: "Shop" },
    { key: "footer.colRead", page: "footer", label: "フッター列見出し：Read", type: "text", default: "Read" },
    { key: "footer.colAbout", page: "footer", label: "フッター列見出し：About", type: "text", default: "About" },
    { key: "footer.copyright", page: "footer", label: "コピーライト表記", type: "text", default: "© 2026 LOVABLE — Edit your everyday." },
    { key: "footer.adminLinkLabel", page: "footer", label: "管理画面リンク文言", type: "text", default: "管理画面" },
    { key: "footer.disclaimer", page: "footer", label: "アフィリエイト開示文", type: "textarea", default: "本サイトはアフィリエイトプログラムを利用しています。リンクから各ストア（TikTok Shop・Amazon・楽天市場・Qoo10）へ遷移します。価格・在庫は遷移先をご確認ください。" },

    // ---- Common buttons (reused across pages) ----
    { key: "buttons.back", page: "buttons", label: "共通ボタン：戻る", type: "text", default: "戻る" },
    { key: "buttons.save", page: "buttons", label: "共通ボタン：保存", type: "text", default: "保存" },
    { key: "buttons.delete", page: "buttons", label: "共通ボタン：削除", type: "text", default: "削除" },
    { key: "buttons.update", page: "buttons", label: "共通ボタン：更新", type: "text", default: "更新" },
    { key: "buttons.add", page: "buttons", label: "共通ボタン：追加", type: "text", default: "追加" },
    { key: "buttons.viewMore", page: "buttons", label: "共通ボタン：もっと見る", type: "text", default: "もっと見る" },
    { key: "buttons.viewDetail", page: "buttons", label: "共通ボタン：詳しく見る", type: "text", default: "詳しく見る" },

    // ---- Error state ----
    { key: "error.title", page: "system", label: "エラー画面：見出し", type: "text", default: "このページを表示できませんでした" },
    { key: "error.body", page: "system", label: "エラー画面：本文", type: "text", default: "他のページは通常どおりご利用いただけます。" },
    { key: "error.cta", page: "system", label: "エラー画面：ボタン", type: "text", default: "トップに戻る" },

    // ---- SEO (per page-type; product/category pages use their own title as {{name}}) ----
    { key: "seo.top.title", page: "seo", label: "TOP：タイトルタグ", type: "text", default: "LOVABLE — 暮らしを整える小さな贅沢。" },
    { key: "seo.top.desc", page: "seo", label: "TOP：メタディスクリプション", type: "textarea", default: "20〜30代のためのQuiet Luxuryなライフスタイルセレクト。コスメ・スキンケア・美容家電・ファッション・韓国アイテムを各ストアへ。" },
    { key: "seo.all.title", page: "seo", label: "すべてのアイテム：タイトルタグ", type: "text", default: "すべてのアイテム｜LOVABLE" },
    { key: "seo.all.desc", page: "seo", label: "すべてのアイテム：メタディスクリプション", type: "textarea", default: "ジャンルを横断して、いま並んでいるものを一覧で。気になった順に、各ストアへ。" },
    { key: "seo.category.titleSuffix", page: "seo", label: "カテゴリー：タイトル末尾（カテゴリー名の後に付く）", type: "text", default: "｜LOVABLE" },
    { key: "seo.product.titleSuffix", page: "seo", label: "商品詳細：タイトル末尾（商品名の後に付く）", type: "text", default: "｜LOVABLE" },
    { key: "seo.saved.title", page: "seo", label: "お気に入り：タイトルタグ", type: "text", default: "保存したお気に入り｜LOVABLE" },
  ];

  const PAGE_LABELS = {
    header: "ヘッダー", top: "TOPページ", catalog: "商品一覧（共通）", all: "すべてのアイテム",
    saved: "お気に入り", pdp: "商品詳細", footer: "フッター",
    buttons: "共通ボタン", system: "システムメッセージ", seo: "SEO（ページ別）",
  };

  const byKey = {};
  REGISTRY.forEach(e => { byKey[e.key] = e; });

  window.LBContentRegistry = { REGISTRY, byKey, PAGE_LABELS, get: (k) => byKey[k] || null };
})();
