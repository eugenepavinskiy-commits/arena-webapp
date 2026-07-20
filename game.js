const config = {
    type: Phaser.CANVAS,
    width: 400,
    height: 700,
    parent: 'game-container',
    backgroundColor: '#e6d8b8',
    scene: {
        create: create
    }
};

const game = new Phaser.Game(config);

// Инициализация Telegram WebApp API
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand(); // Разворачиваем окно Telegram на весь экран
}

let combatStep = 'att1'; 
let attackZones = []; 
let defendZone1 = null;
let defendZone2 = null;
let tempSelectedZone = null;

let statusLabel; 
let zoneObjects = {};
let applyBtn;

let p1Hp = 100, p2Hp = 100;
let p1HpBar, p2HpBar, p1HpText, p2HpText;
let battleLogText;

// Размеры и координаты кубиков анатомической сетки
const bodyParts = {
    head_left:   { x: 186, y: 195, w: 24, h: 24 },
    head_right:  { x: 214, y: 195, w: 24, h: 24 },
    chest_left:  { x: 183, y: 232, w: 30, h: 30 },
    chest_right: { x: 217, y: 232, w: 30, h: 30 },
    l_arm_top:   { x: 152, y: 235, w: 20, h: 22 },
    l_arm_bot:   { x: 152, y: 260, w: 20, h: 22 },
    r_arm_top:   { x: 248, y: 235, w: 20, h: 22 },
    r_arm_bot:   { x: 248, y: 260, w: 20, h: 22 },
    belly_top:   { x: 200, y: 270, w: 42, h: 18 },
    belly_bot:   { x: 200, y: 290, w: 42, h: 18 },
    leg_left:    { x: 186, y: 330, w: 24, h: 42 },
    leg_right:   { x: 214, y: 330, w: 24, h: 42 }
};

function create() {
    const scene = this;

    // --- ШАПКА И СТАТУСЫ ---
    scene.add.text(200, 20, 'ТАКТИКА БОЯ: 2 УДАРА / 2 БЛОКА', {
        fontSize: '13px', fill: '#800000', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Шкалы HP
    scene.add.text(25, 45, 'Вы:', { fontSize: '11px', fill: '#2e7d32', fontStyle: 'bold' });
    p1HpText = scene.add.text(55, 45, '100/100', { fontSize: '11px', fill: '#2e7d32' });
    scene.add.rectangle(25, 60, 160, 8, 0xcccccc).setOrigin(0, 0.5);
    p1HpBar = scene.add.rectangle(25, 60, 160, 8, 0x4caf50).setOrigin(0, 0.5);

    scene.add.text(215, 45, 'Враг:', { fontSize: '11px', fill: '#c62828', fontStyle: 'bold' });
    p2HpText = scene.add.text(245, 45, '100/100', { fontSize: '11px', fill: '#c62828' });
    scene.add.rectangle(215, 60, 160, 8, 0xcccccc).setOrigin(0, 0.5);
    p2HpBar = scene.add.rectangle(215, 60, 160, 8, 0xf44336).setOrigin(0, 0.5);

    // Фоновая подложка под сетку
    const mapBg = scene.add.rectangle(200, 260, 320, 260, 0xf5e9be).setOrigin(0.5);
    mapBg.setStrokeStyle(1, 0x800000);

    statusLabel = scene.add.text(200, 145, '1-й Удар', {
        fontSize: '16px', fill: '#800000', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Слоты экипировки
    const slotLeft = scene.add.rectangle(80, 250, 42, 42, 0xd4c4a8).setOrigin(0.5);
    slotLeft.setStrokeStyle(1, 0x800000);
    scene.add.text(80, 246, '⚔️', { fontSize: '18px' }).setOrigin(0.5);
    scene.add.text(80, 276, 'Меч', { fontSize: '9px', fill: '#5a4a3a', fontStyle: 'bold' }).setOrigin(0.5);

    const slotRight = scene.add.rectangle(320, 250, 42, 42, 0xd4c4a8).setOrigin(0.5);
    slotRight.setStrokeStyle(1, 0x800000);
    scene.add.text(320, 246, '🛡️', { fontSize: '18px' }).setOrigin(0.5);
    scene.add.text(320, 276, 'Щит', { fontSize: '9px', fill: '#5a4a3a', fontStyle: 'bold' }).setOrigin(0.5);

    // --- СОЗДАНИЕ ОБЪЕМНЫХ КУБИКОВ (3D EFFECT) ---
    Object.keys(bodyParts).forEach(key => {
        const part = bodyParts[key];

        const shadow = scene.add.rectangle(part.x + 1, part.y + 1, part.w, part.h, 0x3a4550).setOrigin(0.5);
        const mainRect = scene.add.rectangle(part.x, part.y, part.w, part.h, 0x7a8b99).setOrigin(0.5);
        mainRect.setStrokeStyle(1, 0x2c3e50);
        mainRect.setInteractive();

        const highlight = scene.add.rectangle(part.x, part.y - (part.h / 2) + 2, part.w - 2, 2, 0xffffff, 0.4).setOrigin(0.5);

        zoneObjects[key] = { main: mainRect, shadow: shadow, highlight: highlight, data: part };

        mainRect.on('pointerdown', function () {
            tempSelectedZone = key;
            redrawHuman();
        });
    });

    // Кнопка "Применить"
    const btnShadow = scene.add.rectangle(201, 356, 110, 26, 0x3a2e24).setOrigin(0.5);
    applyBtn = scene.add.rectangle(200, 355, 110, 26, 0xd4c4a8).setOrigin(0.5);
    applyBtn.setStrokeStyle(2, 0x5a4a3a);
    applyBtn.setInteractive();

    scene.add.text(200, 355, 'Применить', {
        fontSize: '12px', fill: '#000000', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5);

    // Текстовый лог боя
    scene.add.text(30, 395, '📜 Лог боя:', {
        fontSize: '12px', fill: '#5a4a3a', fontStyle: 'bold'
    });

    const logBg = scene.add.rectangle(200, 490, 340, 160, 0xfcf8ed).setOrigin(0.5);
    logBg.setStrokeStyle(1, 0xb89768);

    battleLogText = scene.add.text(40, 420, 'Бой начался.\nВыберите 2 удара и 2 блока.', {
        fontSize: '11px', fill: '#333333', fontFamily: 'Arial',
        wordWrap: { width: 310 }
    });

    // Обработка нажатия кнопки "Применить"
    applyBtn.on('pointerdown', function () {
        if (!tempSelectedZone) return;

        if (combatStep === 'att1') {
            attackZones[0] = tempSelectedZone;
            tempSelectedZone = null;
            combatStep = 'att2';
            statusLabel.setText('2-й Удар');
            statusLabel.setFill('#800000');
            battleLogText.setText('1-й удар выбран.\nВыберите 2-й удар.');
        } 
        else if (combatStep === 'att2') {
            attackZones[1] = tempSelectedZone;
            tempSelectedZone = null;
            combatStep = 'def1';
            statusLabel.setText('1-й Блок');
            statusLabel.setFill('#000080');
            battleLogText.setText('Удары зафиксированы.\nПоставьте 1-й блок.');
        } 
        else if (combatStep === 'def1') {
            defendZone1 = tempSelectedZone;
            tempSelectedZone = null;
            combatStep = 'def2';
            statusLabel.setText('2-й Блок');
            statusLabel.setFill('#000080');
            battleLogText.setText('1-й блок поставлен.\nПоставьте 2-й блок.');
        } 
        else if (combatStep === 'def2') {
            defendZone2 = tempSelectedZone;
            tempSelectedZone = null;

            // Формируем объект с выбранными 2 ударами и 2 блоками
            const turnData = {
                attacks: attackZones,
                defends: [defendZone1, defendZone2]
            };

            // Если открыто внутри Telegram Mini App — отправляем данные боту!
            if (tg) {
                battleLogText.setText('Ход отправлен серверу!\nОжидание ответа...');
                tg.sendData(JSON.stringify(turnData));
            } else {
                // Если проверяем локально в браузере (для тестов без Telegram)
                p2Hp = Math.max(0, p2Hp - 15);
                p1Hp = Math.max(0, p1Hp - 10);

                p1HpBar.width = (p1Hp / 100) * 160;
                p2HpBar.width = (p2Hp / 100) * 160;
                p1HpText.setText(p1Hp + '/100');
                p2HpText.setText(p2Hp + '/100');

                battleLogText.setText('Раунд рассчитан!\nВы нанесли 15 урона.\nВраг нанес 10 урона.\nНовый раунд.');
            }

            // Сброс состояния для следующего шага
            combatStep = 'att1';
            attackZones = [];
            defendZone1 = null;
            defendZone2 = null;
            statusLabel.setText('1-й Удар');
            statusLabel.setFill('#800000');
            redrawHuman();
        }
        redrawHuman();
    });
}

function redrawHuman() {
    Object.keys(bodyParts).forEach(key => {
        const item = zoneObjects[key];
        const rect = item.main;
        
        rect.setFillStyle(0x7a8b99);
        rect.setStrokeStyle(1, 0x2c3e50);

        if (tempSelectedZone === key) {
            rect.setFillStyle(0xe67e22);
            rect.setStrokeStyle(2, 0xd35400);
        }

        if (attackZones.includes(key)) {
            rect.setFillStyle(0xc0392b);
            rect.setStrokeStyle(2, 0x7b241c);
        }

        if (defendZone1 === key || defendZone2 === key) {
            if (attackZones.includes(key)) {
                rect.setFillStyle(0x8e44ad);
                rect.setStrokeStyle(2, 0x512e5f);
            } else {
                rect.setFillStyle(0x2980b9);
                rect.setStrokeStyle(2, 0x1b4f72);
            }
        }
    });
}