// 血統系統のカラー定義
const BLOODLINE_COLORS = {
  sunday: { label: 'サンデー系', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
  kingmambo: { label: 'キングマンボ系', bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
  northerndancer: { label: 'ノーザンダンサー系', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  mrprospector: { label: 'ミスプロ系', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  nasrullah: { label: 'ナスルーラ系', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  other: { label: 'その他', bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200' },
};

// 枠番カラー
const WAKU_COLORS = {
  1: 'bg-white text-stone-900 border border-stone-300',
  2: 'bg-stone-900 text-white',
  3: 'bg-red-600 text-white',
  4: 'bg-blue-600 text-white',
  5: 'bg-yellow-400 text-stone-900',
  6: 'bg-green-600 text-white',
  7: 'bg-orange-500 text-white',
  8: 'bg-pink-400 text-white',
};

// サンプルレースデータ
const SAMPLE_RACE = {
  name: 'サンデーカップ (サンプル)',
  grade: 'GII',
  course: '東京',
  surface: '芝',
  distance: 2000,
  condition: '良',
  horses: [
    {
      waku: 1,
      num: 1,
      name: 'カフェラテタイム',
      jockey: 'C.ルメール',
      odds: 2.8,
      popularity: 1,
      sire: { name: 'キタサンブラック', line: 'sunday' },
      broodmareSire: { name: 'キングカメハメハ', line: 'kingmambo' },
      tags: ['瞬発力', '東京巧者', '先行'],
      recent: [
        { rank: 1, surface: '芝', dist: 2000, cond: '良', note: '上がり最速' },
        { rank: 2, surface: '芝', dist: 2000, cond: '良', note: 'クビ差' },
        { rank: 1, surface: '芝', dist: 1800, cond: '良', note: '完勝' },
        { rank: 4, surface: '芝', dist: 2400, cond: '重', note: '道悪苦戦' },
        { rank: 2, surface: '芝', dist: 2000, cond: '良', note: '' },
      ],
      pedigreeDetail: '父キタサンブラック×母父キングカメハメハ。王道の中距離血統で、東京芝2000mのキレ味勝負に強い。'
    },
    {
      waku: 2,
      num: 2,
      name: 'モーニングブリーズ',
      jockey: '武豊',
      odds: 5.4,
      popularity: 3,
      sire: { name: 'ドゥラメンテ', line: 'kingmambo' },
      broodmareSire: { name: 'ディープインパクト', line: 'sunday' },
      tags: ['差し', '大舞台◎'],
      recent: [
        { rank: 3, surface: '芝', dist: 2200, cond: '良', note: '追い込み' },
        { rank: 1, surface: '芝', dist: 2000, cond: '稍', note: '上がり最速' },
        { rank: 5, surface: '芝', dist: 1800, cond: '良', note: '不利あり' },
        { rank: 1, surface: '芝', dist: 2000, cond: '良', note: '' },
        { rank: 3, surface: '芝', dist: 2000, cond: '良', note: '' },
      ],
      pedigreeDetail: '父ドゥラメンテ×母父ディープインパクト。トップスピードの持続力が魅力。'
    },
    {
      waku: 3,
      num: 3,
      name: 'ロッピャクエン',
      jockey: '横山武史',
      odds: 12.6,
      popularity: 5,
      sire: { name: 'エピファネイア', line: 'northerndancer' },
      broodmareSire: { name: 'ハーツクライ', line: 'sunday' },
      tags: ['パワー型', '穴候補', '逃げ'],
      recent: [
        { rank: 2, surface: '芝', dist: 2000, cond: '重', note: '粘り込み' },
        { rank: 6, surface: '芝', dist: 1600, cond: '良', note: '距離短い' },
        { rank: 1, surface: '芝', dist: 2000, cond: '良', note: '逃げ切り' },
        { rank: 4, surface: '芝', dist: 2200, cond: '良', note: '' },
        { rank: 2, surface: '芝', dist: 1800, cond: '良', note: '' },
      ],
      pedigreeDetail: 'ロベルト系×サンデー系。単騎逃げに持ち込めれば一発の魅力あり。'
    },
    {
      waku: 4,
      num: 4,
      name: 'サンデークロワッサン',
      jockey: '川田将雅',
      odds: 4.1,
      popularity: 2,
      sire: { name: 'コントレイル', line: 'sunday' },
      broodmareSire: { name: 'クロフネ', line: 'northerndancer' },
      tags: ['自在性', '安定感◎'],
      recent: [
        { rank: 2, surface: '芝', dist: 2000, cond: '良', note: '好位抜け出し' },
        { rank: 2, surface: '芝', dist: 1800, cond: '良', note: '' },
        { rank: 3, surface: '芝', dist: 2000, cond: '良', note: '' },
        { rank: 1, surface: '芝', dist: 1800, cond: '良', note: '上がり最速' },
        { rank: 2, surface: '芝', dist: 1600, cond: '良', note: '' },
      ],
      pedigreeDetail: '父コントレイルの軽快さに母父クロフネのパワーが加わり、崩れにくいタイプ。'
    },
    {
      waku: 5,
      num: 5,
      name: 'ミスターアメリカン',
      jockey: '戸崎圭太',
      odds: 18.2,
      popularity: 6,
      sire: { name: 'ドレフォン', line: 'mrprospector' },
      broodmareSire: { name: 'スペシャルウィーク', line: 'sunday' },
      tags: ['ダート◎', 'パワー型'],
      recent: [
        { rank: 8, surface: '芝', dist: 2000, cond: '良', note: '芝初戦' },
        { rank: 1, surface: 'ダ', dist: 1800, cond: '良', note: '圧勝' },
        { rank: 1, surface: 'ダ', dist: 1800, cond: '重', note: '' },
        { rank: 2, surface: 'ダ', dist: 1600, cond: '良', note: '' },
        { rank: 3, surface: 'ダ', dist: 1800, cond: '良', note: '' },
      ],
      pedigreeDetail: 'ダートでの実績が中心。芝のスピード決着に対応できるかが鍵。'
    },
    {
      waku: 6,
      num: 6,
      name: 'グラスホッパー',
      jockey: '坂井瑠星',
      odds: 8.9,
      popularity: 4,
      sire: { name: 'モーリス', line: 'northerndancer' },
      broodmareSire: { name: 'ルーラーシップ', line: 'kingmambo' },
      tags: ['先行', 'タフネス'],
      recent: [
        { rank: 4, surface: '芝', dist: 2000, cond: '良', note: '0.2秒差' },
        { rank: 1, surface: '芝', dist: 1800, cond: '良', note: '' },
        { rank: 3, surface: '芝', dist: 2000, cond: '稍', note: '' },
        { rank: 2, surface: '芝', dist: 2000, cond: '良', note: '' },
        { rank: 5, surface: '芝', dist: 2400, cond: '良', note: '' },
      ],
      pedigreeDetail: 'モーリス産駒らしいパワーと持続力。東京2000mはベスト条件に近い。'
    }
  ]
};
