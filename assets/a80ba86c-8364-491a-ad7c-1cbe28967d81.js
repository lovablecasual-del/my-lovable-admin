/* ============================================================
   LOVABLE — CategoryMapper
   カテゴリ判定を一箇所に集約。推測ではなく「取得可能な公式データを
   最優先し、不足時のみ補助判定」する多段設計。
   新ECは Mapper を1つ足して registry に登録するだけ（既存無修正）。

   判定優先順位（全ECで共通）:
     1. 公式カテゴリID（楽天ジャンルID / Amazonノード 等）
     2. パンくず / ROOMカテゴリ / 公式カテゴリ名
     3. 公式ジャンル名
     4. 商品属性（ブランド・ショップ・シリーズ・タグ）
     5. タイトル・説明による補助判定（最終手段のみ）
   ============================================================ */
(function () {
  /* ---- 共通カテゴリ（サービス横断の統一分類） ---- */
  const COMMON = [
    "Fashion", "Beauty", "Shoes", "Bag", "Accessory", "Home", "Interior",
    "Kitchen", "Electronics", "PC", "Smartphone", "Food", "Drink", "Baby",
    "Kids", "Pet", "Sports", "Outdoor", "Health", "Book", "Toy", "Hobby",
    "Travel", "Daily Goods", "Other",
  ];

  /* ---- 共通カテゴリ → サイトの4カテゴリ {cat, sub} へのマッピング ---- */
  const SITE = {
    Fashion:      { cat: "fashion",   sub: "トップス" },
    Shoes:        { cat: "fashion",   sub: "ボトムス" },
    Bag:          { cat: "fashion",   sub: "バッグ" },
    Accessory:    { cat: "fashion",   sub: "アクセサリー" },
    Beauty:       { cat: "beauty",    sub: "コスメ" },
    Health:       { cat: "beauty",    sub: "スキンケア" },
    Home:         { cat: "lifestyle", sub: "日用品" },
    Interior:     { cat: "lifestyle", sub: "インテリア" },
    Kitchen:      { cat: "lifestyle", sub: "キッチン用品" },
    Electronics:  { cat: "lifestyle", sub: "ガジェット" },
    PC:           { cat: "lifestyle", sub: "ガジェット" },
    Smartphone:   { cat: "lifestyle", sub: "ガジェット" },
    "Daily Goods":{ cat: "lifestyle", sub: "日用品" },
    Food:         { cat: "lifestyle", sub: "日用品" },
    Drink:        { cat: "lifestyle", sub: "日用品" },
    Pet:          { cat: "lifestyle", sub: "日用品" },
    Baby:         { cat: "lifestyle", sub: "日用品" },
    Kids:         { cat: "lifestyle", sub: "日用品" },
    Toy:          { cat: "lifestyle", sub: "日用品" },
    Hobby:        { cat: "lifestyle", sub: "日用品" },
    Book:         { cat: "lifestyle", sub: "日用品" },
    Sports:       { cat: "lifestyle", sub: "ガジェット" },
    Outdoor:      { cat: "travel",    sub: "旅行グッズ" },
    Travel:       { cat: "travel",    sub: "旅行グッズ" },
    Other:        { cat: "lifestyle", sub: "日用品" },
  };

  /* サブカテゴリの更に細かい上書き（美容家電・ヘアケア等はキーワードで精緻化） */
  function refineSub(common, text) {
    const t = (text || "").toLowerCase();
    if (common === "Beauty" || common === "Health") {
      if (/(ドライヤー|美顔器|ヘアアイロン|脱毛|スチーマー|電動|美容家電|dyson|ヘアドライ)/i.test(text)) return { cat: "beauty", sub: "美容家電" };
      if (/(シャンプー|トリートメント|ヘアオイル|ヘアミルク|ヘアケア|コンディショナ)/i.test(text)) return { cat: "beauty", sub: "ヘアケア" };
      if (/(化粧水|美容液|乳液|クリーム|日焼け|スキンケア|洗顔|クレンジング|パック|セラム|下地)/i.test(text)) return { cat: "beauty", sub: "スキンケア" };
      if (/(リップ|チーク|ファンデ|アイシャドウ|マスカラ|コスメ|口紅|コンシーラ|メイク)/i.test(text)) return { cat: "beauty", sub: "コスメ" };
    }
    if (common === "Fashion") {
      if (/(ワンピース|ドレス|オールインワン|サロペット)/.test(text)) return { cat: "fashion", sub: "ワンピース" };
      if (/(パンツ|デニム|スカート|ボトム|ジーンズ|レギンス|ショーツ)/i.test(text)) return { cat: "fashion", sub: "ボトムス" };
      if (/(バッグ|トート|ショルダー|リュック|ポーチ|財布|カバン)/.test(text)) return { cat: "fashion", sub: "バッグ" };
      if (/(ネックレス|ピアス|イヤリング|リング|ブレス|アクセ|時計|指輪)/.test(text)) return { cat: "fashion", sub: "アクセサリー" };
      if (/(ブラウス|シャツ|ニット|トップス|カットソー|Tシャツ|セーター|カーデ|パーカー)/i.test(text)) return { cat: "fashion", sub: "トップス" };
    }
    if (common === "Travel" || common === "Outdoor") {
      if (/(スーツケース|キャリー|旅行|トラベル|パッキング|機内)/.test(text)) return { cat: "travel", sub: "旅行グッズ" };
      if (/(韓国|明洞|ソウル)/.test(text)) return { cat: "travel", sub: "韓国購入品" };
    }
    return SITE[common] || SITE.Other;
  }

  /* ---- 楽天ジャンルID（先頭一致）→ 共通カテゴリ ---- */
  const RAKUTEN_GENRE = [
    ["100939", "Beauty"], ["216131", "Bag"], ["558885", "Shoes"], ["216130", "Accessory"],
    ["216129", "Accessory"], ["100371", "Fashion"], ["551177", "Fashion"], ["100533", "Fashion"],
    ["100804", "Health"], ["551167", "Health"], ["100938", "Food"], ["100316", "Food"],
    ["100227", "Drink"], ["510901", "Drink"], ["510915", "Drink"], ["215783", "Electronics"],
    ["211742", "Electronics"], ["100026", "PC"], ["564500", "Smartphone"], ["215776", "Interior"],
    ["200162", "Kitchen"], ["558944", "Daily Goods"], ["215793", "Daily Goods"], ["101070", "Hobby"],
    ["101164", "Toy"], ["101240", "Pet"], ["101205", "Book"], ["562637", "Sports"],
    ["101070", "Hobby"], ["566379", "Baby"], ["100533", "Fashion"],
  ];

  /* ---- 補助判定：キーワード加重（最終手段） ---- */
  const KW = {
    Beauty: /(コスメ|化粧|美容|スキンケア|ヘアケア|シャンプー|トリートメント|ヘアオイル|美容液|化粧水|乳液|日焼け|ファンデ|リップ|チーク|マスカラ|美顔|ドライヤー|香水|ネイル|パック|クレンジング|洗顔|dyson|snidel\s*beauty)/i,
    Fashion: /(ブラウス|シャツ|ニット|トップス|パンツ|デニム|スカート|ワンピース|コート|ジャケット|カーデ|セーター|服|ウェア|levi|デニム|ボトム|カットソー)/i,
    Bag: /(バッグ|トート|ショルダー|リュック|財布|ポーチ|カバン|clutch|handbag)/i,
    Shoes: /(スニーカー|パンプス|ブーツ|サンダル|ローファー|靴|シューズ|ヒール)/i,
    Accessory: /(ネックレス|ピアス|イヤリング|リング|指輪|ブレスレット|アクセサリー|腕時計|ジュエリー)/i,
    Kitchen: /(キッチン|調理|フライパン|鍋|包丁|食器|タンブラー|マグ|カトラリー|保存容器)/i,
    Interior: /(インテリア|ソファ|チェア|テーブル|収納|ラグ|カーテン|照明|ディフューザー|花瓶|クッション|寝具|布団|枕)/i,
    Electronics: /(家電|イヤホン|スピーカー|加湿器|空気清浄|扇風機|掃除機|体組成計|カメラ|テレビ|充電|ガジェット|プロジェクタ)/i,
    PC: /(パソコン|ノートpc|キーボード|マウス|モニター|ssd|usbハブ)/i,
    Smartphone: /(スマホ|iphone|android|スマートフォン|ケース|フィルム|モバイルバッテリー)/i,
    Food: /(食品|お菓子|スイーツ|チョコ|クッキー|コーヒー豆|お茶|グルメ|米|調味料)/i,
    Drink: /(ドリンク|ジュース|水|炭酸|ワイン|ビール|日本酒|コーヒー(?!豆))/i,
    Health: /(サプリ|健康|ビタミン|プロテイン|マスク|体温計|市販薬|漢方|ダイエット)/i,
    Pet: /(ペット|犬|猫|ドッグ|キャット|トリーツ)/i,
    Baby: /(ベビー|赤ちゃん|おむつ|授乳|離乳)/i,
    Kids: /(キッズ|子供|こども|入園|入学)/i,
    Toy: /(おもちゃ|トイ|ぬいぐるみ|フィギュア|ブロック)/i,
    Book: /(本|書籍|雑誌|コミック|文庫|写真集)/i,
    Sports: /(スポーツ|ヨガ|ランニング|トレーニング|フィットネス|筋トレ)/i,
    Outdoor: /(アウトドア|キャンプ|登山|テント|ランタン)/i,
    Travel: /(旅行|トラベル|スーツケース|キャリー|機内|パッキング|韓国購入|ホテル)/i,
    "Daily Goods": /(日用品|文房具|文具|洗剤|ティッシュ|収納|掃除|タオル|ハンガー|消耗品)/i,
  };

  function keywordAssist(text) {
    const t = text || "";
    let best = null, bestScore = 0;
    for (const [common, re] of Object.entries(KW)) {
      const matches = (t.match(new RegExp(re, "gi")) || []).length;
      if (matches > bestScore) { best = common; bestScore = matches; }
    }
    return best ? { common: best, score: bestScore } : null;
  }

  /* ---- Base mapper：全ECで共有する判定パイプライン ---- */
  class CategoryMapper {
    constructor(shop) { this.shop = shop; }
    // サブクラスが公式データ→共通カテゴリを返す（無ければ null）
    fromOfficial(_sig) { return null; }
    fromAttributes(sig) {
      const t = [sig.brand, sig.shopName, sig.series, (sig.tags || []).join(" ")].filter(Boolean).join(" ");
      return keywordAssist(t);
    }
    classify(sig) {
      const text = [sig.title, sig.desc, (sig.tags || []).join(" ")].filter(Boolean).join(" ");
      const log = { shop: this.shop, signals: {} };
      let common = null, source = "", confidence = "low";

      // 1–3: 公式データ（ID / パンくず / カテゴリ名 / ジャンル名）
      const off = this.fromOfficial(sig);
      if (off) { common = off.common; source = off.source; confidence = "high";
        log.signals.official = off; }

      // 4: 属性（ブランド・ショップ・シリーズ・タグ）
      if (!common) {
        const attr = this.fromAttributes(sig);
        if (attr && attr.score >= 1) { common = attr.common; source = "attributes"; confidence = "medium";
          log.signals.attributes = attr; }
      }

      // 5: タイトル・説明の補助判定（最終手段）
      if (!common) {
        const kw = keywordAssist(text);
        if (kw) { common = kw.common; source = "keyword-assist"; confidence = kw.score >= 2 ? "medium" : "low";
          log.signals.keyword = kw; }
      }

      if (!common) { common = "Other"; source = "fallback"; confidence = "low"; }

      const site = refineSub(common, text);
      const result = {
        common,
        cat: site.cat, sub: site.sub,
        originalCategory: sig.officialName || sig.breadcrumb?.join(" > ") || "",
        originalCategoryId: sig.genreId || sig.categoryId || "",
        shopCategory: sig.roomCategory || sig.breadcrumb?.slice(-1)[0] || "",
        source, confidence,
        mappedAt: new Date().toISOString(),
      };
      log.result = result;
      return { ...result, _log: log };
    }
  }

  /* ---- 楽天 / ROOM ---- */
  class RakutenCategoryMapper extends CategoryMapper {
    constructor() { super("rakuten"); }
    fromOfficial(sig) {
      if (sig.genreId) {
        const hit = RAKUTEN_GENRE.find(([id]) => String(sig.genreId).startsWith(id));
        if (hit) return { common: hit[1], source: "rakuten-genreId" };
      }
      if (sig.breadcrumb && sig.breadcrumb.length) {
        const kw = keywordAssist(sig.breadcrumb.join(" "));
        if (kw && kw.score >= 1) return { common: kw.common, source: "rakuten-breadcrumb" };
      }
      if (sig.roomCategory) {
        const kw = keywordAssist(sig.roomCategory);
        if (kw) return { common: kw.common, source: "room-category" };
      }
      if (sig.genreName) {
        const kw = keywordAssist(sig.genreName);
        if (kw) return { common: kw.common, source: "rakuten-genreName" };
      }
      return null;
    }
  }

  /* ---- Amazon ---- */
  class AmazonCategoryMapper extends CategoryMapper {
    constructor() { super("amazon"); }
    fromOfficial(sig) {
      if (sig.breadcrumb && sig.breadcrumb.length) {
        const kw = keywordAssist(sig.breadcrumb.join(" "));
        if (kw && kw.score >= 1) return { common: kw.common, source: "amazon-breadcrumb" };
      }
      if (sig.officialName) {
        const kw = keywordAssist(sig.officialName);
        if (kw) return { common: kw.common, source: "amazon-department" };
      }
      return null;
    }
  }

  /* ---- Qoo10 ---- */
  class Qoo10CategoryMapper extends CategoryMapper {
    constructor() { super("qoo10"); }
    fromOfficial(sig) {
      if (sig.breadcrumb && sig.breadcrumb.length) {
        const kw = keywordAssist(sig.breadcrumb.join(" "));
        if (kw && kw.score >= 1) return { common: kw.common, source: "qoo10-breadcrumb" };
      }
      return null;
    }
  }

  /* ---- TikTok Shop ---- */
  class TikTokShopCategoryMapper extends CategoryMapper {
    constructor() { super("tiktok"); }
    fromOfficial(sig) {
      if (sig.officialName) {
        const kw = keywordAssist(sig.officialName);
        if (kw) return { common: kw.common, source: "tiktok-category" };
      }
      return null;
    }
  }

  /* ---- registry：新EC追加はここに1行 ---- */
  const REGISTRY = {
    rakuten: new RakutenCategoryMapper(),
    amazon: new AmazonCategoryMapper(),
    qoo10: new Qoo10CategoryMapper(),
    tiktok: new TikTokShopCategoryMapper(),
  };
  const generic = new CategoryMapper("generic");

  /* 公開API：shop と各シグナルを渡すと最終カテゴリ＋根拠を返す（例外を投げない） */
  function classifyCategory(shop, signals) {
    try {
      const mapper = REGISTRY[shop] || generic;
      const out = mapper.classify(signals || {});
      try {
        console.log("[LB category] 判定ログ", {
          取得元: shop || "(不明)",
          取得カテゴリ: out.originalCategory || "(なし)",
          カテゴリID: out.originalCategoryId || "(なし)",
          ショップカテゴリ: out.shopCategory || "(なし)",
          判定根拠: out.source,
          確度: out.confidence,
          共通カテゴリ: out.common,
          最終カテゴリ: out.cat + " / " + out.sub,
          使用データ: out._log.signals,
        });
      } catch (e) {}
      return out;
    } catch (e) {
      return { common: "Other", cat: "lifestyle", sub: "日用品", source: "error",
        confidence: "low", originalCategory: "", originalCategoryId: "", shopCategory: "",
        mappedAt: new Date().toISOString(), _log: { error: String(e) } };
    }
  }

  window.LBCategory = { classifyCategory, COMMON, SITE, RakutenCategoryMapper, AmazonCategoryMapper, Qoo10CategoryMapper, TikTokShopCategoryMapper, CategoryMapper };
})();
