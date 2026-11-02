import { Commute, dateSeed, seededRandom, STAGES } from './game.js';
import { Renderer } from './render.js';
import { LEVELS, normalizeProgress, recordLevel } from './campaign.js';
import { DRIVERS, getDriver } from './drivers.js';
import { ReactionDirector } from './reactions.js';
const $ = id => document.getElementById(id);
const renderer = new Renderer($('road'));
let selectedDriver = 'clover';
let currentView = 0, showcase = 'character', detailsOpen = false;
try { const saved = localStorage.getItem('commute-driver-v1'); if (DRIVERS.some(driver => driver.id === saved)) selectedDriver = saved; } catch { /* 本次会话仍可选角色。 */ }
function selectDriver(id) {
  const driver = DRIVERS.find(item => item.id === id);
  if (!driver) return;
  selectedDriver = id; renderer.driver = id;
  try { localStorage.setItem('commute-driver-v1', id); } catch { /* 角色选择不依赖存档。 */ }
  $('active-driver-name').textContent = driver.name;
  $('active-driver-portrait').className = `driver-portrait portrait-${id}`;
  $('active-driver-portrait').setAttribute('aria-label', `${driver.name} 头像`);
  $('active-driver-portrait').style.backgroundImage = `url("${driver.homeArt || driver.sheet}")`;
  $('active-driver-portrait').style.backgroundPosition = driver.homeArt ? '50% 8%' : '0% 26%';
  $('active-driver-portrait').style.backgroundSize = driver.homeArt ? '130% auto' : '340% auto';
  document.querySelectorAll('[data-driver]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.driver === id)));
  if ($('driver-caption')) $('driver-caption').textContent = driver.note;
  document.documentElement.style.setProperty('--driver-accent', driver.accent);
  $('lobby').dataset.character = id;
  $('driver-model').dataset.character = id;
  $('driver-name').textContent = driver.name;
  $('driver-number').textContent = driver.number;
  $('stage-count').textContent = `${driver.number} / 04`;
  $('driver-title').textContent = driver.title;
  $('selected-character-name').textContent = driver.name;
  $('selected-character-number').textContent = `${driver.number} / 04`;
  $('selected-character-vehicle').textContent = driver.vehicle;
  $('driver-type').textContent = driver.tag;
  $('driver-description').textContent = driver.description;
  $('vehicle-name').textContent = driver.vehicle;
  $('game-driver-label').textContent = `${driver.name} / ${driver.vehicle}`;
  $('game-note').textContent = driver.note;
  $('player-vehicle-label').textContent = `你的载具 · ${driver.vehicle}`;
  $('player-dot').style.background = driver.color;
  for (const node of [$('stage-vehicle'), $('vehicle-thumb'), $('selected-ride')]) {
    node.style.backgroundPosition = driver.tile;
    node.setAttribute('aria-label', `${driver.name} 与${driver.vehicle}`);
  }
  const stats = [
    ['最高速度', driver.stats.speed, `${Math.round(72 * driver.stats.speed)} <small>km/h</small>`],
    ['加速', driver.stats.acceleration, `${(2.8 * driver.stats.acceleration).toFixed(1)} <small>m/s²</small>`],
    ['操控', driver.stats.handling, `${(1.5 * driver.stats.handling).toFixed(2)} <small>道/s</small>`],
    ['制动', driver.stats.braking, `${(7 * driver.stats.braking).toFixed(1)} <small>m/s²</small>`],
  ];
  $('driver-stats').innerHTML = stats.map(([label, value, readout]) => `<div class="stat-row"><div><span>${label}</span><b>${readout}</b></div><div class="stat-track"><i style="width:${value / 1.4 * 100}%"></i></div></div>`).join('');
  $('stage-sticker').textContent = ['FAST, NOT LAWLESS.', "THINK IT. DON'T SAY IT.", 'TAKE IT EASY, HUMAN.', 'LOGGED WITH COURTESY.'][DRIVERS.indexOf(driver)];
  $('score-note').textContent = '只显示本角色的每日安全完赛记录。随机通勤个人最佳也按角色分别保存。';
  updateShowcase(); displayScores();
}
function updateShowcase() {
  $('driver-model').hidden = showcase !== 'character';
  $('stage-vehicle').hidden = showcase !== 'vehicle';
  $('view-switch').hidden = showcase !== 'character';
  const driver = getDriver(selectedDriver), standalone = currentView === 0 && Boolean(driver.homeArt);
  $('driver-model').classList.toggle('standalone-art', standalone);
  $('driver-model').style.backgroundImage = `url("${standalone ? driver.homeArt : driver.sheet}")`;
  $('driver-model').style.backgroundPosition = standalone ? 'center' : `${currentView * 50}% 50%`;
  $('driver-model').setAttribute('aria-label', `${getDriver(selectedDriver).name} ${['正面', '侧面', '背面'][currentView]}`);
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.view) === currentView)));
  document.querySelectorAll('[data-showcase]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.showcase === showcase)));
}
function showLobby() {
  screen = 'lobby'; game.state = 'paused'; resetInput();
  clearReaction();
  $('lobby').hidden = false; $('game-app').hidden = true; $('game-nav').hidden = true;
  document.body.classList.remove('in-game');
  detailsOpen = false; currentView = 0; showcase = 'character'; updateDetails(); selectDriver(selectedDriver);
  window.scrollTo(0, 0);
}
function setupLobby() {
  $('previous-driver').onclick = () => cycleDriver(-1);
  $('next-driver').onclick = () => cycleDriver(1);
  $('toggle-details').onclick = () => { detailsOpen = !detailsOpen; updateDetails(); };
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { currentView = Number(button.dataset.view); updateShowcase(); });
  document.querySelectorAll('[data-showcase]').forEach(button => button.onclick = () => { showcase = button.dataset.showcase; updateShowcase(); });
  $('inspect-vehicle').onclick = () => { showcase = 'vehicle'; updateShowcase(); };
  $('play').onclick = showStart;
  $('back-lobby').onclick = showLobby;
  $('open-guide').onclick = () => $('guide-dialog').showModal();
  document.querySelectorAll('.brand,.lobby-logo').forEach(link => link.onclick = event => { event.preventDefault(); showLobby(); });
  document.body.dataset.ready = 'true';
}
function cycleDriver(direction) {
  const index = DRIVERS.findIndex(driver => driver.id === selectedDriver);
  selectDriver(DRIVERS[(index + direction + DRIVERS.length) % DRIVERS.length].id);
}
function updateDetails() {
  $('character-details').hidden = !detailsOpen;
  $('stage-toolbar').hidden = !detailsOpen;
  $('showcase-layout').classList.toggle('detail-open', detailsOpen);
  $('lobby').classList.toggle('details-open', detailsOpen);
  $('toggle-details').setAttribute('aria-expanded', String(detailsOpen));
  $('toggle-details').innerHTML = `${detailsOpen ? '收起属性' : '角色属性'} <span aria-hidden="true">${detailsOpen ? '－' : '＋'}</span>`;
  if (!detailsOpen) { currentView = 0; showcase = 'character'; updateShowcase(); }
}
const input = { gas: false, brake: false };
let game = new Commute(20261021), currentSeed = 20261021, mode = 'random', screen = 'start';
let lastFrame = 0, accumulator = 0, toastUntil = 0, audio = null, muted = true, resultSaved = false;
let currentLevel = 0;
let campaignProgress = loadProgress();
let reactionDirector = new ReactionDirector(selectedDriver), activeReaction = null;
const originalRouteMarkup = document.querySelector('.route-list').innerHTML;
const heldKeys = new Set(), heldPointers = new Map();
const formatTime = time => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
const todayKey = () => String(dateSeed());
function loadProgress() {
  try { return normalizeProgress(JSON.parse(localStorage.getItem('commute-levels-v1') || 'null')); }
  catch { return normalizeProgress(null); }
}
function randomSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function retryCurrent() { start(currentSeed, mode, currentLevel); }
function setupRoutePanel(isCampaign) {
  $('route-title').textContent = isCampaign ? '闯关路线' : '今天的通勤';
  document.querySelector('.route-list').innerHTML = isCampaign
    ? LEVELS.map((level, i) => `<div class="route-item"><i></i><span>${level.name}<small>${i === 0 ? '坑洼与行人，慢慢学避让' : i === 1 ? '红灯与拥堵，学会留车距' : '快慢车混行，判断速度差'}</small></span><b>0${i + 1}</b></div>`).join('')
    : originalRouteMarkup;
  $('distance-label').textContent = isCampaign ? '距离终点' : '距离公司';
  $('tip').innerHTML = isCampaign ? LEVELS[currentLevel].tip : '旁边那条车道现在快，<br>不代表十秒后还快。';
}
function readScores() { try { const data = JSON.parse(localStorage.getItem('commute-scores-v1') || '[]'); return Array.isArray(data) ? data.filter(s => s && Number.isFinite(s.time) && typeof s.day === 'string') : []; } catch { return []; } }
function displayScores() {
  const scores = readScores().filter(s => s.day === todayKey() && (s.driver || 'clover') === selectedDriver).sort((a, b) => a.time - b.time).slice(0, 5);
  $('scores').replaceChildren();
  if (!scores.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '还没有人安全到达。\n今天的第一名，等你来。'; $('scores').append(li); }
  scores.forEach((score, i) => {
    const li = document.createElement('li'), rank = document.createElement('span'), name = document.createElement('span'), time = document.createElement('b');
    rank.textContent = String(i + 1).padStart(2, '0'); name.textContent = '准时通勤人'; time.textContent = `${formatTime(score.time)}.${Math.floor(score.time * 10) % 10}`;
    li.append(rank, name, time); $('scores').append(li);
  });
}
function sound(freq = 260, duration = .12, type = 'sine', volume = .025) {
  if (muted) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = type; oscillator.frequency.value = freq; gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Sound is optional; unsupported browsers remain playable. */ }
}
function toast(message) { $('toast').textContent = message; toastUntil = performance.now() + 3700; $('toast').classList.add('visible'); }
function resetInput() { input.gas = false; input.brake = false; heldKeys.clear(); heldPointers.clear(); document.querySelectorAll('.held').forEach(el => el.classList.remove('held')); }
function overlay(html) { $('overlay-content').innerHTML = html; $('overlay-content').className = 'overlay-content'; $('overlay-content').classList.toggle('start-card', screen === 'start'); $('overlay').hidden = false; resetInput(); }
function hideOverlay() { $('overlay').hidden = true; }
function clearReaction() { activeReaction = null; game.reaction = null; $('driver-reaction').hidden = true; }
function updateReaction() {
  if (screen !== 'playing') return;
  const reaction = reactionDirector.update(game.time, game.incidents.splice(0));
  if (reaction) {
    activeReaction = reaction; game.reaction = reaction;
    $('driver-reaction').dataset.mood = reaction.mood;
    $('driver-reaction').dataset.character = selectedDriver;
    const driver = getDriver(selectedDriver);
    const portrait = reaction.mood === 'angry' ? driver.resultArt?.lost : driver.homeArt;
    $('reaction-portrait').classList.toggle('standalone-portrait', Boolean(portrait));
    $('reaction-portrait').style.backgroundImage = `url("${portrait || driver.sheet}")`;
    $('reaction-name').textContent = getDriver(selectedDriver).name;
    $('reaction-tag').textContent = reaction.tag;
    $('reaction-quote').textContent = reaction.quote;
    $('reaction-thought').textContent = reaction.thought ? `心里想：${reaction.thought}` : '';
    $('reaction-thought').hidden = !reaction.thought;
    $('driver-reaction').hidden = false;
  }
  if (activeReaction && game.time >= activeReaction.expiresAt) clearReaction();
}
function start(seed, selectedMode, levelIndex = 0) {
  if (selectedMode === 'levels' && (!Number.isInteger(levelIndex) || levelIndex < 0 || levelIndex > campaignProgress.unlocked)) return;
  currentSeed = seed; mode = selectedMode; currentLevel = levelIndex;
  game = new Commute(seed, mode, currentLevel, selectedDriver); screen = 'playing'; resultSaved = false; accumulator = 0; resetInput(); hideOverlay();
  reactionDirector = new ReactionDirector(selectedDriver, seededRandom(seed ^ 0x52454143)); clearReaction();
  $('back-lobby').textContent = '← 结束本局，回大厅';
  setupRoutePanel(mode === 'levels');
  $('status').textContent = mode === 'levels' ? `闯关 ${currentLevel + 1}/3 · ${game.level.name}` : mode === 'daily' ? '每日通勤 · 同路况挑战' : '随机通勤 · 正在路上';
  if ($('branch-name')) $('branch-name').innerHTML = '路线选择<small>走大路，还是抄近道？</small>';
  $('pause').textContent = 'Ⅱ'; $('pause').setAttribute('aria-label', '暂停游戏');
  updateHUD();
}
function showStart() {
  clearReaction();
  game = new Commute(20261021, 'random', 0, selectedDriver); $('status').textContent = '准备出发'; $('pause').textContent = 'Ⅱ';
  mode = 'random'; setupRoutePanel(false);
  screen = 'start';
  $('lobby').hidden = true; $('game-app').hidden = false; $('game-nav').hidden = false;
  document.body.classList.add('in-game'); $('back-lobby').textContent = '← 车手大厅';
  renderer.resize();
  overlay(`<span class="eyebrow">${getDriver(selectedDriver).name} / READY TO GO</span><h2>今天开哪条路？</h2><p>${getDriver(selectedDriver).vehicle}已就位。<br>选好模式，就出发。</p><button class="primary" id="start-levels">闯关出发 ↗ · 新手推荐</button><button class="secondary" id="start-random">随机通勤</button><button class="secondary" id="start-daily">每日同路况挑战</button><button class="text-button" id="view-scores">查看本角色今日榜 →</button><p class="overlay-hint">↑ 加速　↓ / 空格 刹车　← → 变道<br>闯关有防追尾辅助，每关约 1～2 分钟。</p>`);
  window.scrollTo(0, 0);
  $('start-levels').onclick = showLevelSelect;
  $('start-random').onclick = () => start(randomSeed(), 'random');
  $('start-daily').onclick = () => start(dateSeed(), 'daily');
  $('view-scores').onclick = () => {
    const scores = readScores().filter(s => s.day === todayKey() && (s.driver || 'clover') === selectedDriver).sort((a, b) => a.time - b.time).slice(0, 5);
    overlay(`<span class="eyebrow">${todayKey()} / 本机记录</span><h2>安全到达榜</h2><p>每日同路况，无事故、无闯灯完赛入榜。<br>只保存在当前浏览器，不是联网排行。</p>${scores.length ? scores.map((s, i) => `<p>${String(i + 1).padStart(2, '0')}　准时通勤人　<strong>${formatTime(s.time)}.${Math.floor(s.time * 10) % 10}</strong></p>`).join('') : '<p>还没有人安全到达。第一名等你来。</p>'}<button class="primary" id="scores-back">返回出发页</button>`);
    $('scores-back').onclick = showStart;
  };
  updateHUD();
}
function showLevelSelect() {
  screen = 'level-select'; mode = 'levels'; currentLevel = Math.min(currentLevel, campaignProgress.unlocked);
  game = new Commute(20261022, 'levels', currentLevel, selectedDriver); setupRoutePanel(true); updateHUD();
  const total = campaignProgress.records.reduce((sum, record) => sum + (record?.score || 0), 0);
  overlay(`<span class="eyebrow">闯关模式 / 慢慢变熟练</span><h2>从村路，<br>开到高速。</h2><p>三种道路，各练一种判断。<br>车况每关恢复；过关解锁，不限完成时间。</p>${LEVELS.map((level, i) => {
    const locked = i > campaignProgress.unlocked, record = campaignProgress.records[i];
    return `<button class="${i === campaignProgress.unlocked ? 'primary' : 'secondary'} level-choice" data-level="${i}" ${locked ? 'disabled' : ''}><strong>0${i + 1} / ${level.name} ${locked ? '· 待解锁' : ''}</strong><small>${locked ? '先通过上一关' : record ? `${'★'.repeat(record.stars)} · 最佳 ${record.score}分 · ${formatTime(record.time)}` : `${level.length}m · ${i === 0 ? '低速避坑、礼让行人' : i === 1 ? '跟车、等灯、绕开拥堵' : '看速度差，提前超车'}`}</small></button>`;
  }).join('')}<p class="campaign-summary">已过关最佳分合计：${total}分。重试不清空，也不重复累加。</p><button class="text-button" id="levels-back">← 返回模式选择</button>`);
  document.querySelectorAll('[data-level]').forEach(button => button.onclick = () => showLevelBriefing(Number(button.dataset.level)));
  $('levels-back').onclick = showStart;
}
function showLevelBriefing(index) {
  if (index > campaignProgress.unlocked || !LEVELS[index]) return;
  const level = LEVELS[index]; currentLevel = index;
  game = new Commute(20261022, 'levels', index, selectedDriver); setupRoutePanel(true); updateHUD();
  overlay(`<span class="eyebrow">第${index + 1}关 / ${level.length}m</span><h2>${level.name}</h2><p>${level.briefing}</p><p class="campaign-summary">巡航约${Math.round(level.cruise * 3.6 * getDriver(selectedDriver).stats.speed)}km/h · 最高${Math.round(level.maxSpeed * 3.6 * getDriver(selectedDriver).stats.speed)}km/h<br>防追尾辅助已开启；变道、等灯和礼让仍要自己判断。<br>${index === 0 ? '绕开一个坑 +25分，停车礼让一次 +80分。' : '不贴车抢道，安全过关有额外奖励。'}</p><button class="primary" id="begin-level">开始第${index + 1}关</button><button class="secondary" id="briefing-back">返回关卡选择</button>`);
  $('begin-level').onclick = () => start(randomSeed(), 'levels', index);
  $('briefing-back').onclick = showLevelSelect;
}
function pause() {
  if (screen === 'paused') { game.state = 'running'; screen = 'playing'; hideOverlay(); $('pause').textContent = 'Ⅱ'; $('pause').setAttribute('aria-label', '暂停游戏'); return; }
  if (screen !== 'playing' || game.state !== 'running') return;
  game.state = 'paused'; screen = 'paused'; updateHUD(); $('pause').textContent = '▶'; $('pause').setAttribute('aria-label', '继续游戏');
  overlay(`<span class="eyebrow">暂时靠边</span><h2>喘口气，<br>时间也停了。</h2><p>暂停不会计入驾驶用时。</p><button id="resume" class="primary">继续驾驶</button><button id="pause-retry" class="secondary">${mode === 'levels' ? '重试当前关' : '同一路线重开'}</button>`);
  $('resume').onclick = pause; $('pause-retry').onclick = retryCurrent;
}
function showChoice() {
  screen = 'choice';
  overlay('<span class="eyebrow">导航 / 路线选择</span><h2>这次，走哪边？</h2><p>路况和计时暂时停住。选好再出发。</p><button id="main-road" class="primary choice">走主干道 · 车道更多<small>全程2.6km，速度空间大；有4变2汇流。</small></button><button id="shortcut" class="secondary choice">抄近道 · 距离更短<small>全程2.38km，两车道；三轮车和减速带更多。</small></button>');
  for (const route of ['main-road', 'shortcut']) $(route).onclick = () => { game.chooseRoute(route === 'shortcut' ? 'shortcut' : 'main'); screen = 'playing'; hideOverlay(); $('branch-name').innerHTML = `${route === 'shortcut' ? '街巷近道' : '城市主干道'}<small>${route === 'shortcut' ? '距离短，慢车多' : '道路宽，汇流多'}</small>`; };
}
const escapeText = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
function showOutcome(won, { stats, actions, explanation, record = '', stamp = '', stars = 0 }) {
  clearReaction();
  const driver = getDriver(selectedDriver), reaction = reactionDirector.result(won);
  const resultArt = driver.resultArt?.[won ? 'won' : 'lost'];
  const moodArt = resultArt ? '' : reaction.mood === 'cool'
    ? '<svg class="cool-glasses" viewBox="0 0 160 45" aria-hidden="true"><path d="M4 9L69 12L63 37L17 35Z M91 12L156 9L143 35L97 37Z" fill="#17181f" stroke="#fff" stroke-width="2"/><path d="M68 16Q80 10 92 16" fill="none" stroke="#17181f" stroke-width="6"/><path d="M21 15L43 16 M105 17L125 15" stroke="#fff" stroke-width="3"/></svg>'
    : reaction.mood === 'angry'
      ? '<svg class="angry-mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M6 5V15H15M34 5V15H25M6 35V25H15M34 35V25H25" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg><i class="heat-steam steam-one"></i><i class="heat-steam steam-two"></i>'
      : `<span class="result-emote" aria-hidden="true">${reaction.mood === 'power' ? '↑ ↑' : reaction.mood === 'ai' ? '01' : reaction.mood === 'brooding' ? '……' : '～'}</span>`;
  overlay(`<div class="result-layout"><div class="result-art" aria-hidden="true"><div class="result-art-ink"></div><div class="result-art-paper"></div><div class="result-pose${resultArt ? ' result-pose-generated' : ''}"><div class="result-character${resultArt ? ' result-character-art' : ''}" data-character="${driver.id}" style="background-image:url('${resultArt || driver.sheet}')">${moodArt}</div></div><span class="result-mood-sticker">${escapeText(reaction.tag)}</span>${won ? `<div class="result-confetti">${Array.from({ length: 10 }, (_, i) => `<i style="--piece:${i};left:${8 + i * 9}%"></i>`).join('')}</div>` : ''}</div><div class="result-content"><span class="outcome-stamp">${won ? 'ARRIVED / 通勤成功' : 'TRY AGAIN / 通勤失算'}</span><small class="result-route">${escapeText(stamp)}</small><h2>${won ? '稳稳到站！' : '这趟，失算了。'}</h2><h3>${escapeText(reaction.title)}</h3><div class="result-quote"><small>${driver.name}</small><p>${escapeText(reaction.quote)}</p>${reaction.thought ? `<span>${escapeText(reaction.thought)}</span>` : ''}</div>${stars ? `<div class="level-stars" aria-label="${stars}星">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>` : ''}<div class="result-stats">${stats.map(([label, value]) => `<div><small>${escapeText(label)}</small><strong>${escapeText(value)}</strong></div>`).join('')}</div><p class="result-explanation">${escapeText(explanation)}</p>${record ? `<p class="result-record">${escapeText(record)}</p>` : ''}<div class="result-actions">${actions}</div></div></div>`);
  $('overlay-content').classList.add('result-screen', won ? 'result-won' : 'result-lost');
  $('overlay-content').dataset.mood = reaction.mood;
  $('overlay-content').dataset.character = driver.id;
  $('back-lobby').textContent = '← 车手大厅';
}
function showResult() {
  if (mode === 'levels') { showLevelResult(); return; }
  screen = 'result'; resetInput();
  const won = game.state === 'won', safe = !game.accidents && !game.violations;
  let recordNote = '';
  if (won && !resultSaved) {
    resultSaved = true;
    try {
      if (mode === 'daily' && safe) { const scores = readScores(); scores.push({ day: String(currentSeed), time: game.time, route: game.branch, driver: selectedDriver }); localStorage.setItem('commute-scores-v1', JSON.stringify(scores.slice(-100))); recordNote = '已保存到本机安全到达榜。'; }
      else if (mode === 'random') { const best = Number(localStorage.getItem(selectedDriver === 'clover' ? 'commute-personal-best' : `commute-personal-best-${selectedDriver}`)) || Infinity; if (game.time < best) localStorage.setItem(selectedDriver === 'clover' ? 'commute-personal-best' : `commute-personal-best-${selectedDriver}`, String(game.time)); recordNote = `随机通勤个人最佳 ${formatTime(Math.min(best, game.time))}；不同路况不混排。`; }
      else recordNote = '有碰撞或闯红灯，本次不入安全榜。';
    } catch { recordNote = '浏览器未允许保存记录，本次成绩仍可查看。'; }
    displayScores();
  }
  $('status').textContent = won ? '安全抵达 · 公司门口' : '本次通勤结束';
  showOutcome(won, {
    stats: [['本次得分', game.score()], ['实际用时', formatTime(game.time)], ['剩余车况', `${Math.max(0,Math.round(game.player.health))}%`], ['碰撞 / 闯灯', `${game.accidents} / ${game.violations}`]],
    explanation: won ? safe ? '无碰撞、无闯灯，安全完成本次通勤。' : '已抵达；本次有碰撞或闯灯，不计入安全榜。' : game.reason,
    record: recordNote, stamp: `${mode === 'daily' ? '每日同路况' : '随机通勤'} / ${getDriver(selectedDriver).vehicle}`,
    actions: '<button class="primary" id="retry">同一路线，再开一次 ↗</button><button class="secondary" id="back-home">返回车手大厅</button>',
  });
  $('retry').onclick = () => start(currentSeed, mode); $('back-home').onclick = showLobby;
  sound(won ? 600 : 140, .4);
}
function showLevelResult() {
  screen = 'result'; resetInput(); updateHUD();
  const won = game.state === 'won', last = currentLevel === LEVELS.length - 1;
  let saveNote = '进度保存在当前浏览器。';
  if (won && !resultSaved) {
    resultSaved = true;
    campaignProgress = recordLevel(campaignProgress, currentLevel, { score: game.score(), time: game.time, stars: game.stars() });
    try { localStorage.setItem('commute-levels-v1', JSON.stringify(campaignProgress)); }
    catch { saveNote = '浏览器不允许保存；本次会话仍可继续下一关。'; }
  }
  const total = campaignProgress.records.reduce((sum, record) => sum + (record?.score || 0), 0);
  $('status').textContent = won ? `${game.level.name} · 已通过` : `${game.level.name} · 可以重试`;
  showOutcome(won, {
    stats: [[won ? '本关得分' : '本次得分', game.score()], ['行驶 / 全程', `${Math.min(game.length,Math.floor(game.player.pos))}/${game.length}m`], ['剩余车况', `${Math.max(0,Math.round(game.player.health))}%`], ['实际用时', formatTime(game.time)]],
    explanation: won ? last ? '村路、城市、高速全部通过。这趟稳稳到。' : `下一关：${LEVELS[currentLevel + 1].name}，已解锁。` : game.reason,
    record: `已过关最佳分合计：${total}分。${won ? saveNote : '失败不解锁、不加入过关总分，只重试当前关。'}`,
    stamp: `第${currentLevel + 1}关 / ${game.level.name}`, stars: won ? game.stars() : 0,
    actions: `<button class="primary" id="level-continue">${won ? last ? '查看闯关成绩' : '进入下一关 ↗' : '重试当前关 ↗'}</button>${won ? '<button class="secondary" id="level-retry">再练一次这一关</button>' : ''}<button class="text-button" id="level-map">返回关卡选择</button>`,
  });
  $('level-continue').onclick = won ? last ? showLevelSelect : () => showLevelBriefing(currentLevel + 1) : retryCurrent;
  if ($('level-retry')) $('level-retry').onclick = retryCurrent;
  $('level-map').onclick = showLevelSelect;
  sound(won ? 600 : 140, .4);
}
function updateHUD() {
  const p = game.player;
  $('score').textContent = game.score();
  $('time').innerHTML = `${formatTime(game.time)}<span>.${Math.floor(game.time * 10) % 10}</span>`;
  const distance = Math.max(0, game.length - p.pos);
  $('distance').innerHTML = distance > 1000 ? `${(distance / 1000).toFixed(1)} <span>km</span>` : `${Math.round(distance)} <span>m</span>`;
  $('speed').textContent = Math.round(p.speed * 3.6);
  $('health-bar').style.width = `${Math.max(0, p.health)}%`;
  $('health').textContent = `${p.health > 80 ? '完好' : p.health > 40 ? '轻微车损' : '车损严重'} · ${Math.max(0, Math.round(p.health))}%`;
  $('health-bar').style.background = p.health < 40 ? 'var(--red)' : '';
  $('pedal').textContent = input.brake ? '正在刹车' : input.gas ? '正在加速' : '自动巡航';
  const stage = game.stage(); $('stage').textContent = `0${stage + 1} / ${game.level ? game.level.name : stage === 2 && game.branch ? game.branch === 'shortcut' ? '街巷近道' : '城市主干道' : STAGES[stage]}`;
  $('road-warning').textContent = game.warning();
  document.querySelectorAll('.route-item').forEach((el, i) => { el.classList.toggle('active', i === stage); el.classList.toggle('done', i < stage); });
}
function action(name) {
  if (screen !== 'playing') return;
  if (name === 'left' || name === 'right') game.move(name === 'left' ? -1 : 1);
  if (name === 'horn') { game.horn(); sound(220, .23, 'triangle', .06); }
}
function syncHeld() {
  const pointers = [...heldPointers.values()];
  input.gas = heldKeys.has('ArrowUp') || heldKeys.has('w') || pointers.includes('gas');
  input.brake = heldKeys.has('ArrowDown') || heldKeys.has('s') || heldKeys.has(' ') || pointers.includes('brake');
  document.querySelectorAll('[data-action]').forEach(button => button.classList.toggle('held', button.dataset.action === 'gas' ? input.gas : button.dataset.action === 'brake' ? input.brake : pointers.includes(button.dataset.action)));
}
window.addEventListener('keydown', e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (screen === 'lobby') {
    if (!$('guide-dialog').open && ['ArrowLeft', 'ArrowRight'].includes(key)) {
      e.preventDefault();
      cycleDriver(key === 'ArrowRight' ? 1 : -1);
    }
    return;
  }
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' ', 'h', 'p', 'Escape'].includes(key)) return;
  if (screen !== 'playing' && e.target.closest('button') && key === ' ') return;
  e.preventDefault();
  if (e.repeat) return;
  if (key === 'p' || key === 'Escape') { pause(); return; }
  if (screen !== 'playing') return;
  heldKeys.add(key); syncHeld();
  if (key === 'ArrowLeft' || key === 'a') action('left');
  if (key === 'ArrowRight' || key === 'd') action('right');
  if (key === 'h') action('horn');
});
window.addEventListener('keyup', e => { heldKeys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); syncHeld(); });
document.querySelectorAll('[data-action]').forEach(button => {
  button.addEventListener('pointerdown', e => {
    if (screen !== 'playing') return; e.preventDefault(); button.setPointerCapture(e.pointerId);
    heldPointers.set(e.pointerId, button.dataset.action); syncHeld(); action(button.dataset.action);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, e => { heldPointers.delete(e.pointerId); syncHeld(); });
  // Assistive technologies invoke click without a pointer event.
  button.addEventListener('click', e => { if (e.detail === 0) { const name = button.dataset.action; if (name === 'gas' || name === 'brake') { input[name] = !input[name]; button.classList.toggle('held', input[name]); } else action(name); } });
});
$('pause').onclick = pause;
$('restart').onclick = () => {
  if (screen === 'start' || screen === 'result') { showStart(); return; }
  if (screen === 'playing') { game.state = 'paused'; screen = 'confirm'; }
  else if (screen !== 'paused') return;
  overlay(`<h2>这趟重新开？</h2><p>${mode === 'levels' ? '本关进度会重置，已过关成绩保留。' : '本次进度不保存，路线保持不变。'}</p><button id="confirm-retry" class="primary">重新出发</button><button id="cancel-retry" class="secondary">继续这趟</button>`);
  $('confirm-retry').onclick = retryCurrent;
  $('cancel-retry').onclick = () => { screen = 'paused'; pause(); };
};
$('sound').onclick = () => { muted = !muted; $('sound').textContent = muted ? '静音' : '声音'; $('sound').setAttribute('aria-label', muted ? '开启声音' : '关闭声音'); if (!muted) sound(420); };
window.addEventListener('blur', () => { resetInput(); if (screen === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { resetInput(); if (screen === 'playing') pause(); } });
let hudTick = 0;
function frame(now) {
  const delta = Math.min((now - lastFrame) / 1000 || 0, .1); lastFrame = now;
  if (screen === 'playing') {
    accumulator += delta;
    while (accumulator >= 1 / 60 && game.state === 'running') { game.update(1 / 60, input); accumulator -= 1 / 60; }
    if (game.state === 'choice') showChoice();
    else if (game.state === 'won' || game.state === 'lost') showResult();
  } else accumulator = 0;
  updateReaction();
  document.body.classList.toggle('game-paused', ['paused', 'choice', 'confirm'].includes(screen));
  game.inputBrake = input.brake;
  if (screen !== 'lobby') renderer.render(game, screen === 'start');
  if (now > hudTick) { updateHUD(); hudTick = now + 90; }
  if (game.events.length && screen !== 'start' && screen !== 'lobby') {
    const event = game.events.at(-1); game.events.length = 0; toast(event.message);
    if (event.kind === 'collision') sound(110, .18, 'sawtooth', .03);
    if (event.kind === 'bump') sound(80, .1, 'triangle');
  }
  if (now > toastUntil) $('toast').classList.remove('visible');
  requestAnimationFrame(frame);
}
setupLobby(); showLobby(); updateHUD(); requestAnimationFrame(frame);
