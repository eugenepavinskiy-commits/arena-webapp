// === ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
if (window.Telegram && window.Telegram.WebApp) {
    window.tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
}

// === ВИЗУАЛЬНАЯ БАЗА (VFX & LOTTIE) ===
const VFX_DB = {
    attack_hero: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", 
    attack_enemy: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", 
    
    // В будущем ты сможешь заменить эти ссылки на свои Lottie-анимации для каждого класса!
    knight_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", 
    berserk_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", 
    shadow_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json", 
    ranger_skill: "https://lottie.host/8c1c5b8b-e8d1-4e42-88f2-89518dbdc035/3gB5H5E7b4.json" 
};

function playLottieEffect(targetId, animationUrl, extraClass = "") {
    let targetNode = document.getElementById(targetId);
    if (!targetNode) return;
    let fxContainer = document.createElement('div');
    fxContainer.className = 'lottie-fx-layer ' + extraClass;
    targetNode.appendChild(fxContainer);

    let anim = lottie.loadAnimation({
        container: fxContainer,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: animationUrl 
    });

    anim.addEventListener('complete', () => { fxContainer.remove(); anim.destroy(); });
}

function shakeScreen() {
    let app = document.getElementById("app-container");
    if(app) {
        app.classList.remove("shake-hard");
        void app.offsetWidth;
        app.classList.add("shake-hard");
        setTimeout(() => app.classList.remove("shake-hard"), 350);
    }
}

function triggerSkillVFX(elementId, vfxClass) {
    let el = document.getElementById(elementId);
    if(el) {
        el.classList.remove(vfxClass);
        void el.offsetWidth;
        el.classList.add(vfxClass);
        setTimeout(() => el.classList.remove(vfxClass), 500);
    }
}

const STATIC_URL = "./static/";
const GOD_MODE = false; 

const CLASS_AVATARS = {
    knight: STATIC_URL + "knight.png",
    berserk: STATIC_URL + "berserk.png",
    shadow: STATIC_URL + "shadow.png",
    ranger: STATIC_URL + "ranger.png"
};

const imgCache = {};
for (let key in CLASS_AVATARS) {
    imgCache[key] = new Image();
    imgCache[key].src = CLASS_AVATARS[key];
}

const CLASSES = {
    knight: { 
        id: "knight", name: "Рыцарь", icon: "🛡️", color: "#fbbf24", 
        lore: "Держит удар лучше, чем корпоративный сервер в пятницу. [Пассивка: Идеальный блок отражает 20% урона]", 
        growth: { str: 1, agi: 0, end: 1, mst: 0, luk: 0 }, 
        statWeights: { str_dmg: 1, str_arm: 1, agi_dodge: 0.2, end_hp: 15, mst_block: 1, mst_pen: 0.5, luk_crit: 0.2, luk_drop: 0.1 }, 
        skill: { name: "Эгида", desc: "Блокирует удар и Исцеляет 25% HP.", cd: 3 }, 
        bars: { dmg: 40, def: 100, diff: 20 }, 
        armorMult: 1.25, critDmgMult: 1.4, dodgeMult: 0.9 
    },
    berserk: { 
        id: "berserk", name: "Берсерк", icon: "🪓", color: "#ef4444", 
        lore: "Машина для переработки врагов. [Пассивка: Меньше HP - больше урон и крит]", 
        growth: { str: 2, agi: 0, end: 0, mst: 0, luk: 0 }, 
        statWeights: { str_dmg: 3, agi_dodge: 0.5, end_hp: 8, mst_pen: 2, mst_cdmg: 1, luk_crit: 0.5, luk_drop: 0.1 }, 
        skill: { name: "Яростный Удар", desc: "Удар на x2.5 урона.", cd: 3 }, 
        bars: { dmg: 100, def: 30, diff: 50 }, 
        armorMult: 0.85, critDmgMult: 1.9, dodgeMult: 1.0 
    },
    shadow: { 
        id: "shadow", name: "Тень", icon: "🗡️", color: "#a855f7", 
        lore: "Специалист по внезапным сокращениям популяции. [Пассивка: Уворот дает 100% крит на след. удар]", 
        growth: { str: 0, agi: 1, end: 0, mst: 1, luk: 0 }, 
        statWeights: { str_dmg: 0.5, agi_dmg: 2, agi_dodge: 1, end_hp: 6, mst_cdmg: 3, mst_pen: 1, luk_crit: 0.8, luk_dodge: 0.5, luk_drop: 0.1 }, 
        skill: { name: "Вспышка Тени", desc: "Уворот + Крит на след. ход.", cd: 3 }, 
        bars: { dmg: 85, def: 20, diff: 90 }, 
        armorMult: 1.0, critDmgMult: 2.2, dodgeMult: 1.3 
    },
    ranger: { 
        id: "ranger", name: "Следопыт", icon: "🏹", color: "#10b981", 
        lore: "Делегирует стрелы в уязвимые места. [Пассивка: Удача влияет на лут. Игнор 30% брони]", 
        growth: { str: 0, agi: 1, end: 0, mst: 0, luk: 1 }, 
        statWeights: { str_dmg: 1, agi_dmg: 1.5, agi_dodge: 0.5, end_hp: 8, mst_pen: 2, mst_crit: 0.5, luk_crit: 0.5, luk_drop: 2.0 }, 
        skill: { name: "Выстрел в Сердце", desc: "Оглушает врага на 1 ход.", cd: 3 }, 
        bars: { dmg: 70, def: 40, diff: 60 }, 
        armorMult: 1.0, critDmgMult: 1.8, dodgeMult: 1.15 
    }
};

const TALENTS_DATA = {
    knight: [
        {lvl:20, opts:[{id:'k1a',n:'Бастион',d:'Блок лечит 5% HP'},{id:'k1b',n:'Шипы',d:'+15% Брони к Урону'},{id:'k1c',n:'Молот',d:'Игнор 50% Брони'}]},
        {lvl:40, opts:[{id:'k2a',n:'Крепость',d:'+25% Макс HP'},{id:'k2b',n:'Возмездие',d:'Идеал. блок: возврат 50% урона'},{id:'k2c',n:'Шок',d:'Блок: 25% шанс оглушить'}]},
        {lvl:60, opts:[{id:'k3a',n:'Сталь',d:'+50% Брони'},{id:'k3b',n:'Ярость',d:'Урон +20%'},{id:'k3c',n:'Святость',d:'Навык лечит 50% HP'}]},
        {lvl:80, opts:[{id:'k4a',n:'Иммунитет',d:'Иммунитет к критам'},{id:'k4b',n:'Тяжесть',d:'МСТ дает +2% Блока'},{id:'k4c',n:'Рвение',d:'КД навыка -1 ход'}]},
        {lvl:100, opts:[{id:'k5a',n:'Второе дыхание',d:'<30% HP: Броня x2'},{id:'k5b',n:'Зеркало',d:'Идеал. блок: возврат 100% урона'},{id:'k5c',n:'Кара',d:'Удары игнорируют блок'}]}
    ],
    berserk: [
        {lvl:20, opts:[{id:'b1a',n:'Вампир',d:'Лечит 15% от урона'},{id:'b1b',n:'Гнев',d:'Комбо растет x2 быстрее'},{id:'b1c',n:'Крушитель',d:'Ломает броню с 1 удара'}]},
        {lvl:40, opts:[{id:'b2a',n:'Толстая кожа',d:'+20% Макс HP'},{id:'b2b',n:'Жестокость',d:'+50% Крит Урон'},{id:'b2c',n:'Палач',d:'+40% урона по сломанному'}]},
        {lvl:60, opts:[{id:'b3a',n:'Регенерация',d:'+5 HP каждый ход'},{id:'b3b',n:'Агония',d:'Бонус от ран x2'},{id:'b3c',n:'Пробитие',d:'+30% Игнор брони'}]},
        {lvl:80, opts:[{id:'b4a',n:'Стойкость',d:'Входящий урон -20%'},{id:'b4b',n:'Транс',d:'Комбо не сбрасывается от урона'},{id:'b4c',n:'Кровоточивость',d:'Криты бьют зону x3'}]},
        {lvl:100, opts:[{id:'b5a',n:'Бессмертие',d:'Выживает с 1 HP (1 раз)'},{id:'b5b',n:'Аватар',d:'Крит урон до +200% при лоу HP'},{id:'b5c',n:'Резня',d:'100% Игнор брони'}]}
    ],
    shadow: [
        {lvl:20, opts:[{id:'s1a',n:'Ветер',d:'Кап уворота 90%'},{id:'s1b',n:'Убийца',d:'100% крит по фулл HP'},{id:'s1c',n:'Яд',d:'Яд: -5% HP врага за ход'}]},
        {lvl:40, opts:[{id:'s2a',n:'Тень',d:'Уворот лечит 5% HP'},{id:'s2b',n:'Призрак',d:'Игнор блока врага'},{id:'s2c',n:'Пиявка',d:'Яд лечит Тень'}]},
        {lvl:60, opts:[{id:'s3a',n:'Рефлекс',d:'+15% Уворот'},{id:'s3b',n:'Точность',d:'+20% Крит шанс'},{id:'s3c',n:'Токсин',d:'Яд бьет на +50% сильнее'}]},
        {lvl:80, opts:[{id:'s4a',n:'Контратака',d:'Уворот бьет 100% урона'},{id:'s4b',n:'Ассасин',d:'КД навыка -1 ход'},{id:'s4c',n:'Слабость',d:'Яд режет урон врага на 20%'}]},
        {lvl:100, opts:[{id:'s5a',n:'Мираж',d:'50% шанс увернуться всегда'},{id:'s5b',n:'Казнь',d:'Ваншот врага <20% HP'},{id:'s5c',n:'Эпидемия',d:'Яд стакается до 3 раз'}]}
    ],
    ranger: [
        {lvl:20, opts:[{id:'r1a',n:'Снайпер',d:'В голову: +30% крит шанс'},{id:'r1b',n:'Мародер',d:'Золото x2'},{id:'r1c',n:'Ловчий',d:'Замедление (пропуск 3-го хода)'}]},
        {lvl:40, opts:[{id:'r2a',n:'Пронзание',d:'Криты игнорят 100% брони'},{id:'r2b',n:'Искатель',d:'Шанс Реликвии +50%'},{id:'r2c',n:'Ловушка',d:'Ульта босса позже на 3 хода'}]},
        {lvl:60, opts:[{id:'r3a',n:'Мощь',d:'Урон +20%'},{id:'r3b',n:'Жадность',d:'Алмазы с рейдов +50%'},{id:'r3c',n:'Проворство',d:'+10% Уворот'}]},
        {lvl:80, opts:[{id:'r4a',n:'Хедшот',d:'В голову: +50% Крит Урон'},{id:'r4b',n:'Торгаш',d:'Цены в Лавке -20%'},{id:'r4c',n:'Подавление',d:'Урон боссов -15%'}]},
        {lvl:100, opts:[{id:'r5a',n:'Меткость',d:'Навык режет броню босса навсегда'},{id:'r5b',n:'Клад',d:'20% шанс на х2 Реликвии с босса'},{id:'r5c',n:'Ослепление',d:'Враг мажет с шансом 20%'}]}
    ]
};

const SETS_DB = {
    templar: { name: "Твердыня Храмовника", p2: "+25% Брони, Кап Блока 75%", p4: "Идеал. блок лечит 10% HP и наносит чистый урон врагу." },
    bloodied: { name: "Кровавый Оскал", p2: "+50% Крит. Урона, +20% Макс HP", p4: "Жажда Крови: Урон растет от ран в 2 раза сильнее. 1 раз за бой выживает с 1 HP и получает 100% Вампиризм на след. удар." },
    void: { name: "Шёпот Пустоты", p2: "+20% Уворот, Кап Уворота 95%", p4: "Фантом: Уворот отравляет врага Ядом. Крит после уворота игнорирует 100% брони." },
    storm: { name: "Глаз Бури", p2: "Удача (УДЧ) x2", p4: "Снайпер: Удар в 'Голову' дает +150% Крит. урона и 30% шанс наложить Абсолютное Оглушение." }
};

const ITEMS_DB = {
    "90523": { id: "90523", name: "Ржавая Кирка", type: "weapon1", icon: "⛏️", rarity: "common", lvl: 1, price: 30, stats: { atk: 5, armorPen: 2 } },
    "86389": { id: "86389", name: "Железный Кинжал", type: "weapon1", icon: "🗡️", rarity: "common", lvl: 1, price: 40, allowedClasses: ["shadow", "ranger"], stats: { atk: 4, critChance: 3 } },
    "64755": { id: "64755", name: "Гвардейская Кольчуга", type: "chest", icon: "👕", rarity: "common", lvl: 1, price: 50, stats: { armor: 10, dodgeChance: -1 } },
    "65822": { id: "65822", name: "Круглый Щит", type: "weapon2", icon: "🛡️", rarity: "common", lvl: 1, price: 45, allowedClasses: ["knight", "ranger"], stats: { armor: 6, blockChance: 5 } },
    "61669": { id: "61669", name: "Боевой Топор", type: "weapon1", icon: "🪓", rarity: "rare", lvl: 2, price: 120, allowedClasses: ["berserk", "knight", "ranger"], stats: { atk: 12, str: 2 } },
    "60684": { id: "60684", name: "Синий Камзол", type: "chest", icon: "🧥", rarity: "rare", lvl: 2, price: 150, stats: { armor: 8, mst: 5, luk: 2 } },
    "54873": { id: "54873", name: "Шлем Наемника", type: "head", icon: "🪖", rarity: "common", lvl: 2, price: 100, stats: { armor: 10, str: 2 } },
    "shields_v2_33": { id: "shields_v2_33", name: "Деревянный Тарч", type: "weapon2", icon: "🛡️", rarity: "common", lvl: 2, price: 110, stats: { armor: 12, blockChance: 6 } },
    "25186": { id: "25186", name: "Изумрудное Кольцо", type: "ring", icon: "💍", rarity: "rare", lvl: 3, price: 300, stats: { agi: 4, luk: 3, dodgeChance: 2 } },
    "48635": { id: "48635", name: "Стальной Стилет", type: "weapon1", icon: "🗡️", rarity: "rare", lvl: 3, price: 210, allowedClasses: ["shadow", "ranger"], dropOnly: true, stats: { atk: 18, critChance: 6, armorPen: 3 } },
    "61409": { id: "61409", name: "Шлем Пехотинца", type: "head", icon: "🪖", rarity: "rare", lvl: 3, price: 250, dropOnly: true, stats: { armor: 15, str: 3 } },
    "52433": { id: "52433", name: "Шлем Гладиатора", type: "head", icon: "🪖", rarity: "rare", lvl: 3, price: 270, allowedClasses: ["berserk", "knight"], dropOnly: true, stats: { armor: 10, str: 3 } },
    "23564": { id: "23564", name: "Тяжелый Чекан", type: "two_handed", icon: "⛏️", rarity: "epic", lvl: 4, price: 450, allowedClasses: ["berserk"], dropOnly: true, stats: { atk: 38, armorPen: 10, agi: -2 } },
    "52995": { id: "52995", name: "Пепельная Ряса", type: "chest", icon: "🥋", rarity: "epic", lvl: 4, price: 350, dropOnly: true, stats: { armor: 18, mst: 8, end: 3 } },
    "shields_v2_34": { id: "shields_v2_34", name: "Стальный Щит", type: "weapon2", icon: "🛡️", rarity: "rare", lvl: 4, price: 380, allowedClasses: ["knight"], dropOnly: true, stats: { armor: 25, blockChance: 10 } },
    "35056": { id: "35056", name: "Длинный Меч", type: "weapon1", icon: "⚔️", rarity: "epic", lvl: 5, price: 800, allowedClasses: ["knight"], dropOnly: true, setId: "templar", stats: { atk: 42, str: 5 } },
    "51613": { id: "51613", name: "Стальные Сапоги", type: "boots", icon: "👢", rarity: "epic", lvl: 5, price: 750, allowedClasses: ["knight", "berserk"], dropOnly: true, stats: { armor: 15, end: 5 } },
    "42540": { id: "42540", name: "Рыцарский Щит", type: "weapon2", icon: "🛡️", rarity: "epic", lvl: 5, price: 850, allowedClasses: ["knight"], dropOnly: true, setId: "templar", stats: { armor: 38, blockChance: 12 } },
    "60697": { id: "60697", name: "Капюшон Тени", type: "head", icon: "🥋", rarity: "epic", lvl: 5, price: 800, allowedClasses: ["shadow", "ranger"], dropOnly: true, setId: "void", stats: { armor: 12, agi: 6, dodgeChance: 4 } },
    "47612": { id: "47612", name: "Боевой Молот", type: "weapon1", icon: "🔨", rarity: "legendary", lvl: 6, price: 1100, allowedClasses: ["knight", "berserk"], dropOnly: true, setId: "bloodied", stats: { atk: 55, str: 8, armorPen: 15 } },
    "42069": { id: "42069", name: "Латный Доспех", type: "chest", icon: "🥋", rarity: "epic", lvl: 6, price: 1200, allowedClasses: ["knight", "berserk"], dropOnly: true, setId: "templar", stats: { armor: 55, end: 5, dodgeChance: -4 } },
    "shields_v2_37": { id: "shields_v2_37", name: "Щит Инквизиции", type: "weapon2", icon: "🛡️", rarity: "epic", lvl: 6, price: 1400, allowedClasses: ["knight"], dropOnly: true, stats: { armor: 45, mst: 5, blockChance: 14 } },
    "20152": { id: "20152", name: "Моргенштерн", type: "two_handed", icon: "🏏", rarity: "legendary", lvl: 7, price: 1800, allowedClasses: ["berserk"], dropOnly: true, setId: "bloodied", stats: { atk: 85, str: 12, critChance: 5, agi: -5 } },
    "41139": { id: "41139", name: "Шлем Следопыта", type: "head", icon: "🪖", rarity: "epic", lvl: 7, price: 1600, allowedClasses: ["shadow", "ranger"], dropOnly: true, setId: "void", stats: { armor: 25, agi: 8, dodgeChance: 4 } },
    "24119": { id: "24119", name: "Кольчуга Ветерана", type: "chest", icon: "🥋", rarity: "epic", lvl: 7, price: 1900, dropOnly: true, setId: "bloodied", stats: { armor: 65, end: 8, str: 4 } },
    "shields_v2_38": { id: "shields_v2_38", name: "Эгида Доблести", type: "weapon2", icon: "🛡️", rarity: "legendary", lvl: 7, price: 2100, allowedClasses: ["knight"], dropOnly: true, setId: "templar", stats: { armor: 60, blockChance: 18, end: 6 } },
    "33616": { id: "33616", name: "Двуручный Меч Инквизитора", type: "two_handed", icon: "🗡️", rarity: "legendary", premium: true, lvl: 8, price: 2500, allowedClasses: ["knight", "berserk"], dropOnly: true, setId: "bloodied", stats: { atk: 100, str: 15, critDmg: 25 } },
    "34215": { id: "34215", name: "Нагрудник Чемпиона", type: "chest", icon: "🦺", rarity: "epic", lvl: 8, price: 2000, dropOnly: true, setId: "templar", stats: { armor: 75, str: 10 } },
    "17556": { id: "17556", name: "Мантия Странника", type: "chest", icon: "🧥", rarity: "epic", lvl: 8, price: 2400, allowedClasses: ["ranger", "shadow"], dropOnly: true, setId: "void", stats: { armor: 50, agi: 12, mst: 6 } },
    "50560": { id: "50560", name: "Багровая Роба", type: "chest", icon: "🥋", rarity: "epic", lvl: 8, price: 2600, dropOnly: true, stats: { armor: 55, mst: 15, luk: 5 } },
    "17271": { id: "17271", name: "Рунный Пояс", type: "belt", icon: "➰", rarity: "legendary", lvl: 9, price: 3500, dropOnly: true, setId: "storm", stats: { armor: 15, end: 20, mst: 10 } },
    "18824": { id: "18824", name: "Сапфировое Кольцо", type: "ring", icon: "💍", rarity: "legendary", lvl: 9, price: 3000, dropOnly: true, setId: "storm", stats: { mst: 18, critChance: 10, dodgeChance: 5 } },
    "shields_v2_39": { id: "shields_v2_39", name: "Темный Бастион", type: "weapon2", icon: "🛡️", rarity: "legendary", premium: true, lvl: 9, price: 4000, allowedClasses: ["knight"], dropOnly: true, setId: "templar", stats: { armor: 90, atk: 25, blockChance: 20, end: -5 } },
    "50113": { id: "50113", name: "Одеяние Культиста", type: "chest", icon: "🥋", rarity: "legendary", lvl: 9, price: 3800, allowedClasses: ["shadow"], dropOnly: true, setId: "void", stats: { armor: 65, mst: 25, critChance: 8 } },
    "23579": { id: "23579", name: "Доспех Убийцы", type: "chest", icon: "🧥", rarity: "legendary", premium: true, lvl: 10, price: 5500, allowedClasses: ["shadow"], dropOnly: true, setId: "void", stats: { armor: 80, agi: 20, dodgeChance: 15, critDmg: 20 } },
    "shields_v2_40": { id: "shields_v2_40", name: "Щит Дракона", type: "weapon2", icon: "🛡️", rarity: "legendary", lvl: 10, price: 6000, allowedClasses: ["knight"], dropOnly: true, stats: { armor: 120, blockChance: 25, end: 15, str: 10 } }
};

let SHOP_ASSORTMENT = Object.keys(ITEMS_DB);
const PREFIXES = ["Древний", "Проклятый", "Пылающий", "Забытый", "Рунный", "Теневой", "Божественный"];

const DAILY_QUESTS = {
    "kill_mobs": { name: "Охотник на монстров", desc: "Победите 10 обычных или элитных врагов.", target: 10, rewardGems: 2 },
    "forge_upg": { name: "Мастер-кузнец", desc: "Улучшите любой предмет в кузнице 3 раза.", target: 3, rewardGems: 2 },
    "boss_dmg": { name: "Убийца гигантов", desc: "Нанесите 2000 урона Мировым Боссам.", target: 2000, rewardGems: 3 }
};

let currentScreen = "hero";
let shopMode = "buy";
let previewClassId = "knight";
let inspectInvIndex = null;
let forgeSelectedIndex = null; 

let hero = {
    name: "Гладиатор", level: 1, floor: 1, maxFloor: 1, exp: 0, expNext: 100, gold: 5000, 
    unspentPoints: 0, gems: 0, tickets: 3, maxTickets: 3, nextTicketTime: 0,
    baseClass: "knight", hp: 100, maxHp: 100,
    baseStats: { str: 5, agi: 5, end: 10, mst: 5, luk: 5 },
    equipment: { head: null, chest: null, belt: null, boots: null, amulet: null, ring1: null, ring2: null, weapon1: null, weapon2: null },
    inventory: ["90523", "64755"],
    talents: [],
    finalStats: {}, combatStats: {}, deathDebuffEnd: 0, setCounts: {}, flags: {},
    questDate: "", quests: {} 
};

if (window.tg && tg.initDataUnsafe && tg.initDataUnsafe.user) hero.name = tg.initDataUnsafe.user.first_name || "Гладиатор";

function saveGame() {
    try {
        localStorage.setItem('tg_rpg_hero', JSON.stringify(hero));
        let activeItemIds = [...hero.inventory];
        for (let key in hero.equipment) { if (hero.equipment[key] && hero.equipment[key].id !== "blocked") activeItemIds.push(hero.equipment[key].id); }
        let customItems = {};
        for(let key in ITEMS_DB) { if((ITEMS_DB[key].rarity === 'relic' || key.includes('_upg_')) && activeItemIds.includes(key)) customItems[key] = ITEMS_DB[key]; }
        localStorage.setItem('tg_rpg_custom_items', JSON.stringify(customItems));
    } catch (e) {
        console.error("Ошибка сохранения.", e);
    }
}

function loadGame() {
    try {
        let savedHero = localStorage.getItem('tg_rpg_hero');
        let savedItems = localStorage.getItem('tg_rpg_custom_items');
        if(savedItems) { let parsedItems = JSON.parse(savedItems); Object.assign(ITEMS_DB, parsedItems); SHOP_ASSORTMENT = Object.keys(ITEMS_DB); }
        if(savedHero) { 
            hero = JSON.parse(savedHero); 
            if(isNaN(hero.hp)) hero.hp = 100; 
            if(hero.gems === undefined) hero.gems = 0;
            if(hero.tickets === undefined) hero.tickets = 3;
            if(hero.maxTickets === undefined) hero.maxTickets = 3;
            if(hero.nextTicketTime === undefined) hero.nextTicketTime = 0;
            if(hero.unspentPoints === undefined) hero.unspentPoints = 0;
            if(hero.talents === undefined || !Array.isArray(hero.talents)) hero.talents = []; 
            if(hero.setCounts === undefined) hero.setCounts = {};
            if(hero.flags === undefined) hero.flags = {};
            if(hero.quests === undefined) hero.quests = {};
            if(hero.questDate === undefined) hero.questDate = "";
        }
        previewClassId = hero.baseClass;
    } catch(e) {}
}

function hardReset() { if(confirm("Вы уверены? Весь прогресс будет удален!")) { localStorage.removeItem('tg_rpg_hero'); localStorage.removeItem('tg_rpg_custom_items'); location.reload(); } }
loadGame();

function checkDailyQuests() {
    let today = new Date().toDateString();
    if (hero.questDate !== today) {
        hero.questDate = today;
        hero.quests = {
            "kill_mobs": { progress: 0, claimed: false },
            "forge_upg": { progress: 0, claimed: false },
            "boss_dmg": { progress: 0, claimed: false }
        };
        saveGame();
    }
}

function addQuestProgress(qId, amount) {
    if (!hero.quests || !hero.quests[qId]) return;
    if (hero.quests[qId].claimed) return;
    hero.quests[qId].progress += amount;
    let target = DAILY_QUESTS[qId].target;
    if (hero.quests[qId].progress > target) hero.quests[qId].progress = target;
    saveGame();
}

function claimQuest(qId) {
    let q = hero.quests[qId];
    let def = DAILY_QUESTS[qId];
    if (!q || q.claimed || q.progress < def.target) return;
    
    q.claimed = true;
    hero.gems += def.rewardGems;
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    saveGame();
    updateUI();
}

checkDailyQuests();

let enemy = null;
let combatMode = 'pve';
let combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0 };

const hasTalent = (id) => hero.talents && Array.isArray(hero.talents) && hero.talents.includes(id);
const getShopPrice = (basePrice) => hasTalent('r4b') ? Math.floor(basePrice * 0.8) : basePrice;

const NORMAL_MOBS = [ { id: 1, name: "Гвардеец" }, { id: 2, name: "Змей" }, { id: 3, name: "Жаба" }, { id: 4, name: "Кентавр" }, { id: 5, name: "Воин" }, { id: 6, name: "Единорог" }, { id: 7, name: "Палач" }, { id: 8, name: "Ифрит" }, { id: 9, name: "Минотавр" }, { id: 10, name: "Червь" }, { id: 11, name: "Улитка" }, { id: 12, name: "Ведьма" }, { id: 13, name: "Вирм" }, { id: 14, name: "Стрелок" }, { id: 15, name: "Гаргулья" }, { id: 16, name: "Мурлок" }, { id: 17, name: "Дракон" }, { id: 18, name: "Акула" }, { id: 19, name: "Паук" }, { id: 20, name: "Пугало" } ];
const BOSSES = { 10: { id: 21, name: "Тень" }, 20: { id: 22, name: "Око" }, 30: { id: 23, name: "Мимик" }, 40: { id: 24, name: "Смерч" }, 50: { id: 25, name: "Терраск" }, 60: { id: 26, name: "Вендиго" }, 70: { id: 27, name: "Голем" }, 80: { id: 28, name: "Гидра" }, 90: { id: 29, name: "Механоид" }, 100: { id: 30, name: "Суккуб" } };

const RAID_BOSSES = [
    { id: "raid_1", name: "Костяной Голем", imgId: 27, diff: "Легкий", desc: "Уязвимая груда камней.", hpMult: 3, atkMult: 1.2, armMult: 1, gemReward: 2, dropRelic: false },
    { id: "raid_2", name: "Архилич Тьмы", imgId: 21, diff: "Средний", desc: "Бьет больно, живет недолго.", hpMult: 5, atkMult: 1.8, armMult: 1.5, gemReward: 5, dropRelic: false },
    { id: "raid_3", name: "Древний Дракон", imgId: 17, diff: "Хардкор", desc: "Гарантированная реликвия.", hpMult: 8, atkMult: 2.5, armMult: 2, gemReward: 10, dropRelic: true }
];

function getExpReq(lvl) { return Math.floor(100 * Math.pow(1.25, lvl - 1)); }

setInterval(() => {
    if (hero.tickets < hero.maxTickets) {
        if (hero.nextTicketTime === 0) hero.nextTicketTime = Date.now() + 60 * 60 * 1000; 
        if (Date.now() >= hero.nextTicketTime) {
            hero.tickets++;
            if (hero.tickets < hero.maxTickets) hero.nextTicketTime = Date.now() + 60 * 60 * 1000;
            else hero.nextTicketTime = 0;
            saveGame(); updateUI();
        }
    }

    let bloodScreen = document.getElementById('blood-screen');
    if (hero.deathDebuffEnd > Date.now()) {
        let left = Math.ceil((hero.deathDebuffEnd - Date.now())/1000); let m = Math.floor(left/60); let s = left%60;
        let el = document.getElementById('ui-debuff-timer');
        if(el) { el.innerText = `ШТРАФ СМЕРТИ: ${m}:${s<10?'0':''}${s}`; el.style.display = 'block'; }
        if(bloodScreen) bloodScreen.classList.add('active');
    } else {
        let el = document.getElementById('ui-debuff-timer');
        if(el && hero.deathDebuffEnd !== 0) { el.style.display = 'none'; hero.deathDebuffEnd = 0; if(bloodScreen) bloodScreen.classList.remove('active'); calculateStats(); updateUI(); }
    }

    let tTimer = document.getElementById("ui-ticket-timer");
    if (tTimer) {
        if (hero.tickets >= hero.maxTickets) tTimer.innerText = "Максимум билетов";
        else {
            let left = Math.ceil((hero.nextTicketTime - Date.now())/1000); let m = Math.floor(left/60); let s = left%60;
            tTimer.innerText = `До следующего: ${m}:${s<10?'0':''}${s}`;
        }
    }
}, 1000);

function generateEnemy(floorLevel) {
    let isMegaBoss = floorLevel % 10 === 0; let isMiniBoss = floorLevel % 5 === 0 && !isMegaBoss;
    let mobData;
    if (isMegaBoss) { let bossKey = floorLevel > 100 ? 100 : floorLevel; mobData = BOSSES[bossKey] || BOSSES[10]; } 
    else { let normalFloorCount = floorLevel - Math.floor(floorLevel / 10); let mobIndex = (normalFloorCount - 1) % NORMAL_MOBS.length; mobData = NORMAL_MOBS[mobIndex]; }

    let name = mobData.name; let mobImgUrl = `${STATIC_URL}mobs/B_${mobData.id}_high_resolution.png`;
    let bgImg = isMegaBoss ? 'throne.png' : 'grave.png'; let bgUrl = `${STATIC_URL}begraund/${bgImg}`;

    if (isMegaBoss) name = "👑 " + name; else if (isMiniBoss) name = "☠️ " + name + " (Элита)";

    let statMult = 1 + (floorLevel * 0.04);
    let hp = Math.floor((30 + floorLevel * 12) * statMult); let atk = Math.floor((6 + floorLevel * 3) * statMult); let armor = Math.floor(floorLevel * 1.2);
    if (isMiniBoss) { hp = Math.floor(hp * 1.5); atk = Math.floor(atk * 1.3); }
    if (isMegaBoss) { hp = Math.floor(hp * 2.5); atk = Math.floor(atk * 1.6); armor = Math.floor(armor * 1.5); }

    return { name: name, floor: floorLevel, imgUrl: mobImgUrl, bgUrl: bgUrl, isBoss: isMegaBoss, isMiniBoss: isMiniBoss, isRaid: false, hp: hp, maxHp: hp, nextAtkZone: ["head", "chest", "legs"][Math.floor(Math.random()*3)], turnCounter: 0, stats: { atk: atk, armor: armor, critChance: 5, dodge: 4, armorPen: Math.floor(floorLevel / 2) } };
}

function changeFloor(dir) { hero.floor += dir; if (hero.floor < 1) hero.floor = 1; if (hero.floor > hero.maxFloor) hero.floor = hero.maxFloor; saveGame(); initCombat(); }

function generateBossDrop(floor, specificId = null) {
    let maxLvl = Math.max(1, Math.ceil(floor / 10)); let baseId = specificId;
    if (!baseId) { let pool = SHOP_ASSORTMENT.filter(id => ITEMS_DB[id].lvl <= maxLvl); if(pool.length === 0) pool = SHOP_ASSORTMENT.filter(id => ITEMS_DB[id].lvl === 1); baseId = pool[Math.floor(Math.random() * pool.length)]; }
    
    let baseItem = ITEMS_DB[baseId]; let newItem = JSON.parse(JSON.stringify(baseItem));
    newItem.id = baseId + "_" + Date.now();
    let prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]; newItem.name = `✨ ${prefix} ${baseItem.name}`;
    newItem.rarity = "relic"; newItem.premium = false; newItem.dropOnly = true;
    
    let classSetMap = { "knight": "templar", "berserk": "bloodied", "shadow": "void", "ranger": "storm" };
    if (Math.random() > 0.5) newItem.setId = classSetMap[hero.baseClass];

    let tierMult = 1 + (floor * 0.05); let rollQuality = 0.85 + (Math.random() * 0.40); let finalMult = tierMult * rollQuality;
    for (let s in newItem.stats) newItem.stats[s] = Math.max(1, Math.ceil(newItem.stats[s] * finalMult));
    
    let possibleSubstats = ['str', 'agi', 'end', 'mst', 'luk', 'critChance', 'dodgeChance', 'armorPen', 'critDmg'].filter(s => !newItem.stats[s]); 
    if(possibleSubstats.length > 0) { let sub = possibleSubstats[Math.floor(Math.random() * possibleSubstats.length)]; newItem.stats[sub] = (sub.includes('Chance') || sub === 'critDmg') ? Math.floor(5 * finalMult) : Math.floor(3 * finalMult); }
    
    newItem.lvl = floor; newItem.price = Math.floor(baseItem.price * finalMult * 2.5); newItem.desc = `Трофей ${floor} этажа. Качество: ${Math.floor(rollQuality*100)}%`;
    ITEMS_DB[newItem.id] = newItem; return newItem;
}
function initCombat() {
    combatMode = 'pve';
    enemy = generateEnemy(hero.floor);
    combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0 };
    calculateStats(true); 
    
    let title = document.getElementById("combat-stage-name");
    document.getElementById("enemy-rage-bg").style.display = "none";
    if (enemy.isBoss) { title.innerText = `МЕГА-БОСС`; title.className = "combat-header boss"; document.getElementById("enemy-rage-bg").style.display = "block";}
    else if (enemy.isMiniBoss) { title.innerText = `ЭЛИТНЫЙ ВРАГ`; title.className = "combat-header boss";}
    else { title.innerText = `ОБЫЧНЫЙ ВРАГ`; title.className = "combat-header";}
    
    document.getElementById("combat-log").innerHTML = `<div class="log-entry log-sys">Сражение начинается!</div>`;
    planEnemyTurn(); updateUI();
}

function startRaid(bossId) {
    if (hero.tickets < 1) return alert("Нет билетов рейда!");
    if (hero.hp <= 0) return alert("Герой мертв!");
    hero.tickets--;
    saveGame();

    let bData = RAID_BOSSES.find(b => b.id === bossId);
    combatMode = 'raid';
    
    let statMult = 1 + (hero.level * 0.1); 
    enemy = {
        name: "Рейд: " + bData.name,
        floor: hero.level, 
        imgUrl: `${STATIC_URL}mobs/B_${bData.imgId}_high_resolution.png`,
        bgUrl: `${STATIC_URL}begraund/throne.png`,
        isBoss: true, isMiniBoss: false, isRaid: true, raidData: bData,
        hp: Math.floor(100 * statMult * bData.hpMult),
        maxHp: Math.floor(100 * statMult * bData.hpMult),
        nextAtkZone: ["head", "chest", "legs"][Math.floor(Math.random()*3)],
        turnCounter: 0,
        stats: { atk: Math.floor(10 * statMult * bData.atkMult), armor: Math.floor(5 * statMult * bData.armMult), critChance: 10, dodge: 5, armorPen: Math.floor(hero.level) }
    };
    
    combatState = { atkZone: null, defZone: null, enemyNextAtkZone: null, skillCooldown: 0, enemyStunned: false, combo: 0, zoneHealth: { head: 3, chest: 3, legs: 3 }, shadowCritReady: false, bloodiedUndying: false, bloodiedLifesteal: false, poisonStacks: 0, enemyTurns: 0 };
    calculateStats(true); 
    
    document.getElementById("combat-stage-name").innerText = `МИРОВОЙ БОСС`;
    document.getElementById("combat-stage-name").className = "combat-header boss";
    document.getElementById("enemy-rage-bg").style.display = "block";
    
    document.getElementById("combat-log").innerHTML = `<div class="log-entry log-sys">Рейд начался! У вас только 15 ходов!</div>`;
    planEnemyTurn();
    
    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active'));
    document.getElementById('screen-PVE').classList.add('active'); 
    currentScreen = 'PVE';
    updateUI();
}

function planEnemyTurn() {
    enemy.turnCounter++;
    let delay = hasTalent('r2c') ? 3 : 0;
    if (enemy.isRaid) {
        let turnsLeft = (15 + delay) - enemy.turnCounter;
        if (turnsLeft <= 0) {
            enemy.nextAtkZone = 'ENRAGE';
        } else if (enemy.turnCounter % 4 === 0) {
            enemy.nextAtkZone = 'ULTIMATUM';
        } else {
            enemy.nextAtkZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)];
        }
    } else {
        let ultMod = (enemy.turnCounter - delay) % 4;
        if (enemy.isBoss && ultMod === 0 && enemy.turnCounter > delay) enemy.nextAtkZone = 'ULTIMATUM';
        else enemy.nextAtkZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)];
    }
    updateIntentDisplay();
}

function updateIntentDisplay() {
    let el = document.getElementById("combat-intent");
    if (enemy.nextAtkZone === 'ENRAGE') { 
        el.innerHTML = `⚠️ <span style="color:#ef4444;">БОСС ВПАЛ В БЕЗУМИЕ! СМЕРТЬ НЕМИНУЕМА!</span>`; el.className = "intent-box ultimatum"; 
    } else if (enemy.nextAtkZone === 'ULTIMATUM') { 
        el.innerHTML = `☠️ <span style="color:#fca5a5;">БОСС ГОТОВИТ УЛЬТИМАТУМ ПО ВСЕМ ЗОНАМ!</span>`; el.className = "intent-box ultimatum"; 
    } else { 
        el.innerHTML = `🗡️ <span style="color:#a1a1aa;">Враг выжидает и готовится к удару...</span>`; el.className = "intent-box"; 
    }
}

function triggerClashAnim(isHero, isEnemy) {
    if (isHero) { let hc = document.getElementById("entity-hero-box"); if(hc) { hc.classList.remove("clash-hero-anim"); void hc.offsetWidth; hc.classList.add("clash-hero-anim"); } }
    if (isEnemy) { let ec = document.getElementById("entity-enemy-box"); if(ec) { ec.classList.remove("clash-enemy-anim"); void ec.offsetWidth; ec.classList.add("clash-enemy-anim"); } }
    if (isHero && isEnemy) { let sp = document.getElementById("clash-spark-fx"); if(sp) { sp.classList.remove("spark-anim"); void sp.offsetWidth; sp.classList.add("spark-anim"); } }
}

function triggerHitAnim(elementId) {
    let el = document.getElementById(elementId); if(el) { el.classList.remove("hit-anim"); void el.offsetWidth; el.classList.add("hit-anim"); }
    let slashId = elementId === "entity-hero-box" ? "hero-slash" : "enemy-slash"; let slash = document.getElementById(slashId);
    if(slash) { slash.style.animation = 'none'; void slash.offsetWidth; slash.style.animation = 'slashAnim 0.3s ease-out'; }
}

function showDmgPopup(entityBoxId, text, colorClass) { let box = document.getElementById(entityBoxId); if (!box) return; let pop = document.createElement("div"); pop.className = `dmg-popup ${colorClass}`; pop.innerText = text; box.appendChild(pop); setTimeout(() => { pop.remove(); }, 800); }
function selectZone(type, zone) { if(type === 'atk') combatState.atkZone = zone; if(type === 'def') combatState.defZone = zone; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); updateUI(); }
function resetCombatZones() { combatState.atkZone = null; combatState.defZone = null; }
function logCombat(text) { let logBox = document.getElementById("combat-log"); if (logBox) { logBox.innerHTML += `<div class="log-entry">${text}</div>`; while (logBox.children.length > 25) logBox.removeChild(logBox.firstChild); logBox.scrollTop = logBox.scrollHeight; } }

function useClassSkill() {
    if (combatState.skillCooldown > 0 || hero.hp <= 0) return; 
    let cls = CLASSES[hero.baseClass]; 
    combatState.skillCooldown = hasTalent('k4c') || hasTalent('s4b') ? cls.skill.cd - 1 : cls.skill.cd;
    
    if (hero.baseClass === 'knight') { 
        triggerSkillVFX("entity-hero-box", "vfx-knight");
        playLottieEffect("entity-hero-box", VFX_DB.knight_skill, "scale-up");
        let healPct = hasTalent('k3c') ? 0.50 : 0.25;
        let heal = Math.floor(hero.combatStats.hp * healPct); 
        hero.hp = Math.min(hero.combatStats.hp, hero.hp + heal); 
        showDmgPopup("entity-hero-box", `+${heal} HP`, "log-sys"); 
        logCombat(`<span class="log-skill">Вы применили СКИЛЛ! +${heal} HP.</span>`); 
    } 
    else if (hero.baseClass === 'berserk') { 
        triggerSkillVFX("entity-enemy-box", "vfx-berserk");
        playLottieEffect("entity-enemy-box", VFX_DB.berserk_skill, "scale-huge");
        shakeScreen(); 
        let dmg = Math.floor(hero.combatStats.damage * 2.5); enemy.hp -= dmg; 
        if (enemy.isRaid) addQuestProgress('boss_dmg', dmg);
        showDmgPopup("entity-enemy-box", `-${dmg}`, "log-crit"); 
        logCombat(`<span class="log-skill">Вы применили СКИЛЛ! -${dmg} HP.</span>`); 
    } 
    else if (hero.baseClass === 'shadow') { 
        triggerSkillVFX("entity-hero-box", "vfx-shadow");
        playLottieEffect("entity-enemy-box", VFX_DB.shadow_skill, "scale-up");
        let dmg = Math.floor(hero.combatStats.damage * 1.8); enemy.hp -= dmg; 
        if (enemy.isRaid) addQuestProgress('boss_dmg', dmg);
        showDmgPopup("entity-enemy-box", `-${dmg}`, "log-crit"); 
        logCombat(`<span class="log-skill">Вы применили СКИЛЛ! Уворот активен.</span>`); 
    } 
    else if (hero.baseClass === 'ranger') { 
        triggerSkillVFX("entity-hero-box", "vfx-ranger");
        playLottieEffect("entity-enemy-box", VFX_DB.ranger_skill, "scale-up");
        let dmg = Math.floor(hero.combatStats.damage * 1.5); enemy.hp -= dmg; 
        if (enemy.isRaid) addQuestProgress('boss_dmg', dmg);
        combatState.enemyStunned = true; triggerHitAnim("entity-enemy-box"); 
        showDmgPopup("entity-enemy-box", `ОГЛУШЕНИЕ!`, "log-block"); 
        if (hasTalent('r5a') && enemy.isBoss) { enemy.stats.armor = Math.floor(enemy.stats.armor * 0.9); logCombat(`<span class="log-skill">СКИЛЛ! Броня босса снижена на 10%.</span>`); }
        else { logCombat(`<span class="log-skill">Вы применили СКИЛЛ! Враг оглушен.</span>`); }
    }
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
    if (enemy.hp <= 0) handleCombatWin(); updateUI();
}

function calcDmg(attacker, defender, zAtk, zDef, isHeroAtk) {
    let dodgeChance = defender.dodge || 0;
    if (!isHeroAtk && hasTalent('s5a')) dodgeChance = 50; 
    
    if (Math.random() * 100 < dodgeChance) return { dmg: 0, rawDmg: 0, type: "dodge" };
    if (!isHeroAtk && hasTalent('r5c') && Math.random() * 100 < 20) return { dmg: 0, rawDmg: 0, type: "dodge" }; 
    
    let baseAtk = attacker.damage || attacker.atk || 5; 
    let cChance = attacker.critChance || 5;
    let armPen = attacker.armorPen || 0;
    let cDmg = attacker.critDmg || 150;
    
    let bIsBerserk = isHeroAtk && hero.baseClass === 'berserk';
    let bIsKnightDef = !isHeroAtk && hero.baseClass === 'knight';
    let bIsShadowAtk = isHeroAtk && hero.baseClass === 'shadow';
    let bIsRangerAtk = isHeroAtk && hero.baseClass === 'ranger';
    
    if (isHeroAtk && combatState.combo > 0) baseAtk = Math.floor(baseAtk * (1 + combatState.combo * 0.25));
    if (isHeroAtk && hasTalent('k3b')) baseAtk = Math.floor(baseAtk * 1.20);
    if (isHeroAtk && hasTalent('r3a')) baseAtk = Math.floor(baseAtk * 1.20);
    
    if (bIsBerserk) {
        let missingHpPct = (hero.combatStats.hp - hero.hp) / hero.combatStats.hp;
        let stacks = Math.floor(missingHpPct * 10);
        if (hasTalent('b3b')) stacks *= 2;
        if (hero.flags.bloodied) stacks *= 2; 
        baseAtk = Math.floor(baseAtk * (1 + stacks * 0.05));
        cChance += stacks * 2;
        if (hasTalent('b5b')) cDmg += Math.min(200, stacks * 20); 
        if (hasTalent('b3c')) armPen += Math.floor(defender.armor * 0.3); 
        if (hasTalent('b5c')) armPen += defender.armor; 
        if (hasTalent('b2c') && combatState.zoneHealth[zAtk] === 0) baseAtk = Math.floor(baseAtk * 1.40); 
        if (hasTalent('b1c')) combatState.zoneHealth[zAtk] = 0; 
    }

    if (bIsShadowAtk) {
        if (combatState.shadowCritReady) { cChance = 100; combatState.shadowCritReady = false; }
        if (hasTalent('s1b') && defender.hp === defender.maxHp) cChance = 100; 
        if (hasTalent('s5b') && defender.hp <= defender.maxHp * 0.2) return { dmg: 999999, rawDmg: 999999, type: 'crit' }; 
        if (combatState.shadowCritReady && hero.flags.void) armPen += 99999;
    }

    if (bIsRangerAtk) {
        armPen += Math.floor(defender.armor * 0.3); 
        if (hasTalent('r2a')) armPen += defender.armor; 
        if (zAtk === 'head') {
            if (hasTalent('r1a')) cChance += 30;
            if (hasTalent('r4a')) cDmg += 50;
            if (hero.flags.storm) cDmg += 150;
        }
    }

    if (isHeroAtk && hero.baseClass === 'knight') {
        if (hasTalent('k1c')) armPen += Math.floor(defender.armor * 0.5); 
    }

    if (!isHeroAtk) {
        if (hasTalent('k4a') && hero.baseClass === 'knight') cChance = 0; 
        if (hasTalent('b4a') && hero.baseClass === 'berserk') baseAtk = Math.floor(baseAtk * 0.8); 
        if (hasTalent('r4c') && hero.baseClass === 'ranger' && attacker.isBoss) baseAtk = Math.floor(baseAtk * 0.85); 
        if (hasTalent('s4c') && hero.baseClass === 'shadow' && combatState.poisonStacks > 0) baseAtk = Math.floor(baseAtk * 0.8); 
    }

    let isCrit = Math.random() * 100 < cChance; 
    if (isCrit) baseAtk = Math.floor(baseAtk * (cDmg / 100));
    
    let defArmor = Math.max(0, (defender.armor || 0) - armPen); 
    let mitigation = defArmor; 
    let isBlock = false; 
    let isPerfectBlock = false;
    
    if (zAtk === zDef) { 
        isBlock = true; 
        if (!isHeroAtk) {
            isPerfectBlock = true; 
            mitigation = bIsKnightDef ? Math.floor(defArmor * 1.5) : Math.floor(defArmor * 1.5);
        } else {
            mitigation *= 2; 
        }
    } else { 
        mitigation = bIsKnightDef ? Math.floor(defArmor * 0.7) : Math.floor(defArmor * 0.5); 
    }

    if (isHeroAtk && hasTalent('s2b') && hero.baseClass === 'shadow') mitigation = Math.floor(defArmor * 0.5); 
    if (isHeroAtk && hasTalent('k5c') && hero.baseClass === 'knight') mitigation = Math.floor(defArmor * 0.5); 
    
    let finalDmg = Math.max(Math.floor(baseAtk * 0.15), baseAtk - mitigation); 
    return { dmg: finalDmg, rawDmg: baseAtk, type: isCrit ? "crit" : (isPerfectBlock ? "perfect_block" : (isBlock ? "block" : "normal")) };
}

function handleCombatWin() {
    enemy.hp = 0; 
    let lukDropMod = CLASSES[hero.baseClass].statWeights.luk_drop || 0.1;
    if(hero.flags.storm) lukDropMod *= 2;
    
    if (enemy.isRaid) {
        let gems = enemy.raidData.gemReward; 
        if (hasTalent('r3b')) gems = Math.floor(gems * 1.5); 
        hero.gems += gems; 
        let goldGained = hero.level * 50 + 100; hero.gold += goldGained;
        let droppedItem = null; let logMsg = "";
        if (enemy.raidData.dropRelic) {
            droppedItem = generateBossDrop(hero.level);
            if (hero.inventory.length < 10) hero.inventory.push(droppedItem.id);
            else {
                let cheapestIdx = 0; let minPrice = ITEMS_DB[hero.inventory[0]].price || 0;
                for(let i=1; i<10; i++) { let p = ITEMS_DB[hero.inventory[i]].price || 0; if(p < minPrice) { minPrice = p; cheapestIdx = i; } }
                if (minPrice < droppedItem.price) { let soldItem = ITEMS_DB[hero.inventory[cheapestIdx]]; hero.gold += Math.floor(soldItem.price * 0.5); logMsg = `<br>Выброшен ${soldItem.name} ради Реликвии!`; hero.inventory[cheapestIdx] = droppedItem.id; } 
                else { let sellP = Math.floor(droppedItem.price * 0.5); hero.gold += sellP; logMsg = `<br>Сумка полна! Реликвия продана за ${sellP}💰.`; droppedItem = null; }
            }
        }
        document.getElementById("vic-title-text").innerText = "РЕЙД ЗАВЕРШЕН!";
        document.getElementById("vic-rewards-text").innerHTML = `Заработано: +${goldGained}💰 | +${gems}💎 ${logMsg}`;
        let lootBox = document.getElementById("vic-loot-container");
        if (lootBox) {
            if (droppedItem) { lootBox.style.display = "flex"; document.getElementById("vic-loot-box").className = `vic-loot-box rarity-${droppedItem.rarity}`; document.getElementById("vic-loot-box").innerHTML = renderItemIcon(droppedItem); document.getElementById("vic-loot-name").innerText = droppedItem.name; } 
            else { lootBox.style.display = "none"; }
        }
    } else {
        addQuestProgress('kill_mobs', 1);

        let goldGained = 15 + (hero.floor * 5); let expGained = 20 + (hero.floor * 8);
        if (enemy.isMiniBoss) { goldGained *= 2; expGained *= 2; } if (enemy.isBoss) { goldGained *= 4; expGained *= 3; }
        if (hasTalent('r1b')) goldGained *= 2; 
        hero.gold += goldGained; hero.exp += expGained;
        
        let droppedItem = null; 
        let dropChance = (enemy.isBoss ? 100 : (enemy.isMiniBoss ? 35 : 1)) + (hero.combatStats.luk * lukDropMod); 
        let isRelicDrop = enemy.isBoss || (enemy.isMiniBoss && Math.random() > 0.6);
        
        if (hasTalent('r2b')) isRelicDrop = Math.random() > 0.3; 

        let logMsg = "";
        let processDrop = () => {
            let dItem = null;
            if (Math.random() * 100 <= dropChance) {
                if (isRelicDrop) dItem = generateBossDrop(hero.floor); else { let pool = SHOP_ASSORTMENT.filter(id => !ITEMS_DB[id].dropOnly); dItem = ITEMS_DB[pool[Math.floor(Math.random() * pool.length)]]; }
                if (hero.inventory.length < 10) hero.inventory.push(dItem.id);
                else {
                    if (dItem.rarity === 'relic') {
                        let cheapestIdx = 0; let minPrice = ITEMS_DB[hero.inventory[0]].price || 0;
                        for(let i=1; i<10; i++) { let p = ITEMS_DB[hero.inventory[i]].price || 0; if(p < minPrice) { minPrice = p; cheapestIdx = i; } }
                        if (minPrice < dItem.price) { let soldItem = ITEMS_DB[hero.inventory[cheapestIdx]]; hero.gold += Math.floor(soldItem.price * 0.5); logMsg += `<br>Выброшен ${soldItem.name} ради Реликвии!`; hero.inventory[cheapestIdx] = dItem.id; } 
                        else { let sellP = Math.floor(dItem.price * 0.5); hero.gold += sellP; logMsg += `<br>Реликвия продана за ${sellP}💰.`; dItem = null; }
                    } else { let sellP = Math.floor(dItem.price * 0.5); hero.gold += sellP; logMsg += `<br>Вещь продана за ${sellP}💰.`; dItem = null; }
                }
            }
            return dItem;
        };

        droppedItem = processDrop();
        if (enemy.isBoss && hasTalent('r5b') && Math.random() < 0.2) {
            processDrop(); 
            logMsg += `<br><span style="color:#fbbf24">КЛАД: Выпал двойной лут!</span>`;
        }
        
        if (hero.exp >= hero.expNext) { 
            hero.exp -= hero.expNext; hero.level++; 
            hero.unspentPoints += 3; 
            hero.expNext = getExpReq(hero.level); 
            calculateStats(); 
            logMsg += `<br><span style="color:#34d399;">УРОВЕНЬ ПОВЫШЕН! +3 очка характеристик.</span>`;
        }
        
        document.getElementById("vic-title-text").innerText = "ЭТАЖ ПРОЙДЕН!";
        document.getElementById("vic-rewards-text").innerHTML = `Заработано: +${goldGained}💰 | +${expGained} EXP ${logMsg}`;
        let lootBox = document.getElementById("vic-loot-container");
        if (lootBox) {
            if (droppedItem) { lootBox.style.display = "flex"; document.getElementById("vic-loot-box").className = `vic-loot-box rarity-${droppedItem.rarity}`; document.getElementById("vic-loot-box").innerHTML = renderItemIcon(droppedItem); document.getElementById("vic-loot-name").innerText = droppedItem.name; } 
            else { lootBox.style.display = "none"; }
        }
        if (hero.floor === hero.maxFloor && hero.maxFloor < 100) { hero.maxFloor++; hero.floor = hero.maxFloor; }
    }

    saveGame(); document.getElementById("vic-modal").classList.add("show"); updateUI(); 
}

function closeVictoryModal() { document.getElementById("vic-modal").classList.remove("show"); if (combatMode === 'raid') openScreen('boss'); else initCombat(); }

function applyTurnEndEffects() {
    if (hasTalent('s1c') && hero.baseClass === 'shadow') {
        combatState.poisonStacks = Math.min(hasTalent('s5c') ? 3 : 1, combatState.poisonStacks + 1);
        let dmgPerStack = Math.floor(enemy.maxHp * 0.05);
        if (hasTalent('s3c')) dmgPerStack = Math.floor(dmgPerStack * 1.5);
        let poisonDmg = dmgPerStack * combatState.poisonStacks;
        enemy.hp -= poisonDmg;
        if (enemy.isRaid) addQuestProgress('boss_dmg', poisonDmg);
        if (hasTalent('s2c')) { hero.hp = Math.min(hero.combatStats.hp, hero.hp + poisonDmg); } 
        logCombat(`<span class="log-skill">ЯД наносит ${poisonDmg} урона.</span>`);
        showDmgPopup("entity-enemy-box", `ЯД -${poisonDmg}`, "log-skill");
        if (enemy.hp <= 0) handleCombatWin();
    }
    if (hasTalent('b3a') && hero.baseClass === 'berserk' && hero.hp > 0) { hero.hp = Math.min(hero.combatStats.hp, hero.hp + 5); } 
}

function executeTurn() {
    if (!combatState.atkZone || !combatState.defZone) return;
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    let zNameRu = {head: "Голову", chest: "Торс", legs: "Ноги", "ULTIMATUM": "ВСЕ ЗОНЫ (УЛЬТИМАТУМ)", "ENRAGE": "ЯРОСТЬ (ИНСТАКИЛЛ)"};
    let eAtkZone = enemy.nextAtkZone; let eDefZone = ["head", "chest", "legs"][Math.floor(Math.random()*3)];
    if (combatState.skillCooldown > 0) combatState.skillCooldown--;

    let isEnemyStunned = combatState.enemyStunned; 
    combatState.enemyTurns++;

    if (hasTalent('r1c') && hero.baseClass === 'ranger' && combatState.enemyTurns % 3 === 0) {
        isEnemyStunned = true;
        logCombat(`<span class="log-sys">ЛОВЧИЙ! Враг замедлен и пропускает ход.</span>`);
    }

    triggerClashAnim(true, !isEnemyStunned);

    setTimeout(() => {
        let hRes = calcDmg(hero.combatStats, enemy.stats, combatState.atkZone, eDefZone, true); 
        enemy.hp -= hRes.dmg;
        
        if (enemy.isRaid && hRes.dmg > 0) addQuestProgress('boss_dmg', hRes.dmg);
        
        if (hasTalent('b1a') && hero.baseClass === 'berserk') { hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(hRes.dmg * 0.15)); }
        if (combatState.bloodiedLifesteal) { hero.hp = Math.min(hero.combatStats.hp, hero.hp + hRes.dmg); combatState.bloodiedLifesteal = false; showDmgPopup("entity-hero-box", `ЛЕЧЕНИЕ +${hRes.dmg}`, "log-sys"); }

        triggerHitAnim("entity-enemy-box");
        playLottieEffect("entity-enemy-box", VFX_DB.attack_hero); 
        
        if (hRes.type === "dodge") showDmgPopup("entity-enemy-box", "УВОРОТ", "log-dodge"); 
        else if (hRes.type === "crit") { 
            shakeScreen(); // Экран трясется при твоем КРИТЕ
            showDmgPopup("entity-enemy-box", `КРИТ -${hRes.dmg}`, "log-crit"); 
            if (hasTalent('b4c') && hero.baseClass === 'berserk' && combatState.zoneHealth[eDefZone] > 0) { combatState.zoneHealth[eDefZone] = Math.max(0, combatState.zoneHealth[eDefZone] - 2); } 
            if (hero.flags.storm && combatState.atkZone === 'head' && Math.random() < 0.3) { combatState.enemyStunned = true; logCombat(`<span class="log-sys">СНАЙПЕР! Враг оглушен.</span>`); }
        } 
        else showDmgPopup("entity-enemy-box", `-${hRes.dmg}`, "log-dmg");
        
        let comboTxt = combatState.combo > 0 ? ` (Комбо x${(1 + combatState.combo * 0.25).toFixed(2)})` : '';
        logCombat(`Вы ударили в ${zNameRu[combatState.atkZone]}: -${hRes.dmg} HP${comboTxt}.`);

        if (enemy.hp <= 0) { handleCombatWin(); } 
        else {
            applyTurnEndEffects(); 
            if (enemy.hp <= 0) return;

            if (isEnemyStunned) { 
                logCombat(`<span class="log-sys">${enemy.name} пропускает ход.</span>`); 
                combatState.enemyStunned = false; 
            } 
            else {
                let forceDodge = hero.baseClass === 'shadow' && combatState.skillCooldown === (CLASSES.shadow.skill.cd - 1); let eRes;
                
                if (eAtkZone === 'ENRAGE') {
                    eRes = { dmg: 99999, rawDmg: 99999, type: "crit" };
                    shakeScreen();
                } else if (eAtkZone === 'ULTIMATUM') { 
                    shakeScreen();
                    let baseAtk = Math.floor((enemy.stats.atk || 5) * 2.5); 
                    if (forceDodge) eRes = { dmg: 0, rawDmg: 0, type: "dodge" }; 
                    else { let mitigation = Math.floor(hero.combatStats.armor * 0.2); let finalDmg = Math.max(Math.floor(baseAtk * 0.2), baseAtk - mitigation); eRes = { dmg: finalDmg, rawDmg: baseAtk, type: "crit" }; } 
                } else { 
                    eRes = calcDmg(enemy.stats, hero.combatStats, eAtkZone, combatState.defZone, false); 
                    if(forceDodge) eRes = { dmg: 0, rawDmg: 0, type: "dodge" }; 
                }

                if (!GOD_MODE) hero.hp -= eRes.dmg; 

                triggerHitAnim("entity-hero-box");
                if(eRes.dmg > 0) playLottieEffect("entity-hero-box", VFX_DB.attack_enemy); 

                if (eRes.type === "dodge" && hero.baseClass === 'shadow') {
                    combatState.shadowCritReady = true;
                    logCombat(`<span class="log-skill">ТАНЦОР СМЕРТИ! След. удар крит.</span>`);
                    if (hero.flags.void) { combatState.poisonStacks++; logCombat(`<span class="log-skill">ФАНТОМ: Враг отравлен.</span>`); }
                    if (hasTalent('s4a')) { 
                        enemy.hp -= hero.combatStats.damage; 
                        if(enemy.isRaid) addQuestProgress('boss_dmg', hero.combatStats.damage);
                        showDmgPopup("entity-enemy-box", `КОНТР -${hero.combatStats.damage}`, "log-crit"); 
                    } 
                    if (hasTalent('s2a')) { hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(hero.combatStats.hp * 0.05)); } 
                }

                if (eRes.type === "perfect_block" && hero.baseClass === 'knight') {
                    let rPct = hasTalent('k5b') ? 1.0 : (hasTalent('k2b') ? 0.5 : 0.2);
                    let reflectDmg = Math.floor((enemy.stats.atk || 10) * rPct);
                    enemy.hp -= reflectDmg;
                    if(enemy.isRaid) addQuestProgress('boss_dmg', reflectDmg);
                    showDmgPopup("entity-enemy-box", `ОТРАЖЕНО -${reflectDmg}`, "log-block");
                    logCombat(`<span class="log-block">ЭГИДА! Отражено ${reflectDmg} урона.</span>`);
                    if (hasTalent('k2c') && Math.random() < 0.25) combatState.enemyStunned = true; 
                }
                
                if ((eRes.type === "perfect_block" || eRes.type === "block") && hero.flags.templar) {
                    hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(hero.combatStats.hp * 0.1));
                    let refl = Math.floor(eRes.rawDmg * 0.5); enemy.hp -= refl; 
                    if(enemy.isRaid) addQuestProgress('boss_dmg', refl);
                    showDmgPopup("entity-enemy-box", `СВЕТ -${refl}`, "log-block");
                }

                if (eRes.type === "block" && hero.baseClass === 'knight' && hasTalent('k1a')) {
                    hero.hp = Math.min(hero.combatStats.hp, hero.hp + Math.floor(hero.combatStats.hp * 0.05)); 
                }

                if (eRes.dmg > 0) {
                    if (!hasTalent('b4b')) combatState.combo = 0; 
                    if (eAtkZone !== 'ULTIMATUM' && eAtkZone !== 'ENRAGE' && eRes.type !== "perfect_block" && combatState.zoneHealth[eAtkZone] > 0) {
                        combatState.zoneHealth[eAtkZone]--;
                        if (combatState.zoneHealth[eAtkZone] === 0) { logCombat(`<span class="log-dmg">⚠️ БРОНЯ В ЗОНЕ '${zNameRu[eAtkZone].toUpperCase()}' ПОЛНОСТЬЮ РАЗРУШЕНА!</span>`); showDmgPopup("entity-hero-box", "СЛОМАНО!", "log-crit"); calculateStats(true); }
                    }
                }

                if (eRes.type === "dodge") showDmgPopup("entity-hero-box", "УВОРОТ", "log-dodge");
                else if (eRes.type === "perfect_block") { showDmgPopup("entity-hero-box", `ПЕРФЕКТ! -${eRes.dmg}`, "log-block"); logCombat(`<span class="log-block">ПЕРФЕКТ БЛОК! +1 КОМБО!</span>`); combatState.combo++; if (combatState.skillCooldown > 0) combatState.skillCooldown--; } 
                else if (eAtkZone === 'ENRAGE') showDmgPopup("entity-hero-box", `СМЕРТЬ!`, "log-crit");
                else if (eAtkZone === 'ULTIMATUM' && eRes.type !== "dodge") showDmgPopup("entity-hero-box", `УЛЬТА! -${eRes.dmg}`, "log-crit");
                else showDmgPopup("entity-hero-box", `-${eRes.dmg}`, "log-dmg");

                if (eAtkZone !== 'ULTIMATUM' && eAtkZone !== 'ENRAGE') logCombat(`${enemy.name} бьет в ${zNameRu[eAtkZone]}: -${eRes.dmg} HP.`);
                else if (eAtkZone === 'ENRAGE') logCombat(`<span class="log-dmg">ЯРОСТЬ БОССА УНИЧТОЖИЛА ВАС!</span>`);
                
                if (hero.hp <= 0 && !GOD_MODE) {
                    if (hero.flags.bloodied && !combatState.bloodiedUndying) {
                        hero.hp = 1; combatState.bloodiedUndying = true; combatState.bloodiedLifesteal = true; logCombat(`<span class="log-sys">КРОВАВЫЙ ОСКАЛ! Вы выжили. След. удар лечит.</span>`); showDmgPopup("entity-hero-box", "ЖАЖДА!", "log-sys");
                        planEnemyTurn();
                    } else if (hasTalent('b5a') && hero.baseClass === 'berserk' && !combatState.undyingUsed) {
                        hero.hp = 1; combatState.undyingUsed = true; logCombat(`<span class="log-sys">БЕССМЕРТИЕ! Вы выжили с 1 HP.</span>`); showDmgPopup("entity-hero-box", "СПАСЕН!", "log-sys");
                        planEnemyTurn();
                    } else {
                        hero.hp = 0; hero.deathDebuffEnd = Date.now() + 10 * 60 * 1000; 
                        if(!enemy.isRaid && hero.floor > 1) hero.floor--; 
                        logCombat(`<span class="log-dmg">💀 ВЫ ПОГИБЛИ. Получено ТЯЖЕЛОЕ РАНЕНИЕ на 10 минут.</span>`); calculateStats(); 
                        setTimeout(() => { alert("Вы были повержены и отступаете в Лагерь..."); enemy = null; combatMode = 'pve'; openScreen('hero'); }, 2000);
                    }
                } else { planEnemyTurn(); }
            }
        }
        resetCombatZones(); saveGame(); updateUI();
    }, 250); 
}
function openInspectModal(invIndex) {
    inspectInvIndex = invIndex; let itemId = hero.inventory[invIndex]; let item = ITEMS_DB[itemId]; if (!item) return;
    document.getElementById("inspect-title").innerText = item.name;
    document.getElementById("inspect-icon-box").className = `vic-loot-box rarity-${item.rarity}`;
    document.getElementById("inspect-icon-box").innerHTML = renderItemIcon(item);
    
    let setHtmlBlock = "";
    if (item.setId && SETS_DB[item.setId]) {
        let set = SETS_DB[item.setId]; let count = hero.setCounts[item.setId] || 0;
        setHtmlBlock = `<div style="margin-top:8px; border-top:1px dotted #3f3f46; padding-top:6px; font-size:10px;">
            <b style="color:#fbbf24;">Сет: ${set.name} (${count}/4)</b><br>
            <span style="color:${count>=2?'#10b981':'#71717a'}">[2 шт] ${set.p2}</span><br>
            <span style="color:${count>=4?'#10b981':'#71717a'}">[4 шт] ${set.p4}</span>
        </div>`;
    }
    
    document.getElementById("inspect-stats-box").innerHTML = formatStats(item.stats) + setHtmlBlock + `<br><i style="color:#71717a; margin-top:4px; display:block;">${item.desc||''}</i>`;
    let sellPrice = Math.floor(item.price * 0.5); document.getElementById("btn-inspect-sell").innerText = `ПРОДАТЬ ЗА 💰 ${sellPrice}`;
    document.getElementById("btn-inspect-equip").onclick = function() { equipItem(inspectInvIndex); closeInspectModal(); };
    document.getElementById("btn-inspect-sell").onclick = function() { sellItem(inspectInvIndex); closeInspectModal(); };
    document.getElementById("item-inspect-modal").classList.add("show");
}

function closeInspectModal() { document.getElementById("item-inspect-modal").classList.remove("show"); inspectInvIndex = null; }

function openScreen(screenName) {
    if (!['hero', 'shop', 'classes', 'PVE', 'blacksmith', 'boss', 'talents', 'quests'].includes(screenName)) return alert("В разработке!");
    
    if ((screenName === 'PVE' || screenName === 'boss') && hero.hp <= 0 && !GOD_MODE) {
        if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        return alert("Герой мертв! Сначала вылечитесь в лагере.");
    }

    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    document.querySelectorAll('.app-screen').forEach(el => el.classList.remove('active'));
    document.getElementById('screen-' + screenName).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + (screenName === 'classes' ? 'class' : screenName)).classList.add('active');
    currentScreen = screenName;
    
    let wrapper = document.querySelector('.app-screens-wrapper');
    if(wrapper) wrapper.scrollTop = 0;

    if(screenName === 'classes') previewClassId = hero.baseClass;
    if(screenName === 'PVE' && (!enemy || enemy.isRaid)) initCombat();
    if(screenName === 'blacksmith') forgeSelectedIndex = null; 
    updateUI();
}

function setShopMode(mode) { shopMode = mode; updateUI(); }

function selectPreviewClass(classId) { 
    previewClassId = classId; 
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); 
    updateUI(); 
}

function changeClass(classKey) {
    if (hero.baseClass === classKey) return;
    if (hero.gold < 5000) return alert(`Нужно 5000 золота!`);
    let itemsToUnequip = [];
    for (let slot in hero.equipment) { let item = hero.equipment[slot]; if (item && item.id !== "blocked" && item.allowedClasses && !item.allowedClasses.includes(classKey)) itemsToUnequip.push(slot); }
    let neededSlots = (hero.inventory.length + itemsToUnequip.length) - 10;
    if (neededSlots > 0) return alert(`Для смены класса нужно снять несовместимые вещи. Освободите ${neededSlots} мест в сумке!`);
    
    if(!confirm("Внимание! При смене класса ВСЕ ВЫБРАННЫЕ ТАЛАНТЫ БУДУТ СБРОШЕНЫ. Продолжить?")) return;

    itemsToUnequip.forEach(slot => { let item = hero.equipment[slot]; if (item && item.id !== "blocked") hero.inventory.push(item.id); hero.equipment[slot] = null; if (item && item.type === 'two_handed') hero.equipment.weapon2 = null; });
    hero.gold -= 5000; hero.baseClass = classKey; hero.talents = []; calculateStats(); saveGame(); openScreen('hero');
}

function equipItem(invIndex) {
    if (currentScreen === 'PVE' || (enemy && enemy.hp > 0 && hero.hp > 0)) return alert("Нельзя менять снаряжение прямо во время боя!");
    let itemId = hero.inventory[invIndex]; if (!itemId) return; let item = ITEMS_DB[itemId];
    if (item.lvl > hero.level) return alert(`Нужен Ур. ${item.lvl}! Вы пока Ур. ${hero.level}.`);
    if (item.allowedClasses && !item.allowedClasses.includes(hero.baseClass)) return alert(`Этот предмет не подходит для вашего класса!`);

    let targetSlot = item.type;
    if (item.type === 'two_handed') {
        let w1 = hero.equipment.weapon1; let w2 = hero.equipment.weapon2; let needsExtraSlot = (w1 && w2 && w2.id !== "blocked");
        if (needsExtraSlot && hero.inventory.length >= 10) return alert("Освободите 1 место в сумке, чтобы снять текущие оружие и щит!");
        hero.inventory.splice(invIndex, 1); if (w1) hero.inventory.push(w1.id); if (w2 && w2.id !== "blocked") hero.inventory.push(w2.id);
        hero.equipment.weapon1 = item; hero.equipment.weapon2 = { id: "blocked", icon: "🔒", name: "Занято", type: "weapon2", rarity: "common", stats: {} };
        calculateStats(); saveGame(); updateUI(); return;
    }

    if ((targetSlot === 'weapon1' || targetSlot === 'weapon2') && hero.equipment.weapon1 && hero.equipment.weapon1.type === 'two_handed') {
        let twoHandedItem = hero.equipment.weapon1; hero.equipment.weapon1 = null; hero.equipment.weapon2 = null;
        hero.inventory.splice(invIndex, 1); hero.inventory.push(twoHandedItem.id); hero.equipment[targetSlot] = item;
        calculateStats(); saveGame(); updateUI(); return;
    }

    if (item.type === 'ring') targetSlot = !hero.equipment.ring1 ? 'ring1' : 'ring2';
    let oldItem = hero.equipment[targetSlot]; hero.equipment[targetSlot] = item; hero.inventory.splice(invIndex, 1);
    if (oldItem && oldItem.id !== "blocked") hero.inventory.push(oldItem.id);
    calculateStats(); saveGame(); updateUI();
}

function unequipSlot(slotKey) {
    if (currentScreen === 'PVE' || (enemy && enemy.hp > 0 && hero.hp > 0)) return alert("Нельзя снимать снаряжение во время боя!");
    let item = hero.equipment[slotKey]; if (!item || item.id === "blocked") return;
    if (hero.inventory.length >= 10) return alert("Сумка полна!");
    if (item.type === 'two_handed') { hero.inventory.push(item.id); hero.equipment.weapon1 = null; hero.equipment.weapon2 = null; } 
    else { hero.inventory.push(item.id); hero.equipment[slotKey] = null; }
    calculateStats(); saveGame(); updateUI();
}

function addStat(statKey) { 
    if (hero.unspentPoints > 0) { 
        hero.baseStats[statKey]++; 
        hero.unspentPoints--; 
        if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        calculateStats(); 
        saveGame(); 
        updateUI(); 
    } 
}

function buyItem(itemId) {
    let item = ITEMS_DB[itemId];
    let price = getShopPrice(item.price);
    if (hero.gold < price) return alert("Мало золота!");
    if (item.allowedClasses && !item.allowedClasses.includes(hero.baseClass)) return alert("Предмет не для вашего класса!");
    if (hero.inventory.length >= 10) return alert("Сумка полна!");
    hero.gold -= price; hero.inventory.push(itemId);
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    saveGame(); updateUI();
}

function sellItem(invIndex) { let item = ITEMS_DB[hero.inventory[invIndex]]; if (!item) return; hero.gold += Math.floor(item.price * 0.5); hero.inventory.splice(invIndex, 1); saveGame(); updateUI(); }

function healHero() {
    if (hero.hp >= hero.finalStats.hp) return alert("Здоровье уже полное!");
    let missingHp = hero.finalStats.hp - Math.floor(hero.hp); let cost = Math.max(10, Math.floor(missingHp * 0.5));
    if (hero.gold < cost) {
        if (hero.gold > 0) { let affordableHeal = hero.gold * 2; hero.hp += affordableHeal; hero.gold = 0; alert(`Золота хватило лишь на частичное лечение (+${affordableHeal} HP).`); saveGame(); updateUI(); } 
        else { alert(`У вас нет золота! Продайте трофеи в Лавке или рискните спуститься на 1 этаж.`); }
        return;
    }
    hero.gold -= cost; hero.hp = hero.finalStats.hp;
    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success'); saveGame(); updateUI();
}

function selectForgeItem(idx) { forgeSelectedIndex = idx; if (window.tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); updateUI(); }

function upgradeItem() {
    if (forgeSelectedIndex === null) return;
    let itemId = hero.inventory[forgeSelectedIndex];
    let item = ITEMS_DB[itemId];
    let cost = item.lvl * item.price * 2; 
    
    if (hero.gold < cost) return alert("Не хватает золота!");
    if (item.lvl >= 20) return alert("Максимальный уровень предмета достигнут!");

    hero.gold -= cost;
    let newItem = JSON.parse(JSON.stringify(item));
    if (!newItem.id.includes("_upg_")) { newItem.id = newItem.id + "_upg_" + Date.now(); } 
    else { newItem.id = newItem.id.split("_upg_")[0] + "_upg_" + Date.now(); }
    
    newItem.lvl += 1; newItem.price = Math.floor(newItem.price * 1.5);
    for (let s in newItem.stats) newItem.stats[s] = Math.max(1, Math.ceil(newItem.stats[s] * 1.15));
    
    ITEMS_DB[newItem.id] = newItem; hero.inventory[forgeSelectedIndex] = newItem.id; 
    addQuestProgress('forge_upg', 1);

    if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    
    let anvil = document.getElementById("forge-anvil");
    if (anvil) { anvil.classList.remove("hammer-hit"); void anvil.offsetWidth; anvil.classList.add("hammer-hit"); }
    saveGame(); updateUI();
}

function pickTalent(tierIndex, talentId) {
    let tData = TALENTS_DATA[hero.baseClass][tierIndex];
    if (hero.level < tData.lvl) return alert(`Требуется ${tData.lvl} уровень!`);
    
    let tierTalentIds = tData.opts.map(o => o.id);
    if (hero.talents.some(t => tierTalentIds.includes(t))) return alert("Талант в этом тире уже выбран!");
    
    if(confirm("Вы уверены? Этот выбор навсегда определит стиль игры.")) {
        hero.talents.push(talentId);
        if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        calculateStats(); saveGame(); updateUI();
    }
}

function calculateStats(isCombat = false) {
    let cls = CLASSES[hero.baseClass]; let lvlBonus = hero.level - 1; 
    
    let setCounts = {};
    for (let key in hero.equipment) {
        let item = hero.equipment[key];
        if (item && item.setId && item.id !== "blocked") { setCounts[item.setId] = (setCounts[item.setId] || 0) + 1; }
    }
    hero.setCounts = setCounts;
    hero.flags = { templar: setCounts['templar'] >= 4, bloodied: setCounts['bloodied'] >= 4, void: setCounts['void'] >= 4, storm: setCounts['storm'] >= 4 };

    let total = { 
        str: hero.baseStats.str + (cls.growth.str * lvlBonus), 
        agi: hero.baseStats.agi + (cls.growth.agi * lvlBonus), 
        end: hero.baseStats.end + (cls.growth.end * lvlBonus), 
        mst: hero.baseStats.mst + (cls.growth.mst * lvlBonus), 
        luk: hero.baseStats.luk + (cls.growth.luk * lvlBonus), 
        armor: 0, atk: 0, critChance: 5, critDmg: 150, dodge: 0, blockChance: 0, armorPen: 0 
    };
    
    let skipHead = isCombat && combatState.zoneHealth.head === 0; let skipChest = isCombat && combatState.zoneHealth.chest === 0; let skipLegs = isCombat && combatState.zoneHealth.legs === 0;

    for (let key in hero.equipment) {
        if (skipHead && key === 'head') continue; if (skipChest && (key === 'chest' || key === 'weapon1' || key === 'weapon2')) continue; if (skipLegs && (key === 'boots' || key === 'belt')) continue;
        let item = hero.equipment[key];
        if (item && item.stats) {
            if (item.stats.str) total.str += item.stats.str; if (item.stats.agi) total.agi += item.stats.agi; if (item.stats.end) total.end += item.stats.end; if (item.stats.mst) total.mst += item.stats.mst; if (item.stats.luk) total.luk += item.stats.luk; if (item.stats.armor) total.armor += item.stats.armor; if (item.stats.atk) total.atk += item.stats.atk; if (item.stats.critChance) total.critChance += item.stats.critChance; if (item.stats.blockChance) total.blockChance += item.stats.blockChance; if (item.stats.dodgeChance) total.dodge += item.stats.dodgeChance; if (item.stats.armorPen) total.armorPen += item.stats.armorPen; if (item.stats.critDmg) total.critDmg += item.stats.critDmg;
        }
    }

    if (setCounts['storm'] >= 2) total.luk *= 2;

    let w = cls.statWeights;
    let hp = Math.floor(total.end * (w.end_hp || 10)); 
    if (hasTalent('k2a')) hp = Math.floor(hp * 1.25); 
    if (hasTalent('b2a')) hp = Math.floor(hp * 1.20); 
    if (setCounts['bloodied'] >= 2) hp = Math.floor(hp * 1.20);

    if (GOD_MODE) { hp = 999999; hero.hp = 999999; hero.deathDebuffEnd = 0; } 
    
    let damage = Math.floor(total.str * (w.str_dmg || 0) + total.agi * (w.agi_dmg || 0) + total.atk);
    if (hasTalent('k1b')) damage += Math.floor(total.armor * 0.15); 
    
    total.critChance += total.luk * (w.luk_crit || 0) + total.mst * (w.mst_crit || 0);
    if (hasTalent('s3b')) total.critChance += 20; 
    
    total.dodge += total.agi * (w.agi_dodge || 0) + total.luk * (w.luk_dodge || 0);
    if (hasTalent('s3a')) total.dodge += 15; 
    if (hasTalent('r3c')) total.dodge += 10; 
    if (setCounts['void'] >= 2) total.dodge += 20;
    
    total.armorPen += total.mst * (w.mst_pen || 0);
    total.critDmg += total.mst * (w.mst_cdmg || 0);
    if (hasTalent('b2b')) total.critDmg += 50; 
    if (setCounts['bloodied'] >= 2) total.critDmg += 50;

    total.armor += total.str * (w.str_arm || 0);
    if (hasTalent('k3a')) total.armor = Math.floor(total.armor * 1.5); 
    if (hasTalent('k5a') && hero.hp < hero.maxHp * 0.3) total.armor *= 2; 
    if (setCounts['templar'] >= 2) total.armor = Math.floor(total.armor * 1.25);

    total.blockChance += total.mst * (w.mst_block || 0);
    if (hasTalent('k4b')) total.blockChance += total.mst * 0.02; 

    total.armor = Math.floor(total.armor * cls.armorMult); 
    total.critDmg = Math.floor(total.critDmg * cls.critDmgMult); 
    total.dodge = Math.floor(total.dodge * cls.dodgeMult); 
    
    let dodgeCap = hasTalent('s1a') ? 90 : 75; 
    if (setCounts['void'] >= 2) dodgeCap = 95;
    total.dodge = Math.min(dodgeCap, total.dodge); 
    
    let blockCap = setCounts['templar'] >= 2 ? 75 : 60;
    total.blockChance = Math.min(blockCap, total.blockChance);
    
    if (hero.deathDebuffEnd > Date.now()) { total.armor = Math.floor(total.armor * 0.75); damage = Math.floor(damage * 0.75); }
    
    if (!isCombat) { 
        hero.maxHp = hp; 
        if (hero.hp > hero.maxHp && !GOD_MODE) hero.hp = hero.maxHp; 
        hero.finalStats = { hp: hp, damage: damage, armor: total.armor, armorPen: total.armorPen, critChance: total.critChance.toFixed(1), critDmg: total.critDmg, dodge: total.dodge.toFixed(1), blockChance: total.blockChance, str: total.str, agi: total.agi, end: total.end, mst: total.mst, luk: total.luk }; 
    }
    hero.combatStats = { hp: hp, damage: damage, armor: total.armor, armorPen: total.armorPen, critChance: total.critChance.toFixed(1), critDmg: total.critDmg, dodge: total.dodge.toFixed(1), blockChance: total.blockChance, str: total.str, agi: total.agi, end: total.end, mst: total.mst, luk: total.luk };
}

function formatStats(stats) {
    let res = [];
    if(stats.atk) res.push(`Урон ${stats.atk>0?'+':''}${stats.atk}`); if(stats.armor) res.push(`Броня ${stats.armor>0?'+':''}${stats.armor}`);
    if(stats.str) res.push(`СИЛ ${stats.str>0?'+':''}${stats.str}`); if(stats.agi) res.push(`ЛОВ ${stats.agi>0?'+':''}${stats.agi}`);
    if(stats.end) res.push(`ВЫН ${stats.end>0?'+':''}${stats.end}`); if(stats.mst) res.push(`МСТ ${stats.mst>0?'+':''}${stats.mst}`);
    if(stats.luk) res.push(`УДЧ ${stats.luk>0?'+':''}${stats.luk}`); if(stats.critChance) res.push(`Крит ${stats.critChance>0?'+':''}${stats.critChance}%`);
    if(stats.dodgeChance) res.push(`Уворот ${stats.dodgeChance>0?'+':''}${stats.dodgeChance}%`); if(stats.blockChance) res.push(`Блок ${stats.blockChance>0?'+':''}${stats.blockChance}%`);
    if(stats.armorPen) res.push(`Пробитие ${stats.armorPen>0?'+':''}${stats.armorPen}`); if(stats.critDmg) res.push(`Крит. Урон ${stats.critDmg>0?'+':''}${stats.critDmg}%`);
    return res.join(' • ');
}

function getSlotName(slotId) { return {head:"Шлем", chest:"Броня", belt:"Пояс", boots:"Обувь", amulet:"Амулет", ring1:"Кольцо", ring2:"Кольцо", weapon1:"Оружие", weapon2:"Щит"}[slotId]; }
function renderItemIcon(item) { if (!item) return ""; if (item.id === "blocked") return `<div class="item-icon">${item.icon}</div>`; let imgId = item.id.split('_')[0]; if (item.id.includes("shields_v2_")) { let parts = item.id.split('_'); imgId = parts[0] + "_" + parts[1] + "_" + parts[2]; } return `<div class="item-img-wrapper"><img src="${STATIC_URL}items/${imgId}.png" class="item-img" alt="${item.name}"></div>`; }
function renderDurability(zoneKey) { let dur = combatState.zoneHealth[zoneKey]; if(dur === 3) return `<span class="dur-dot g"></span><span class="dur-dot g"></span><span class="dur-dot g"></span>`; if(dur === 2) return `<span class="dur-dot y"></span><span class="dur-dot y"></span><span class="dur-dot" style="background:#27272a"></span>`; if(dur === 1) return `<span class="dur-dot o"></span><span class="dur-dot" style="background:#27272a"></span><span class="dur-dot" style="background:#27272a"></span>`; return ``; }

function renderTalents() {
    let html = '';
    let tData = TALENTS_DATA[hero.baseClass];
    tData.forEach((tier, index) => {
        let isLocked = hero.level < tier.lvl;
        let tierTalentIds = tier.opts.map(o => o.id);
        let pickedTalent = hero.talents.find(t => tierTalentIds.includes(t));
        
        let lockBadge = isLocked ? `<span class="talent-lock-badge">🔒 УР. ${tier.lvl}</span>` : '';

        let optsHtml = '';
        tier.opts.forEach(opt => {
            let isSelected = pickedTalent === opt.id;
            let isDimmed = pickedTalent && !isSelected;
            let btnClass = `talent-btn ${isSelected ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}`;
            optsHtml += `<div class="${btnClass}" onclick="pickTalent(${index}, '${opt.id}')"><div class="talent-name">${opt.n}</div><div class="talent-desc">${opt.d}</div></div>`;
        });

        html += `<div class="talent-tier ${isLocked ? 'locked' : ''}">
                    <div class="talent-tier-header">ТИР ${index + 1} ${lockBadge}</div>
                    <div class="talent-options">${optsHtml}</div>
                 </div>`;
    });
    document.getElementById("ui-talents-container").innerHTML = html;
}

function updateUI() {
    let bloodScreen = document.getElementById('blood-screen');
    if (hero.deathDebuffEnd > Date.now()) { if(bloodScreen) bloodScreen.classList.add('active'); } else { if(bloodScreen) bloodScreen.classList.remove('active'); }

    document.getElementById("ui-gold").innerText = hero.gold; 
    document.getElementById("ui-gems").innerText = hero.gems; 
    document.getElementById("ui-top-lvl").innerText = hero.level;
    
    let floorNavHtml = `<button class="floor-nav-btn" onclick="changeFloor(-1)" ${hero.floor <= 1 || combatMode === 'raid' ? 'disabled' : ''}>◀</button><span id="pve-floor-display" style="font-size: 13px;">ЭТАЖ ${hero.floor}</span><button class="floor-nav-btn" onclick="changeFloor(1)" ${hero.floor >= hero.maxFloor || combatMode === 'raid' ? 'disabled' : ''}>▶</button>`;
    let titleEl = document.getElementById("combat-floor-title"); if(titleEl) titleEl.innerHTML = floorNavHtml;
    document.getElementById("ui-top-floor").innerText = hero.floor; document.getElementById("ui-top-exp").innerText = `${hero.exp}/${hero.expNext}`; document.getElementById("ui-exp-bar").style.width = `${(hero.exp / hero.expNext) * 100}%`;

    if (currentScreen === 'quests') {
        checkDailyQuests();
        let html = '';
        for (let qId in DAILY_QUESTS) {
            let def = DAILY_QUESTS[qId];
            let q = hero.quests[qId] || { progress: 0, claimed: false };
            let pct = Math.min(100, (q.progress / def.target) * 100);
            let btnHtml = '';
            
            if (q.claimed) {
                btnHtml = `<div class="quest-btn claimed">ВЫПОЛНЕНО</div>`;
            } else if (q.progress >= def.target) {
                btnHtml = `<div class="quest-btn ready" onclick="claimQuest('${qId}')">ЗАБРАТЬ НАГРАДУ</div>`;
            } else {
                btnHtml = `<div class="quest-btn">${Math.floor(q.progress)} / ${def.target}</div>`;
            }
            
            html += `
                <div class="quest-card">
                    <div class="quest-header"><span>${def.name}</span><span class="quest-reward">+${def.rewardGems} 💎</span></div>
                    <div class="quest-desc">${def.desc}</div>
                    <div class="quest-progress-wrap"><div class="quest-progress-fill" style="width: ${pct}%"></div></div>
                    ${btnHtml}
                </div>
            `;
        }
        document.getElementById("ui-quests-list").innerHTML = html;
    }

    if (currentScreen === 'PVE' && enemy) {
        let arenaOuter = document.getElementById("arena-bg"); arenaOuter.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(9,9,11,0.95) 100%), url('${enemy.bgUrl}')`; arenaOuter.style.backgroundSize = 'cover'; arenaOuter.style.backgroundPosition = 'center';
        let diorama = document.getElementById("combat-entities-box"); diorama.style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(9,9,11,0.9) 100%), url('${enemy.bgUrl}')`; diorama.style.backgroundSize = 'cover'; diorama.style.backgroundPosition = 'center';
        
        let comboEl = document.getElementById("combo-display");
        if (combatState.combo > 0) { comboEl.innerText = `🔥 КОМБО: x${(1 + combatState.combo * 0.25).toFixed(2)}`; comboEl.className = "combo-meter show"; } else { comboEl.className = "combo-meter"; }

        if (enemy.isBoss || enemy.isRaid) { 
            let rPct = enemy.isRaid ? (enemy.turnCounter / 15 * 100) : ((enemy.turnCounter % 4) / 3 * 100); 
            document.getElementById("enemy-rage-bar").style.width = `${rPct}%`; 
            if(rPct >= 100) document.getElementById("enemy-rage-bar").classList.add("full"); 
            else document.getElementById("enemy-rage-bar").classList.remove("full"); 
        }

        let stunIcon = document.getElementById("enemy-stun-icon"); if (combatState.enemyStunned) stunIcon.style.display = "block"; else stunIcon.style.display = "none";
        let heroLvlHtml = `<span class="entity-lvl">УР. ${hero.level}</span>`; document.getElementById("combat-hero-name-plate").innerHTML = `<span class="entity-name-text">${hero.name}</span>${heroLvlHtml}`; document.getElementById("combat-hero-img").src = CLASS_AVATARS[hero.baseClass];
        
        let bossIcon = enemy.isBoss ? "👑 " : (enemy.isMiniBoss ? "☠️ " : ""); let enemyCleanName = enemy.name.replace("👑 ", "").replace("☠️ ", "").replace(" (Элита)", ""); let enemyLvlTag = "";
        if(enemy.isRaid) { enemyLvlTag = `<span class="entity-lvl boss">УР. ${enemy.floor}</span>`; }
        else if(enemy.isBoss) { enemyLvlTag = `<span class="entity-lvl boss">БОСС ${enemy.floor}</span>`; } 
        else if(enemy.isMiniBoss) { enemyLvlTag = `<span class="entity-lvl elite">ЭЛИТА ${enemy.floor}</span>`; } 
        else { enemyLvlTag = `<span class="entity-lvl">УР. ${enemy.floor}</span>`; }

        document.getElementById("combat-enemy-name-plate").innerHTML = `<span class="entity-name-text">${bossIcon}${enemyCleanName}</span>${enemyLvlTag}`; document.getElementById("combat-enemy-img").src = enemy.imgUrl;
        if(enemy.isBoss) document.getElementById("entity-enemy-box").className = "combat-card boss"; else document.getElementById("entity-enemy-box").className = "combat-card";

        let isHeroDead = hero.hp <= 0 && !GOD_MODE;
        if (GOD_MODE) { document.getElementById("combat-hero-hp").innerText = "GOD MODE"; document.getElementById("combat-hero-maxhp").innerText = "999K"; } else { document.getElementById("combat-hero-hp").innerText = Math.floor(hero.hp); document.getElementById("combat-hero-maxhp").innerText = hero.combatStats.hp; }
        document.getElementById("combat-hero-hp-bar").style.width = `${Math.max(0, (hero.hp/hero.combatStats.hp)*100)}%`;
        
        let heroHpOuter = document.getElementById("combat-hero-hp-bar").parentElement; if(isHeroDead) heroHpOuter.style.background = "#2a0808"; else heroHpOuter.style.background = "#050505";
        document.getElementById("combat-enemy-hp").innerText = Math.floor(enemy.hp); document.getElementById("combat-enemy-maxhp").innerText = enemy.maxHp; document.getElementById("combat-enemy-hp-bar").style.width = `${Math.max(0, (enemy.hp/enemy.maxHp)*100)}%`;

        document.getElementById("combat-hero-atk-val").innerText = hero.combatStats.damage;
        document.getElementById("combat-hero-arm-val").innerText = hero.combatStats.armor;
        document.getElementById("combat-enemy-atk-val").innerText = enemy.stats.atk;
        document.getElementById("combat-enemy-arm-val").innerText = enemy.stats.armor;

        let btnSkill = document.getElementById("btn-use-skill");
        if (combatState.skillCooldown > 0) { btnSkill.innerHTML = `<span style="font-size:7px; color:#d8b4fe">Скилл</span>КД (${combatState.skillCooldown})`; btnSkill.disabled = true; btnSkill.style.filter = "grayscale(100%) opacity(0.5)"; } 
        else { let cls = CLASSES[hero.baseClass]; btnSkill.innerHTML = `<span style="font-size:7px; color:#d8b4fe">${cls.name}</span>ПРИМЕНИТЬ`; btnSkill.disabled = hero.hp <= 0 && !GOD_MODE; btnSkill.style.filter = "none"; }

        ['head', 'chest', 'legs'].forEach(z => { let btnAtk = document.getElementById(`btn-atk-${z}`); let btnDef = document.getElementById(`btn-def-${z}`); btnAtk.className = `zone-btn atk ${combatState.atkZone === z ? 'selected' : ''}`; let defClass = `zone-btn def ${combatState.defZone === z ? 'selected' : ''}`; if (combatState.zoneHealth[z] === 0) defClass += " broken"; btnDef.className = defClass; document.getElementById(`dur-${z}`).innerHTML = renderDurability(z); });
        
        let btnExe = document.getElementById("btn-execute-turn");
        if (btnExe) { if(hero.hp <= 0 && !GOD_MODE) { btnExe.innerText = "ГЕРОЙ МЕРТВ"; btnExe.disabled = true; } else if (combatState.atkZone && combatState.defZone) { btnExe.innerText = "УДАРИТЬ ⚔️"; btnExe.disabled = false; } else { btnExe.innerText = "ВЫБЕРИТЕ ЗОНЫ"; btnExe.disabled = true; } }
    }

    if (currentScreen === 'hero') {
        let cls = CLASSES[hero.baseClass];
        document.getElementById("ui-class-name").innerHTML = `<button class="reset-btn" onclick="hardReset()">СБРОС</button> ${cls.icon} ${hero.name} <span style="font-size:11px; color:#71717a; font-weight:normal;">[${cls.name}]</span>`;
        document.getElementById("main-hero-avatar").src = CLASS_AVATARS[hero.baseClass];

        let isCombat = currentScreen === 'PVE' && enemy; let skipHead = isCombat && combatState.zoneHealth.head === 0; let skipChest = isCombat && combatState.zoneHealth.chest === 0; let skipLegs = isCombat && combatState.zoneHealth.legs === 0;

        const slots = ["head", "chest", "belt", "boots", "amulet", "ring1", "ring2", "weapon1", "weapon2"];
        slots.forEach(slotKey => {
            let el = document.getElementById("slot-" + slotKey);
            if (el) {
                let item = hero.equipment[slotKey]; let isBroken = false;
                if(skipHead && slotKey === 'head') isBroken = true; if(skipChest && (slotKey === 'chest' || slotKey === 'weapon1' || slotKey === 'weapon2')) isBroken = true; if(skipLegs && (slotKey === 'boots' || slotKey === 'belt')) isBroken = true;
                el.className = `equip-slot ${item ? (item.id === "blocked" ? "blocked" : "filled rarity-" + (item.rarity || "common")) : "empty"} ${isBroken ? "blocked" : ""}`;
                el.innerHTML = item ? `${renderItemIcon(item)}<span class="slot-label" ${item.id==="blocked"||isBroken?'style="color:#ef4444"':''}>${isBroken?'СЛОМАНО':getSlotName(slotKey)}</span>` : `<div class="silhouette">${el.getAttribute("data-sil")}</div><span class="slot-label">${getSlotName(slotKey)}</span>`;
                if(isBroken) el.style.filter = "grayscale(100%) opacity(0.5)"; else el.style.filter = "none";
            }
        });

        document.getElementById("ui-bag-capacity").innerText = `${hero.inventory.length}/10`;
        let invHtml = '';
        for (let i = 0; i < 10; i++) { if (i < hero.inventory.length) { let item = ITEMS_DB[hero.inventory[i]]; invHtml += `<div class="inv-item filled rarity-${item.rarity}" onclick="openInspectModal(${i})">${renderItemIcon(item)}</div>`; } else { invHtml += `<div class="inv-item empty"></div>`; } }
        document.getElementById("ui-inventory-grid").innerHTML = invHtml;

        let hpPercent = Math.min(100, Math.max(0, (hero.hp / hero.finalStats.hp) * 100)); let missingHp = hero.finalStats.hp - Math.floor(hero.hp); let healCost = Math.max(10, Math.floor(missingHp * 0.5));
        let healBtnHtml = hero.hp < hero.finalStats.hp ? `<button class="heal-btn" onclick="healHero()">ЛЕЧИТЬ (-${healCost}💰)</button>` : ``;

        let isDebuff = hero.deathDebuffEnd > Date.now();
        let warnTxt = isDebuff ? `<div style="color:#ef4444; font-size:9px; font-weight:bold; margin-bottom:4px;">⚠️ АКТИВЕН ШТРАФ СМЕРТИ (-25%)</div>` : '';

        let unspentHtml = hero.unspentPoints > 0 ? `<div style="background:#064e3b; color:#34d399; padding:6px; border-radius:6px; text-align:center; margin-bottom:12px; font-weight:bold; border: 1px solid #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);">ОЧКОВ ХАРАКТЕРИСТИК: ${hero.unspentPoints}</div>` : '';
        
        function renderStatRow(icon, name, key, val) {
            let btn = hero.unspentPoints > 0 ? `<button class="stat-btn-add" onclick="addStat('${key}')">+</button>` : '';
            return `<div class="stat-item"><span>${icon} ${name}</span> <div style="display:flex; align-items:center;"><b>${val}</b>${btn}</div></div>`;
        }

        document.getElementById("ui-stats-container").innerHTML = `
            <div class="stats-card">
                ${unspentHtml}
                <div class="stat-group-title">Базовые параметры</div>
                ${renderStatRow('⚔️', 'Сила (СИЛ)', 'str', hero.finalStats.str)}
                ${renderStatRow('🏃', 'Ловкость (ЛОВ)', 'agi', hero.finalStats.agi)}
                ${renderStatRow('❤️', 'Выносл-ть (ВЫН)', 'end', hero.finalStats.end)}
                ${renderStatRow('🎯', 'Мастерство (МСТ)', 'mst', hero.finalStats.mst)}
                ${renderStatRow('🍀', 'Удача (УДЧ)', 'luk', hero.finalStats.luk)}
            </div>
            <div class="stats-card">
                <div class="stat-group-title">Боевые параметры</div>
                ${warnTxt}
                <div class="stat-item" style="flex-direction:column; align-items:stretch;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px; align-items:center;">
                        <span>🩸 Здоровье <b>${Math.floor(hero.hp)} / ${hero.finalStats.hp}</b></span>${healBtnHtml}
                    </div>
                    <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${hpPercent}%;"></div></div>
                </div>
                <div class="stat-item"><span>🗡️ Урон</span> <b style="${isDebuff?'color:#ef4444':''}">${hero.finalStats.damage}</b></div>
                <div class="stat-item"><span>🛡️ Броня</span> <b style="${isDebuff?'color:#ef4444':''}">${hero.finalStats.armor}</b></div>
                <div class="stat-item"><span>⛏️ Пробитие</span> <b style="color:#f59e0b;">${hero.finalStats.armorPen}</b></div>
                <div class="stat-item"><span>⚡ Крит</span> <b>${hero.finalStats.critChance}%</b></div>
            </div>
        `;
    }

    if (currentScreen === 'boss') {
        document.getElementById("ui-raid-tickets").innerText = `${hero.tickets}/${hero.maxTickets}`;
        let raidHtml = "";
        let statMult = 1 + (hero.level * 0.1); 
        RAID_BOSSES.forEach(b => {
            let imgUrl = `${STATIC_URL}mobs/B_${b.imgId}_high_resolution.png`;
            let canAfford = hero.tickets > 0;
            let btnHtml = canAfford ? `<button class="raid-btn" onclick="startRaid('${b.id}')">В БОЙ (1 🎟️)</button>` : `<button class="raid-btn" disabled>НЕТ БИЛЕТОВ</button>`;
            
            let bHp = Math.floor(100 * statMult * b.hpMult);
            let bAtk = Math.floor(10 * statMult * b.atkMult);
            let bArm = Math.floor(5 * statMult * b.armMult);

            raidHtml += `
                <div class="raid-boss-card">
                    <div class="raid-img-box">
                        <div class="silhouette">👾</div>
                        <img src="${imgUrl}" class="raid-img">
                    </div>
                    <div class="raid-info">
                        <div>
                            <div class="raid-name">${b.name} <span class="entity-lvl boss" style="font-size:8px;">УР. ${hero.level}</span></div>
                            <div class="raid-desc">${b.desc}</div>
                            <div class="combat-mini-stats" style="margin-bottom: 6px; justify-content: space-between; padding: 4px 6px;">
                                <span>❤️ ${bHp}</span> <span>⚔️ ${bAtk}</span> <span>🛡️ ${bArm}</span>
                            </div>
                            <div class="raid-loot">Лут: ${b.gemReward} 💎 ${b.dropRelic ? '+ Реликвия' : '+ Золото'}</div>
                        </div>
                        ${btnHtml}
                    </div>
                </div>
            `;
        });
        document.getElementById("ui-raid-list").innerHTML = raidHtml;
    }

    if (currentScreen === 'blacksmith') {
        let forgeHtml = '';
        for (let i = 0; i < 10; i++) { 
            if (i < hero.inventory.length) { 
                let item = ITEMS_DB[hero.inventory[i]]; let selClass = forgeSelectedIndex === i ? 'selected' : '';
                forgeHtml += `<div class="inv-item filled rarity-${item.rarity} ${selClass}" onclick="selectForgeItem(${i})">${renderItemIcon(item)}</div>`; 
            } else { forgeHtml += `<div class="inv-item empty"></div>`; } 
        }
        document.getElementById("ui-forge-grid").innerHTML = forgeHtml;

        let dPanel = document.getElementById("forge-details-panel"); let btnUpg = document.getElementById("btn-forge-upgrade");
        if (forgeSelectedIndex !== null && hero.inventory[forgeSelectedIndex]) {
            let item = ITEMS_DB[hero.inventory[forgeSelectedIndex]]; let cost = item.lvl * item.price * 2; let nextLvl = item.lvl + 1;
            document.getElementById("f-item-name").innerText = item.name; document.getElementById("f-item-lvl").innerText = `УР. ${item.lvl} ➔ ${nextLvl}`;
            let statHtml = "";
            for (let s in item.stats) {
                let oldVal = item.stats[s]; let newVal = Math.max(1, Math.ceil(oldVal * 1.15)); let sName = {atk:'Урон', armor:'Броня', str:'Сила', agi:'Ловкость', end:'Выносливость', mst:'Мастерство', luk:'Удача', critChance:'Крит %', dodgeChance:'Уворот %', armorPen:'Пробитие', blockChance:'Блок %', critDmg: 'Крит. Урон %'}[s] || s;
                statHtml += `<div class="f-stat-row"><span>${sName}</span><div><span class="f-old">${oldVal}</span><span class="f-arrow">➔</span><span class="f-new">${newVal}</span></div></div>`;
            }
            document.getElementById("f-item-stats").innerHTML = statHtml;
            btnUpg.innerText = `КОВАТЬ (💰 ${cost})`; btnUpg.disabled = hero.gold < cost || item.lvl >= 20;
            if (item.lvl >= 20) btnUpg.innerText = "МАКСИМАЛЬНЫЙ УРОВЕНЬ";
            dPanel.classList.add("show");
        } else { dPanel.classList.remove("show"); }
    }

    if (currentScreen === 'shop') {
        let shopHtml = '';
        if (shopMode === 'buy') {
            let fClass = document.getElementById("filter-class").value;
            let sortedAssortment = [...SHOP_ASSORTMENT].sort((a, b) => { let itemA = ITEMS_DB[a], itemB = ITEMS_DB[b]; if(itemA.lvl <= hero.level && itemB.lvl > hero.level) return -1; if(itemA.lvl > hero.level && itemB.lvl <= hero.level) return 1; return itemA.price - itemB.price; });
            sortedAssortment.forEach(itemId => {
                let item = ITEMS_DB[itemId];
                if(item.dropOnly || item.rarity === 'relic') return; if (fClass === 'my_class' && item.allowedClasses && !item.allowedClasses.includes(hero.baseClass)) return;
                let tagClassHtml = item.allowedClasses ? `<div class="shop-class-tag tag-class">[Класс]</div>` : `<div class="shop-class-tag tag-uni">[Общее]</div>`;
                let price = getShopPrice(item.price);
                let canAfford = hero.gold >= price; let meetLvl = hero.level >= item.lvl; let classMatch = !item.allowedClasses || item.allowedClasses.includes(hero.baseClass);
                let btnHtml = (canAfford && meetLvl && classMatch) ? `<button class="shop-btn btn-buy" onclick="buyItem('${item.id}')">Купить<br>💰 ${price}</button>` : `<button class="shop-btn btn-buy" disabled>💰 ${price}</button>`;
                shopHtml += `<div class="shop-item-card"><div class="shop-item-icon rarity-${item.rarity}">${renderItemIcon(item)}</div><div class="shop-item-info"><div class="shop-item-name"><span>${item.name}</span><span class="shop-item-lvl" style="color:${meetLvl?'#a1a1aa':'#ef4444'}">Ур. ${item.lvl}</span></div><div style="display:flex; gap:4px; flex-wrap:wrap;">${tagClassHtml}</div><div class="shop-item-stats">${formatStats(item.stats)}</div></div>${btnHtml}</div>`;
            });
        } else {
            if (hero.inventory.length === 0) shopHtml = `<div style="text-align:center; padding: 20px; color:#71717a;">Ваша сумка пуста.</div>`;
            else {
                hero.inventory.forEach((itemId, index) => {
                    let item = ITEMS_DB[hero.inventory[index]];
                    shopHtml += `<div class="shop-item-card"><div class="shop-item-icon rarity-${item.rarity}">${renderItemIcon(item)}</div><div class="shop-item-info"><div class="shop-item-name">${item.name} <span class="shop-item-lvl">Ур. ${item.lvl}</span></div><div class="shop-item-stats" style="color:#71717a;">Возврат: 50%</div></div><button class="shop-btn btn-sell" onclick="sellItem(${index})">Продать<br>💰 +${Math.floor(item.price * 0.5)}</button></div>`;
                });
            }
        }
        document.getElementById("ui-shop-list").innerHTML = shopHtml;
    }

    if (currentScreen === 'classes') {
        let galleryHtml = '';
        for (let key in CLASSES) { let cls = CLASSES[key]; galleryHtml += `<div class="class-icon-btn ${previewClassId === key ? 'selected' : ''}" onclick="selectPreviewClass('${key}')"><div class="icon">${cls.icon}</div><div class="name">${cls.name}</div></div>`; }
        document.getElementById("ui-classes-gallery").innerHTML = galleryHtml;

        let selCls = CLASSES[previewClassId]; let isCurrentHeroClass = hero.baseClass === previewClassId;
        
        document.getElementById("ui-class-detail").innerHTML = `
            <div class="class-detail-card" style="border-color: ${selCls.color}40;">
                <div class="class-detail-img-box">
                    <div class="silhouette" style="position:absolute; font-size:80px; z-index:1; opacity:0.3;">👤</div>
                    <img src="${CLASS_AVATARS[previewClassId]}" alt="${selCls.name}" class="class-preview-img">
                    <div class="class-gradient-fade"></div>
                </div>
                <div class="class-detail-content">
                    <div class="class-detail-header">
                        <div class="class-detail-title" style="color:${selCls.color}; text-shadow: 0 0 15px ${selCls.color}80;">${selCls.icon} ${selCls.name}</div>
                        <div class="class-detail-growth">Авто-рост: СИЛ +${selCls.growth.str} | ЛОВ +${selCls.growth.agi} | ВЫН +${selCls.growth.end} | МСТ +${selCls.growth.mst} | УДЧ +${selCls.growth.luk}</div>
                    </div>
                    <div class="class-detail-lore">"${selCls.lore}"</div>
                    <div class="class-bars">
                        <div class="c-bar-row"><span>Атака</span><div class="c-bar-wrap"><div class="c-bar-fill" style="width: ${selCls.bars.dmg}%; background: ${selCls.color}; box-shadow: 0 0 10px ${selCls.color};"></div></div></div>
                        <div class="c-bar-row"><span>Защита</span><div class="c-bar-wrap"><div class="c-bar-fill" style="width: ${selCls.bars.def}%; background: ${selCls.color}; box-shadow: 0 0 10px ${selCls.color};"></div></div></div>
                        <div class="c-bar-row"><span>Сложность</span><div class="c-bar-wrap"><div class="c-bar-fill" style="width: ${selCls.bars.diff}%; background: ${selCls.color}; box-shadow: 0 0 10px ${selCls.color};"></div></div></div>
                    </div>
                    <button class="select-class-btn" ${isCurrentHeroClass ? 'disabled' : ''} onclick="changeClass('${previewClassId}')" style="${!isCurrentHeroClass ? `box-shadow: 0 4px 15px ${selCls.color}40; border-color: ${selCls.color};` : ''}">${isCurrentHeroClass ? '✔ ТЕКУЩИЙ КЛАСС' : 'СМЕНИТЬ КЛАСС (💰 5000)'}</button>
                </div>
            </div>`;
    }

    if (currentScreen === 'talents') {
        renderTalents();
    }
}

calculateStats(); 
updateUI();
