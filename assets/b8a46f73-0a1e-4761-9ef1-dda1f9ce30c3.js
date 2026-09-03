/* ============================================================
   LOVABLE — Product Badge System
   汎用「商品バッジ」機能。1商品に複数バッジを付与できる。
   新しいバッジの追加は BADGES に1エントリ足すだけ（既存コード無修正）。
   ============================================================ */
(function () {
  /* 各バッジ：key・ラベル・アイコン(絵文字)・トーン(配色バリアント)・説明 */
  const BADGES = [
    { key: "repeat",    label: "リピート買い", icon: "💞", tone: "rose", desc: "何度もリピートしているお気に入り" },
    { key: "favorite",  label: "愛用品",       icon: "💖", tone: "rose",  desc: "日常的に使っている定番" },
    { key: "bestseller",label: "ベストセラー", icon: "🏆", tone: "gold",  desc: "よく売れている人気商品" },
    { key: "popular",   label: "人気商品",     icon: "🔥", tone: "gold",  desc: "注目を集めている商品" },
    { key: "new",       label: "新着",         icon: "✨", tone: "sky",   desc: "最近追加した商品" },
    { key: "limited",   label: "限定商品",     icon: "⏳", tone: "plum",  desc: "数量・期間限定" },
    { key: "editors",   label: "編集部おすすめ", icon: "📝", tone: "ink", desc: "編集部が選んだ一品" },
    { key: "gift",      label: "ギフトにおすすめ", icon: "🎁", tone: "plum", desc: "贈り物に最適" },
    { key: "value",     label: "コスパ抜群",   icon: "💎", tone: "sky",   desc: "価格以上の満足感" },
    { key: "beginner",  label: "初心者向け",   icon: "🌱", tone: "sage",  desc: "はじめての一つに" },
    { key: "trending",  label: "SNSで話題",    icon: "📱", tone: "plum",  desc: "SNSで注目されている" },
    { key: "lowstock",  label: "売り切れ間近", icon: "⚡", tone: "warn",  desc: "在庫が少なくなっています" },
  ];

  const byKey = {};
  BADGES.forEach((b) => { byKey[b.key] = b; });

  function get(key) { return byKey[key] || null; }
  function all() { return BADGES.slice(); }

  /* 商品オブジェクトから有効なバッジ配列を導出（後方互換込み）。
     - p.badges: string[]（正式・複数対応）
     - p.repeatPurchase: boolean（今回の要望のショートカット → repeat を含める）
     - p.badge: 旧・自由文字列（既存データ）→ ラベル一致すれば対応キーに変換 */
  function resolve(p) {
    if (!p || typeof p !== "object") return [];
    const keys = [];
    if (Array.isArray(p.badges)) p.badges.forEach((k) => { if (byKey[k] && !keys.includes(k)) keys.push(k); });
    if (p.repeatPurchase && !keys.includes("repeat")) keys.unshift("repeat");
    // legacy free-text single badge → map to a known key if the label matches
    if (typeof p.badge === "string" && p.badge.trim()) {
      const hit = BADGES.find((b) => p.badge.includes(b.label));
      if (hit && !keys.includes(hit.key)) keys.push(hit.key);
    }
    return keys.map((k) => byKey[k]).filter(Boolean);
  }

  window.LBBadges = { BADGES, get, all, resolve };
})();
