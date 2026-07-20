[17:05, 20.07.2026] Джон Павинский: <!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPG Арена</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #18191c; color: white; text-align: center; margin: 0; padding: 12px; }
        
        /* Вкладки */
        .nav-tabs { display: flex; justify-content: space-around; background: #22242a; padding: 6px; border-radius: 10px; margin-bottom: 12px; }
        .tab-btn { background: transparent; color: #aaa; border: none; padding: 8px 12px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .ta…
[17:07, 20.07.2026] Джон Павинский: const tg = window.Telegram.WebApp;
tg.expand();

// SVG-векторы оружия
const svgModels = {
    sword: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffb74d" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/></svg>,
    dagger: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2"><path d="M6 18L18 6"/><path d="M18 6V11"/><path d="M18 6H13"/><path d="M4 20l3-3"/></svg>,
    axe: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e57373" stroke-width="2"><path d="M14 4c0 0 4 1 4 5s-4 5-4 5V4z"/><path d="M5 19l9-9"/></svg>,
    fists: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="12" r="6"/></svg>
};

const parts = [
    { id: 'head_left', name: '🙆‍♂️ Голова (Л)' }, { id: 'head_right', name: '🙆‍♂️ Голова (П)' },
    { id: 'chest_left', name: '🛡️ Грудь (Л)' }, { id: 'chest_right', name: '🛡️ Грудь (П)' },
    { id: 'l_arm_top', name: '🥊 Л.Рука (В)' }, { id: 'r_arm_top', name: '🥊 П.Рука (В)' },
    { id: 'belly_top', name: '腹 Живот (В)' }, { id: 'belly_bot', name: '腹 Живот (Н)' },
    { id: 'leg_left', name: '🦿 Нога (Л)' }, { id: 'leg_right', name: '🦿 Нога (П)' }
];

let selectedAttacks = [], selectedDefends = [];
let currentWeapon = 'fists';
let freePoints = 5, strVal = 5, agiVal = 5, luckVal = 5;

// Рендер иконок в магазине
document.getElementById('icon-sword').innerHTML = svgModels.sword;
document.getElementById('icon-dagger').innerHTML = svgModels.dagger;
document.getElementById('icon-axe').innerHTML = svgModels.axe;

function renderHeroAvatar() {
    const avatar = document.getElementById('hero-avatar');
    avatar.innerHTML = `
        <svg width="100" height="150" viewBox="0 0 100 150">
            <!-- Голова -->
            <circle cx="50" cy="30" r="18" fill="#ffd54f"/>
            <!-- Тело -->
            <rect x="35" y="52" width="30" height="45" rx="5" fill="#424242"/>
            <!-- Ноги -->
            <rect x="37" y="100" width="10" height="35" fill="#212121"/>
            <rect x="53" y="100" width="10" height="35" fill="#212121"/>
            <!-- Руки -->
            <rect x="20" y="55" width="10" height="35" fill="#ffd54f"/>
            <rect x="70" y="55" width="10" height="35" fill="#ffd54f"/>
            <!-- Моделька оружия в правой руке -->
            <g transform="translate(68, 70)">${svgModels[currentWeapon] || ''}</g>
        </svg>
    `;
}

function upgradeStat(stat) {
    if (freePoints <= 0) return;
    freePoints--;
    if (stat === 'str') strVal++;
    if (stat === 'agi') agiVal++;
    if (stat === 'luck') luckVal++;
    
    document.getElementById('free-points-val').innerText = freePoints;
    document.getElementById('str-val').innerText = strVal;
    document.getElementById('agi-val').innerText = agiVal + '%';
    document.getElementById('luck-val').innerText = luckVal + '%';

    tg.sendData(JSON.stringify({ type: 'upgrade', stat: stat }));
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    if(tab === 'arena') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-arena').classList.add('active');
    } else if(tab === 'hero') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-hero').classList.add('active');
        renderHeroAvatar();
    } else {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('tab-shop').classList.add('active');
    }
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    parts.forEach(p => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.innerText = p.name;
        cell.onclick = () => toggleSelect(p.id, cell);
        grid.appendChild(cell);
    });
}

function toggleSelect(id, cell) {
    if (selectedAttacks.includes(id)) {
        selectedAttacks = selectedAttacks.filter(i => i !== id);
        selectedDefends.push(id);
        cell.className = 'cell defend';
    } else if (selectedDefends.includes(id)) {
        selectedDefends = selectedDefends.filter(i => i !== id);
        cell.className = 'cell';
    } else {
        if (selectedAttacks.length < 2) {
            selectedAttacks.push(id);
            cell.className = 'cell attack';
        } else if (selectedDefends.length < 2) {
            selectedDefends.push(id);
            cell.className = 'cell defend';
        }
    }
}

function sendBattleTurn() {
    if (selectedAttacks.length !== 2 || selectedDefends.length !== 2) {
        alert("Выберите 2 зоны атаки (красные) и 2 зоны защиты (синие)!");
        return;
    }
    tg.sendData(JSON.stringify({ type: 'turn', attacks: selectedAttacks, defends: selectedDefends }));
}

function buyItem(weaponKey) {
    currentWeapon = weaponKey;
    tg.sendData(JSON.stringify({ type: 'buy', weapon: weaponKey }));
}

renderGrid();
renderHeroAvatar();
