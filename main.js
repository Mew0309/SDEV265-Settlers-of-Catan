const landResourcesOriginal = ['wood', 'wood', 'wood', 'wood', 'brick', 'brick', 'brick', 'brick', 'wheat', 'wheat', 'wheat', 'wheat', 'ore', 'ore', 'ore', 'sheep', 'sheep', 'sheep', 'desert'];
const tokensOriginal = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const mapRadius = 2, seaRadius = mapRadius + 1, side = 115 / 2;
const board = document.getElementById('board');
const players = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
let currentPlayer = 0;
let resourcesCollapsed = false;
let robberHex = null;
let robberHexId = null;
let robberMoving = false;
let robberHexEl = null;
const playerColors = [
    '#8A2BE2', // violet
    '#FF8C00', // orange
    '#008080', // Teal 
    '#FF1493'  // pink
];
// color coding players
const resourcePanels = document.querySelectorAll('.player-resources');
resourcePanels.forEach(panel => {
    const idx = parseInt(panel.dataset.player, 10);
    const labelEl = panel.querySelector('.player-label');
    if (labelEl) {
        labelEl.style.color = playerColors[idx];
    }
});
const tradeTargetSelect = document.getElementById('trade-target');
Array.from(tradeTargetSelect.options).forEach((opt, idx) => {
    opt.style.color = playerColors[idx];
});
function updateTradeTargetColor() {
    tradeTargetSelect.style.color = playerColors[tradeTargetSelect.selectedIndex];
}
tradeTargetSelect.addEventListener('change', updateTradeTargetColor);

updateTradeTargetColor();
let dragStart = null;
let buildMode = null;  // null | 'road' | 'settlement'
const buildRoadBtn = document.getElementById('build-roads-mode');
const roads = new Set();
const buildSettBtn = document.getElementById('build-settlements-mode');
buildSettBtn.addEventListener('click', () => {
    // toggle settlement mode on/off
    buildMode = (buildMode === 'settlement') ? null : 'settlement';

    //turn road mode off when toggling settlements
    buildRoadBtn.textContent = 'Build Roads: Off';

    // update the settlement button label and cursor
    buildSettBtn.textContent = `Build Settlements: ${buildMode === 'settlement' ? 'On' : 'Off'}`;
    board.style.cursor = (buildMode === 'settlement') ? 'pointer' : 'default';
    // highlight
    document.getElementById('build-settlement-cost')
        .classList.toggle('active', buildMode === 'settlement');
    document.getElementById('build-road-cost')
        .classList.remove('active');
});
const playersResources = players.map(_ => ({ wood: 5, brick: 5, wheat: 5, ore: 5, sheep: 5 }));
const settlementMap = {};

function cornerCenter(cornerEl) {
    const br = board.getBoundingClientRect();
    const rc = cornerEl.getBoundingClientRect();
    return {
        x: (rc.left + rc.width / 2) - br.left,
        y: (rc.top + rc.height / 2) - br.top
    };
}
buildRoadBtn.addEventListener('click', () => {
    // toggle road mode
    buildMode = (buildMode === 'road') ? null : 'road';
    buildSettBtn.textContent = 'Build Settlements: Off';
    //update the road button label/ cursor
    buildRoadBtn.textContent = `Build Roads: ${buildMode === 'road' ? 'On' : 'Off'}`;
    board.style.cursor = (buildMode === 'road') ? 'crosshair' : 'default';
    // highlight
    document.getElementById('build-road-cost')
        .classList.toggle('active', buildMode === 'road');
    // ensure settlement‐cost is not highlighted
    document.getElementById('build-settlement-cost')
        .classList.remove('active');
});


//start dragging from a corner
board.addEventListener('mousedown', e => {
    if (buildMode !== 'road' || !e.target.classList.contains('corner')) return;
    if (!e.target.classList.contains('corner')) return;
    dragStart = {
        el: e.target,
        pos: cornerCenter(e.target)
    };
});

//check for drag to other corner
board.addEventListener('mouseup', e => {
    if (!dragStart) return;
    if (buildMode !== 'road' || !e.target.classList.contains('corner')) return;
    if (!e.target.classList.contains('corner')) {
        dragStart = null;
        return;
    }

    const start = dragStart;
    const end = {
        el: e.target,
        pos: cornerCenter(e.target)
    };
    dragStart = null;

    // verify not starting corner
    if (start.el === end.el) return;

    //validation
    const dx = start.pos.x - end.pos.x;
    const dy = start.pos.y - end.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 70) return; // tweak threshold if needed
    const res = playersResources[currentPlayer];
    if (res.wood < 1 || res.brick < 1) {
        alert('Not enough resources to build a road (1 wood + 1 brick needed).');
        return;
    }
    // Subtract cost/update the UI
    res.wood--;
    res.brick--;
    updateResourcePanel();
    //keys so roads are undirected
    const key1 = `${Math.round(start.pos.x)}-${Math.round(start.pos.y)}`;
    const key2 = `${Math.round(end.pos.x)}-${Math.round(end.pos.y)}`;
    const roadKey = key1 < key2 ? key1 + '|' + key2 : key2 + '|' + key1;
    if (roads.has(roadKey)) return;  // already built here
    roads.add(roadKey);

    //draw road
    const svgNS = 'http://www.w3.org/2000/svg';
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', start.pos.x);
    line.setAttribute('y1', start.pos.y);
    line.setAttribute('x2', end.pos.x);
    line.setAttribute('y2', end.pos.y);
    line.setAttribute('stroke-width', 6);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke', playerColors[currentPlayer]);
    document.getElementById('roads-layer').appendChild(line);
});

function updateCurrentPlayerUI() {
    document.getElementById('current-player').textContent = 'Current Player: ' + players[currentPlayer];
    updateResourcePanel();
    if (resourcesCollapsed) applyCollapse();
}
function updateResourcePanel() {
    playersResources.forEach((resMap, idx) => {
        const panel = document.querySelector(`.player-resources[data-player="${idx}"]`);
        if (!panel) return;
        ['wood', 'brick', 'wheat', 'ore', 'sheep'].forEach(res => {
            const lbl = panel.querySelector(`.resource-card.${res} .label`);
            if (lbl) lbl.textContent = resMap[res];
        });
    });
}
function applyCollapse() {
    document.querySelectorAll('.player-resources').forEach(el => {
        el.style.display = (parseInt(el.dataset.player, 10) === currentPlayer) ? 'flex' : 'none';
    });
    document.getElementById('toggle-resources').textContent = 'Expand';
}
function applyExpand() {
    document.querySelectorAll('.player-resources').forEach(el => el.style.display = 'flex');
    document.getElementById('toggle-resources').textContent = 'Collapse';
}

document.getElementById('toggle-resources').addEventListener('click', () => {
    resourcesCollapsed = !resourcesCollapsed;
    if (resourcesCollapsed) applyCollapse(); else applyExpand();
});
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
function toCartesian(q, r) {
    return { x: side * Math.sqrt(3) * (q + r / 2), y: side * 1.5 * r };
}
function placeRobberIcon(hexEl) {
    const icon = document.createElement('div');
    icon.className = 'robber-icon';
    icon.textContent = '🐴';
    icon.style.left = '50%';
    icon.style.top = '50%';
    hexEl.appendChild(icon);
}

// hexes are uniquely identified by their board coords
// store robberHexId = `${q}-${r}` when placing
function matchesThisHex(hexEl, robberHexId) {
    return hexEl.dataset.q + '-' + hexEl.dataset.r === robberHexId;
}
let landResources, tokens, tokenElements;
function clearBoard() {
    tokenElements = [];
    Object.values(settlementMap).forEach(s => s.el.remove());
    Object.keys(settlementMap).forEach(k => delete settlementMap[k]);
}
function generateBoard() {
    clearBoard();
    landResources = [...landResourcesOriginal];
    tokens = [...tokensOriginal];
    shuffle(landResources);
    shuffle(tokens);
    let resIdx = 0, tokIdx = 0;
    for (let q = -seaRadius; q <= seaRadius; q++) {
        for (let r = -seaRadius; r <= seaRadius; r++) {
            const s = -q - r;
            const maxDist = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
            if (maxDist <= seaRadius) {
                const { x, y } = toCartesian(q, r);
                const hex = document.createElement('div');
                hex.className = 'hex ' + (maxDist <= mapRadius ? 'land' : 'sea');
                hex.style.left = `calc(50% + ${x}px)`;
                hex.style.top = `calc(50% + ${y}px)`;
                board.appendChild(hex);
                if (robberHexId && matchesThisHex(hex, robberHexId)) {
                    placeRobberIcon(hex);
                }
                if (maxDist <= mapRadius) {
                    const res = landResources[resIdx++];
                    hex.dataset.res = res;
                    hex.dataset.q = q;
                    hex.dataset.r = r;
                    hex.style.background = {
                        wood: '#228B22', brick: '#B22222', wheat: '#DAA520', ore: '#708090', sheep: '#7CFC00', desert: '#DEB887'
                    }[res];
                    if (res !== 'desert') {
                        const num = tokens[tokIdx++];
                        hex.dataset.token = num;
                        const tokEl = document.createElement('div'); tokEl.className = 'token'; tokEl.textContent = num;
                        hex.appendChild(tokEl);
                        tokenElements.push(tokEl);
                    } else {
                        robberHex = hex;
                        robberMoving = false;
                        robberHexEl = hex;
                        placeRobberIcon(hex);
                        tokenElements.push(null);
                    }
                    for (let i = 0; i < 6; i++) {
                        const corner = document.createElement('div'); corner.className = 'corner'; corner.dataset.pos = i;
                        hex.appendChild(corner);
                    }
                }
            }
        }
    }
}

// Settlement placement/removal
board.addEventListener('click', e => {

    if (buildMode !== 'settlement' || !e.target.classList.contains('corner')) return;

    // never place settlements while in road‐mode
    // only allow settlement clicks when buildSettlementMode is on,
    // otherwise ignore corner‐clicks
    // must be on a corner
    if (!e.target.classList.contains('corner')) return;

    // compute the key based on corner center
    const br = board.getBoundingClientRect();
    const rc = e.target.getBoundingClientRect();
    const cx = Math.round(rc.left + rc.width / 2 - br.left);
    const cy = Math.round(rc.top + rc.height / 2 - br.top);
    const key = `${cx}-${cy}`;

    if (settlementMap[key]) {
        alert('There is already a settlement here.');
        return;
    }

    // Check resources for 1 wood, 1 brick, 1 wheat, 1 sheep
    const res = playersResources[currentPlayer];
    if (res.wood < 1 || res.brick < 1 || res.wheat < 1 || res.sheep < 1) {
        alert('Not enough resources (need 1 wood + 1 brick + 1 wheat + 1 sheep).');
        return;
    }

    // subtract cost and update UI
    res.wood--;
    res.brick--;
    res.wheat--;
    res.sheep--;
    updateResourcePanel();

    // place the settlement
    const div = document.createElement('div');
    div.className = 'settlement-icon';
    div.style.left = `${cx}px`;
    div.style.top = `${cy}px`;
    div.style.backgroundColor = playerColors[currentPlayer];
    board.appendChild(div);
    settlementMap[key] = { el: div, playerIndex: currentPlayer };
});


// Dice rolling and resource distribution
document.getElementById('roll-dice').addEventListener('click', () => {
    const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1;
    document.getElementById('die1').textContent = d1;
    document.getElementById('die2').textContent = d2;
    const sum = d1 + d2;
    if (sum === 7) {
        robberMoving = true;
        alert('Robber! Click a land hex to move the robber.');
        return;  // skip the normal distribution
    }

    const br = board.getBoundingClientRect();
    document.querySelectorAll('.hex.land').forEach(hex => {
        if (hex.querySelector('.robber-icon')) return;
        if (+hex.dataset.token === sum) {
            const resType = hex.dataset.res;
            hex.querySelectorAll('.corner').forEach(corner => {
                const rc2 = corner.getBoundingClientRect();
                const cx2 = Math.round(rc2.left + rc2.width / 2 - br.left);
                const cy2 = Math.round(rc2.top + rc2.height / 2 - br.top);
                const key2 = `${cx2}-${cy2}`;
                if (settlementMap[key2]) {
                    const owner = settlementMap[key2].playerIndex;
                    playersResources[owner][resType]++;
                }
            });
        }
    });
    updateResourcePanel();
});
board.addEventListener('click', e => {
    const hex = e.target.closest('.hex.land');
    if (!robberMoving || !hex) return;

    // remove old robber icon
    if (robberHex) robberHex.querySelector('.robber-icon').remove();

    // remember new location and show icon
    robberHex = hex;
    robberMoving = false;
    placeRobberIcon(hex);

    // steal from a random adjacent player
    stealFromAdjacent(hex);

});
function stealFromAdjacent(hexEl) {
    // find settlements on hex's corners
    const br = board.getBoundingClientRect();
    const victims = new Set();
    hexEl.querySelectorAll('.corner').forEach(c => {
        const rc = c.getBoundingClientRect();
        const key = `${Math.round(rc.left + rc.width / 2 - br.left)}-${Math.round(rc.top + rc.height / 2 - br.top)}`;
        if (settlementMap[key]) victims.add(settlementMap[key].playerIndex);
    });
    victims.delete(currentPlayer);  // can't rob yourself

    if (victims.size === 0) {
        alert('No one to steal from here.');
        return;
    }

    // pick a random victim
    const victimArr = Array.from(victims);
    const victim = victimArr[Math.floor(Math.random() * victimArr.length)];
    const resMap = playersResources[victim];
    // pick a random resource they actually have
    const types = ['wood', 'brick', 'wheat', 'ore', 'sheep'].filter(r => resMap[r] > 0);
    if (types.length === 0) {
        alert(`${players[victim]} has no resources to steal.`);
        return;
    }
    const stolenType = types[Math.floor(Math.random() * types.length)];

    // transfer it
    resMap[stolenType]--;
    playersResources[currentPlayer][stolenType]++;
    updateResourcePanel();

    alert(`You stole 1 ${stolenType} from ${players[victim]}!`);
}
// Bank trade 4:1
document.getElementById('trade-bank').addEventListener('click', () => {
    const give = document.getElementById('trade-give').value;
    const get = document.getElementById('trade-get').value;
    if (give === get) { alert('Choose two different resources.'); return; }
    if (playersResources[currentPlayer][give] < 4) {
        alert('Not enough resources.'); return;
    }
    playersResources[currentPlayer][give] -= 4;
    playersResources[currentPlayer][get] += 1;
    updateResourcePanel();
    alert(`Traded 4 ${give} for 1 ${get}`);
});

// Controls
document.getElementById('next-turn').addEventListener('click', () => { currentPlayer = (currentPlayer + 1) % players.length; updateCurrentPlayerUI(); });
document.getElementById('trade-player').addEventListener('click', () => {
    const give = document.getElementById('trade-give').value;
    const get = document.getElementById('trade-get').value;
    const target = parseInt(document.getElementById('trade-target').value, 10);

    // Validation
    if (target === currentPlayer) {
        alert("You can't trade with yourself.");
        return;
    }
    if (give === get) {
        alert("Choose two different resources to swap.");
        return;
    }
    if (playersResources[currentPlayer][give] < 1) {
        alert(`You don't have any ${give} to trade.`);
        return;
    }
    if (playersResources[target][get] < 1) {
        alert(`${players[target]} has no ${get} to trade.`);
        return;
    }

    // Execute the swap
    playersResources[currentPlayer][give]--;
    playersResources[currentPlayer][get]++;
    playersResources[target][get]--;
    playersResources[target][give]++;

    // Update only the UI for the current player
    updateResourcePanel();
    alert(`You gave 1 ${give} to ${players[target]} and received 1 ${get}.`);
});
updateCurrentPlayerUI();
generateBoard();