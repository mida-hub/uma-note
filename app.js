// アプリケーション状態（サーバーの cache/state.json から復元）
let currentRace = { ...SAMPLE_RACE, name: 'レース未読み込み', horses: [] };
let pinnedNums = [];
let horseMemos = {};
let bets = [];

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupFilters();
  setupModals();
  await loadState();
  renderAll();
});

async function loadState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    if (data && data.currentRace) currentRace = data.currentRace;
    if (Array.isArray(data.pinnedNums)) pinnedNums = data.pinnedNums;
    if (data.horseMemos) horseMemos = data.horseMemos;
    if (Array.isArray(data.bets)) bets = data.bets;
  } catch (e) {
    console.warn('状態読み込みスキップ:', e);
  }
}

function saveState() {
  fetch('/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentRace, pinnedNums, horseMemos, bets })
  }).catch(e => console.warn('状態保存エラー:', e));
}

function renderAll() {
  renderRaceHeader();
  renderHorseList();
  renderCompareView();
  updatePinBadge();
}

// タブ切り替え
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

window.switchTab = function(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isActive = b.dataset.tab === tabName;
    b.classList.toggle('border-turf-600', isActive);
    b.classList.toggle('text-turf-700', isActive);
    b.classList.toggle('border-transparent', !isActive);
    b.classList.toggle('text-stone-500', !isActive);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('hidden', p.id !== `tab-${tabName}`);
  });
};

function setupFilters() {
  document.getElementById('filterPinned').addEventListener('change', renderHorseList);
}

// レースヘッダー描画
function renderRaceHeader() {
  document.getElementById('raceName').textContent = currentRace.name;
  document.getElementById('raceCourse').textContent = currentRace.course;
  document.getElementById('raceSurfaceDist').textContent = `${currentRace.surface}${currentRace.distance}m`;
  document.getElementById('raceCondition').textContent = `${currentRace.condition}馬場`;
  document.getElementById('highlightCondText').textContent = `${currentRace.surface}${currentRace.distance}m・${currentRace.condition}`;
}

// 着順ドットの色
function getRankBadgeClass(rank) {
  if (rank === 1) return 'bg-amber-400 text-stone-900 ring-2 ring-amber-200 font-black';
  if (rank === 2) return 'bg-stone-300 text-stone-800 font-bold';
  if (rank === 3) return 'bg-orange-300 text-stone-900 font-bold';
  return 'bg-stone-100 text-stone-500';
}

// 血統バッジHTML
function renderBloodlineBadge(role, info) {
  const style = BLOODLINE_COLORS[info.line] || BLOODLINE_COLORS.other;
  return `
    <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}">
      <span class="opacity-70 text-[10px]">${role}</span>
      <span class="font-bold">${info.name}</span>
    </span>
  `;
}

// 出走馬一覧描画
function renderHorseList() {
  const container = document.getElementById('horseListContainer');
  const onlyPinned = document.getElementById('filterPinned').checked;
  const horses = onlyPinned
    ? currentRace.horses.filter(h => pinnedNums.includes(h.num))
    : currentRace.horses;

  if (horses.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-stone-200">
        <p class="text-3xl mb-2">🐎</p>
        <h2 class="font-bold text-stone-800 mb-1">出馬表を読み込んでみましょう</h2>
        <p class="text-xs text-stone-500 mb-4">右上の「📋 出馬表を取り込む」からJRAのURLまたはテキストを入力できます。</p>
      </div>
    `;
    return;
  }

  container.innerHTML = horses.map(h => renderHorseCardHtml(h)).join('');
}

function renderHorseCardHtml(h) {
    const isPinned = pinnedNums.includes(h.num);
    const wakuClass = WAKU_COLORS[h.waku] || 'bg-stone-200 text-stone-800';
    const memo = horseMemos[h.num] || '';

    const recentHtml = (h.recent || []).map(r => {
      const isMatch = r.surface === currentRace.surface && r.dist === currentRace.distance;
      const condMatch = r.cond === currentRace.condition;
      return `
        <div class="flex flex-col items-center p-2 rounded-xl ${isMatch ? 'bg-turf-50 ring-1 ring-turf-600/30' : 'bg-stone-50'} min-w-[78px] flex-shrink-0">
          <span class="text-[9px] text-stone-400 font-mono mb-1">${r.date || '-'} ${r.course ? `<span class="font-bold ${r.course === currentRace.course ? 'text-turf-700' : 'text-stone-500'}">${r.course}</span>` : ''}</span>
          <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs ${getRankBadgeClass(r.rank)}">
            ${r.rank}
          </span>
          <span class="text-[10px] mt-1 font-bold text-stone-700 truncate max-w-[72px]" title="${r.raceTitle || ''}">
            ${r.raceTitle || '-'}
          </span>
          <span class="text-[10px] font-bold ${isMatch ? 'text-turf-700' : 'text-stone-500'}">
            ${r.surface}${r.dist}
          </span>
          <span class="text-[9px] ${condMatch ? 'text-turf-600 font-bold' : 'text-stone-400'}">
            ${r.cond}
          </span>
          ${r.time ? `<span class="text-[9px] text-stone-500 font-mono mt-0.5">${r.time}</span>` : ''}
          ${r.weight ? `<span class="text-[9px] text-stone-400 font-mono">${r.weight}</span>` : ''}
        </div>
      `;
    }).join('');

    const tagsHtml = (h.tags || []).map(t =>
      `<span class="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">#${t}</span>`
    ).join('');

    return `
      <div class="bg-white rounded-2xl p-4 border ${isPinned ? 'border-turf-600 ring-1 ring-turf-600/20' : 'border-stone-200'} shadow-sm hover:shadow transition flex flex-col justify-between">
        <div>
          <!-- Top Row -->
          <div class="flex items-start justify-between gap-2 mb-2.5">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm ${wakuClass}">${h.num}</span>
              <div>
                <h3 class="font-black text-base text-stone-800 leading-tight cursor-pointer hover:text-turf-700" onclick="openDetailModal(${h.num})">
                  ${h.name}
                </h3>
                <p class="text-xs text-stone-500 mt-0.5">${h.jockey}${h.odds > 0 ? ` ・ <span class="font-bold text-stone-700">${h.odds}倍</span>` : ''}${h.popularity > 0 ? ` (${h.popularity}人気)` : ''}</p>
              </div>
            </div>
            <button onclick="togglePin(${h.num})" class="text-xs font-bold px-2.5 py-1 rounded-full transition ${isPinned ? 'bg-turf-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}">
              ${isPinned ? '📌 済' : '📌 気になる'}
            </button>
          </div>

          <!-- Bloodline -->
          <div class="flex flex-wrap gap-1.5 mb-2.5">
            ${renderBloodlineBadge('父', h.sire)}
            ${h.dam ? renderBloodlineBadge('母', { name: h.dam, line: 'other' }) : ''}
            ${renderBloodlineBadge('母父', h.broodmareSire)}
          </div>

          <!-- Tags -->
          <div class="flex flex-wrap gap-1 mb-3">
            ${tagsHtml}
          </div>

          <!-- Recent 5 Races -->
          <div class="mb-3">
            <p class="text-[10px] font-bold text-stone-400 mb-1">直近戦績（左が最新）</p>
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar">
              ${recentHtml || '<span class="text-xs text-stone-400">戦績データなし</span>'}
            </div>
          </div>
        </div>

        <!-- Memo & Detail -->
        <div class="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
          <input type="text" value="${memo.replace(/"/g, '&quot;')}" onchange="updateMemo(${h.num}, this.value)" placeholder="✏️ 一言メモ..." class="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-turf-600">
          <button onclick="openDetailModal(${h.num})" class="text-xs font-bold text-turf-700 hover:underline whitespace-nowrap px-1">
            詳細 &rarr;
          </button>
        </div>
      </div>
    `;
}

// ピン留め切り替え
window.togglePin = function(num) {
  if (pinnedNums.includes(num)) {
    pinnedNums = pinnedNums.filter(n => n !== num);
  } else {
    pinnedNums.push(num);
  }
  saveState();
  renderAll();
};

window.updateMemo = function(num, text) {
  horseMemos[num] = text;
  saveState();
};

function updatePinBadge() {
  document.getElementById('pinCountBadge').textContent = pinnedNums.length;
}

// 気になる比較モード描画（出走馬一覧と同じカードレイアウトで絞り込み表示）
function renderCompareView() {
  const emptyState = document.getElementById('compareEmptyState');
  const grid = document.getElementById('compareGrid');
  const pinnedHorses = currentRace.horses.filter(h => pinnedNums.includes(h.num));

  if (pinnedHorses.length === 0) {
    emptyState.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');
  grid.innerHTML = pinnedHorses.map(h => renderHorseCardHtml(h)).join('');
}

// 600円パズル
function renderBets() {
  const totalUsed = bets.reduce((sum, b) => sum + b.amount, 0);
  const remaining = 600 - totalUsed;
  const remEl = document.getElementById('remainingBudget');
  remEl.textContent = `${remaining}円`;
  remEl.className = `text-xl font-black ${remaining < 0 ? 'text-red-600' : remaining === 0 ? 'text-amber-600' : 'text-turf-700'}`;

  const listEl = document.getElementById('betList');
  if (bets.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-stone-400 text-center py-6">まだ買い目がありません。上のフォームやおすすめプランから追加してみましょう！</p>`;
    return;
  }

  listEl.innerHTML = bets.map((b, idx) => `
    <div class="flex items-center justify-between bg-stone-50 px-3.5 py-2.5 rounded-xl border border-stone-200">
      <div class="flex items-center gap-2.5">
        <span class="text-xs font-black bg-turf-700 text-white px-2 py-0.5 rounded">${b.type}</span>
        <span class="text-sm font-bold text-stone-800">${b.target}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm font-black text-stone-700">${b.amount}円</span>
        <button onclick="removeBet(${idx})" class="text-stone-400 hover:text-red-500 text-sm font-bold">&times;</button>
      </div>
    </div>
  `).join('');
}

window.addBet = function() {
  const type = document.getElementById('betType').value;
  const target = document.getElementById('betTarget').value.trim();
  const amount = parseInt(document.getElementById('betAmount').value, 10);
  if (!target) return alert('馬番や組み合わせを入力してください');
  bets.push({ type, target, amount });
  document.getElementById('betTarget').value = '';
  saveState();
  renderBets();
};

window.removeBet = function(idx) {
  bets.splice(idx, 1);
  saveState();
  renderBets();
};

window.clearBets = function() {
  bets = [];
  saveState();
  renderBets();
};

window.applyPreset = function(preset) {
  const pinnedHorses = currentRace.horses.filter(h => pinnedNums.includes(h.num));
  if (pinnedHorses.length === 0) {
    return alert('先に気になる馬を「📌 気になる」で選んでください！');
  }
  const nums = pinnedHorses.map(h => h.num);
  bets = [];

  if (preset === 'tansho') {
    const count = Math.min(nums.length, 6);
    const perBet = Math.floor(600 / count / 100) * 100;
    for (let i = 0; i < count; i++) {
      bets.push({ type: '単勝', target: `${nums[i]}番 (${pinnedHorses[i].name})`, amount: perBet });
    }
  } else if (preset === 'wakuren') {
    const wakus = [...new Set(pinnedHorses.map(h => h.waku))];
    if (wakus.length < 2) {
      bets.push({ type: '枠連', target: `${wakus[0]}-${wakus[0]}`, amount: 600 });
    } else {
      const pairs = [];
      for (let i = 0; i < wakus.length; i++) {
        for (let j = i + 1; j < wakus.length; j++) pairs.push(`${wakus[i]}-${wakus[j]}`);
      }
      const usePairs = pairs.slice(0, 6);
      const perBet = Math.floor(600 / usePairs.length / 100) * 100;
      usePairs.forEach(p => bets.push({ type: '枠連', target: p, amount: perBet }));
    }
  } else if (preset === 'wide' || preset === 'umaren') {
    const label = preset === 'wide' ? 'ワイド' : '馬連';
    if (nums.length < 2) return alert(`${label}は2頭以上📌してください`);
    const pairs = [];
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) pairs.push(`${nums[i]}-${nums[j]}`);
    }
    const usePairs = pairs.slice(0, 6);
    const perBet = Math.floor(600 / usePairs.length / 100) * 100;
    usePairs.forEach(p => bets.push({ type: label, target: p, amount: perBet }));
  } else if (preset === 'sanrenpuku') {
    if (nums.length < 3) return alert('3連複（ながし）は3頭以上📌してください');
    const axis = nums[0];
    const others = nums.slice(1);
    const combos = [];
    for (let i = 0; i < others.length; i++) {
      for (let j = i + 1; j < others.length; j++) combos.push(`${axis} - ${others[i]},${others[j]}`);
    }
    const useCombos = combos.slice(0, 6);
    const perBet = Math.floor(600 / useCombos.length / 100) * 100;
    useCombos.forEach(c => bets.push({ type: '3連複', target: c, amount: perBet }));
  }
  saveState();
  renderBets();
};

// モーダル制御
function setupModals() {
  document.getElementById('openImportBtn').addEventListener('click', () => {
    document.getElementById('importModal').classList.remove('hidden');
    document.getElementById('importModal').classList.add('flex');
  });
}

window.closeImportModal = function() {
  document.getElementById('importModal').classList.add('hidden');
  document.getElementById('importModal').classList.remove('flex');
};

window.openDetailModal = function(num) {
  const h = currentRace.horses.find(x => x.num === num);
  if (!h) return;
  const wakuClass = WAKU_COLORS[h.waku] || 'bg-stone-200';
  document.getElementById('modalTitleArea').innerHTML = `
    <div class="flex items-center gap-2.5">
      <span class="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm ${wakuClass}">${h.num}</span>
      <div>
        <h3 class="font-black text-lg text-stone-800">${h.name}</h3>
        <p class="text-xs text-stone-500">${h.jockey} ・ ${h.odds}倍 (${h.popularity}人気)</p>
      </div>
    </div>
  `;
  document.getElementById('modalBody').innerHTML = `
    <div class="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
      <h4 class="text-xs font-bold text-stone-500 mb-1.5">🧬 血統メモ</h4>
      <div class="flex flex-wrap gap-1.5 mb-2">
        ${renderBloodlineBadge('父', h.sire)}
        ${renderBloodlineBadge('母父', h.broodmareSire)}
      </div>
      <p class="text-xs text-stone-700 leading-relaxed">${h.pedigreeDetail || '詳細情報はありません。'}</p>
    </div>
    <div>
      <h4 class="text-xs font-bold text-stone-500 mb-2">📊 直近5走の詳細</h4>
      <div class="space-y-1.5">
        ${(h.recent || []).map((r, i) => `
          <div class="flex items-center justify-between text-xs bg-white border border-stone-200 px-3 py-2 rounded-lg">
            <div class="flex items-center gap-2">
              <span class="text-stone-400 font-mono">${i + 1}走前</span>
              <span class="w-5 h-5 rounded-full flex items-center justify-center ${getRankBadgeClass(r.rank)}">${r.rank}</span>
              <span class="font-bold">${r.surface}${r.dist}m (${r.cond})</span>
            </div>
            <span class="text-stone-500">${r.note || '-'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailModal').classList.add('flex');
};

window.closeDetailModal = function() {
  document.getElementById('detailModal').classList.add('hidden');
  document.getElementById('detailModal').classList.remove('flex');
};

// ランダムなゆらぎウェイト (1秒 + 1.0〜3.0秒 = 2.0〜4.0秒)
const sleepWithJitter = () => new Promise(resolve => {
  const ms = 1000 + (1000 + Math.random() * 2000);
  setTimeout(resolve, ms);
});

// 馬ごとの詳細履歴を順番に取得（キャッシュ利用）
async function fetchAllHorseHistories(horseLinks) {
  if (!horseLinks || Object.keys(horseLinks).length === 0) return;
  const shuffled = [...currentRace.horses];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const total = shuffled.length;
  const statusEl = document.getElementById('highlightCondText');
  const origText = statusEl.textContent;

  for (let i = 0; i < total; i++) {
    const horse = shuffled[i];
    const url = horseLinks[horse.name];
    if (!url) continue;

    statusEl.textContent = `🔄 履歴取得中 (${i + 1}/${total}頭: ${horse.name})`;
    try {
      const res = await fetch(`/api/horse_history?name=${encodeURIComponent(horse.name)}&url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.history) && data.history.length > 0) {
        horse.recent = data.history;
        // 通過順位から脚質を自動判定してタグに追加
        const positions = data.history.slice(0, 5).map(r => r.pos).filter(p => typeof p === 'number');
        if (positions.length > 0) {
          const avgPos = positions.reduce((a, b) => a + b, 0) / positions.length;
          let styleTag = '差し';
          if (avgPos <= 2.0) styleTag = '逃げ';
          else if (avgPos <= 5.5) styleTag = '先行';
          else if (avgPos >= 10.5) styleTag = '追込';
          horse.tags = [...new Set([...(horse.tags || []).filter(t => !['逃げ','先行','差し','追込'].includes(t)), styleTag])];
        }
        saveState();
        renderHorseList();
      }
      // キャッシュに無かった場合のみ、サーバー負荷軽減のためゆらぎウェイトを入れる
      if (!data.cached && i < total - 1) {
        await sleepWithJitter();
      }
    } catch (e) {
      console.warn(`履歴取得スキップ (${horse.name}):`, e);
    }
  }
  statusEl.textContent = origText;
}

// URLからデータ取り込み（server.py経由）
window.importFromUrl = async function() {
  const url = document.getElementById('importUrlInput').value.trim();
  if (!url) return alert('URLを入力してください');
  try {
    const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) {
      alert(`取得エラー: ${data.error || '不明なエラー'}`);
      return;
    }
    const horses = parseJraText(data.text);
    if (horses.length > 0) {
      const isDifferentRace = currentRace.sourceUrl !== url;
      currentRace = {
        ...SAMPLE_RACE,
        name: '取り込みレース (JRA出馬表)',
        sourceUrl: url,
        horses
      };
      if (isDifferentRace) {
        pinnedNums = [];
        horseMemos = {};
      }
      saveState();
      closeImportModal();
      renderAll();
    } else {
      alert('出馬表データをパースできませんでした');
    }
    if (data.horseLinks) {
      fetchAllHorseHistories(data.horseLinks);
    }
  } catch (e) {
    alert('ローカルサーバー (server.py) に接続できませんでした。python3 server.py で起動しているか確認してください。');
  }
};

// データ取り込み
window.loadSampleData = function() {
  currentRace = JSON.parse(JSON.stringify(SAMPLE_RACE));
  closeImportModal();
  renderAll();
};

// 種牡馬名から血統系統を簡易判定
function guessBloodline(name) {
  if (!name) return 'other';
  const sunday = ['サンデー', 'ディープ', 'キタサン', 'ブラックタイド', 'キズナ', 'オルフェーヴル', 'シルバーステート', 'ハーツクライ', 'コントレイル', 'ゴールドシップ', 'アルアイン', 'マンハッタンカフェ', 'スペシャルウィーク', 'ゼンノロブロイ'];
  const kingmambo = ['キングカメハメハ', 'ドゥラメンテ', 'ロードカナロア', 'ルーラーシップ', 'サートゥルナーリア', 'レイデオロ'];
  const northern = ['エピファネイア', 'モーリス', 'ハービンジャー', 'クロフネ', 'デクラレーション', 'ダンチヒ', 'サドラーズ', 'ノーザン', 'ベーカバド', 'ホワイトマズル'];
  const mrpro = ['ドレフォン', 'ミスタープロスペクター', 'ヘニーヒューズ', 'マインドユアビスケッツ'];
  if (sunday.some(k => name.includes(k))) return 'sunday';
  if (kingmambo.some(k => name.includes(k))) return 'kingmambo';
  if (northern.some(k => name.includes(k))) return 'northerndancer';
  if (mrpro.some(k => name.includes(k))) return 'mrprospector';
  return 'other';
}

// JRA出馬表コピペテキストのパーサー
function parseJraText(raw) {
  const blocks = raw.split(/(?=枠[1-8][白黒赤青黄緑橙桃]\s+\d+)/);
  const horses = [];

  for (const block of blocks) {
    const headerMatch = block.match(/^枠([1-8])[白黒赤青黄緑橙桃]\s+(\d+)/);
    if (!headerMatch) continue;

    const waku = parseInt(headerMatch[1], 10);
    const num = parseInt(headerMatch[2], 10);
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);

    // 馬名取得（枠行の次。ブリンカー着用があればスキップ）
    let nameIdx = 1;
    const tags = [];
    if (lines[nameIdx] && lines[nameIdx].includes('ブリンカー')) {
      tags.push('ブリンカー');
      nameIdx++;
    }
    const name = lines[nameIdx] || `馬${num}`;

    // オッズ・人気（独立して取得）
    const popMatch = block.match(/\((\d+)番人気\)/);
    const popularity = popMatch ? parseInt(popMatch[1], 10) : 0;
    const oddsMatch = block.match(/(\d+\.\d+)[^\d\n]*\n?\s*\(\d+番人気\)/) || block.match(/(\d+\.\d+)[\s\S]{0,30}?\d+番人気/);
    const odds = oddsMatch ? parseFloat(oddsMatch[1]) : 0;

    // 血統
    const sireMatch = block.match(/父：([^\n\t]+)/);
    const sireName = sireMatch ? sireMatch[1].trim() : '不明';
    const damMatch = block.match(/母：([^\n\t]+)/);
    const damName = damMatch ? damMatch[1].replace(/\(母の父：.*$/, '').trim() : '';
    const bmsMatch = block.match(/\(母の父：([^)]+)\)/);
    const bmsName = bmsMatch ? bmsMatch[1].trim() : '不明';

    // 騎手名（負担重量 kg の次の名前らしい行）
    const weightIdx = lines.findIndex(l => /\d+\.\d+\s*kg/.test(l));
    let jockey = '未定';
    if (weightIdx !== -1) {
      for (let j = weightIdx + 1; j < Math.min(weightIdx + 5, lines.length); j++) {
        const cand = lines[j].replace(/\s+/g, ' ').trim();
        if (cand && !/^\d+$/.test(cand) && !/^[MLEI]$/.test(cand) && !cand.includes('kg')) {
          jockey = cand;
          break;
        }
      }
    }

    // 過去走パース（出馬表上の直近4走から脚質も判定）
    const raceBlocks = block.split(/(?=\d{4}年\d{1,2}月\d{1,2}日)/).slice(1);
    const positions = [];
    const recent = raceBlocks.map(rb => {
      const dateMatch = rb.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      const shortDate = dateMatch ? `${dateMatch[1].slice(2)}/${dateMatch[2]}` : '';
      const rankMatch = rb.match(/(\d+)\s*着/);
      const distMatch = rb.match(/(\d{4})\s*(芝|ダ)/);
      const condMatch = rb.match(/(良|稍重|重|不良)/);
      const timeMatch = rb.match(/(\d:\d{2}\.\d)/);
      const agariMatch = rb.match(/3F\s*([\d.]+)/);
      // 3F の直前にある通過順位（例: 10 9 11）を抽出
      const posBlockMatch = rb.match(/\n(\d{1,2}(?:[\s\t]+\d{1,2}){1,3})\s*\n?\s*3F/);
      if (posBlockMatch) {
        const firstCorner = parseInt(posBlockMatch[1].trim().split(/[\s\t]+/)[0], 10);
        if (!isNaN(firstCorner)) positions.push(firstCorner);
      }
      const rLines = rb.split('\n').map(l => l.trim()).filter(Boolean);
      const raceTitle = rLines[1] ? rLines[1].replace(/\s+/g, ' ').replace(/G[ⅠⅡⅢI]+/g, '').trim() : '';
      return {
        date: shortDate,
        raceTitle,
        rank: rankMatch ? parseInt(rankMatch[1], 10) : '-',
        surface: distMatch ? distMatch[2] : '芝',
        dist: distMatch ? parseInt(distMatch[1], 10) : 0,
        cond: condMatch ? condMatch[1] : '良',
        time: timeMatch ? timeMatch[1] : '',
        note: agariMatch ? `${raceTitle} (3F ${agariMatch[1]})` : raceTitle
      };
    });

    if (positions.length > 0) {
      const avgPos = positions.reduce((a, b) => a + b, 0) / positions.length;
      let styleTag = '差し';
      if (avgPos <= 2.0) styleTag = '逃げ';
      else if (avgPos <= 5.5) styleTag = '先行';
      else if (avgPos >= 10.5) styleTag = '追込';
      tags.push(styleTag);
    }

    horses.push({
      waku,
      num,
      name,
      jockey,
      odds,
      popularity,
      sire: { name: sireName, line: guessBloodline(sireName) },
      dam: damName,
      broodmareSire: { name: bmsName, line: guessBloodline(bmsName) },
      tags,
      recent,
      pedigreeDetail: `父${sireName} × 母${damName || '不明'} (母父${bmsName})`
    });
  }
  return horses;
}

window.importTextData = function() {
  const raw = document.getElementById('importTextarea').value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.horses)) {
      currentRace = parsed;
      closeImportModal();
      renderAll();
      return;
    }
  } catch (e) {
    // JRA出馬表コピペ形式を試す
    if (/枠[1-8][白黒赤青黄緑橙桃]/.test(raw)) {
      const horses = parseJraText(raw);
      if (horses.length > 0) {
        currentRace = {
          ...SAMPLE_RACE,
          name: '取り込みレース (JRA出馬表)',
          horses
        };
        saveState();
        closeImportModal();
        renderAll();
        return;
      }
    }

    // 簡易テキストパース: "馬番 馬名 騎手 オッズ"
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const horses = lines.map((line, idx) => {
      const parts = line.split(/\s+/);
      const num = parseInt(parts[0], 10) || (idx + 1);
      return {
        waku: Math.min(8, Math.ceil(num / 2)),
        num,
        name: parts[1] || `馬${num}`,
        jockey: parts[2] || '未定',
        odds: parseFloat(parts[3]) || 10.0,
        popularity: idx + 1,
        sire: { name: '不明', line: 'other' },
        broodmareSire: { name: '不明', line: 'other' },
        tags: ['取り込みデータ'],
        recent: []
      };
    });
    if (horses.length > 0) {
      currentRace = {
        ...SAMPLE_RACE,
        name: '取り込みレース',
        horses
      };
      closeImportModal();
      renderAll();
    }
  }
};
