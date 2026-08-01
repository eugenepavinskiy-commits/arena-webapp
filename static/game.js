// === ИНИЦИАЛИЗАЦИЯ TELEGRAM И ЖЕСТКИЙ ФИКС ЭКРАНА ===
if (window.Telegram && window.Telegram.WebApp) { 
    window.tg = window.Telegram.WebApp; 
    tg.ready(); 
    tg.expand(); 
    
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    
    const lockViewport = () => {
        let vh = tg.viewportStableHeight || window.innerHeight;
        document.documentElement.style.height = `${vh}px`;
        document.body.style.height = `${vh}px`;
        document.body.style.position = 'fixed';
        document.body.style.overflow = 'hidden';
        document.body.style.width = '100%';
        window.scrollTo(0, 0);
    };
    
    tg.onEvent('viewportChanged', lockViewport);
    window.addEventListener('resize', lockViewport);
    setTimeout(lockViewport, 50);
    setTimeout(lockViewport, 300);
} else {
    window.tg = null;
    const fallbackLock = () => {
        document.documentElement.style.height = `${window.innerHeight}px`;
        document.body.style.height = `${window.innerHeight}px`;
    };
    window.addEventListener('resize', fallbackLock);
    fallbackLock();
}

const getUserId = () => (window.tg && tg.initDataUnsafe && tg.initDataUnsafe.user) ? String(tg.initDataUnsafe.user.id) : "local_test_user";

// === FIREBASE БЭКЕНД ===
const FIREBASE_URL = "https://arenarpg-default-rtdb.europe-west1.firebasedatabase.app/";

let cachedPlayersList = [];
let currentRatingTab = 'pvp';

// === АУДИО И ЭФФЕКТЫ ===
const STATIC_URL = "static/";
const SFX_FILES = { click: STATIC_URL + "sounds/click.mp3", hit: STATIC_URL + "sounds/hit.mp3", crit: STATIC_URL + "sounds/crit.mp3", dodge: STATIC_URL + "sounds/dodge.mp3", block: STATIC_URL + "sounds/block.mp3", skill: STATIC_URL + "sounds/skill.mp3", coins: STATIC_URL + "sounds/coins.mp3", forge: STATIC_URL + "sounds/forge.mp3", win: STATIC_URL + "sounds/win.mp3", death: STATIC_URL + "sounds/death.mp3" };

const BGM_FILES = { 
    menu: STATIC_URL + "sounds/bgm_menu.mp3", 
    combat: STATIC_URL + "sounds/bgm_combat.mp3", 
    boss: STATIC_URL + "sounds/bgm_boss.mp3" 
};

const BGM_VOLUMES = { menu: 0.15, combat: 0.25, boss: 0.35 };

let sfxMuted = false;
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext({ latencyHint: 'interactive' });
const SFX_BUFFERS = {};
let audioUnlocked = false;

const masterCompressor = audioCtx.createDynamicsCompressor();
masterCompressor.threshold.value = -12;
masterCompressor.knee.value = 10;
masterCompressor.ratio.value = 12;
masterCompressor.attack.value = 0.003;
masterCompressor.release.value = 0.25;
masterCompressor.connect(audioCtx.destination);

const bgmTracks = {};
let currentBgmId = 'menu';
let fadeInterval = null;
const sfxThrottle = {}; 

for (let key in BGM_FILES) {
    bgmTracks[key] = new Audio(BGM_FILES[key]);
    bgmTracks[key].loop = true;
    bgmTracks[key].volume = 0; 
}

function playBGM(trackId) {
    if (currentBgmId === trackId && !bgmTracks[trackId].paused && bgmTracks[trackId].volume > 0) return;
    let oldTrackId = currentBgmId; currentBgmId = trackId; if (sfxMuted || !audioUnlocked) return;
    clearInterval(fadeInterval); let oldAudio = bgmTracks[oldTrackId]; let newAudio = bgmTracks[trackId]; let targetVol = BGM_VOLUMES[trackId] || 0.25;
    if (newAudio.paused) { newAudio.volume = 0; let p = newAudio.play(); if (p !== undefined) p.catch(e => {}); }
    fadeInterval = setInterval(() => {
        let done = true;
        if (oldAudio && oldTrackId !== trackId && oldAudio.volume > 0.02) { oldAudio.volume = Math.max(0, oldAudio.volume - 0.02); done = false; } else if (oldAudio && oldTrackId !== trackId) { oldAudio.pause(); oldAudio.volume = 0; }
        if (newAudio.volume < targetVol - 0.02) { newAudio.volume = Math.min(targetVol, newAudio.volume + 0.02); done = false; } else { newAudio.volume = targetVol; }
        if (done) clearInterval(fadeInterval);
    }, 40);
}

async function initAudio() { for (let key in SFX_FILES) { try { let res = await fetch(SFX_FILES[key]); if (!res.ok) continue; SFX_BUFFERS[key] = await audioCtx.decodeAudioData(await res.arrayBuffer()); } catch(e) {} } }
initAudio();

function unlockAudio() { 
    if (audioUnlocked) return; if (audioCtx.state === 'suspended') audioCtx.resume(); 
    let buffer = audioCtx.createBuffer(1, 1, 22050); let source = audioCtx.createBufferSource(); source.buffer = buffer; source.connect(audioCtx.destination); source.start(0); 
    audioUnlocked = true; document.removeEventListener('touchstart', unlockAudio); document.removeEventListener('click', unlockAudio); 
    if (currentBgmId && !sfxMuted) playBGM(currentBgmId);
}
document.addEventListener('touchstart', unlockAudio, { once: true }); document.addEventListener('click', unlockAudio, { once: true });

function playSFX(id) { 
    if (sfxMuted || !SFX_BUFFERS[id]) return; let now = Date.now(); if (sfxThrottle[id] && now - sfxThrottle[id] < 100) return; sfxThrottle[id] = now;
    if (audioCtx.state === 'suspended') audioCtx.resume(); 
    try { let source = audioCtx.createBufferSource(); source.buffer = SFX_BUFFERS[id]; let gainNode = audioCtx.createGain(); gainNode.gain.value = 0.5; source.connect(gainNode); gainNode.connect(masterCompressor); source.start(0); } catch(e) {} 
}

window.toggleMute = function() { 
    sfxMuted = !sfxMuted; 
    if (sfxMuted) { clearInterval(fadeInterval); for(let key in bgmTracks) { bgmTracks[key].pause(); bgmTracks[key].volume = 0; } } else { playSFX('click'); if (audioUnlocked) playBGM(currentBgmId); }
    updateUI(); 
};

// === ОСТАЛЬНАЯ ЛОГИКА ===
const VFX_DB = { attack_hero: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", attack_enemy: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", knight_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", berserk_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", shadow_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", ranger_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json" };
function playLottieEffect(targetId, animationUrl, extraClass = "") { let targetNode = document.getElementById(targetId); if (!targetNode) return; let fxContainer = document.createElement('div'); fxContainer.className = 'lottie-fx-layer ' + extraClass; targetNode.appendChild(fxContainer); let anim = lottie.loadAnimation({ container: fxContainer, renderer: 'svg', loop: false, autoplay: true, path: animationUrl }); anim.addEventListener('complete', () => { fxContainer.remove(); anim.destroy(); }); }
function shakeScreen() { let app = document.getElementById("app-container"); if(app) { app.classList.remove("shake-hard"); void app.offsetWidth; app.classList.add("shake-hard"); setTimeout(() => app.classList.remove("shake-hard"), 350); } }
function triggerSkillVFX(elementId, vfxClass) { let el = document.getElementById(elementId); if(el) { el.classList.remove(vfxClass); void el.offsetWidth; el.classList.add(vfxClass); setTimeout(() => el.classList.remove(vfxClass), 500); } }

let GOD_MODE = false; let isTurnExecuting = false; 

// === АДМИН-ПАНЕЛЬ ===
const ADMIN_ID = 7495831046;
if (window.tg && tg.initDataUnsafe && tg.initDataUnsafe.user) { if (String(tg.initDataUnsafe.user.id) === String(ADMIN_ID)) { GOD_MODE = true; } }

const CLASS_AVATARS = { knight: STATIC_URL + "knight.png", berserk: STATIC_URL + "berserk.png", shadow: STATIC_URL + "shadow.png", ranger: STATIC_URL + "ranger.png" };
const imgCache = {}; for (let key in CLASS_AVATARS) { imgCache[key] = new Image(); imgCache[key].src = CLASS_AVATARS[key]; }

const CLASSES = {
    knight: { id: "knight", name: "Рыцарь", icon: "🛡️", color: "#fbbf24", lore: "Танк-Рефлект. Выносливость повышает мощь Шипов.", growth: { str: 1, agi: 0, end: 1, mst: 0, luk: 0 }, statWeights: { str_dmg: 1, str_arm: 1, agi_dodge: 0.2, end_hp: 15, mst_block: 1, mst_pen: 0.5, luk_crit: 0.2, luk_drop: 0.1 }, skill: { name: "Эгида", desc: "Блокирует удар и Исцеляет 50% HP.", cd: 3 }, bars: { dmg: 40, def: 100, diff: 20 }, armorMult: 1.25, critDmgMult: 1.4, dodgeMult: 0.9 },
    berserk: { id: "berserk", name: "Берсерк", icon: "🪓", color: "#ef4444", lore: "Стеклянная пушка. Сила дает Пробитие и немного Брони.", growth: { str: 2, agi: 0, end: 0, mst: 0, luk: 0 }, statWeights: { str_dmg: 3, str_arm: 0.5, agi_dodge: 0.5, end_hp: 8, mst_pen: 2, mst_cdmg: 1, luk_crit: 0.5, luk_drop: 0.1 }, skill: { name: "Яростный Удар", desc: "Удар на x2.5 урона.", cd: 3 }, bars: { dmg: 100, def: 30, diff: 50 }, armorMult: 0.85, critDmgMult: 1.9, dodgeMult: 1.0 },
    shadow: { id: "shadow", name: "Тень", icon: "🗡️", color: "#a855f7", lore: "Мастер Контратаки. Ловкость дает силу ответного удара.", growth: { str: 0, agi: 1, end: 0, mst: 1, luk: 0 }, statWeights: { str_dmg: 0.5, agi_dmg: 2, agi_dodge: 0.8, end_hp: 6, mst_cdmg: 3, mst_pen: 1, luk_crit: 0.8, luk_dodge: 0.5, luk_drop: 0.1 }, skill: { name: "Вспышка Тени", desc: "Уворот + Крит на след. ход.", cd: 3 }, bars: { dmg: 85, def: 20, diff: 90 }, armorMult: 1.0, critDmgMult: 2.2, dodgeMult: 1.3 },
    ranger: { id: "ranger", name: "Следопыт", icon: "🏹", color: "#10b981", lore: "Вампир-Охотник. Удача дает Крит и огромный дроп.", growth: { str: 0, agi: 1, end: 0, mst: 0, luk: 1 }, statWeights: { str_dmg: 1, agi_dmg: 1.5, agi_dodge: 0.5, end_hp: 8, mst_pen: 2, mst_crit: 0.5, luk_crit: 0.5, luk_drop: 2.0 }, skill: { name: "Выстрел в Сердце", desc: "Оглушает врага на 1 ход.", cd: 3 }, bars: { dmg: 70, def: 40, diff: 60 }, armorMult: 1.0, critDmgMult: 1.8, dodgeMult: 1.15 }
};

const TALENTS_DATA = {
    knight: [ {lvl:20, opts:[{id:'k1a',n:'Бастион',d:'Блок лечит 5% потер. HP'},{id:'k1b',n:'Шипы',d:'+25% Брони к Урону'},{id:'k1c',n:'Молот',d:'Игнор 30% Брони'}]}, {lvl:40, opts:[{id:'k2a',n:'Крепость',d:'+25% Макс HP'},{id:'k2b',n:'Возмездие',d:'Идеал. блок: возврат 25% урона'},{id:'k2c',n:'Шок',d:'Блок: 25% шанс оглушить'}]}, {lvl:60, opts:[{id:'k3a',n:'Сталь',d:'+50% Брони'},{id:'k3b',n:'Ярость',d:'Урон +20%'},{id:'k3c',n:'Святость',d:'Навык лечит 50% HP'}]}, {lvl:80, opts:[{id:'k4a',n:'Иммунитет',d:'Иммунитет к критам'},{id:'k4b',n:'Тяжесть',d:'МСТ дает +2% Блока'},{id:'k4c',n:'Рвение',d:'КД навыка -1 ход'}]}, {lvl:100, opts:[{id:'k5a',n:'Второе дыхание',d:'<30% HP: Броня x2'},{id:'k5b',n:'Зеркало',d:'Идеал. блок: возврат 50% урона'},{id:'k5c',n:'Кара',d:'Удары игнорируют блок'}]} ],
    berserk: [ {lvl:20, opts:[{id:'b1a',n:'Вампир',d:'Лечит 15% от урона'},{id:'b1b',n:'Гнев',d:'Комбо растет x2 быстрее'},{id:'b1c',n:'Крушитель',d:'Ломает броню с 1 удара'}]}, {lvl:40, opts:[{id:'b2a',n:'Толстая кожа',d:'+20% Макс HP'},{id:'b2b',n:'Жестокость',d:'+50% Крит Урон'},{id:'b2c',n:'Палач',d:'+25% урона по сломанному'}]}, {lvl:60, opts:[{id:'b3a',n:'Регенерация',d:'+5 HP каждый ход'},{id:'b3b',n:'Агония',d:'Бонус от ран x2'},{id:'b3c',n:'Пробитие',d:'+30% Игнор брони'}]}, {lvl:80, opts:[{id:'b4a',n:'Стойкость',d:'Входящий урон -15%'},{id:'b4b',n:'Транс',d:'Комбо не сбрасывается от урона'},{id:'b4c',n:'Кровоточивость',d:'Криты бьют зону x3'}]}, {lvl:100, opts:[{id:'b5a',n:'Бессмертие',d:'Выживает с 1 HP (1 раз)'},{id:'b5b',n:'Аватар',d:'Крит урон до +100% при лоу HP'},{id:'b5c',n:'Резня',d:'50% Игнор брони'}]} ],
    shadow: [ {lvl:20, opts:[{id:'s1a',n:'Ветер',d:'Кап уворота 65%'},{id:'s1b',n:'Убийца',d:'100% крит по фулл HP'},{id:'s1c',n:'Яд',d:'Яд: 50% от МСТ в виде урона'}]}, {lvl:40, opts:[{id:'s2a',n:'Тень',d:'Уворот лечит 5% потер. HP'},{id:'s2b',n:'Призрак',d:'Игнор блока врага'},{id:'s2c',n:'Пиявка',d:'Яд лечит Тень'}]}, {lvl:60, opts:[{id:'s3a',n:'Рефлекс',d:'+15% Уворот'},{id:'s3b',n:'Точность',d:'+20% Крит шанс'},{id:'s3c',n:'Токсин',d:'Урон яда +50%'}]}, {lvl:80, opts:[{id:'s4a',n:'Контратака',d:'Уворот бьет 100% урона'},{id:'s4b',n:'Ассасин',d:'КД навыка -1 ход'},{id:'s4c',n:'Слабость',d:'Яд режет урон врага на 20%'}]}, {lvl:100, opts:[{id:'s5a',n:'Мираж',d:'50% шанс увернуться всегда'},{id:'s5b',n:'Казнь',d:'Ваншот врага <10% HP'},{id:'s5c',n:'Эпидемия',d:'Яд стакается до 3 раз'}]} ],
    ranger: [ {lvl:20, opts:[{id:'r1a',n:'Снайпер',d:'В голову: +30% крит шанс'},{id:'r1b',n:'Мародер',d:'Золото x2'},{id:'r1c',n:'Ловчий',d:'Замедление (пропуск 3-го хода)'}]}, {lvl:40, opts:[{id:'r2a',n:'Пронзание',d:'Криты игнорят 40% брони'},{id:'r2b',n:'Искатель',d:'Шанс Реликвии +50%'},{id:'r2c',n:'Ловушка',d:'Ульта босса позже на 3 хода'}]}, {lvl:60, opts:[{id:'r3a',n:'Мощь',d:'Урон +20%'},{id:'r3b',n:'Жадность',d:'Алмазы с рейдов +50%'},{id:'r3c',n:'Проворство',d:'+10% Уворот'}]}, {lvl:80, opts:[{id:'r4a',n:'Хедшот',d:'В голову: +50% Крит Урон'},{id:'r4b',n:'Торгаш',d:'Цены в Лавке -20%'},{id:'r4c',n:'Подавление',d:'Урон боссов -10%'}]}, {lvl:100, opts:[{id:'r5a',n:'Меткость',d:'Навык срезает 15% брони босса'},{id:'r5b',n:'Клад',d:'20% шанс на х2 Реликвии с босса'},{id:'r5c',n:'Ослепление',d:'Враг мажет с шансом 20%'}]} ]
};

const SETS_DB = { templar: { name: "Твердыня Храмовника", p2: "+25% Брони, Кап Блока 60%", p4: "Идеал. блок лечит 5% от недостающего HP и возвращает 20% урона." }, bloodied: { name: "Кровавый Оскал", p2: "+30% Крит. Урона, +20% Макс HP", p4: "Жажда Крови: Урон растет от ран. Выживает с 1 HP (1 раз), но получает +50% входящего урона. Вамп макс 20% HP." }, void: { name: "Шёпот Пустоты", p2: "+15% Уворот, Кап Уворота 75%", p4: "Фантом: Уворот отравляет врага Ядом. Крит после уворота игнорирует 30% брони." }, storm: { name: "Глаз Бури", p2: "Удача (УДЧ) x2", p4: "Снайпер: Удар в 'Голову' дает +100% Крит. урона и 20% шанс наложить Оглушение." } };

const ITEMS_DB = {
    "pot_heal_1": { id: "pot_heal_1", name: "Малое Зелье Здоровья", type: "consumable", subtype: "heal", power: 100, icon: "🧪", imageId: "pot_heal_1", rarity: "rare", lvl: 1, price: 80, inShop: true, desc: "Восстанавливает 100 HP.", stats: {} },
    "pot_heal_2": { id: "pot_heal_2", name: "Великое Зелье", type: "consumable", subtype: "heal", power: 250, icon: "🏺", imageId: "pot_heal_2", rarity: "epic", lvl: 5, price: 250, inShop: true, desc: "Восстанавливает 250 HP.", stats: {} },
    "scroll_fire": { id: "scroll_fire", name: "Свиток Метеорита", type: "consumable", subtype: "dmg_fire", power: 150, icon: "📜", imageId: "scroll_fire", rarity: "epic", lvl: 1, price: 150, inShop: true, desc: "Наносит 150 🔥 урона.", stats: {} },
    "scroll_ice": { id: "scroll_ice", name: "Свиток Бурана", type: "consumable", subtype: "dmg_ice", power: 150, icon: "❄️", imageId: "scroll_ice", rarity: "epic", lvl: 1, price: 150, inShop: true, desc: "Наносит 150 ❄️ урона.", stats: {} },
    
    "base_sword": { id: "base_sword", name: "Клинок", type: "weapon1", icon: "🗡️", rarity: "common", lvl: 1, price: 50, inShop: false, allowedClasses: ["knight", "berserk"], stats: { atk: 6 }, imgPrefix: "sword", maxImages: 7 },
    "base_dagger": { id: "base_dagger", name: "Кинжал", type: "weapon1", icon: "🗡️", rarity: "common", lvl: 1, price: 40, inShop: false, allowedClasses: ["shadow", "ranger"], stats: { atk: 5 }, imgPrefix: "dagger", maxImages: 2 },
    "base_two_handed": { id: "base_two_handed", name: "Двуручный меч", type: "two_handed", icon: "🗡️", rarity: "common", lvl: 1, price: 70, inShop: false, allowedClasses: ["berserk"], stats: { atk: 12 }, imgPrefix: "two_handed", maxImages: 2 },
    "base_shield": { id: "base_shield", name: "Щит", type: "weapon2", icon: "🛡️", rarity: "common", lvl: 1, price: 45, inShop: false, allowedClasses: ["knight"], stats: { armor: 8, blockChance: 5 }, imgPrefix: "shield", maxImages: 7 },
    "base_head": { id: "base_head", name: "Шлем", type: "head", icon: "🪖", rarity: "common", lvl: 1, price: 40, inShop: false, stats: { armor: 6 }, imgPrefix: "head", maxImages: 7 },
    "base_chest": { id: "base_chest", name: "Доспех", type: "chest", icon: "👕", rarity: "common", lvl: 1, price: 50, inShop: false, stats: { armor: 10 }, imgPrefix: "chest", maxImages: 9 },
    "base_boots": { id: "base_boots", name: "Обувь", type: "boots", icon: "👢", rarity: "common", lvl: 1, price: 35, inShop: false, stats: { armor: 4 }, imgPrefix: "boots", maxImages: 1 },
    "base_belt": { id: "base_belt", name: "Пояс", type: "belt", icon: "➰", rarity: "common", lvl: 1, price: 55, inShop: false, stats: { end: 2 }, imgPrefix: "belt", maxImages: 2 },
    "base_ring": { id: "base_ring", name: "Кольцо", type: "ring", icon: "💍", rarity: "common", lvl: 1, price: 60, inShop: false, stats: { luk: 2 }, imgPrefix: "ring", maxImages: 3 },
    "base_amulet": { id: "base_amulet", name: "Амулет", type: "amulet", icon: "📿", rarity: "common", lvl: 1, price: 65, inShop: false, stats: { mst: 2 }, imgPrefix: "amulet", maxImages: 1 }
};

let SHOP_ASSORTMENT = Object.keys(ITEMS_DB).filter(id => ITEMS_DB[id].inShop);
const PREFIXES = ["Древний", "Проклятый", "Пылающий", "Забытый", "Рунный", "Теневой", "Божественный"];

const NORMAL_MOBS = [ { id: 1, name: "Гвардеец" }, { id: 2, name: "Змей" }, { id: 3, name: "Жаба" }, { id: 4, name: "Кентавр" }, { id: 5, name: "Воин" }, { id: 6, name: "Единорог" }, { id: 7, name: "Палач" }, { id: 8, name: "Ифрит" }, { id: 9, name: "Минотавр" }, { id: 10, name: "Червь" } ];
const BOSSES = { 10: { id: 21, name: "Тень" }, 20: { id: 22, name: "Око" }, 30: { id: 23, name: "Мимик" }, 40: { id: 24, name: "Смерч" }, 50: { id: 25, name: "Терраск" }, 60: { id: 26, name: "Вендиго" }, 70: { id: 27, name: "Голем" }, 80: { id: 28, name: "Гидра" }, 90: { id: 29, name: "Механоид" }, 100: { id: 30, name: "Суккуб" } };

const RAID_BOSSES = [
    { id: "raid_1", name: "Костяной Голем", imgId: 27, diff: "Легкий", desc: "Гарант: Эпический сет по Уровню.", hpMult: 3, atkMult: 1.2, armMult: 1, gemReward: 2, res_fire: 50, res_ice: -20 },
    { id: "raid_2", name: "Архилич Тьмы", imgId: 21, diff: "Средний", desc: "Гарант: Легендарный сет по Уровню.", hpMult: 5, atkMult: 1.8, armMult: 1.5, gemReward: 5, dmg_dark: 30, res_dark: 80, res_holy: -50 },
    { id: "raid_3", name: "Древний Дракон", imgId: 17, diff: "Хардкор", desc: "Гарант: Реликтовый сет по Уровню.", hpMult: 8, atkMult: 2.5, armMult: 2, gemReward: 10, dmg_fire: 50, res_fire: 80, res_ice: -50 }
];

const DAILY_QUESTS = { "kill_mobs": { name: "Охотник на монстров", desc: "Победите 10 обычных или элитных врагов.", target: 10, rewardGems: 2 }, "forge_upg": { name: "Мастер-кузнец", desc: "Улучшите любой предмет в кузнице 3 раза.", target: 3, rewardGems: 2 }, "boss_dmg": { name: "Убийца гигантов", desc: "Нанесите 2000 урона Мировым Боссам.", target: 2000, rewardGems: 3 } };

const BOSS_EVENTS = [
    { id: "blood_pact", title: "Кровавый Контракт", desc: "Огромный урон ценой здоровья. Работает на всех этажах.", buffText: "+40% Урон", debuffText: "-30% Макс Здоровья", apply: (stats) => { stats.damage = Math.floor(stats.damage * 1.4); stats.hp = Math.floor(stats.hp * 0.7); } },
    { id: "iron_will", title: "Железная Воля", desc: "Проклятые доспехи защитят вас, но сделают удары медленными.", buffText: "+50% Броня", debuffText: "-20% Урон", apply: (stats) => { stats.armor = Math.floor(stats.armor * 1.5); stats.damage = Math.floor(stats.damage * 0.8); } },
    { id: "shadow_step", title: "Шепот Тени", desc: "Неуловимость в обмен на защиту. Работает на всех этажах.", buffText: "+20% Уворот и Крит", debuffText: "-40% Броня", apply: (stats) => { stats.dodge = Math.min(95, parseFloat(stats.dodge) + 20).toFixed(1); stats.critChance = Math.min(100, parseFloat(stats.critChance) + 20).toFixed(1); stats.armor = Math.floor(stats.armor * 0.6); } },
    { id: "berserker_rage", title: "Безумие Берсерка", desc: "Убить или умереть. Никакой защиты.", buffText: "+75% Урон", debuffText: "Броня падает до 0", apply: (stats) => { stats.damage = Math.floor(stats.damage * 1.75); stats.armor = 0; } }
];

let currentScreen = "hero"; let shopMode = "buy"; let previewClassId = "knight"; let inspectInvIndex = null; let forgeSelectedIndex = null; 
let enemy = null; let combatMode = 'pve'; 
let combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0, undyingUsed: false, potionUsed: false, scrollUsed: false };
let savedPveEnemy = null; let savedPveState = null;

let hero = { name: "Гладиатор", rating: 1000, level: 1, floor: 1, maxFloor: 1, exp: 0, expNext: 100, gold: 5000, unspentPoints: 0, gems: 0, tickets: 3, maxTickets: 3, nextTicketTime: 0, baseClass: "knight", hp: 100, maxHp: 100, baseStats: { str: 5, agi: 5, end: 10, mst: 5, luk: 5 }, equipment: { head: null, chest: null, belt: null, boots: null, amulet: null, ring1: null, ring2: null, weapon1: null, weapon2: null }, inventory: ["pot_heal_1", "pot_heal_1"], talents: [], finalStats: {}, combatStats: {}, deathDebuffEnd: 0, setCounts: {}, flags: {}, questDate: "", quests: {}, activeAltar: null, altarOffers: {}, friends: [] };
if (window.tg && tg.initDataUnsafe && tg.initDataUnsafe.user) hero.name = tg.initDataUnsafe.user.first_name || "Гладиатор";

const hasTalent = (id) => hero.talents && Array.isArray(hero.talents) && hero.talents.includes(id);
const getShopPrice = (basePrice) => hasTalent('r4b') ? Math.floor(basePrice * 0.8) : basePrice;
const SECONDARY_STATS = ['str', 'agi', 'end', 'mst', 'luk', 'critChance', 'dodgeChance', 'armorPen', 'critDmg', 'lifesteal', 'counter', 'thorns'];

function createDynamicItem(baseTemplateId, targetLevel, rarity, isBoss = false, isRaid = false) {
    let baseItem = ITEMS_DB[baseTemplateId]; if(!baseItem) return null;
    let newItem = JSON.parse(JSON.stringify(baseItem));
    
    newItem.id = baseTemplateId + "_" + Date.now() + Math.floor(Math.random()*1000);
    
    if (baseItem.maxImages && baseItem.imgPrefix) {
        let randomNum = Math.floor(Math.random() * baseItem.maxImages) + 1;
        newItem.imageId = baseItem.imgPrefix + "_" + randomNum;
    }

    newItem.lvl = targetLevel; newItem.inShop = false; newItem.dropOnly = true;
    
    let rarities = { "common": 1.0, "rare": 1.3, "epic": 1.7, "legendary": 2.2, "relic": 3.0 };
    newItem.rarity = rarity; let rMult = rarities[rarity] || 1.0;
    
    let statMult = 1 + (targetLevel * 0.1); 
    let finalMult = statMult * rMult * (0.85 + Math.random() * 0.3);

    for (let s in newItem.stats) newItem.stats[s] = Math.max(1, Math.ceil(newItem.stats[s] * finalMult));

    let extraStatsCount = { "common": 0, "rare": 1, "epic": 2, "legendary": 3, "relic": 4 }[rarity] || 0;
    let possibleStats = SECONDARY_STATS.filter(s => !newItem.stats[s]);
    for(let i=0; i<extraStatsCount; i++) {
        if(possibleStats.length === 0) break;
        let idx = Math.floor(Math.random() * possibleStats.length);
        let statName = possibleStats[idx]; possibleStats.splice(idx, 1);
        
        let isPct = ['critChance', 'dodgeChance', 'lifesteal', 'counter', 'thorns', 'blockChance'].includes(statName);
        if (isPct) {
            let pctBase = { "common": 2, "rare": 3, "epic": 5, "legendary": 7, "relic": 10 }[rarity] || 2;
            newItem.stats[statName] = pctBase + Math.floor(Math.random() * 3);
        } else if (statName === 'critDmg') {
            newItem.stats[statName] = Math.floor(10 * finalMult);
        } else {
            newItem.stats[statName] = Math.floor(3 * finalMult);
        }
    }

    if(isBoss) { let prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]; newItem.name = `✨ ${prefix} ${baseItem.name}`; }
    if(isRaid) { let classSetMap = { "knight": "templar", "berserk": "bloodied", "shadow": "void", "ranger": "storm" }; newItem.setId = classSetMap[hero.baseClass]; }

    newItem.price = Math.floor(baseItem.price * finalMult * 2.5); ITEMS_DB[newItem.id] = newItem; return newItem;
}

function generateLootDrop(enemyObj) {
    let dropChance = 0; let rarity = "common"; let isBoss = false; let isRaid = false;
    let uckBonus = hero.combatStats.luk * (CLASSES[hero.baseClass].statWeights.luk_drop || 0.1);
    if(hero.flags.storm) uckBonus *= 2;

    if (enemyObj.isRaid) {
        dropChance = 100; isRaid = true; isBoss = true;
        if(enemyObj.raidData.id === "raid_1") rarity = "epic";
        else if(enemyObj.raidData.id === "raid_2") rarity = "legendary";
        else rarity = "relic";
    } else if (enemyObj.isBoss) {
        dropChance = 100; isBoss = true; let r = Math.random() * 100;
        if(r < 10) rarity = "relic"; else if(r < 50) rarity = "legendary"; else rarity = "epic";
    } else if (enemyObj.isMiniBoss) {
        dropChance = 30 + (uckBonus * 2); let r = Math.random() * 100;
        if(r < 10) rarity = "legendary"; else if(r < 40) rarity = "epic"; else rarity = "rare";
    } else {
        dropChance = 2 + uckBonus; let r = Math.random() * 100;
        if(r < 1) rarity = "epic"; else if(r < 20) rarity = "rare"; else rarity = "common";
    }

    if (Math.random() * 100 <= dropChance) {
        let pool = Object.keys(ITEMS_DB).filter(id => !ITEMS_DB[id].inShop && ITEMS_DB[id].type !== "consumable" && !ITEMS_DB[id].dropOnly && !id.includes('_upg_') && (!ITEMS_DB[id].allowedClasses || ITEMS_DB[id].allowedClasses.includes(hero.baseClass)));
        if(pool.length === 0) return null;
        let baseTemplate = pool[Math.floor(Math.random() * pool.length)];
        
        let targetLevel = enemyObj.floor;
        if(isRaid) { targetLevel = Math.floor(hero.level / 20) * 20; if (targetLevel === 0) targetLevel = 1; }
        
        return createDynamicItem(baseTemplate, targetLevel, rarity, isBoss, isRaid);
    }
    return null;
}

// === СИСТЕМА СОХРАНЕНИЙ И ЗАГРУЗКИ (ПРИОРИТЕТ TELEGRAM CLOUD + FIREBASE) ===
async function syncSaveToServer() { 
    try { 
        let payload = { 
            id: String(getUserId()), 
            name: hero.name, 
            cls: hero.baseClass, 
            level: hero.level, 
            rating: hero.rating, 
            maxFloor: hero.maxFloor || 1,
            gold: hero.gold || 0,
            lastUpdate: Date.now() 
        };
        await fetch(FIREBASE_URL + 'players/' + getUserId() + '.json', { 
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        }); 
    } catch (e) { console.warn("Фоновая синхронизация с Firebase не удалась.", e); } 
}

function saveGame() {
    try {
        hero.inventory = hero.inventory.filter(id => ITEMS_DB[id]);
        let heroStr = JSON.stringify(hero); 
        localStorage.setItem('tg_rpg_hero', heroStr);
        
        let activeItemIds = [...hero.inventory]; 
        for (let key in hero.equipment) { if (hero.equipment[key] && hero.equipment[key].id !== "blocked") activeItemIds.push(hero.equipment[key].id); }
        let customItems = {}; 
        for(let key in ITEMS_DB) { if((ITEMS_DB[key].dropOnly || ITEMS_DB[key].id.includes('_upg_')) && activeItemIds.includes(key)) customItems[key] = ITEMS_DB[key]; }
        let itemsStr = JSON.stringify(customItems); 
        localStorage.setItem('tg_rpg_custom_items', itemsStr);
        
        if (window.tg && tg.CloudStorage) { 
            tg.CloudStorage.setItem('tg_rpg_hero', heroStr); 
            tg.CloudStorage.setItem('tg_rpg_custom_items', itemsStr); 
        }
        syncSaveToServer();
    } catch (e) { console.error("Ошибка сохранения.", e); }
}

function applyLoadedSave(savedHero, savedItems) {
    if(savedItems) { try { let parsedItems = JSON.parse(savedItems); Object.assign(ITEMS_DB, parsedItems); } catch(e) {} }
    if(savedHero) { 
        try {
            let h = JSON.parse(savedHero); 
            if (h && typeof h === 'object') {
                if(isNaN(h.hp)) h.hp = 100; if(h.gems === undefined) h.gems = 0; if(h.tickets === undefined) h.tickets = 3; if(h.maxTickets === undefined) h.maxTickets = 3; if(h.nextTicketTime === undefined) h.nextTicketTime = 0; if(h.unspentPoints === undefined) h.unspentPoints = 0; if(!Array.isArray(h.talents)) h.talents = []; if(!h.setCounts) h.setCounts = {}; if(!h.flags) h.flags = {}; if(!h.quests) h.quests = {}; if(!h.questDate) h.questDate = ""; if(h.rating === undefined) h.rating = 1000; if(!h.baseClass || !CLASSES[h.baseClass]) h.baseClass = 'knight'; if(!Array.isArray(h.inventory)) h.inventory = []; if(!h.equipment) h.equipment = { head: null, chest: null, belt: null, boots: null, amulet: null, ring1: null, ring2: null, weapon1: null, weapon2: null }; if(!h.baseStats) h.baseStats = { str: 5, agi: 5, end: 10, mst: 5, luk: 5 };
                if(!Array.isArray(h.friends)) h.friends = []; 
                for(let k in h) { if(h[k] !== undefined) hero[k] = h[k]; }
            }
        } catch(e) { console.error("Ошибка чтения сейва", e); }
    }
    previewClassId = hero.baseClass; 
    try { calculateStats(); updateUI(); } catch(e) { 
        console.error("Критический сбой рендера:", e); localStorage.removeItem('tg_rpg_hero'); localStorage.removeItem('tg_rpg_custom_items');
        if (window.tg && tg.CloudStorage) { tg.CloudStorage.removeItem('tg_rpg_hero'); tg.CloudStorage.removeItem('tg_rpg_custom_items'); }
        alert("Критическая ошибка сейва. Кэш сброшен, игра перезапускается."); location.reload();
    }
}

async function loadGame() {
    let loadedFromCloud = false;
    if (window.tg && tg.CloudStorage) {
        try {
            let cloudValues = await new Promise((resolve) => {
                tg.CloudStorage.getItems(['tg_rpg_hero', 'tg_rpg_custom_items'], (err, values) => {
                    if (!err && values) resolve(values); else resolve(null);
                });
            });
            if (cloudValues && cloudValues['tg_rpg_hero']) {
                applyLoadedSave(cloudValues['tg_rpg_hero'], cloudValues['tg_rpg_custom_items']);
                loadedFromCloud = true;
            }
        } catch(e) { console.error("Ошибка при чтении из CloudStorage:", e); }
    }
    if (!loadedFromCloud) {
        try { let localHero = localStorage.getItem('tg_rpg_hero'); let localItems = localStorage.getItem('tg_rpg_custom_items'); if (localHero) applyLoadedSave(localHero, localItems); } catch(e) {}
    }
    playBGM('menu');
}

function hardReset() { if(confirm("СБРОС ПРОГРЕССА НАВСЕГДА! Вы уверены?")) { localStorage.removeItem('tg_rpg_hero'); localStorage.removeItem('tg_rpg_custom_items'); if (window.tg && tg.CloudStorage) { tg.CloudStorage.removeItem('tg_rpg_hero'); tg.CloudStorage.removeItem('tg_rpg_custom_items'); } location.reload(); } }

function checkDailyQuests() { let today = new Date().toDateString(); if (hero.questDate !== today) { hero.questDate = today; hero.quests = { "kill_mobs": { progress: 0, claimed: false }, "forge_upg": { progress: 0, claimed: false }, "boss_dmg": { progress: 0, claimed: false } }; saveGame(); } }
function addQuestProgress(qId, amount) { if (!hero.quests || !hero.quests[qId]) return; if (hero.quests[qId].claimed) return; hero.quests[qId].progress += amount; let target = DAILY_QUESTS[qId].target; if (hero.quests[qId].progress > target) hero.quests[qId].progress = target; saveGame(); }
function claimQuest(qId) { let q = hero.quests[qId]; let def = DAILY_QUESTS[qId]; if (!q || q.claimed || q.progress < def.target) return; q.claimed = true; hero.gems += def.rewardGems; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); playSFX('coins'); saveGame(); updateUI(); }

// === БЕЗОПАСНЫЙ ГЛОБАЛЬНЫЙ ТАЙМЕР ===
setInterval(() => {
    if (hero.tickets < hero.maxTickets) { 
        if (hero.nextTicketTime === 0) hero.nextTicketTime = Date.now() + 60 * 60 * 1000; 
        if (Date.now() >= hero.nextTicketTime) { 
            hero.tickets++; 
            if (hero.tickets < hero.maxTickets) hero.nextTicketTime = Date.now() + 60 * 60 * 1000; 
            else hero.nextTicketTime = 0; 
            saveGame(); 
            if (!isTurnExecuting) updateUI(); 
        } 
    }
    
    let bloodScreen = document.getElementById('blood-screen');
    if (hero.deathDebuffEnd > Date.now()) { 
        let left = Math.ceil((hero.deathDebuffEnd - Date.now())/1000); let m = Math.floor(left/60); let s = left%60; 
        let el = document.getElementById('ui-debuff-timer'); 
        if(el) { el.innerText = `ШТРАФ СМЕРТИ: ${m}:${s<10?'0':''}${s}`; el.style.display = 'block'; } 
        if(bloodScreen) bloodScreen.classList.add('active'); 
    } 
    else { 
        let el = document.getElementById('ui-debuff-timer'); 
        if(el && hero.deathDebuffEnd !== 0) { 
            el.style.display = 'none'; hero.deathDebuffEnd = 0; 
            if(bloodScreen) bloodScreen.classList.remove('active'); 
            calculateStats(); 
            if (!isTurnExecuting) updateUI(); 
        } 
    }

    let tTimer = document.getElementById("ui-ticket-timer"); 
    if (tTimer) { 
        if (hero.tickets >= hero.maxTickets) tTimer.innerText = "Максимум билетов"; 
        else { let left = Math.ceil((hero.nextTicketTime - Date.now())/1000); let m = Math.floor(left/60); let s = left%60; tTimer.innerText = `До следующего: ${m}:${s<10?'0':''}${s}`; } 
    }
}, 1000);

function getExpReq(lvl) { return Math.floor(100 * Math.pow(1.15, lvl - 1)); }

function generateEnemy(floorLevel) {
    let isMegaBoss = floorLevel % 10 === 0; let isMiniBoss = floorLevel % 5 === 0 && !isMegaBoss;
    let mobData; if (isMegaBoss) { let bossKey = floorLevel > 100 ? 100 : floorLevel; mobData = BOSSES[bossKey] || BOSSES[10]; } else { let normalFloorCount = floorLevel - Math.floor(floorLevel / 10); let mobIndex = (normalFloorCount - 1) % NORMAL_MOBS.length; mobData = NORMAL_MOBS[mobIndex]; }
    let name = mobData.name; let mobImgUrl = `${STATIC_URL}mobs/B_${mobData.id}_high_resolution.png`; let bgImg = isMegaBoss ? 'throne.png' : 'grave.png'; let bgUrl = `${STATIC_URL}begraund/${bgImg}`;
    if (isMegaBoss) name = "👑 " + name; else if (isMiniBoss) name = "☠️ " + name + " (Элита)";
    let statMult = 1 + (floorLevel * 0.04); let hp = Math.floor((30 + floorLevel * 12) * statMult); let atk = Math.floor((6 + floorLevel * 3) * statMult); let armor = Math.floor(floorLevel * 1.2);
    if (isMiniBoss) { hp = Math.floor(hp * 1.5); atk = Math.floor(atk * 1.3); } if (isMegaBoss) { hp = Math.floor(hp * 2.5); atk = Math.floor(atk * 1.6); armor = Math.floor(armor * 1.5); }
    let baseEnemy = { name: name, floor: floorLevel, imgUrl: mobImgUrl, bgUrl: bgUrl, isBoss: isMegaBoss, isMiniBoss: isMiniBoss, isRaid: false, hp: hp, maxHp: hp, nextAtkZone: ["head", "chest", "legs"][Math.floor(Math.random()*3)], turnCounter: 0, stats: { atk: atk, armor: armor, critChance: 5, dodge: 4, armorPen: Math.floor(floorLevel / 2) } };
    if (isMegaBoss || isMiniBoss) { let elems = ['fire', 'ice', 'dark', 'holy']; let randElem = elems[Math.floor(Math.random() * elems.length)]; baseEnemy.stats[`dmg_${randElem}`] = Math.floor(floorLevel * 1.5); baseEnemy.stats[`res_${randElem}`] = 50; let weakMap = { fire:'ice', ice:'fire', dark:'holy', holy:'dark' }; baseEnemy.stats[`res_${weakMap[randElem]}`] = -30; }
    return baseEnemy;
}

function changeFloor(dir) { 
    hero.inventory = hero.inventory.filter(id => ITEMS_DB[id]);
    if (hero.inventory.length > 15) return alert("⚠️ Сумка переполнена! Продайте или наденьте лишние вещи (Максимум 15), чтобы сражаться дальше.");
    hero.floor += dir; if (hero.floor < 1) hero.floor = 1; if (hero.floor > hero.maxFloor) hero.floor = hero.maxFloor; playSFX('click'); saveGame(); initCombat(); 
}

function initCombat() {
    hero.inventory = hero.inventory.filter(id => ITEMS_DB[id]);
    if (hero.inventory.length > 15) { if (currentScreen !== 'hero') openScreen('hero'); return alert("⚠️ Сумка переполнена! Продайте или наденьте лишние вещи (Максимум 15), чтобы начать бой."); }
    combatMode = 'pve'; enemy = generateEnemy(hero.floor); 
    combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0, undyingUsed: false, potionUsed: false, scrollUsed: false };
    calculateStats(true); 
    if (enemy.isBoss && !hero.activeAltar) { if (!hero.altarOffers) hero.altarOffers = {}; if (!hero.altarOffers[hero.floor]) { hero.altarOffers[hero.floor] = BOSS_EVENTS[Math.floor(Math.random() * BOSS_EVENTS.length)].id; saveGame(); } updateUI(); showBossEventModal(hero.altarOffers[hero.floor]); } else { startCombatProper(); }
}

function showBossEventModal(eventId) {
    let event = BOSS_EVENTS.find(e => e.id === eventId); let overlay = document.createElement('div'); overlay.id = "boss-event-overlay"; overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; display:flex; justify-content:center; align-items:center; padding:20px; backdrop-filter:blur(5px); transition: opacity 0.2s ease-in-out;";
    overlay.innerHTML = `<div style="background:#18181b; border:1px solid #3f3f46; border-radius:16px; padding:20px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.8); max-width:320px; width:100%;"><div style="font-size:40px; margin-bottom:10px;">🔮</div><div style="color:#fbbf24; font-size:18px; font-weight:900; margin-bottom:10px; text-shadow: 0 0 10px rgba(251,191,36,0.5);">${event.title}</div><div style="color:#a1a1aa; font-size:13px; margin-bottom:15px; line-height:1.4;">${event.desc}</div><div style="background:#27272a; padding:10px; border-radius:8px; margin-bottom:20px; display:flex; flex-direction:column; gap:6px; text-align:left; border: 1px solid #3f3f46;"><div style="color:#34d399; font-size:12px; font-weight:bold;">🟢 ${event.buffText}</div><div style="color:#ef4444; font-size:12px; font-weight:bold;">🔴 ${event.debuffText}</div></div><div style="display:flex; gap:10px;"><button style="flex:1; padding:12px; background:#fbbf24; color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer; box-shadow:0 4px 10px rgba(251,191,36,0.3);" onclick="acceptBossEvent('${event.id}')">Принять</button><button style="flex:1; padding:12px; background:#3f3f46; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="declineBossEvent()">Отказаться</button></div></div>`;
    document.body.appendChild(overlay);
}

window.acceptBossEvent = function(eventId) { let el = document.getElementById("boss-event-overlay"); if(el) el.remove(); hero.activeAltar = eventId; saveGame(); playSFX('skill'); startCombatProper(); };
window.declineBossEvent = function() { let el = document.getElementById("boss-event-overlay"); if(el) el.remove(); playSFX('click'); startCombatProper(); };

function startCombatProper() { 
    calculateStats(true); 
    if (hero.hp > hero.combatStats.hp && !GOD_MODE) hero.hp = hero.combatStats.hp; 
    let title = document.getElementById("combat-stage-name"); 
    document.getElementById("enemy-rage-bg").style.display = "none"; 
    
    if (title) { 
        if (enemy.isBoss) { 
            title.innerText = `МЕГА-БОСС`; title.className = "combat-header boss"; document.getElementById("enemy-rage-bg").style.display = "block";
            playBGM('boss');
        } else if (enemy.isMiniBoss) { 
            title.innerText = `ЭЛИТНЫЙ ВРАГ`; title.className = "combat-header boss";
            playBGM('combat');
        } else { 
            title.innerText = `ОБЫЧНЫЙ ВРАГ`; title.className = "combat-header";
            playBGM('combat');
        } 
    } 
    let log = document.getElementById("combat-log"); if (log) log.innerHTML = ``; planEnemyTurn(); updateUI(); 
}

function startRaid(bossId) {
    hero.inventory = hero.inventory.filter(id => ITEMS_DB[id]);
    if (hero.inventory.length > 15) { if (currentScreen !== 'hero') openScreen('hero'); return alert("⚠️ Сумка переполнена! Продайте или наденьте вещи (Максимум 15), чтобы начать бой."); }
    if (hero.tickets < 1) return alert("Нет билетов рейда!"); if (hero.hp <= 0) return alert("Герой мертв!"); hero.tickets--; saveGame(); playSFX('click');
    if (combatMode === 'pve') { savedPveEnemy = JSON.parse(JSON.stringify(enemy)); savedPveState = JSON.parse(JSON.stringify(combatState)); }
    let bData = RAID_BOSSES.find(b => b.id === bossId); combatMode = 'raid'; let statMult = 1 + (hero.level * 0.1); 
    playBGM('boss');
    enemy = { name: "Рейд: " + bData.name, floor: hero.level, imgUrl: `${STATIC_URL}mobs/B_${bData.imgId}_high_resolution.png`, bgUrl: `${STATIC_URL}begraund/throne.png`, isBoss: true, isMiniBoss: false, isRaid: true, raidData: bData, hp: Math.floor(100 * statMult * bData.hpMult), maxHp: Math.floor(100 * statMult * bData.hpMult), nextAtkZone: ["head", "chest", "legs"][Math.floor(Math.random()*3)], turnCounter: 0, stats: { atk: Math.floor(10 * statMult * bData.atkMult), armor: Math.floor(5 * statMult * bData.armMult), critChance: 10, dodge: 5, armorPen: Math.floor(hero.level) } };
    ['fire', 'ice', 'dark', 'holy'].forEach(el => { if (bData[`dmg_${el}`]) enemy.stats[`dmg_${el}`] = Math.floor(bData[`dmg_${el}`] * statMult); if (bData[`res_${el}`]) enemy.stats[`res_${el}`] = bData[`res_${el}`]; });
    combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0, undyingUsed: false, potionUsed: false, scrollUsed: false };
    calculateStats(true); document.getElementById("enemy-rage-bg").style.display = "block"; document.getElementById("combat-log").innerHTML = ``; planEnemyTurn(); document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active')); document.getElementById('screen-PVE').classList.add('active'); document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active')); document.getElementById('nav-PVE').classList.add('active'); currentScreen = 'PVE'; updateUI();
}

async function startPvP() {
    hero.inventory = hero.inventory.filter(id => ITEMS_DB[id]);
    if (hero.inventory.length > 15) { if (currentScreen !== 'hero') openScreen('hero'); return alert("⚠️ Сумка переполнена! Продайте или наденьте вещи (Максимум 15), чтобы начать бой."); }
    if (hero.hp <= 0 && !GOD_MODE) return alert("Герой мертв!"); playSFX('click');
    
    let pvpBtn = document.querySelector("#screen-arena button");
    if (pvpBtn) { pvpBtn.innerText = "ПОИСК ПРОТИВНИКА..."; pvpBtn.disabled = true; pvpBtn.style.opacity = "0.7"; }

    let pvpEnemyData = null;
    try { 
        let res = await fetch(FIREBASE_URL + 'players.json'); 
        if(res.ok) { 
            let data = await res.json(); 
            if(data && typeof data === 'object' && !data.error) { 
                let players = Object.values(data).filter(p => p && typeof p === 'object' && p.id && p.id !== String(getUserId()));
                if (players.length > 0) {
                    let valid = players.filter(p => Math.abs((p.level || 1) - hero.level) <= 5);
                    if (valid.length === 0) valid = players;
                    pvpEnemyData = valid[Math.floor(Math.random() * valid.length)];
                }
            } 
        } 
    } catch(e) { console.error("Ошибка поиска противника PvP:", e); }
    
    if (pvpBtn) { pvpBtn.innerText = "ИСКАТЬ ПРОТИВНИКА ⚔️"; pvpBtn.disabled = false; pvpBtn.style.opacity = "1"; }

    if (!pvpEnemyData) { alert("Не удалось найти реального противника на сервере. Возможно, вы пока единственный игрок!"); return; }

    if (combatMode === 'pve') { savedPveEnemy = JSON.parse(JSON.stringify(enemy)); savedPveState = JSON.parse(JSON.stringify(combatState)); }
    combatMode = 'pvp'; document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active')); document.getElementById('screen-PVE').classList.add('active'); document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active')); document.getElementById('nav-PVE').classList.add('active'); currentScreen = 'PVE';
    playBGM('boss');
    
    enemy = { name: pvpEnemyData.name, floor: pvpEnemyData.level, imgUrl: STATIC_URL + (pvpEnemyData.cls + ".png"), bgUrl: STATIC_URL + "begraund/throne.png", isBoss: false, isMiniBoss: false, isRaid: false, isPlayer: true, hp: Math.floor(hero.combatStats.hp * 0.9), maxHp: Math.floor(hero.combatStats.hp * 0.9), nextAtkZone: ["head", "chest", "legs"][Math.floor(Math.random()*3)], turnCounter: 0, stats: { atk: Math.floor(hero.combatStats.damage * 0.8), armor: Math.floor(hero.combatStats.armor * 0.8), critChance: 10, dodge: 5, armorPen: Math.floor(hero.level) }, ratingReward: 25 + Math.floor(Math.random()*10) };
    combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0, undyingUsed: false, potionUsed: false, scrollUsed: false };
    
    calculateStats(true); document.getElementById("enemy-rage-bg").style.display = "none"; document.getElementById("combat-log").innerHTML = ``; planEnemyTurn(); updateUI();
}

function fleeCombat() {
    if (isTurnExecuting || hero.hp <= 0) return;
    if (combatMode === 'pvp') return alert("С Арены нельзя сбежать! Сражайтесь до конца.");
    if (!confirm("Сбежать с поля боя? Текущий прогресс здоровья врага будет потерян!")) return;
    playSFX('dodge'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
    if (combatMode === 'raid') { combatMode = 'pve'; if (savedPveEnemy) { enemy = savedPveEnemy; combatState = savedPveState; savedPveEnemy = null; savedPveState = null; } else { initCombat(); } playBGM('menu'); openScreen('boss'); } else { initCombat(); playBGM('menu'); openScreen('hero'); }
}

function buildLeaderboardHTML(players) { 
    let html = ''; 
    players.forEach((p, index) => { 
        let rank = index + 1; let cardClass = "pvp-player-card"; 
        if (rank === 1) cardClass += " top-1"; else if (rank === 2) cardClass += " top-2"; else if (rank === 3) cardClass += " top-3"; 
        let avatarCls = p.cls || 'knight'; 
        html += `<div class="${cardClass}"><div class="pvp-rank">${rank}</div><img src="${CLASS_AVATARS[avatarCls] || CLASS_AVATARS['knight']}" class="pvp-avatar"><div class="pvp-info"><div class="pvp-name">${p.name}</div><div class="pvp-stats">${CLASSES[avatarCls] ? CLASSES[avatarCls].name : 'Неизвестный'} • Ур. ${p.level || 1}</div></div><div class="pvp-rating">🏆 ${p.rating || 0}</div></div>`; 
    }); 
    return html; 
}

// === УПРАВЛЕНИЕ МУЛЬТИ-РЕЙТИНГОМ ===
function switchRatingTab(tab) { playSFX('click'); currentRatingTab = tab; document.querySelectorAll('.rating-tab').forEach(el => el.classList.remove('active')); document.getElementById('tab-rating-' + tab).classList.add('active'); renderRatingScreen(); }

function renderRatingScreen() {
    let pedestalContainer = document.getElementById("ui-rating-pedestal"); let listContainer = document.getElementById("ui-global-top"); let listTitle = document.getElementById("ui-rating-list-title");
    if (!pedestalContainer || !listContainer) return;
    if (cachedPlayersList.length === 0) { pedestalContainer.innerHTML = `<div style="text-align:center; color:#71717a; width:100%; padding:20px;">Нет данных игроков</div>`; listContainer.innerHTML = ``; return; }

    let sorted = [...cachedPlayersList];
    if (currentRatingTab === 'pvp') { sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); if(listTitle) listTitle.innerText = "ПРЕТЕНДЕНТЫ ПО КУБКАМ"; } else if (currentRatingTab === 'pve') { sorted.sort((a, b) => (b.maxFloor || 1) - (a.maxFloor || 1)); if(listTitle) listTitle.innerText = "ПРЕТЕНДЕНТЫ ПО ЭТАЖАМ"; } else if (currentRatingTab === 'wealth') { sorted.sort((a, b) => (b.gold || 0) - (a.gold || 0)); if(listTitle) listTitle.innerText = "МАГНАТЫ СЕРВЕРА"; }

    let top3 = sorted.slice(0, 3); let rest = sorted.slice(3);
    let orderedTop = []; if (top3[1]) orderedTop.push({p: top3[1], rank: 2, cls: 'ped-2'}); if (top3[0]) orderedTop.push({p: top3[0], rank: 1, cls: 'ped-1'}); if (top3[2]) orderedTop.push({p: top3[2], rank: 3, cls: 'ped-3'});

    let pedHtml = '';
    orderedTop.forEach(item => { let p = item.p; let avatarCls = p.cls || 'knight'; let scoreVal = currentRatingTab === 'pvp' ? `🏆 ${p.rating || 0}` : (currentRatingTab === 'pve' ? `🏰 ${p.maxFloor || 1} эт.` : `💰 ${p.gold || 0}`); let pIdStr = JSON.stringify(p).replace(/"/g, '&quot;'); pedHtml += `<div class="pedestal-item ${item.cls}" onclick='openPlayerProfile(${pIdStr})'><img src="${CLASS_AVATARS[avatarCls] || CLASS_AVATARS['knight']}" class="pedestal-avatar"><div class="pedestal-base"><div class="pedestal-name">${p.name}</div><div class="pedestal-score">${scoreVal}</div></div></div>`; });
    pedestalContainer.innerHTML = pedHtml;

    let listHtml = '';
    rest.forEach((p, idx) => { let rank = idx + 4; let avatarCls = p.cls || 'knight'; let scoreVal = currentRatingTab === 'pvp' ? `🏆 ${p.rating || 0}` : (currentRatingTab === 'pve' ? `🏰 ${p.maxFloor || 1} эт.` : `💰 ${p.gold || 0}`); let pIdStr = JSON.stringify(p).replace(/"/g, '&quot;'); listHtml += `<div class="pvp-player-card" onclick='openPlayerProfile(${pIdStr})' style="cursor:pointer;"><div class="pvp-rank">${rank}</div><img src="${CLASS_AVATARS[avatarCls] || CLASS_AVATARS['knight']}" class="pvp-avatar"><div class="pvp-info"><div class="pvp-name">${p.name}</div><div class="pvp-stats">${CLASSES[avatarCls] ? CLASSES[avatarCls].name : 'Неизвестный'} • Ур. ${p.level || 1}</div></div><div class="pvp-rating">${scoreVal}</div></div>`; });

    let myAvatarCls = hero.baseClass; let myScoreVal = currentRatingTab === 'pvp' ? `🏆 ${hero.rating}` : (currentRatingTab === 'pve' ? `🏰 ${hero.maxFloor} эт.` : `💰 ${hero.gold}`);
    listHtml += `<div class="pvp-player-card" style="margin-top: 10px; border-style: dashed; border-color: #38bdf8;"><div class="pvp-rank">#</div><img src="${CLASS_AVATARS[myAvatarCls]}" class="pvp-avatar"><div class="pvp-info"><div class="pvp-name" style="color: #38bdf8;">${hero.name} (Вы)</div><div class="pvp-stats">${CLASSES[myAvatarCls].name} • Ур. ${hero.level}</div></div><div class="pvp-rating">${myScoreVal}</div></div>`;
    listContainer.innerHTML = listHtml;
}

function openPlayerProfile(pData) {
    playSFX('click'); let avatarCls = pData.cls || 'knight'; document.getElementById("pp-avatar").src = CLASS_AVATARS[avatarCls] || CLASS_AVATARS['knight']; document.getElementById("pp-name").innerText = pData.name; document.getElementById("pp-class").innerText = `${CLASSES[avatarCls] ? CLASSES[avatarCls].name : 'Странник'} • Ур. ${pData.level || 1}`; document.getElementById("pp-rating").innerText = `🏆 ${pData.rating || 0}`; document.getElementById("pp-floor").innerText = `🏰 ${pData.maxFloor || 1}`; document.getElementById("pp-fights").innerText = `⚔️ ${pData.level ? pData.level * 3 : 5}`; document.getElementById("pp-gold").innerText = `💰 ${pData.gold || 0}`; document.getElementById("player-profile-modal").classList.add("show");
}

function closePlayerProfile() { playSFX('click'); document.getElementById("player-profile-modal").classList.remove("show"); }

function planEnemyTurn() { if(!enemy) return; enemy.turnCounter++; let delay = hasTalent('r2c') ? 3 : 0; if (enemy.isRaid) { let turnsLeft = (15 + delay) - enemy.turnCounter; if (turnsLeft <= 0) enemy.nextAtkZone = 'ENRAGE'; else if (enemy.turnCounter % 4 === 0) enemy.nextAtkZone = 'ULTIMATUM'; else enemy.nextAtkZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)]; } else { let ultMod = (enemy.turnCounter - delay) % 4; if (enemy.isBoss && ultMod === 0 && enemy.turnCounter > delay) enemy.nextAtkZone = 'ULTIMATUM'; else enemy.nextAtkZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)]; } updateIntentDisplay(); }

function updateIntentDisplay() { let el = document.getElementById("combat-intent"); if(!el || !enemy) return; if (enemy.nextAtkZone === 'ENRAGE') { el.innerHTML = `⚠️ БОСС ВПАЛ В БЕЗУМИЕ! СМЕРТЬ НЕМИНУЕМА!`; el.className = "intent-box ultimatum popup"; el.style.display = "block"; } else if (enemy.nextAtkZone === 'ULTIMATUM') { el.innerHTML = `☠️ БОСС: ФИНАЛЬНАЯ АТАКА!`; el.className = "intent-box ultimatum popup"; el.style.display = "block"; } else { el.style.display = "none"; } }

function triggerClashAnim(isHero, isEnemy, hitType = "normal") { if (isHero) { let hc = document.getElementById("entity-hero-box"); if(hc) { hc.classList.remove("clash-hero-anim"); void hc.offsetWidth; hc.classList.add("clash-hero-anim"); } } if (isEnemy) { let ec = document.getElementById("entity-enemy-box"); if(ec) { ec.classList.remove("clash-enemy-anim"); void ec.offsetWidth; ec.classList.add("clash-enemy-anim"); } } let sp = document.getElementById("clash-spark-fx"); if(sp) { sp.className = `clash-spark ${hitType} spark-anim`; void sp.offsetWidth; } }

function triggerHitAnim(elementId) { let el = document.getElementById(elementId); if(el) { el.classList.remove("hit-anim"); void el.offsetWidth; el.classList.add("hit-anim"); } }

function showDmgPopup(entityBoxId, text, colorClass) { let box = document.getElementById(entityBoxId); if (!box) return; let pop = document.createElement("div"); pop.className = `dmg-popup ${colorClass}`; pop.innerText = text; box.appendChild(pop); setTimeout(() => { pop.remove(); }, 800); }

function selectZone(type, zone) { if(type === 'atk') combatState.atkZone = zone; if(type === 'def') combatState.defZone = zone; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); playSFX('click'); updateUI(); }

function resetCombatZones() { combatState.atkZone = null; combatState.defZone = null; }
function logCombat(text) { let logBox = document.getElementById("combat-log"); if (logBox) { logBox.innerHTML += `<div class="log-entry">${text}</div>`; while (logBox.children.length > 25) logBox.removeChild(logBox.firstChild); logBox.scrollTop = logBox.scrollHeight; } }

function useConsumableInCombat(itemId, type) {
    if (isTurnExecuting || hero.hp <= 0 && !GOD_MODE) return; if (type === 'potion' && combatState.potionUsed) return; if (type === 'scroll' && combatState.scrollUsed) return;
    let invIndex = hero.inventory.indexOf(itemId); if (invIndex === -1) return; let item = ITEMS_DB[itemId]; if (!item || item.type !== 'consumable') return;
    if (item.subtype === 'heal' && hero.hp >= hero.combatStats.hp) return alert("Здоровье уже полное!"); playSFX('skill'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    
    if (item.subtype === 'heal') { hero.hp = Math.min(hero.combatStats.hp, hero.hp + item.power); showDmgPopup("entity-hero-box", `+${item.power} HP`, "log-sys"); logCombat(`<span class="log-sys">Вы применили ${item.name}: +${item.power} HP.</span>`); combatState.potionUsed = true; } 
    else if (item.subtype.startsWith('dmg_')) { let elem = item.subtype.split('_')[1]; let rawDmg = item.power; let res = enemy.stats[`res_${elem}`] || 0; let finalDmg = Math.floor(rawDmg * (1 - res/100)); if (finalDmg < 0) finalDmg = 0; enemy.hp -= finalDmg; if (enemy.hp < 0) enemy.hp = 0; if (enemy.isRaid) addQuestProgress('boss_dmg', finalDmg); let icon = elem==='fire'?'🔥':elem==='ice'?'❄️':elem==='dark'?'☠️':'☀️'; showDmgPopup("entity-enemy-box", `-${finalDmg}`, "log-crit"); triggerHitAnim("entity-enemy-box"); shakeScreen(); logCombat(`<span class="log-crit">${item.name} наносит ${finalDmg} ${icon} урона!</span>`); combatState.scrollUsed = true; }
    
    hero.inventory.splice(invIndex, 1); saveGame();
    if (enemy.hp <= 0) { isTurnExecuting = true; setTimeout(() => { isTurnExecuting = false; handleCombatWin(); }, 400); } else { updateUI(); }
}

function useClassSkill() {
    if (isTurnExecuting || combatState.skillCooldown > 0 || hero.hp <= 0) return; let cls = CLASSES[hero.baseClass]; combatState.skillCooldown = hasTalent('k4c') || hasTalent('s4b') ? cls.skill.cd - 1 : cls.skill.cd; playSFX('skill'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    if (hero.baseClass === 'knight') { triggerSkillVFX("entity-hero-box", "vfx-knight"); playLottieEffect("entity-hero-box", VFX_DB.knight_skill, "scale-up"); let healPct = hasTalent('k3c') ? 0.50 : 0.25; let heal = Math.floor(hero.combatStats.hp * healPct); hero.hp = Math.min(hero.combatStats.hp, hero.hp + heal); showDmgPopup("entity-hero-box", `+${heal} HP`, "log-sys"); logCombat(`<span class="log-skill">Вы применили СКИЛЛ! +${heal} HP.</span>`); } 
    else if (hero.baseClass === 'berserk') { triggerSkillVFX("entity-enemy-box", "vfx-berserk"); playLottieEffect("entity-enemy-box", VFX_DB.berserk_skill, "scale-huge"); shakeScreen(); let dmg = Math.floor(hero.combatStats.damage * 2.5); enemy.hp -= dmg; if (enemy.hp < 0) enemy.hp = 0; if (enemy.isRaid) addQuestProgress('boss_dmg', dmg); showDmgPopup("entity-enemy-box", `-${dmg}`, "log-crit"); logCombat(`<span class="log-skill">Вы применили СКИЛЛ! -${dmg} HP.</span>`); playSFX('crit'); } 
    else if (hero.baseClass === 'shadow') { triggerSkillVFX("entity-hero-box", "vfx-shadow"); playLottieEffect("entity-enemy-box", VFX_DB.shadow_skill, "scale-up"); let dmg = Math.floor(hero.combatStats.damage * 1.8); enemy.hp -= dmg; if (enemy.hp < 0) enemy.hp = 0; if (enemy.isRaid) addQuestProgress('boss_dmg', dmg); showDmgPopup("entity-enemy-box", `-${dmg}`, "log-crit"); logCombat(`<span class="log-skill">Вы применили СКИЛЛ! Уворот активен.</span>`); playSFX('hit'); } 
    else if (hero.baseClass === 'ranger') { triggerSkillVFX("entity-hero-box", "vfx-ranger"); playLottieEffect("entity-enemy-box", VFX_DB.ranger_skill, "scale-up"); let dmg = Math.floor(hero.combatStats.damage * 1.5); enemy.hp -= dmg; if (enemy.hp < 0) enemy.hp = 0; if (enemy.isRaid) addQuestProgress('boss_dmg', dmg); combatState.enemyStunned = true; triggerHitAnim("entity-enemy-box"); showDmgPopup("entity-enemy-box", `ОГЛУШЕНИЕ!`, "log-block"); if (hasTalent('r5a') && enemy.isBoss) { enemy.stats.armor = Math.floor(enemy.stats.armor * 0.85); logCombat(`<span class="log-skill">СКИЛЛ! Броня босса снижена на 15%.</span>`); } else { logCombat(`<span class="log-skill">Вы применили СКИЛЛ! Враг оглушен.</span>`); } }
    if (enemy.hp <= 0) { isTurnExecuting = true; setTimeout(() => { isTurnExecuting = false; handleCombatWin(); }, 400); } else { updateUI(); }
}

function calcDmg(attacker, defender, zAtk, zDef, isHeroAtk) {
    let dodgeChance = defender.dodge || 0; if (!isHeroAtk && hasTalent('s5a')) dodgeChance = 50; if (Math.random() * 100 < dodgeChance) return { dmg: 0, rawDmg: 0, elemLog: '', type: "dodge" };
    if (!isHeroAtk && hasTalent('r5c') && Math.random() * 100 < 20) return { dmg: 0, rawDmg: 0, elemLog: '', type: "dodge" }; 
    let baseAtk = attacker.damage || attacker.atk || 5; let cChance = attacker.critChance || 5; let armPen = attacker.armorPen || 0; let cDmg = attacker.critDmg || 150;
    let bIsBerserk = isHeroAtk && hero.baseClass === 'berserk'; let bIsKnightDef = !isHeroAtk && hero.baseClass === 'knight'; let bIsShadowAtk = isHeroAtk && hero.baseClass === 'shadow'; let bIsRangerAtk = isHeroAtk && hero.baseClass === 'ranger';
    if (isHeroAtk && combatState.combo > 0) baseAtk = Math.floor(baseAtk * (1 + combatState.combo * 0.25));
    if (isHeroAtk && hasTalent('k3b')) baseAtk = Math.floor(baseAtk * 1.20); if (isHeroAtk && hasTalent('r3a')) baseAtk = Math.floor(baseAtk * 1.20);
    
    if (bIsBerserk) { let missingHpPct = (hero.combatStats.hp - hero.hp) / hero.combatStats.hp; let stacks = Math.floor(missingHpPct * 10); if (hasTalent('b3b')) stacks *= 2; if (hero.flags.bloodied) stacks *= 2; baseAtk = Math.floor(baseAtk * (1 + stacks * 0.05)); cChance += stacks * 2; if (hasTalent('b5b')) cDmg += Math.min(100, stacks * 10); if (hasTalent('b3c')) armPen += Math.floor(defender.armor * 0.3); if (hasTalent('b5c')) armPen += Math.floor(defender.armor * 0.5); if (hasTalent('b2c') && combatState.zoneHealth[zAtk] === 0) baseAtk = Math.floor(baseAtk * 1.25); if (hasTalent('b1c')) combatState.zoneHealth[zAtk] = 0; }
    if (bIsShadowAtk) { if (combatState.shadowCritReady) { cChance = 100; combatState.shadowCritReady = false; } if (hasTalent('s1b') && defender.hp === defender.maxHp) cChance = 100; if (hasTalent('s5b') && defender.hp <= defender.maxHp * 0.1) return { dmg: 999999, rawDmg: 999999, elemLog: '', type: 'crit' }; if (combatState.shadowCritReady && hero.flags.void) armPen += Math.floor(defender.armor * 0.3); }
    if (bIsRangerAtk) { armPen += Math.floor(defender.armor * 0.3); if (hasTalent('r2a')) armPen += Math.floor(defender.armor * 0.4); if (zAtk === 'head') { if (hasTalent('r1a')) cChance += 30; if (hasTalent('r4a')) cDmg += 50; if (hero.flags.storm) cDmg += 100; } }
    if (isHeroAtk && hero.baseClass === 'knight' && hasTalent('k1c')) armPen += Math.floor(defender.armor * 0.3); 
    
    if (!isHeroAtk) { 
        if (hasTalent('k4a') && hero.baseClass === 'knight') cChance = 0; 
        if (hasTalent('b4a') && hero.baseClass === 'berserk') baseAtk = Math.floor(baseAtk * 0.85); 
        if (hasTalent('r4c') && hero.baseClass === 'ranger' && attacker.isBoss) baseAtk = Math.floor(baseAtk * 0.90); 
        if (hasTalent('s4c') && hero.baseClass === 'shadow' && combatState.poisonStacks > 0) baseAtk = Math.floor(baseAtk * 0.8); 
        if (combatState.bloodiedUndying) baseAtk = Math.floor(baseAtk * 1.5);
    }
    
    let isCrit = Math.random() * 100 < cChance; if (isCrit) baseAtk = Math.floor(baseAtk * (cDmg / 100));
    let defArmor = Math.max(0, (defender.armor || 0) - armPen); let mitigation = defArmor; let isBlock = false; let isPerfectBlock = false;
    
    if (zAtk === zDef) { isBlock = true; if (!isHeroAtk) { isPerfectBlock = true; mitigation = bIsKnightDef ? Math.floor(defArmor * 1.5) : Math.floor(defArmor * 1.5); } else { mitigation *= 2; } } else { mitigation = bIsKnightDef ? Math.floor(defArmor * 0.7) : Math.floor(defArmor * 0.5); }
    if (isHeroAtk && hasTalent('s2b') && hero.baseClass === 'shadow') mitigation = Math.floor(defArmor * 0.5); if (isHeroAtk && hasTalent('k5c') && hero.baseClass === 'knight') mitigation = Math.floor(defArmor * 0.5); 
    
    let physDmg = Math.max(Math.floor(baseAtk * 0.15), baseAtk - mitigation); 
    let elemDmgTotal = 0; let elemLog = [];
    ['fire', 'ice', 'dark', 'holy'].forEach(el => { let rawElemDmg = attacker[`dmg_${el}`] || 0; if (rawElemDmg > 0) { let res = defender[`res_${el}`] || 0; let actualElemDmg = Math.floor(rawElemDmg * (1 - res/100)); if (actualElemDmg > 0) { elemDmgTotal += actualElemDmg; let icon = el==='fire'?'🔥':el==='ice'?'❄️':el==='dark'?'☠️':'☀️'; elemLog.push(`+${actualElemDmg}${icon}`); } } });
    let finalDmg = physDmg + elemDmgTotal; let eLogStr = elemLog.length > 0 ? ` <span style="font-size:10px;">(${elemLog.join(' ')})</span>` : '';
    
    return { dmg: finalDmg, rawDmg: baseAtk, elemLog: eLogStr, type: isCrit ? "crit" : (isPerfectBlock ? "perfect_block" : (isBlock ? "block" : "normal")) };
}

function handleCombatWin() {
    enemy.hp = 0; playSFX('win'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    
    if (combatMode === 'pvp') {
        hero.rating += enemy.ratingReward; let goldGained = 150; hero.gold += goldGained;
        let tTitle = document.getElementById("vic-title-text"); if(tTitle) tTitle.innerText = "ПОБЕДА НА АРЕНЕ!"; 
        let tRewards = document.getElementById("vic-rewards-text"); if(tRewards) tRewards.innerHTML = `Рейтинг: <span style="color:#fbbf24">+${enemy.ratingReward} 🏆</span><br>Золото: +${goldGained} 💰`;
        let lootBox = document.getElementById("vic-loot-container"); if (lootBox) lootBox.style.display = "none";
    } else {
        let isRaid = enemy.isRaid; let logMsg = ""; let goldGained = isRaid ? (hero.level * 50 + 100) : (15 + (hero.floor * 5)); let expGained = isRaid ? 0 : (20 + (hero.floor * 8));
        if (!isRaid) { addQuestProgress('kill_mobs', 1); if (enemy.isMiniBoss) { goldGained *= 2; expGained *= 2; } if (enemy.isBoss) { goldGained *= 4; expGained *= 3; } if (hasTalent('r1b')) goldGained *= 2; hero.exp += expGained; if (hero.exp >= hero.expNext) { hero.exp -= hero.expNext; hero.level++; hero.unspentPoints += 3; hero.expNext = getExpReq(hero.level); calculateStats(); logMsg += `<br><span style="color:#34d399;">УРОВЕНЬ ПОВЫШЕН! +3 очка характеристик.</span>`; } } else { let gems = enemy.raidData.gemReward; if (hasTalent('r3b')) gems = Math.floor(gems * 1.5); hero.gems += gems; logMsg += ` | +${gems}💎`; }
        hero.gold += goldGained; let droppedItem = generateLootDrop(enemy);
        if (droppedItem) { hero.inventory.push(droppedItem.id); logMsg += `<br>✨ Получен предмет: ${droppedItem.name}`; if (hero.inventory.length > 15) { logMsg += `<br><b style="color:#ef4444;">⚠️ СУМКА ПЕРЕПОЛНЕНА! Бои заблокированы.</b>`; } }
        let tTitle = document.getElementById("vic-title-text"); if(tTitle) tTitle.innerText = isRaid ? "РЕЙД ЗАВЕРШЕН!" : "ВРАГ ПОВЕРЖЕН!"; 
        let tRewards = document.getElementById("vic-rewards-text"); if(tRewards) tRewards.innerHTML = `Заработано: +${goldGained}💰 ${expGained>0?`| +${expGained} EXP`:''} ${logMsg}`;
        let lootBox = document.getElementById("vic-loot-container"); if (lootBox) { if (droppedItem) { lootBox.style.display = "flex"; let boxEl = document.getElementById("vic-loot-box"); boxEl.className = `vic-loot-box rarity-${droppedItem.rarity}`; boxEl.innerHTML = renderItemIcon(droppedItem); document.getElementById("vic-loot-name").innerHTML = droppedItem.name; } else { lootBox.style.display = "none"; } }
        if (!isRaid && hero.floor === hero.maxFloor && hero.maxFloor < 100) { hero.maxFloor++; hero.floor = hero.maxFloor; }
    }
    saveGame(); let modal = document.getElementById("vic-modal"); if(modal) modal.classList.add("show"); updateUI(); 
}

function closeVictoryModal() { playSFX('click'); let modal = document.getElementById("vic-modal"); if(modal) modal.classList.remove("show"); if (combatMode === 'pvp') { combatMode = 'pve'; if (savedPveEnemy) { enemy = savedPveEnemy; combatState = savedPveState; savedPveEnemy = null; savedPveState = null; } else { initCombat(); } playBGM('menu'); openScreen('arena'); } else if (combatMode === 'raid') { combatMode = 'pve'; if (savedPveEnemy) { enemy = savedPveEnemy; combatState = savedPveState; savedPveEnemy = null; savedPveState = null; } else { initCombat(); } playBGM('menu'); openScreen('boss'); } else { initCombat(); } }

function applyTurnEndEffects() {
    if (hasTalent('s1c') && hero.baseClass === 'shadow') { combatState.poisonStacks = Math.min(hasTalent('s5c') ? 3 : 1, combatState.poisonStacks + 1); let dmgPerStack = Math.floor(hero.combatStats.mst * 0.5); if (hasTalent('s3c')) dmgPerStack = Math.floor(dmgPerStack * 1.5); let poisonDmg = dmgPerStack * combatState.poisonStacks; enemy.hp -= poisonDmg; if (enemy.hp < 0) enemy.hp = 0; if (enemy.isRaid) addQuestProgress('boss_dmg', poisonDmg); if (hasTalent('s2c')) { let missing = hero.combatStats.hp - hero.hp; hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(missing * 0.05)); } logCombat(`<span class="log-skill">ЯД наносит ${poisonDmg} урона.</span>`); showDmgPopup("entity-enemy-box", `ЯД -${poisonDmg}`, "log-skill"); if (enemy.hp <= 0) handleCombatWin(); }
    if (hasTalent('b3a') && hero.baseClass === 'berserk' && hero.hp > 0) { hero.hp = Math.min(hero.combatStats.hp, hero.hp + 5); } 
}

function executeTurn() {
    if (isTurnExecuting) return; if (!combatState.atkZone || !combatState.defZone) return; isTurnExecuting = true; 
    try {
        let heroAtkZone = combatState.atkZone; let heroDefZone = combatState.defZone; resetCombatZones(); updateUI(); 
        let zNameRu = {head: "Голову", chest: "Торс", legs: "Ноги", "ULTIMATUM": "ВСЕ ЗОНЫ (УЛЬТИМАТУМ)", "ENRAGE": "ЯРОСТЬ (ИНСТАКИЛЛ)"};
        if (!enemy.nextAtkZone) { enemy.nextAtkZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)]; }
        let eAtkZone = enemy.nextAtkZone; let eDefZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)];
        if (combatState.skillCooldown > 0) combatState.skillCooldown--;

        let isEnemyStunned = combatState.enemyStunned; combatState.enemyTurns++;
        if (hasTalent('r1c') && hero.baseClass === 'ranger' && combatState.enemyTurns % 3 === 0) { isEnemyStunned = true; logCombat(`<span class="log-sys">ЛОВЧИЙ! Враг замедлен.</span>`); }

        let hRes = calcDmg(hero.combatStats, enemy.stats, heroAtkZone, eDefZone, true);
        
        if (hRes.type === "dodge") { playSFX('dodge'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } else if (hRes.type === "crit") { playSFX('crit'); shakeScreen(); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy'); } else if (hRes.type === "block" || hRes.type === "perfect_block") { playSFX('block'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } else { playSFX('hit'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); }
        triggerClashAnim(true, false, hRes.type);

        setTimeout(() => {
            try {
                enemy.hp -= hRes.dmg; if (enemy.hp < 0) enemy.hp = 0; if (enemy.isRaid && hRes.dmg > 0) addQuestProgress('boss_dmg', hRes.dmg);
                let ls = hero.combatStats.lifesteal || 0; if (hasTalent('b1a') && hero.baseClass === 'berserk') ls += 15; if (combatState.bloodiedLifesteal) { ls += 100; combatState.bloodiedLifesteal = false; }
                if (hRes.dmg > 0 && ls > 0) { let heal = Math.floor(hRes.dmg * (ls / 100)); heal = Math.min(heal, Math.floor(hero.combatStats.hp * 0.20)); hero.hp = Math.min(hero.combatStats.hp, hero.hp + heal); showDmgPopup("entity-hero-box", `ВАМП +${heal}`, "log-sys"); }
                triggerHitAnim("entity-enemy-box"); playLottieEffect("entity-enemy-box", VFX_DB.attack_hero); 
                if (hRes.type === "dodge") { showDmgPopup("entity-enemy-box", "УВОРОТ", "log-dodge"); } else if (hRes.type === "crit") { showDmgPopup("entity-enemy-box", `КРИТ -${hRes.dmg}`, "log-crit"); if (hasTalent('b4c') && hero.baseClass === 'berserk' && combatState.zoneHealth[eDefZone] > 0) { combatState.zoneHealth[eDefZone] = Math.max(0, combatState.zoneHealth[eDefZone] - 2); } if (hero.flags.storm && heroAtkZone === 'head' && Math.random() < 0.2) { combatState.enemyStunned = true; logCombat(`<span class="log-sys">СНАЙПЕР! Враг оглушен.</span>`); } } else if (hRes.type === "block" || hRes.type === "perfect_block") { showDmgPopup("entity-enemy-box", `БЛОК -${hRes.dmg}`, "log-block"); } else { showDmgPopup("entity-enemy-box", `-${hRes.dmg}`, "log-dmg"); }
                let comboTxt = combatState.combo > 0 ? ` (Комбо x${(1 + combatState.combo * 0.25).toFixed(2)})` : ''; logCombat(`Вы ударили в ${zNameRu[heroAtkZone]}: -${hRes.dmg} HP${comboTxt}${hRes.elemLog}.`); updateUI();

                if (enemy.hp <= 0) { isTurnExecuting = false; setTimeout(() => handleCombatWin(), 400); } 
                else {
                    applyTurnEndEffects(); if (enemy.hp <= 0) { isTurnExecuting = false; return; }
                    if (isEnemyStunned) { logCombat(`<span class="log-sys">${enemy.name} пропускает ход.</span>`); combatState.enemyStunned = false; saveGame(); updateUI(); isTurnExecuting = false; } 
                    else {
                        setTimeout(() => {
                            try {
                                let forceDodge = hero.baseClass === 'shadow' && combatState.skillCooldown === (CLASSES.shadow.skill.cd - 1); let eRes;
                                if (eAtkZone === 'ENRAGE') { eRes = { dmg: 99999, rawDmg: 99999, elemLog: '', type: "crit" }; shakeScreen(); } else if (eAtkZone === 'ULTIMATUM') { shakeScreen(); let baseAtk = Math.floor((enemy.stats.atk || 5) * 2.0); if (forceDodge) eRes = { dmg: 0, rawDmg: 0, elemLog: '', type: "dodge" }; else { let mitigation = Math.floor(hero.combatStats.armor * 0.2); let finalDmg = Math.max(Math.floor(baseAtk * 0.2), baseAtk - mitigation); eRes = { dmg: finalDmg, rawDmg: baseAtk, elemLog: '', type: "crit" }; } } else { eRes = calcDmg(enemy.stats, hero.combatStats, eAtkZone, heroDefZone, false); if(forceDodge) eRes = { dmg: 0, rawDmg: 0, elemLog: '', type: "dodge" }; }

                                if (!GOD_MODE) { hero.hp -= eRes.dmg; if(hero.hp < 0) hero.hp = 0; }
                                if (eRes.type === "dodge") { playSFX('dodge'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } else if (eRes.type === "crit" || eAtkZone === 'ENRAGE' || eAtkZone === 'ULTIMATUM') { playSFX('crit'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy'); } else if (eRes.type === "block" || eRes.type === "perfect_block") { playSFX('block'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); } else { playSFX('hit'); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); }
                                triggerClashAnim(false, true, eRes.type); 

                                setTimeout(() => {
                                    try {
                                        triggerHitAnim("entity-hero-box"); if(eRes.dmg > 0) playLottieEffect("entity-hero-box", VFX_DB.attack_enemy); 
                                        
                                        if (eRes.type === "dodge") { showDmgPopup("entity-hero-box", "УВОРОТ", "log-dodge"); let counterPct = hero.combatStats.counter || 0; if (hero.baseClass === 'shadow') { combatState.shadowCritReady = true; logCombat(`<span class="log-skill">ТАНЦОР СМЕРТИ! След. удар крит.</span>`); if (hero.flags.void) { combatState.poisonStacks++; logCombat(`<span class="log-skill">ФАНТОМ: Враг отравлен.</span>`); } if (hasTalent('s4a')) counterPct += 100; if (hasTalent('s2a')) { let mHp = hero.combatStats.hp - hero.hp; hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(mHp * 0.05)); } } if (counterPct > 0) { let cDmg = Math.floor(hero.combatStats.damage * (counterPct / 100)); enemy.hp -= cDmg; if (enemy.hp < 0) enemy.hp = 0; if(enemy.isRaid) addQuestProgress('boss_dmg', cDmg); showDmgPopup("entity-enemy-box", `КОНТР -${cDmg}`, "log-crit"); playSFX('crit'); logCombat(`<span class="log-crit">Вы контратаковали на ${cDmg} урона!</span>`); } }
                                        else if (eRes.type === "perfect_block" || eRes.type === "block") { let popupText = eRes.type === "perfect_block" ? "ИДЕАЛ. БЛОК" : "БЛОК"; showDmgPopup("entity-hero-box", `${popupText} -${eRes.dmg}`, "log-block"); let thornsPct = hero.combatStats.thorns || 0; if (hero.baseClass === 'knight') { if (eRes.type === "perfect_block") thornsPct += hasTalent('k5b') ? 50 : (hasTalent('k2b') ? 25 : 0); if (hasTalent('k1a')) { let mHp = hero.combatStats.hp - hero.hp; hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(mHp * 0.05)); } if (hasTalent('k2c') && eRes.type === "perfect_block" && Math.random() < 0.25) combatState.enemyStunned = true; } if (hero.flags.templar) { let mHp = hero.combatStats.hp - hero.hp; hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(mHp * 0.05)); thornsPct += 20; } if (thornsPct > 0) { let rDmg = Math.floor(eRes.rawDmg * (thornsPct / 100)); enemy.hp -= rDmg; if(enemy.hp < 0) enemy.hp = 0; if(enemy.isRaid) addQuestProgress('boss_dmg', rDmg); showDmgPopup("entity-enemy-box", `ШИПЫ -${rDmg}`, "log-block"); logCombat(`<span class="log-block">Шипы отразили ${rDmg} урона!</span>`); } }
                                        else if (eAtkZone === 'ENRAGE' || eAtkZone === 'ULTIMATUM') { showDmgPopup("entity-hero-box", `УЛЬТА! -${eRes.dmg}`, "log-crit"); } else { showDmgPopup("entity-hero-box", `-${eRes.dmg}`, "log-dmg"); }
                                        if (eRes.dmg > 0) { if (!hasTalent('b4b')) combatState.combo = 0; if (eAtkZone !== 'ULTIMATUM' && eAtkZone !== 'ENRAGE' && eRes.type !== "perfect_block" && combatState.zoneHealth[eAtkZone] > 0) { combatState.zoneHealth[eAtkZone]--; if (combatState.zoneHealth[eAtkZone] === 0) { logCombat(`<span class="log-dmg">⚠️ БРОНЯ В ЗОНЕ '${zNameRu[eAtkZone].toUpperCase()}' ПОЛНОСТЬЮ РАЗРУШЕНА!</span>`); showDmgPopup("entity-hero-box", "СЛОМАНО!", "log-crit"); calculateStats(true); } } }
                                        if (eAtkZone !== 'ULTIMATUM' && eAtkZone !== 'ENRAGE') logCombat(`${enemy.name} бьет в ${zNameRu[eAtkZone]}: -${eRes.dmg} HP${eRes.elemLog}.`); else if (eAtkZone === 'ENRAGE') logCombat(`<span class="log-dmg">ЯРОСТЬ БОССА УНИЧТОЖИЛА ВАС!</span>`);
                        
                                        if (hero.hp <= 0 && !GOD_MODE) {
                                            if (hero.flags.bloodied && !combatState.bloodiedUndying) { hero.hp = 1; combatState.bloodiedUndying = true; combatState.bloodiedLifesteal = true; logCombat(`<span class="log-sys">КРОВАВЫЙ ОСКАЛ! Вы выжили.</span>`); showDmgPopup("entity-hero-box", "ЖАЖДА!", "log-sys"); planEnemyTurn(); saveGame(); updateUI(); isTurnExecuting = false; } 
                                            else if (hasTalent('b5a') && hero.baseClass === 'berserk' && !combatState.undyingUsed) { hero.hp = 1; combatState.undyingUsed = true; logCombat(`<span class="log-sys">БЕССМЕРТИЕ! Вы выжили с 1 HP.</span>`); showDmgPopup("entity-hero-box", "СПАСЕН!", "log-sys"); planEnemyTurn(); saveGame(); updateUI(); isTurnExecuting = false; } 
                                            else { 
                                                hero.activeAltar = null; hero.altarOffers = {}; hero.hp = 0; 
                                                if(combatMode === 'pvp') { let ratingLost = 10 + Math.floor(Math.random()*10); hero.rating = Math.max(0, hero.rating - ratingLost); logCombat(`<span class="log-dmg">Вы проиграли. Рейтинг -${ratingLost} 🏆</span>`); playSFX('death'); updateUI(); saveGame(); isTurnExecuting = false; setTimeout(() => { alert(`Поражение! Вы потеряли ${ratingLost} рейтинга.`); combatMode = 'pve'; if (savedPveEnemy) { enemy = savedPveEnemy; combatState = savedPveState; savedPveEnemy = null; savedPveState = null; } else { initCombat(); } playBGM('menu'); openScreen('arena'); }, 2000); } 
                                                else { hero.deathDebuffEnd = Date.now() + 10 * 60 * 1000; if(combatMode === 'pve' && hero.floor > 1) hero.floor--; logCombat(`<span class="log-dmg">💀 ВЫ ПОГИБЛИ. ТЯЖЕЛОЕ РАНЕНИЕ на 10 минут.</span>`); calculateStats(); playSFX('death'); updateUI(); saveGame(); isTurnExecuting = false; setTimeout(() => { alert("Вы отступаете в Лагерь..."); if (combatMode === 'raid') { combatMode = 'pve'; if (savedPveEnemy) { enemy = savedPveEnemy; combatState = savedPveState; savedPveEnemy = null; savedPveState = null; } else { initCombat(); } } else { enemy = null; } playBGM('menu'); openScreen('hero'); }, 2000); }
                                            }
                                        } else { planEnemyTurn(); saveGame(); updateUI(); isTurnExecuting = false; }
                                    } catch (e) { console.error(e); isTurnExecuting = false; }
                                }, 250); 
                            } catch (e) { console.error(e); isTurnExecuting = false; }
                        }, 500); 
                    }
                }
            } catch (e) { console.error(e); isTurnExecuting = false; }
        }, 250); 
    } catch (e) { console.error(e); isTurnExecuting = false; }
}

// === ИНСПЕКТ ===
function formatStats(stats, eqStats = null) {
    let res = []; if(!stats && !eqStats) return res; let combined = {};
    if(stats) { for(let k in stats) combined[k] = {n: stats[k], o: 0}; }
    if(eqStats) { for(let k in eqStats) { if(!combined[k]) combined[k] = {n: 0, o: eqStats[k]}; else combined[k].o = eqStats[k]; } }
    let getDiff = (key) => { if(!eqStats) return ""; let diff = (combined[key].n) - (combined[key].o); if(diff > 0) return ` <span style="color:#10b981; font-size:10px;">(+${diff})</span>`; if(diff < 0) return ` <span style="color:#ef4444; font-size:10px;">(${diff})</span>`; return ""; };
    let getVal = (key, name, color, isPct=false) => { if (!combined[key]) return; let v = combined[key].n; let o = combined[key].o; let d = getDiff(key); let p = isPct ? '%' : ''; if (v === 0 && o === 0) return; if(v > 0) res.push(`<span style="${color}">${name} +${v}${p}${d}</span>`); else if (o > 0) res.push(`<span style="color:#71717a; text-decoration:line-through;">${name} +${o}${p}</span>${d}`); };

    getVal('atk', 'Урон', ''); getVal('armor', 'Броня', '');
    getVal('str', 'СИЛ', ''); getVal('agi', 'ЛОВ', ''); getVal('end', 'ВЫН', ''); getVal('mst', 'МСТ', ''); getVal('luk', 'УДЧ', '');
    getVal('critChance', 'Крит', '', true); getVal('dodgeChance', 'Уворот', '', true); getVal('blockChance', 'Блок', '', true);
    getVal('armorPen', 'Пробитие', ''); getVal('critDmg', 'Крит. Урон', '', true);
    getVal('lifesteal', 'Вампиризм', 'color:#ef4444;', true); getVal('counter', 'Контратака', 'color:#a855f7;', true); getVal('thorns', 'Шипы', 'color:#fbbf24;', true);
    getVal('dmg_fire', 'Огонь', 'color:#ef4444;'); getVal('res_fire', 'Рез. Огню', 'color:#ef4444;', true);
    getVal('dmg_ice', 'Лед', 'color:#3b82f6;'); getVal('res_ice', 'Рез. Льду', 'color:#3b82f6;', true);
    getVal('dmg_dark', 'Тьма', 'color:#a855f7;'); getVal('res_dark', 'Рез. Тьме', 'color:#a855f7;', true);
    getVal('dmg_holy', 'Свет', 'color:#fbbf24;'); getVal('res_holy', 'Рез. Свету', 'color:#fbbf24;', true);

    return res;
}

function openInspectModal(invIndex) {
    playSFX('click'); inspectInvIndex = invIndex; let itemId = hero.inventory[invIndex]; let item = ITEMS_DB[itemId]; if (!item) return;
    let eqStats = null; if (item.type !== 'consumable') { let slot = item.type; if (slot === 'two_handed') slot = 'weapon1'; if (slot === 'ring') slot = 'ring1'; let eqItem = hero.equipment[slot]; if (eqItem && eqItem.id !== "blocked") eqStats = eqItem.stats; }
    document.getElementById("inspect-title").innerText = item.name; document.getElementById("inspect-icon-box").className = `vic-loot-box rarity-${item.rarity}`; document.getElementById("inspect-icon-box").innerHTML = renderItemIcon(item);
    let setHtmlBlock = ""; if (item.setId && SETS_DB[item.setId]) { let set = SETS_DB[item.setId]; let count = hero.setCounts[item.setId] || 0; setHtmlBlock = `<div style="margin-top:8px; border-top:1px dotted #3f3f46; padding-top:6px; font-size:10px;"><b style="color:#fbbf24;">Сет: ${set.name} (${count}/4)</b><br><span style="color:${count>=2?'#10b981':'#71717a'}">[2 шт] ${set.p2}</span><br><span style="color:${count>=4?'#10b981':'#71717a'}">[4 шт] ${set.p4}</span></div>`; }
    document.getElementById("inspect-stats-box").innerHTML = `<div style="color: #f4f4f5; font-size: 13px; line-height: 1.6; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">` + formatStats(item.stats, eqStats).join(' • ') + `</div>` + setHtmlBlock + `<br><i style="color:#71717a; margin-top:4px; display:block;">${item.desc||''}</i>`;
    let sellPrice = Math.floor(item.price * 0.5); document.getElementById("btn-inspect-sell").innerText = `ПРОДАТЬ ЗА 💰 ${sellPrice}`;
    let eqBtn = document.getElementById("btn-inspect-equip");
    if(item.type === 'consumable') { eqBtn.innerText = "ИСПОЛЬЗОВАТЬ В БОЮ"; eqBtn.style.background = "#52525b"; eqBtn.style.boxShadow = "none"; eqBtn.onclick = null; } else { eqBtn.innerText = "НАДЕТЬ"; eqBtn.style.background = "#fbbf24"; eqBtn.style.boxShadow = "0 4px 10px rgba(251,191,36,0.3)"; eqBtn.onclick = function() { equipItem(inspectInvIndex); closeInspectModal(); }; }
    document.getElementById("btn-inspect-sell").onclick = function() { sellItem(inspectInvIndex); closeInspectModal(); }; document.getElementById("item-inspect-modal").classList.add("show");
}

function closeInspectModal() { playSFX('click'); document.getElementById("item-inspect-modal").classList.remove("show"); inspectInvIndex = null; }

function openScreen(screenName) {
    if (isTurnExecuting) return; 
    if (!['hero', 'shop', 'classes', 'PVE', 'blacksmith', 'boss', 'talents', 'quests', 'arena', 'rating', 'friends'].includes(screenName)) return alert("В разработке!");
    if ((combatMode === 'pvp' || combatMode === 'raid') && screenName !== 'PVE') return alert("Сначала завершите текущий бой!"); 
    if ((screenName === 'PVE' || screenName === 'boss' || screenName === 'arena') && hero.hp <= 0 && !GOD_MODE) { if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error'); return alert("Герой мертв! Сначала вылечитесь в лагере."); }
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); playSFX('click');
    if (screenName !== 'PVE') playBGM('menu');

    if(screenName === 'rating') {
        let globalTop = document.getElementById("ui-global-top"); let pedestal = document.getElementById("ui-rating-pedestal");
        if(globalTop) globalTop.innerHTML = `<div style="text-align:center; color:#71717a; padding:20px;">⏳ Загрузка Зала Славы...</div>`; if(pedestal) pedestal.innerHTML = ``;
        fetch(FIREBASE_URL + 'players.json').then(async r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(data => {
            if(data && typeof data === 'object' && !data.error) { cachedPlayersList = Object.values(data).filter(p => p && typeof p === 'object' && p.name); if (cachedPlayersList.length > 0) { renderRatingScreen(); } else { if(globalTop) globalTop.innerHTML = `<div style="text-align:center; color:#71717a; padding:20px;">Зал Славы пуст. Станьте первым!</div>`; } } else { if(globalTop) globalTop.innerHTML = `<div style="text-align:center; color:#71717a; padding:20px;">Зал Славы пуст.</div>`; }
        }).catch(e => { if(globalTop) globalTop.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">❌ Ошибка: ${e.message}</div>`; });
    }

    if(screenName === 'arena') {
        let elBoard = document.getElementById("ui-pvp-leaderboard"); let elRating = document.getElementById("ui-pvp-rating"); if(elRating) elRating.innerText = hero.rating;
        if(elBoard) {
            elBoard.innerHTML = `<div style="text-align:center; color:#71717a; padding:10px;">⏳ Загрузка топ-3...</div>`;
            fetch(FIREBASE_URL + 'players.json').then(async r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(data => {
                if(data && typeof data === 'object' && !data.error) { let players = Object.values(data).filter(p => p && typeof p === 'object' && p.name); if (players.length > 0) { players.sort((a,b) => (b.rating||0) - (a.rating||0)); let top3 = players.slice(0, 3); let html = buildLeaderboardHTML(top3); html += ` <div class="pvp-player-card" style="margin-top: 10px; border-style: dashed;"><div class="pvp-rank">#</div><img src="${CLASS_AVATARS[hero.baseClass]}" class="pvp-avatar"><div class="pvp-info"><div class="pvp-name">${hero.name} (Вы)</div><div class="pvp-stats">${CLASSES[hero.baseClass].name} • Ур. ${hero.level}</div></div><div class="pvp-rating">🏆 ${hero.rating}</div></div> `; elBoard.innerHTML = html; } else { elBoard.innerHTML = `<div style="text-align:center; color:#71717a; padding:10px;">Никто еще не бросал вызов Арене.</div>`; } } else { elBoard.innerHTML = `<div style="text-align:center; color:#71717a; padding:10px;">Нет данных арены.</div>`; }
            }).catch(e => { elBoard.innerHTML = `<div style="text-align:center; color:#ef4444; padding:10px;">❌ Ошибка: ${e.message}</div>`; });
        }
    }

    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active')); document.getElementById('screen-' + screenName).classList.add('active'); document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active')); if(document.getElementById('nav-' + screenName)) document.getElementById('nav-' + screenName).classList.add('active');
    currentScreen = screenName; let wrapper = document.querySelector('.app-screens-wrapper'); if(wrapper) wrapper.scrollTop = 0; if(screenName === 'classes') previewClassId = hero.baseClass; if(screenName === 'PVE' && (!enemy || enemy.isRaid || enemy.isPlayer)) initCombat(); if(screenName === 'blacksmith') forgeSelectedIndex = null;
    updateUI();
}

// === ПОКУПКА АЛМАЗОВ (TELEGRAM STARS) ===
async function buyGemsWithStars(gemsAmount, starsPrice) {
    playSFX('click');
    if (!window.tg || !tg.openInvoice) {
        return alert("Оплата Звездами доступна только при запуске игры внутри Telegram!");
    }
    
    let originalHtml = event.currentTarget.innerHTML;
    event.currentTarget.innerHTML = "⏳...";
    event.currentTarget.disabled = true;

    try {
        const response = await fetch('/api/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                starsAmount: starsPrice,
                title: `${gemsAmount} Алмазов`,
                description: `Покупка премиум-валюты: ${gemsAmount} 💎`,
                payload: `buy_gems_${gemsAmount}_${Date.now()}`
            })
        });
        
        const data = await response.json();
        event.currentTarget.innerHTML = originalHtml;
        event.currentTarget.disabled = false;
        
        if (data.error) { return alert("Ошибка сервера: " + data.error); }
        
        tg.openInvoice(data.invoiceUrl, function(status) {
            if (status === 'paid') {
                hero.gems += gemsAmount;
                saveGame();
                updateUI();
                if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                playSFX('coins');
                alert(`Оплата успешна! Вы получили ${gemsAmount} 💎`);
            } else if (status === 'failed') {
                alert("Произошла ошибка при оплате.");
            }
        });
        
    } catch (e) {
        event.currentTarget.innerHTML = originalHtml;
        event.currentTarget.disabled = false;
        alert("Ошибка соединения с сервером платежей.");
    }
}

function setShopMode(mode) { 
    playSFX('click'); 
    shopMode = mode; 
    
    document.querySelectorAll('.shop-tab').forEach(el => { el.classList.remove('active', 'active-sell', 'active-premium'); });
    if (mode === 'buy') document.getElementById('tab-buy').classList.add('active');
    if (mode === 'sell') document.getElementById('tab-sell').classList.add('active-sell');
    if (mode === 'premium') document.getElementById('tab-premium').classList.add('active-premium');
    
    let shopList = document.getElementById('ui-shop-list');
    let shopFilters = document.getElementById('shop-filters-box');
    let premiumList = document.getElementById('ui-premium-list');

    if (shopList) shopList.style.display = (mode === 'premium') ? 'none' : 'flex';
    if (shopFilters) shopFilters.style.display = (mode === 'premium') ? 'none' : 'flex';
    if (premiumList) premiumList.style.display = (mode === 'premium') ? 'flex' : 'none';

    updateUI(); 
}

function selectPreviewClass(classId) { playSFX('click'); previewClassId = classId; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); updateUI(); }
function changeClass(classKey) {
    if (hero.baseClass === classKey) return; if (hero.gold < 5000) return alert(`Нужно 5000 золота!`);
    let itemsToUnequip = []; for (let slot in hero.equipment) { let item = hero.equipment[slot]; if (item && item.id !== "blocked" && item.allowedClasses && !item.allowedClasses.includes(classKey)) itemsToUnequip.push(slot); }
    if(!confirm("Внимание! При смене класса ВСЕ ВЫБРАННЫЕ ТАЛАНТЫ БУДУТ СБРОШЕНЫ. Продолжить?")) return;
    itemsToUnequip.forEach(slot => { let item = hero.equipment[slot]; if (item && item.id !== "blocked") hero.inventory.push(item.id); hero.equipment[slot] = null; if (item && item.type === 'two_handed') hero.equipment.weapon2 = null; });
    hero.gold -= 5000; hero.baseClass = classKey; hero.talents = []; calculateStats(); playSFX('coins'); saveGame(); openScreen('hero');
}

function equipItem(invIndex) {
    playSFX('click'); if (combatMode === 'pvp' || combatMode === 'raid') return alert("Нельзя менять снаряжение на Арене или в Рейде!"); if (enemy && enemy.hp > 0 && hero.hp > 0 && combatState.enemyTurns > 0) return alert("Бой уже начался! Менять экипировку можно только перед первым ударом по новому врагу.");
    let itemId = hero.inventory[invIndex]; if (!itemId) return; let item = ITEMS_DB[itemId];
    if (item.lvl > hero.level) return alert(`Нужен Ур. ${item.lvl}! Вы пока Ур. ${hero.level}.`); if (item.allowedClasses && !item.allowedClasses.includes(hero.baseClass)) return alert(`Этот предмет не подходит для вашего класса!`);
    if (item.type === 'consumable') return alert("Расходники используются в бою!"); let targetSlot = item.type;
    if (item.type === 'two_handed') { let w1 = hero.equipment.weapon1; let w2 = hero.equipment.weapon2; let needsExtraSlot = (w1 && w2 && w2.id !== "blocked"); if (needsExtraSlot && hero.inventory.length >= 30) return alert("Рюкзак трещит по швам! Освободите место."); hero.inventory.splice(invIndex, 1); if (w1) hero.inventory.push(w1.id); if (w2 && w2.id !== "blocked") hero.inventory.push(w2.id); hero.equipment.weapon1 = item; hero.equipment.weapon2 = { id: "blocked", icon: "🔒", name: "Занято", type: "weapon2", rarity: "common", stats: {} }; calculateStats(); saveGame(); updateUI(); return; }
    if ((targetSlot === 'weapon1' || targetSlot === 'weapon2') && hero.equipment.weapon1 && hero.equipment.weapon1.type === 'two_handed') { let twoHandedItem = hero.equipment.weapon1; hero.equipment.weapon1 = null; hero.equipment.weapon2 = null; hero.inventory.splice(invIndex, 1); hero.inventory.push(twoHandedItem.id); hero.equipment[targetSlot] = item; calculateStats(); saveGame(); updateUI(); return; }
    if (item.type === 'ring') targetSlot = !hero.equipment.ring1 ? 'ring1' : 'ring2';
    let oldItem = hero.equipment[targetSlot]; hero.equipment[targetSlot] = item; hero.inventory.splice(invIndex, 1); if (oldItem && oldItem.id !== "blocked") hero.inventory.push(oldItem.id); calculateStats(); saveGame(); updateUI();
}

function unequipSlot(slotKey) {
    playSFX('click'); if (combatMode === 'pvp' || combatMode === 'raid') return alert("Нельзя снимать снаряжение на Арене или в Рейде!"); if (enemy && enemy.hp > 0 && hero.hp > 0 && combatState.enemyTurns > 0) return alert("Бой уже начался! Менять экипировку можно только перед первым ударом по новому врагу.");
    let item = hero.equipment[slotKey]; if (!item || item.id === "blocked") return; if (hero.inventory.length >= 30) return alert("Рюкзак трещит по швам! Освободите место.");
    if (item.type === 'two_handed') { hero.inventory.push(item.id); hero.equipment.weapon1 = null; hero.equipment.weapon2 = null; } else { hero.inventory.push(item.id); hero.equipment[slotKey] = null; } calculateStats(); saveGame(); updateUI();
}

function addStat(statKey) { if (hero.unspentPoints > 0) { hero.baseStats[statKey]++; hero.unspentPoints--; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); playSFX('click'); calculateStats(); saveGame(); updateUI(); } }
function buyItem(itemId) { let item = ITEMS_DB[itemId]; let price = getShopPrice(item.price); if (hero.gold < price) return alert("Мало золота!"); if (hero.inventory.length >= 30) return alert("Рюкзак трещит по швам! Освободите место."); hero.gold -= price; hero.inventory.push(itemId); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); playSFX('coins'); saveGame(); updateUI(); }
function sellItem(invIndex) { let item = ITEMS_DB[hero.inventory[invIndex]]; if (!item) return; hero.gold += Math.floor(item.price * 0.5); hero.inventory.splice(invIndex, 1); playSFX('coins'); saveGame(); updateUI(); }
function healHero() {
    if (hero.hp >= hero.finalStats.hp) return alert("Здоровье уже полное!"); let missingHp = hero.finalStats.hp - Math.floor(hero.hp); let cost = Math.max(10, Math.floor(missingHp * 0.5));
    if (hero.gold < cost) { if (hero.gold > 0) { let affordableHeal = hero.gold * 2; hero.hp += affordableHeal; hero.gold = 0; alert(`Золота хватило лишь на частичное лечение (+${affordableHeal} HP).`); playSFX('coins'); saveGame(); updateUI(); } else { alert(`У вас нет золота!`); } return; }
    hero.gold -= cost; hero.hp = hero.finalStats.hp; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); playSFX('coins'); saveGame(); updateUI();
}

function selectForgeItem(idx) { forgeSelectedIndex = idx; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); playSFX('click'); updateUI(); }

function upgradeItem() {
    if (forgeSelectedIndex === null) return; let itemId = hero.inventory[forgeSelectedIndex]; let item = ITEMS_DB[itemId]; let upgCount = item.upgradeCount || 0; if (upgCount >= 10) return alert("Этот предмет достиг предела ковки!"); let cost = item.lvl * item.price * 2; if (hero.gold < cost) return alert("Не хватает золота!"); hero.gold -= cost; let newItem = JSON.parse(JSON.stringify(item)); if (!newItem.id.includes("_upg_")) { newItem.id = newItem.id + "_upg_" + Date.now(); } else { newItem.id = newItem.id.split("_upg_")[0] + "_upg_" + Date.now(); } newItem.lvl += 1; newItem.upgradeCount = upgCount + 1; newItem.price = Math.floor(newItem.price * 1.5); for (let s in newItem.stats) { let isPct = ['critChance', 'dodgeChance', 'lifesteal', 'counter', 'thorns', 'blockChance'].includes(s); if (isPct) { newItem.stats[s] += 1; } else { newItem.stats[s] = Math.max(1, Math.ceil(newItem.stats[s] * 1.15)); } } ITEMS_DB[newItem.id] = newItem; hero.inventory[forgeSelectedIndex] = newItem.id; addQuestProgress('forge_upg', 1); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); let anvil = document.getElementById("forge-anvil"); if (anvil) { anvil.classList.remove("hammer-hit"); void anvil.offsetWidth; anvil.classList.add("hammer-hit"); } playSFX('forge'); saveGame(); updateUI();
}

function pickTalent(tierIndex, talentId) { let tData = TALENTS_DATA[hero.baseClass][tierIndex]; if (hero.level < tData.lvl) return alert(`Требуется ${tData.lvl} уровень!`); let tierTalentIds = tData.opts.map(o => o.id); if (hero.talents.some(t => tierTalentIds.includes(t))) return alert("Талант в этом тире уже выбран!"); if(confirm("Вы уверены? Этот выбор навсегда определит стиль игры.")) { hero.talents.push(talentId); if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); playSFX('skill'); calculateStats(); saveGame(); updateUI(); } }

function calculateStats(isCombat = false) {
    hero.inventory = hero.inventory.filter(id => ITEMS_DB[id]); 
    let cls = CLASSES[hero.baseClass]; let lvlBonus = hero.level - 1; let setCounts = {};
    for (let key in hero.equipment) { let item = hero.equipment[key]; if (item && item.setId && item.id !== "blocked") { setCounts[item.setId] = (setCounts[item.setId] || 0) + 1; } }
    hero.setCounts = setCounts; hero.flags = { templar: setCounts['templar'] >= 4, bloodied: setCounts['bloodied'] >= 4, void: setCounts['void'] >= 4, storm: setCounts['storm'] >= 4 };
    let total = { str: hero.baseStats.str + (cls.growth.str * lvlBonus), agi: hero.baseStats.agi + (cls.growth.agi * lvlBonus), end: hero.baseStats.end + (cls.growth.end * lvlBonus), mst: hero.baseStats.mst + (cls.growth.mst * lvlBonus), luk: hero.baseStats.luk + (cls.growth.luk * lvlBonus), armor: 0, atk: 0, critChance: 5, critDmg: 150, dodge: 0, blockChance: 0, armorPen: 0, lifesteal: 0, counter: 0, thorns: 0 };
    ['fire', 'ice', 'dark', 'holy'].forEach(el => { total[`dmg_${el}`] = 0; total[`res_${el}`] = 0; });
    let skipHead = isCombat && combatState.zoneHealth.head === 0; let skipChest = isCombat && combatState.zoneHealth.chest === 0; let skipLegs = isCombat && combatState.zoneHealth.legs === 0;

    for (let key in hero.equipment) {
        if (skipHead && key === 'head') continue; if (skipChest && (key === 'chest' || key === 'weapon1' || key === 'weapon2')) continue; if (skipLegs && (key === 'boots' || key === 'belt')) continue;
        let item = hero.equipment[key];
        if (item && item.stats) {
            SECONDARY_STATS.forEach(s => { if(item.stats[s]) total[s] += item.stats[s]; });
            if (item.stats.atk) total.atk += item.stats.atk; if (item.stats.armor) total.armor += item.stats.armor; if (item.stats.blockChance) total.blockChance += item.stats.blockChance;
            ['fire', 'ice', 'dark', 'holy'].forEach(el => { if (item.stats[`dmg_${el}`]) total[`dmg_${el}`] += item.stats[`dmg_${el}`]; if (item.stats[`res_${el}`]) total[`res_${el}`] += item.stats[`res_${el}`]; });
        }
    }

    if (setCounts['storm'] >= 2) total.luk *= 2;
    let w = cls.statWeights; let hp = Math.floor(total.end * (w.end_hp || 10)); 
    if (hasTalent('k2a')) hp = Math.floor(hp * 1.25); if (hasTalent('b2a')) hp = Math.floor(hp * 1.20); if (setCounts['bloodied'] >= 2) hp = Math.floor(hp * 1.20);
    if (GOD_MODE) { hp = 999999; hero.hp = 999999; hero.deathDebuffEnd = 0; } 
    let damage = Math.floor(total.str * (w.str_dmg || 0) + total.agi * (w.agi_dmg || 0) + total.atk);
    if (hasTalent('k1b')) damage += Math.floor(total.armor * 0.25); 
    
    total.critChance += total.luk * (w.luk_crit || 0) + total.mst * (w.mst_crit || 0); if (hasTalent('s3b')) total.critChance += 20; 
    total.critChance = Math.min(80, total.critChance); 

    total.dodge += total.agi * (w.agi_dodge || 0) + total.luk * (w.luk_dodge || 0); if (hasTalent('s3a')) total.dodge += 15; if (hasTalent('r3c')) total.dodge += 10; if (setCounts['void'] >= 2) total.dodge += 15;
    total.armorPen += total.mst * (w.mst_pen || 0); total.critDmg += total.mst * (w.mst_cdmg || 0); if (hasTalent('b2b')) total.critDmg += 50; if (setCounts['bloodied'] >= 2) total.critDmg += 30;
    total.armor += total.str * (w.str_arm || 0); if (hasTalent('k3a')) total.armor = Math.floor(total.armor * 1.5); if (hasTalent('k5a') && hero.hp < hero.maxHp * 0.3) total.armor *= 2; if (setCounts['templar'] >= 2) total.armor = Math.floor(total.armor * 1.25);
    total.blockChance += total.mst * (w.mst_block || 0); if (hasTalent('k4b')) total.blockChance += total.mst * 0.02; 
    
    total.armor = Math.floor(total.armor * cls.armorMult); total.critDmg = Math.floor(total.critDmg * cls.critDmgMult); total.dodge = Math.floor(total.dodge * cls.dodgeMult); 
    
    let dodgeCap = hasTalent('s1a') ? 65 : 50; if (setCounts['void'] >= 2) dodgeCap = 75; total.dodge = Math.min(dodgeCap, total.dodge); 
    let blockCap = setCounts['templar'] >= 2 ? 60 : 50; total.blockChance = Math.min(blockCap, total.blockChance);
    
    if (hero.deathDebuffEnd > Date.now()) { total.armor = Math.floor(total.armor * 0.75); damage = Math.floor(damage * 0.75); }
    
    let tempStats = { hp: hp, damage: damage, armor: total.armor, dodge: parseFloat(total.dodge), critChance: parseFloat(total.critChance) };
    if (hero.activeAltar) { let ev = BOSS_EVENTS.find(e => e.id === hero.activeAltar); if (ev) ev.apply(tempStats); }
    hp = tempStats.hp; damage = tempStats.damage; total.armor = tempStats.armor; total.dodge = tempStats.dodge; total.critChance = tempStats.critChance;

    if (!isCombat) { hero.maxHp = hp; if (hero.hp > hero.maxHp && !GOD_MODE) hero.hp = hero.maxHp; 
        hero.finalStats = { hp: hp, damage: damage, armor: total.armor, armorPen: total.armorPen, critChance: (typeof total.critChance === 'number' ? total.critChance.toFixed(1) : total.critChance), critDmg: total.critDmg, dodge: (typeof total.dodge === 'number' ? total.dodge.toFixed(1) : total.dodge), blockChance: total.blockChance, str: total.str, agi: total.agi, end: total.end, mst: total.mst, luk: total.luk, lifesteal: total.lifesteal, counter: total.counter, thorns: total.thorns, dmg_fire: total.dmg_fire, dmg_ice: total.dmg_ice, dmg_dark: total.dmg_dark, dmg_holy: total.dmg_holy, res_fire: total.res_fire, res_ice: total.res_ice, res_dark: total.res_dark, res_holy: total.res_holy }; 
    }
    hero.combatStats = { hp: hp, damage: damage, armor: total.armor, armorPen: total.armorPen, critChance: (typeof total.critChance === 'number' ? total.critChance.toFixed(1) : total.critChance), critDmg: total.critDmg, dodge: (typeof total.dodge === 'number' ? total.dodge.toFixed(1) : total.dodge), blockChance: total.blockChance, str: total.str, agi: total.agi, end: total.end, mst: total.mst, luk: total.luk, lifesteal: total.lifesteal, counter: total.counter, thorns: total.thorns, dmg_fire: total.dmg_fire, dmg_ice: total.dmg_ice, dmg_dark: total.dmg_dark, dmg_holy: total.dmg_holy, res_fire: total.res_fire, res_ice: total.res_ice, res_dark: total.res_dark, res_holy: total.res_holy };
}

function getSlotName(slotId) { return {head:"Шлем", chest:"Броня", belt:"Пояс", boots:"Обувь", amulet:"Амулет", ring1:"Кольцо", ring2:"Кольцо", weapon1:"Оружие", weapon2:"Щит"}[slotId]; }

function renderItemIcon(item) { 
    if (!item) return ""; if (item.id === "blocked") return `<div class="item-icon">${item.icon}</div>`; 
    if (item.type === "consumable" && !item.imageId && item.icon) { return `<div class="item-icon" style="font-size:32px; display:flex; justify-content:center; align-items:center; width:100%; height:100%;">${item.icon}</div>`; }
    let imgId = item.imageId; let folder = item.type; 
    if (!imgId || !imgId.includes("_")) { let baseId = item.id.replace(/_\d+(_upg_\d+)?$/, ''); let baseItem = ITEMS_DB[baseId]; if (baseItem && baseItem.imgPrefix) { imgId = baseItem.imgPrefix + "_1"; item.imageId = imgId; } else { imgId = "default_1"; } }
    if (folder === 'two_handed') folder = 'two_handed'; let fallbackHTML = `<div style='font-size:32px; display:flex; justify-content:center; align-items:center; width:100%; height:100%;'>${item.icon || '📦'}</div>`; return `<div class="item-img-wrapper"><img src="${STATIC_URL}items/${folder}/${imgId}.png" class="item-img" alt="${item.name}" onerror="this.outerHTML=decodeURIComponent('${encodeURIComponent(fallbackHTML)}')"></div>`; 
}

function renderDurability(zoneKey) { let dur = combatState.zoneHealth[zoneKey]; if(dur === 3) return `<span class="dur-dot g"></span><span class="dur-dot g"></span><span class="dur-dot g"></span>`; if(dur === 2) return `<span class="dur-dot y"></span><span class="dur-dot y"></span><span class="dur-dot" style="background:#27272a"></span>`; if(dur === 1) return `<span class="dur-dot o"></span><span class="dur-dot" style="background:#27272a"></span><span class="dur-dot" style="background:#27272a"></span>`; return ``; }

function renderTalents() {
    let html = ''; let tData = TALENTS_DATA[hero.baseClass];
    tData.forEach((tier, index) => {
        let isLocked = hero.level < tier.lvl; let tierTalentIds = tier.opts.map(o => o.id); let pickedTalent = hero.talents.find(t => tierTalentIds.includes(t));
        let lockBadge = isLocked ? `<span class="talent-lock-badge">🔒 УР. ${tier.lvl}</span>` : ''; let optsHtml = '';
        tier.opts.forEach(opt => { let isSelected = pickedTalent === opt.id; let isDimmed = pickedTalent && !isSelected; let btnClass = `talent-btn ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`; optsHtml += `<div class="${btnClass}" onclick="pickTalent(${index}, '${opt.id}')"><div class="talent-name">${opt.n}</div><div class="talent-desc">${opt.d}</div></div>`; });
        html += `<div class="talent-tier ${isLocked ? 'locked' : ''}"><div class="talent-tier-header">ТИР ${index + 1} ${lockBadge}</div><div class="talent-options">${optsHtml}</div></div>`;
    });
    let tc = document.getElementById("ui-talents-container"); if(tc) tc.innerHTML = html;
}

function claimFriendReward(index) { if (!hero.friends[index] || hero.friends[index].claimed) return; hero.friends[index].claimed = true; hero.gems += 5; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); playSFX('coins'); saveGame(); updateUI(); renderFriends(); }
function addTestFriend() { if (!hero.friends) hero.friends = []; let names = ["Alexey", "ShadowFiend", "Guts", "Liliya", "Nagibator99", "JohnWick"]; let rndName = names[Math.floor(Math.random() * names.length)] + "_" + Math.floor(Math.random()*1000); hero.friends.push({ name: rndName, claimed: false }); playSFX('click'); saveGame(); renderFriends(); }
function shareRefLink() { const botName = "ArenaRpgBot"; const refUrl = `https://t.me/share/url?url=https://t.me/${botName}?start=ref_${window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'player'}&text=Заходи в крутую RPG в Telegram!`; if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.openTelegramLink(refUrl); } else { alert("Ссылка скопирована!"); } }

function renderFriends() {
    let container = document.getElementById('ui-friends-container'); if (!container) return;
    let friendsListHtml = '';
    if (!hero.friends || hero.friends.length === 0) { friendsListHtml = `<div style="text-align:center; color:#71717a; padding: 20px;">У вас пока нет приглашенных друзей.</div>`; } else { hero.friends.forEach((f, index) => { let btnHtml = f.claimed ? `<button class="modal-btn secondary" style="width:auto; height:32px; font-size:10px; margin-top:0;" disabled>ПОЛУЧЕНО</button>` : `<button class="modal-btn" style="width:auto; height:32px; font-size:10px; margin-top:0; background: #10b981; color: #fff; box-shadow: 0 2px 5px rgba(16,185,129,0.4);" onclick="claimFriendReward(${index})">ЗАБРАТЬ 5 💎</button>`; friendsListHtml += `<div class="ref-player-card"><div class="silhouette" style="font-size: 24px; opacity: 1; background: #27272a; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border: 1px solid #3f3f46;">👤</div><div style="flex: 1;"><div style="font-weight: bold; color: #e4e4e7; font-size: 13px;">${f.name}</div><div style="font-size: 10px; color: #a1a1aa;">Реферал</div></div>${btnHtml}</div>`; }); }
    container.innerHTML = `<div class="ref-invite-box"><div class="ref-invite-title" onclick="addTestFriend()">Приглашайте друзей</div><div class="ref-invite-desc">Получайте 💎 по 5 кристаллов за каждого приглашенного бойца! (Нажми на заголовок для теста)</div><div class="ref-action-row"><button class="btn-ref-share" onclick="shareRefLink()">ПОДЕЛИТЬСЯ ССЫЛКОЙ</button></div></div><div class="stat-group-title">Ваши рефералы (${hero.friends ? hero.friends.length : 0})</div><div style="display: flex; flex-direction: column; gap: 8px; padding-bottom: 20px;">${friendsListHtml}</div>`;
}

function updateUI() {
    let bloodScreen = document.getElementById('blood-screen'); if (hero.deathDebuffEnd > Date.now()) { if(bloodScreen) bloodScreen.classList.add('active'); } else { if(bloodScreen) bloodScreen.classList.remove('active'); }
    document.getElementById("ui-gold").innerText = hero.gold; document.getElementById("ui-gems").innerText = hero.gems; document.getElementById("ui-top-lvl").innerText = hero.level;
    let floorNavHtml = `<button class="floor-nav-btn" onclick="changeFloor(-1)" ${hero.floor <= 1 || combatMode === 'raid' || combatMode === 'pvp' ? 'disabled' : ''}>◀</button><span id="pve-floor-display" style="font-size: 13px;">ЭТАЖ ${hero.floor}</span><button class="floor-nav-btn" onclick="changeFloor(1)" ${hero.floor >= hero.maxFloor || combatMode === 'raid' || combatMode === 'pvp' ? 'disabled' : ''}>▶</button>`;
    document.getElementById("ui-top-floor").innerText = hero.floor; document.getElementById("ui-top-exp").innerText = `${hero.exp}/${hero.expNext}`; document.getElementById("ui-exp-bar").style.width = `${(hero.exp / hero.expNext) * 100}%`;

    if (currentScreen === 'arena') { let elRating = document.getElementById("ui-pvp-rating"); if(elRating) elRating.innerText = hero.rating; }

    if (currentScreen === 'quests') { checkDailyQuests(); let html = ''; for (let qId in DAILY_QUESTS) { let def = DAILY_QUESTS[qId]; let q = hero.quests[qId] || { progress: 0, claimed: false }; let pct = Math.min(100, (q.progress / def.target) * 100); let btnHtml = ''; if (q.claimed) { btnHtml = `<div class="quest-btn claimed">ВЫПОЛНЕНО</div>`; } else if (q.progress >= def.target) { btnHtml = `<div class="quest-btn ready" onclick="claimQuest('${qId}')">ЗАБРАТЬ НАГРАДУ</div>`; } else { btnHtml = `<div class="quest-btn">${Math.floor(q.progress)} / ${def.target}</div>`; } html += `<div class="quest-card"><div class="quest-header"><span>${def.name}</span><span class="quest-reward">+${def.rewardGems} 💎</span></div><div class="quest-desc">${def.desc}</div><div class="quest-progress-wrap"><div class="quest-progress-fill" style="width: ${pct}%"></div></div>${btnHtml}</div>`; } let qList = document.getElementById("ui-quests-list"); if(qList) qList.innerHTML = html; }

    if (currentScreen === 'PVE' && enemy) {
        let fleeBtn = document.getElementById("btn-flee-combat"); if (fleeBtn) { if (combatMode === 'pvp' || hero.hp <= 0 || isTurnExecuting) { fleeBtn.style.display = "none"; } else { fleeBtn.style.display = "block"; } }
        let lootPreviewEl = document.getElementById("boss-loot-preview"); if (!lootPreviewEl) { lootPreviewEl = document.createElement("div"); lootPreviewEl.id = "boss-loot-preview"; let dashboard = document.querySelector('.combat-dashboard'); if (dashboard) dashboard.insertBefore(lootPreviewEl, dashboard.firstChild); }
        if (enemy.isBoss || enemy.isMiniBoss || enemy.isRaid) { let dropInfoHtml = enemy.isRaid ? `🏆 <b>Награда Рейда:</b> <span style="color:#c084fc">Эпик+ 100%</span> | <span style="color:#fbbf24">Шанс на Сет 25%</span>` : (enemy.isBoss ? `👑 <b>Дроп Босса (100%):</b> <span style="color:#c084fc">Эпик 50%</span> | <span style="color:#facc15">Лега 40%</span> | <span style="color:#fbbf24">Сет 5%</span>` : `☠️ <b>Дроп Элиты (30%):</b> <span style="color:#60a5fa">Редкое 60%</span> | <span style="color:#c084fc">Эпик 30%</span> | <span style="color:#facc15">Лега 10%</span>`); lootPreviewEl.innerHTML = `<div style="background: rgba(24, 24, 27, 0.9); border: 1px solid #3f3f46; border-radius: 8px; padding: 6px 10px; margin-bottom: 8px; font-size: 10px; text-align: center; color: #d4d4d8; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">${dropInfoHtml}</div>`; lootPreviewEl.style.display = "block"; } else if (lootPreviewEl) { lootPreviewEl.style.display = "none"; }
        let titleEl = document.getElementById("combat-floor-title"); if(titleEl) { if (combatMode === 'pvp' || combatMode === 'raid') { titleEl.style.display = 'none'; } else { titleEl.style.display = 'flex'; titleEl.innerHTML = floorNavHtml; } }
        let stageNameEl = document.getElementById("combat-stage-name"); if(stageNameEl) { if (combatMode === 'pvp') { stageNameEl.innerText = "PVP АРЕНА"; stageNameEl.className = "combat-header boss"; } else if (combatMode === 'raid') { stageNameEl.innerText = "МИРОВОЙ БОСС"; stageNameEl.className = "combat-header boss"; } else { stageNameEl.innerText = enemy.isBoss ? "МЕГА-БОСС" : (enemy.isMiniBoss ? "ЭЛИТНЫЙ ВРАГ" : "ОБЫЧНЫЙ ВРАГ"); stageNameEl.className = enemy.isBoss || enemy.isMiniBoss ? "combat-header boss" : "combat-header"; } }
        let arenaOuter = document.getElementById("arena-bg"); arenaOuter.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(9,9,11,0.95) 100%), url('${enemy.bgUrl}')`; arenaOuter.style.backgroundSize = 'cover'; arenaOuter.style.backgroundPosition = 'center';
        let diorama = document.getElementById("combat-entities-box"); diorama.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(9,9,11,0.9) 100%), url('${enemy.bgUrl}')`; diorama.style.backgroundSize = 'cover'; diorama.style.backgroundPosition = 'center';
        let comboEl = document.getElementById("combo-display"); if (combatState.combo > 0) { comboEl.innerText = `🔥 КОМБО: x${(1 + combatState.combo * 0.25).toFixed(2)}`; comboEl.className = "combo-meter show"; } else { comboEl.className = "combo-meter"; }
        if (enemy.isBoss || enemy.isRaid) { let rPct = enemy.isRaid ? (enemy.turnCounter / 15 * 100) : ((enemy.turnCounter % 4) / 3 * 100); document.getElementById("enemy-rage-bar").style.width = `${rPct}%`; if(rPct >= 100) document.getElementById("enemy-rage-bar").classList.add("full"); else document.getElementById("enemy-rage-bar").classList.remove("full"); }
        let stunIcon = document.getElementById("enemy-stun-icon"); if (combatState.enemyStunned) stunIcon.style.display = "block"; else stunIcon.style.display = "none";
        let heroLvlHtml = `<span class="entity-lvl">УР. ${hero.level}</span>`; document.getElementById("combat-hero-name-plate").innerHTML = `<span class="entity-name-text">${hero.name}</span>${heroLvlHtml}`; document.getElementById("combat-hero-img").src = CLASS_AVATARS[hero.baseClass];
        let bossIcon = enemy.isBoss ? "👑 " : (enemy.isMiniBoss ? "☠️ " : ""); let enemyCleanName = enemy.name.replace("👑 ", "").replace("☠️ ", "").replace(" (Элита)", ""); let enemyLvlTag = "";
        if(enemy.isRaid || enemy.isPlayer) { enemyLvlTag = `<span class="entity-lvl boss">УР. ${enemy.floor}</span>`; } else if(enemy.isBoss) { enemyLvlTag = `<span class="entity-lvl boss">БОСС ${enemy.floor}</span>`; } else if(enemy.isMiniBoss) { enemyLvlTag = `<span class="entity-lvl elite">ЭЛИТА ${enemy.floor}</span>`; } else { enemyLvlTag = `<span class="entity-lvl">УР. ${enemy.floor}</span>`; }
        document.getElementById("combat-enemy-name-plate").innerHTML = `<span class="entity-name-text">${bossIcon}${enemyCleanName}</span>${enemyLvlTag}`; document.getElementById("combat-enemy-img").src = enemy.imgUrl;
        let enemyWrapper = document.getElementById("entity-enemy-box"); if (enemyWrapper) { enemyWrapper.className = "combat-entity-wrapper"; let enemyCard = enemyWrapper.querySelector(".combat-card"); if (enemyCard) { enemyCard.className = (enemy.isBoss || enemy.isPlayer) ? "combat-card boss" : "combat-card"; } }

        let isHeroDead = hero.hp <= 0 && !GOD_MODE;
        if (GOD_MODE) { document.getElementById("combat-hero-hp").innerText = "GOD MODE"; document.getElementById("combat-hero-maxhp").innerText = "999K"; } else { document.getElementById("combat-hero-hp").innerText = Math.max(0, Math.floor(hero.hp)); document.getElementById("combat-hero-maxhp").innerText = hero.combatStats.hp; }
        document.getElementById("combat-hero-hp-bar").style.width = `${Math.max(0, (hero.hp/hero.combatStats.hp)*100)}%`;
        let heroHpOuter = document.getElementById("combat-hero-hp-bar").parentElement; if(isHeroDead) heroHpOuter.style.background = "#2a0808"; else heroHpOuter.style.background = "#050505";
        document.getElementById("combat-enemy-hp").innerText = Math.max(0, Math.floor(enemy.hp)); document.getElementById("combat-enemy-maxhp").innerText = enemy.maxHp; document.getElementById("combat-enemy-hp-bar").style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;
        document.getElementById("combat-hero-atk-val").innerText = hero.combatStats.damage; document.getElementById("combat-hero-arm-val").innerText = hero.combatStats.armor; document.getElementById("combat-enemy-atk-val").innerText = enemy.stats.atk; document.getElementById("combat-enemy-arm-val").innerText = enemy.stats.armor;

        let centerConsBox = document.getElementById("center-consumables-box");
        if (centerConsBox) { let firstPotionId = hero.inventory.find(id => ITEMS_DB[id] && ITEMS_DB[id].subtype === 'heal'); let firstScrollId = hero.inventory.find(id => ITEMS_DB[id] && ITEMS_DB[id].subtype && ITEMS_DB[id].subtype.startsWith('dmg_')); let consHtml = ''; if (firstPotionId) { let pItem = ITEMS_DB[firstPotionId]; let isUsed = combatState.potionUsed; consHtml += `<div class="inv-item filled rarity-${pItem.rarity} center-cons-item ${isUsed ? 'dimmed' : ''}" onclick="useConsumableInCombat('${firstPotionId}', 'potion')">${renderItemIcon(pItem)}</div>`; } if (firstScrollId) { let sItem = ITEMS_DB[firstScrollId]; let isUsed = combatState.scrollUsed; consHtml += `<div class="inv-item filled rarity-${sItem.rarity} center-cons-item ${isUsed ? 'dimmed' : ''}" onclick="useConsumableInCombat('${firstScrollId}', 'scroll')">${renderItemIcon(sItem)}</div>`; } centerConsBox.innerHTML = consHtml; }

        let btnSkill = document.getElementById("btn-use-skill");
        if (isTurnExecuting || combatState.skillCooldown > 0) { btnSkill.innerHTML = `<span style="font-size:7px; color:#d8b4fe">Скилл</span>КД (${combatState.skillCooldown})`; btnSkill.disabled = true; btnSkill.style.filter = "grayscale(100%) opacity(0.5)"; } else { let cls = CLASSES[hero.baseClass]; btnSkill.innerHTML = `<span style="font-size:7px; color:#d8b4fe">${cls.name}</span>ПРИМЕНИТЬ`; btnSkill.disabled = hero.hp <= 0 && !GOD_MODE; btnSkill.style.filter = "none"; }
        ['head', 'chest', 'legs'].forEach(z => { let btnAtk = document.getElementById(`btn-atk-${z}`); let btnDef = document.getElementById(`btn-def-${z}`); btnAtk.className = `zone-btn atk ${combatState.atkZone === z ? 'selected' : ''}`; let defClass = `zone-btn def ${combatState.defZone === z ? 'selected' : ''}`; if (combatState.zoneHealth[z] === 0) defClass += " broken"; btnDef.className = defClass; document.getElementById(`dur-${z}`).innerHTML = renderDurability(z); });
        let btnExe = document.getElementById("btn-execute-turn"); if (btnExe) { if(hero.hp <= 0 && !GOD_MODE) { btnExe.innerText = "ГЕРОЙ МЕРТВ"; btnExe.disabled = true; } else if (combatState.atkZone && combatState.defZone && !isTurnExecuting) { btnExe.innerText = "УДАРИТЬ ⚔️"; btnExe.disabled = false; } else { btnExe.innerText = "ВЫБЕРИТЕ ЗОНЫ"; btnExe.disabled = true; } }
    }

    if (currentScreen === 'hero') {
        let cls = CLASSES[hero.baseClass]; 
        let muteBtn = `<span style="cursor:pointer; filter:grayscale(${sfxMuted?'100%':'0%'}) opacity(${sfxMuted?'0.5':'1'}); padding: 0 8px; font-size:16px;" onclick="toggleMute()">${sfxMuted?'🔇':'🔊'}</span>`;
        let cn = document.getElementById("ui-class-name"); if(cn) cn.innerHTML = `<div>${cls.icon} <b>${hero.name}</b> <span style="font-size:11px; color:#71717a; font-weight:normal;">[${cls.name}]</span></div> <div style="display:flex; align-items:center; gap:8px;">${muteBtn} <button class="reset-btn" onclick="hardReset()">СБРОС</button></div>`;
        let av = document.getElementById("main-hero-avatar"); if(av) av.src = CLASS_AVATARS[hero.baseClass];
        let isCombat = currentScreen === 'PVE' && enemy; let skipHead = isCombat && combatState.zoneHealth.head === 0; let skipChest = isCombat && combatState.zoneHealth.chest === 0; let skipLegs = isCombat && combatState.zoneHealth.legs === 0;

        const slots = ["head", "chest", "belt", "boots", "amulet", "ring1", "ring2", "weapon1", "weapon2"];
        slots.forEach(slotKey => { let el = document.getElementById("slot-" + slotKey); if (el) { let item = hero.equipment[slotKey]; let isBroken = false; if(skipHead && slotKey === 'head') isBroken = true; if(skipChest && (slotKey === 'chest' || slotKey === 'weapon1' || slotKey === 'weapon2')) isBroken = true; if(skipLegs && (slotKey === 'boots' || slotKey === 'belt')) isBroken = true; el.className = `equip-slot ${item ? (item.id === "blocked" ? "blocked" : "filled rarity-" + (item.rarity || "common")) : "empty"} ${isBroken ? "blocked" : ""}`; let silIcon = el.getAttribute("data-sil") || "🛡️"; el.innerHTML = item ? `${renderItemIcon(item)}<span class="slot-label" ${item.id==="blocked"||isBroken?'style="color:#ef4444"':''}>${isBroken?'СЛОМАНО':getSlotName(slotKey)}</span>` : `<div class="silhouette">${silIcon}</div><span class="slot-label">${getSlotName(slotKey)}</span>`; if(isBroken) el.style.filter = "grayscale(100%) opacity(0.5)"; else el.style.filter = "none"; } });

        let bc = document.getElementById("ui-bag-capacity"); if(bc) { bc.innerText = `${hero.inventory.length}/15`; if (hero.inventory.length > 15) bc.style.color = "#ef4444"; else bc.style.color = "#a1a1aa"; }
        let invHtml = ''; let gridLimit = Math.max(15, Math.ceil(hero.inventory.length / 5) * 5); for (let i = 0; i < gridLimit; i++) { if (i < hero.inventory.length) { let item = ITEMS_DB[hero.inventory[i]]; if (item) { invHtml += `<div class="inv-item filled rarity-${item.rarity}" onclick="openInspectModal(${i})">${renderItemIcon(item)}</div>`; } else { invHtml += `<div class="inv-item empty"></div>`; } } else { invHtml += `<div class="inv-item empty"></div>`; } }
        let ig = document.getElementById("ui-inventory-grid"); if(ig) ig.innerHTML = invHtml;

        let hpPercent = Math.min(100, Math.max(0, (hero.hp / hero.finalStats.hp) * 100)); let missingHp = hero.finalStats.hp - Math.floor(hero.hp); let healCost = Math.max(10, Math.floor(missingHp * 0.5));
        let healBtnHtml = hero.hp < hero.finalStats.hp ? `<button class="heal-btn" onclick="healHero()">ЛЕЧИТЬ (-${healCost}💰)</button>` : ``;

        let isDebuff = hero.deathDebuffEnd > Date.now(); let warnTxt = isDebuff ? `<div style="color:#ef4444; font-size:9px; font-weight:bold; margin-bottom:4px;">⚠️ АКТИВЕН ШТРАФ СМЕРТИ (-25%)</div>` : '';
        let altarTxt = ''; if (hero.activeAltar) { let ev = BOSS_EVENTS.find(e => e.id === hero.activeAltar); if (ev) altarTxt = `<div style="background:#4c0519; color:#fca5a5; padding:6px; border-radius:6px; text-align:center; margin-bottom:12px; font-weight:bold; border: 1px dashed #be123c; box-shadow: 0 0 10px rgba(190, 18, 60, 0.3);">🔮 АКТИВНО ПРОКЛЯТИЕ ЗАБЕГА:<br><span style="font-size:11px; color:#fff;">${ev.title}</span></div>`; }

        let unspentHtml = hero.unspentPoints > 0 ? `<div style="background:#064e3b; color:#34d399; padding:6px; border-radius:6px; text-align:center; margin-bottom:12px; font-weight:bold; border: 1px solid #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);">ОЧКОВ ХАРАКТЕРИСТИК: ${hero.unspentPoints}</div>` : '';
        function renderStatRow(icon, name, key, val) { let btn = hero.unspentPoints > 0 ? `<button class="stat-btn-add" onclick="addStat('${key}')">+</button>` : ''; return `<div class="stat-item"><span>${icon} ${name}</span> <div style="display:flex; align-items:center;"><b>${val}</b>${btn}</div></div>`; }

        let elemTable = `<div class="stat-group-title" style="margin-top:10px;">Стихийный урон и Защита</div><div class="stat-resist-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:#18181b; padding:8px; border-radius:8px; border:1px solid #27272a;"><div style="font-size:10px;"><span class="elem-fire">🔥 Огонь:</span> <b>+${hero.finalStats.dmg_fire || 0}</b> <br><span style="color:#71717a;">Рез: ${hero.finalStats.res_fire || 0}%</span></div><div style="font-size:10px;"><span class="elem-ice">❄️ Лёд:</span> <b>+${hero.finalStats.dmg_ice || 0}</b> <br><span style="color:#71717a;">Рез: ${hero.finalStats.res_ice || 0}%</span></div><div style="font-size:10px;"><span class="elem-dark">☠️ Тьма:</span> <b>+${hero.finalStats.dmg_dark || 0}</b> <br><span style="color:#71717a;">Рез: ${hero.finalStats.res_dark || 0}%</span></div><div style="font-size:10px;"><span class="elem-holy">☀️ Свет:</span> <b>+${hero.finalStats.dmg_holy || 0}</b> <br><span style="color:#71717a;">Рез: ${hero.finalStats.res_holy || 0}%</span></div></div>`;

        let sc = document.getElementById("ui-stats-container");
        if(sc) sc.innerHTML = `<div class="stats-card">${unspentHtml}<div class="stat-group-title">Базовые параметры</div>${renderStatRow('⚔️', 'Сила (СИЛ)', 'str', hero.finalStats.str)}${renderStatRow('🏃', 'Ловкость (ЛОВ)', 'agi', hero.finalStats.agi)}${renderStatRow('❤️', 'Выносл-ть (ВЫН)', 'end', hero.finalStats.end)}${renderStatRow('🎯', 'Мастерство (МСТ)', 'mst', hero.finalStats.mst)}${renderStatRow('🍀', 'Удача (УДЧ)', 'luk', hero.finalStats.luk)}</div><div class="stats-card"><div class="stat-group-title">Боевые параметры</div>${altarTxt} ${warnTxt}<div class="stat-item" style="flex-direction:column; align-items:stretch;"><div style="display:flex; justify-content:space-between; margin-bottom:2px; align-items:center;"><span>🩸 Здоровье <b>${Math.floor(hero.hp)} / ${hero.finalStats.hp}</b></span>${healBtnHtml}</div><div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${hpPercent}%;"></div></div></div><div class="stat-item"><span>🗡️ Урон</span> <b style="${isDebuff?'color:#ef4444':''}">${hero.finalStats.damage}</b></div><div class="stat-item"><span>🛡️ Броня</span> <b style="${isDebuff?'color:#ef4444':''}">${hero.finalStats.armor}</b></div><div class="stat-item"><span>⛏️ Пробитие</span> <b style="color:#f59e0b;">${hero.finalStats.armorPen}</b></div><div class="stat-item"><span>⚡ Крит / Урон</span> <b>${hero.finalStats.critChance}% / ${hero.finalStats.critDmg}%</b></div><div style="display:flex; gap:6px; margin-top:8px; font-size:10px;"><div style="flex:1; background:#27272a; padding:6px; border-radius:6px; text-align:center;"><span style="color:#ef4444">Вампиризм</span><br><b style="font-size:13px;">${hero.finalStats.lifesteal || 0}%</b></div><div style="flex:1; background:#27272a; padding:6px; border-radius:6px; text-align:center;"><span style="color:#a855f7">Контратака</span><br><b style="font-size:13px;">${hero.finalStats.counter || 0}%</b></div><div style="flex:1; background:#27272a; padding:6px; border-radius:6px; text-align:center;"><span style="color:#fbbf24">Шипы</span><br><b style="font-size:13px;">${hero.finalStats.thorns || 0}%</b></div></div>${elemTable}</div>`;
    }

    if (currentScreen === 'boss') {
        let tEl = document.getElementById("ui-raid-tickets"); if(tEl) tEl.innerText = `${hero.tickets}/${hero.maxTickets}`;
        let raidHtml = ""; let statMult = 1 + (hero.level * 0.1); 
        RAID_BOSSES.forEach(b => { let imgUrl = `${STATIC_URL}mobs/B_${b.imgId}_high_resolution.png`; let canAfford = hero.tickets > 0; let btnHtml = canAfford ? `<button class="raid-btn" onclick="startRaid('${b.id}')">В БОЙ (1 🎟️)</button>` : `<button class="raid-btn" disabled>НЕТ БИЛЕТОВ</button>`; let bHp = Math.floor(100 * statMult * b.hpMult); let bAtk = Math.floor(10 * statMult * b.atkMult); let bArm = Math.floor(5 * statMult * b.armMult); let weakHtml = ""; if (b.res_holy < 0) weakHtml = `<span class="elem-holy" style="font-size:9px;">Уязвим к Свету</span>`; if (b.res_ice < 0) weakHtml = `<span class="elem-ice" style="font-size:9px;">Уязвим ко Льду</span>`; let tierLvl = Math.floor(hero.level / 20) * 20; if (tierLvl === 0) tierLvl = 1; raidHtml += `<div class="raid-boss-card"><div class="raid-img-box"><div class="silhouette">👾</div><img src="${imgUrl}" class="raid-img"></div><div class="raid-info"><div><div class="raid-name">${b.name} <span class="entity-lvl boss" style="font-size:8px;">УР. ${hero.level}</span></div><div class="raid-desc">${b.desc} <b style="color:#fbbf24; font-size:10px;">Дроп: Сет Ур. ${tierLvl}</b> ${weakHtml}</div><div class="combat-mini-stats" style="margin-bottom: 6px; justify-content: space-between; padding: 4px 6px;"><span>❤️ ${bHp}</span> <span>⚔️ ${bAtk}</span> <span>🛡️ ${bArm}</span></div></div>${btnHtml}</div></div>`; });
        let rl = document.getElementById("ui-raid-list"); if(rl) rl.innerHTML = raidHtml;
    }

    if (currentScreen === 'blacksmith') {
        let forgeHtml = ''; for (let i = 0; i < 15; i++) { if (i < hero.inventory.length) { let item = ITEMS_DB[hero.inventory[i]]; if (item) { let selClass = forgeSelectedIndex === i ? 'selected' : ''; forgeHtml += `<div class="inv-item filled rarity-${item.rarity} ${selClass}" onclick="selectForgeItem(${i})">${renderItemIcon(item)}</div>`; } else { forgeHtml += `<div class="inv-item empty"></div>`; } } else { forgeHtml += `<div class="inv-item empty"></div>`; } }
        let fg = document.getElementById("ui-forge-grid"); if(fg) fg.innerHTML = forgeHtml;

        let dPanel = document.getElementById("forge-details-panel"); let btnUpg = document.getElementById("btn-forge-upgrade");
        if (forgeSelectedIndex !== null && hero.inventory[forgeSelectedIndex]) { let item = ITEMS_DB[hero.inventory[forgeSelectedIndex]]; if (item) { let cost = item.lvl * item.price * 2; let nextLvl = item.lvl + 1; document.getElementById("f-item-name").innerText = item.name; document.getElementById("f-item-lvl").innerText = `УР. ${item.lvl} ➔ ${nextLvl}`; let statHtml = ""; for (let s in item.stats) { let oldVal = item.stats[s]; let isPct = ['critChance', 'dodgeChance', 'lifesteal', 'counter', 'thorns', 'blockChance'].includes(s); let newVal = isPct ? oldVal + 1 : Math.max(1, Math.ceil(oldVal * 1.15)); let sName = {atk:'Урон', armor:'Броня', str:'Сила', agi:'Ловкость', end:'Выносливость', mst:'Мастерство', luk:'Удача', critChance:'Крит %', dodgeChance:'Уворот %', armorPen:'Пробитие', blockChance:'Блок %', critDmg: 'Крит. Урон %', dmg_fire:'Урон 🔥', dmg_ice:'Урон ❄️', dmg_dark:'Урон ☠️', dmg_holy:'Урон ☀️', lifesteal:'Вампиризм %', counter:'Контратака %', thorns:'Шипы %'}[s] || s; statHtml += `<div class="f-stat-row"><span>${sName}</span><div><span class="f-old">${oldVal}</span><span class="f-arrow">➔</span><span class="f-new">${newVal}</span></div></div>`; } document.getElementById("f-item-stats").innerHTML = statHtml; let upgCount = item.upgradeCount || 0; if(btnUpg) { btnUpg.innerText = `КОВАТЬ (💰 ${cost})`; btnUpg.disabled = hero.gold < cost || upgCount >= 10; if (upgCount >= 10) btnUpg.innerText = "ПРЕДЕЛ КОВКИ"; } if(dPanel) dPanel.classList.add("show"); } } else { if(dPanel) dPanel.classList.remove("show"); }
    }

    if (currentScreen === 'shop') {
        let shopHtml = '';
        if (shopMode === 'buy') {
            let sortedAssortment = [...SHOP_ASSORTMENT].filter(id => ITEMS_DB[id] && ITEMS_DB[id].inShop).sort((a, b) => ITEMS_DB[a].price - ITEMS_DB[b].price);
            sortedAssortment.forEach(itemId => { let item = ITEMS_DB[itemId]; let price = getShopPrice(item.price); let canAfford = hero.gold >= price; let meetLvl = hero.level >= item.lvl; let btnHtml = (canAfford && meetLvl) ? `<button class="shop-btn btn-buy" onclick="buyItem('${item.id}')">Купить<br>💰 ${price}</button>` : `<button class="shop-btn btn-buy" disabled>💰 ${price}</button>`; shopHtml += `<div class="shop-item-card"><div class="shop-item-icon rarity-${item.rarity}">${renderItemIcon(item)}</div><div class="shop-item-info"><div class="shop-item-name"><span>${item.name}</span></div><div class="shop-item-stats">${item.desc}</div></div>${btnHtml}</div>`; });
            if(sortedAssortment.length === 0) shopHtml = `<div style="text-align:center; padding:20px; color:#a1a1aa;">Торгаш ушел за новыми зельями...</div>`;
        } else if (shopMode === 'sell') {
            if (hero.inventory.length === 0) shopHtml = `<div style="text-align:center; padding: 20px; color:#71717a;">Ваша сумка пуста. Экипировка добывается в Башне!</div>`; else { hero.inventory.forEach((itemId, index) => { let item = ITEMS_DB[itemId]; if (!item) return; shopHtml += `<div class="shop-item-card"><div class="shop-item-icon rarity-${item.rarity}">${renderItemIcon(item)}</div><div class="shop-item-info"><div class="shop-item-name">${item.name} <span class="shop-item-lvl">Ур. ${item.lvl}</span></div><div class="shop-item-stats" style="color:#71717a;">Возврат: 50%</div></div><button class="shop-btn btn-sell" onclick="sellItem(${index})">Продать<br>💰 +${Math.floor(item.price * 0.5)}</button></div>`; }); }
        } else if (shopMode === 'premium') {
            let premList = document.getElementById("ui-premium-list");
            if (premList) {
                premList.innerHTML = `
                    <div class="gem-card">
                        <div class="gem-info"><div class="gem-icon">💎</div><div class="gem-amount">100 Алмазов</div></div>
                        <button class="btn-stars" onclick="buyGemsWithStars(100, 50)">50 <span class="star-icon">⭐️</span></button>
                    </div>
                    <div class="gem-card">
                        <div class="gem-info"><div class="gem-icon">💎</div><div class="gem-amount">500 Алмазов <span class="gem-bonus">+ Хит!</span></div></div>
                        <button class="btn-stars" onclick="buyGemsWithStars(500, 200)">200 <span class="star-icon">⭐️</span></button>
                    </div>
                    <div class="gem-card">
                        <div class="gem-info"><div class="gem-icon">💎</div><div class="gem-amount">1500 Алмазов <span class="gem-bonus">+ Выгодно!</span></div></div>
                        <button class="btn-stars" onclick="buyGemsWithStars(1500, 500)">500 <span class="star-icon">⭐️</span></button>
                    </div>
                    <div style="text-align:center; color:#71717a; font-size:10px; margin-top:10px;">Оплата происходит через официальную систему Telegram Stars. Звезды можно купить в настройках вашего профиля Telegram.</div>
                `;
            }
        }
        let sl = document.getElementById("ui-shop-list"); if(sl) sl.innerHTML = shopHtml;
    }

    if (currentScreen === 'classes') {
        let galleryHtml = ''; for (let key in CLASSES) { let cls = CLASSES[key]; galleryHtml += `<div class="class-icon-btn ${previewClassId === key ? 'selected' : ''}" onclick="selectPreviewClass('${key}')"><div class="icon">${cls.icon}</div><div class="name">${cls.name}</div></div>`; }
        let cg = document.getElementById("ui-classes-gallery"); if(cg) cg.innerHTML = galleryHtml;

        let selCls = CLASSES[previewClassId]; let isCurrentHeroClass = hero.baseClass === previewClassId;
        
        let cd = document.getElementById("ui-class-detail");
        if (cd) { cd.innerHTML = `<div class="class-detail-card" style="border-color: ${selCls.color}40;"><div class="class-detail-img-box"><div class="silhouette" style="position:absolute; font-size:80px; z-index:1; opacity:0.3;">👤</div><img src="${CLASS_AVATARS[previewClassId]}" alt="${selCls.name}" class="class-preview-img"><div class="class-gradient-fade"></div></div><div class="class-detail-content"><div class="class-detail-header"><div class="class-detail-title" style="color:${selCls.color}; text-shadow: 0 0 15px ${selCls.color}80;">${selCls.icon} ${selCls.name}</div><div class="class-detail-growth">Авто-рост: СИЛ +${selCls.growth.str} | ЛОВ +${selCls.growth.agi} | ВЫН +${selCls.growth.end} | МСТ +${selCls.growth.mst} | УДЧ +${selCls.growth.luk}</div></div><div class="class-detail-lore">"${selCls.lore}"</div><div class="class-bars"><div class="c-bar-row"><span>Атака</span><div class="c-bar-wrap"><div class="c-bar-fill" style="width: ${selCls.bars.dmg}%; background: ${selCls.color}; box-shadow: 0 0 10px ${selCls.color};"></div></div></div><div class="c-bar-row"><span>Защита</span><div class="c-bar-wrap"><div class="c-bar-fill" style="width: ${selCls.bars.def}%; background: ${selCls.color}; box-shadow: 0 0 10px ${selCls.color};"></div></div></div><div class="c-bar-row"><span>Сложность</span><div class="c-bar-wrap"><div class="c-bar-fill" style="width: ${selCls.bars.diff}%; background: ${selCls.color}; box-shadow: 0 0 10px ${selCls.color};"></div></div></div></div><button class="select-class-btn" ${isCurrentHeroClass ? 'disabled' : ''} onclick="changeClass('${previewClassId}')" style="${!isCurrentHeroClass ? `box-shadow: 0 4px 15px ${selCls.color}40; border-color: ${selCls.color};` : ''}">${isCurrentHeroClass ? '✔ ТЕКУЩИЙ КЛАСС' : 'СМЕНИТЬ КЛАСС (💰 5000)'}</button></div></div>`; }
    }
    
    if (currentScreen === 'talents') { renderTalents(); }
    if (currentScreen === 'friends') { renderFriends(); }
}

loadGame();
