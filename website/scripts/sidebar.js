// Globals
import { _globals } from './first10.js';

import * as GameData from './gameData.js';
import * as Board from './board.js';
import * as First10 from './first10.js';
import * as Auth from './auth.js';

const newSession = {"blue":0, "green":0, "yellow":0, "red":0, "date":0};
const baseUser = {};
baseUser.controls = {
        "preferColor": "random",
        "minimumTurns": 1,
        "maximumTurns": 10,
        "ecoCode": "",
        "showBestArrow": true,
        "playSounds": false,
        "replay": "never",
        "showHighlights": false,
        "theme": "classic",
        "animation": false	//TBD fix
    };
baseUser.idInfo = {"sub":"", picture:"/images/bk.png", "given_name": "Anonymous"};
baseUser.sessions = [newSession];
baseUser.missed = [];
export let _user = baseUser;

export function init() {
     populateUserProfile();
     
     // Start by showing the newgame options
    pickColor(controlGet("preferColor"));
    updateSlider();
    loadEcoOpenings();
    setSessionsTable();
    setCurrentEcoCode(controlGet("ecoCode"));

    show("container-sb-body","sb-body-settings","flex");
 }

export function setUser(data = baseUser) {
    if( ! data.hasOwnProperty("controls") ) 
        data['controls'] = baseUser.controls;
    _user = data;
	_globals.declaredUser = _user.idInfo.given_name;
    populateUserProfile();
}

export function controlGet(control) {
    return _user["controls"][control];
}

export function controlSet(control, value) {
    if( _user["controls"][control] != value ) {
        _user["controls"][control] = value;
        userSave();
    }
}

export function toggleUserState() {
    const loggedIn = (_globals.declaredUser != "Anonymous");
    const el = document.getElementById('menu-toggleLogin');
    el.textContent = "Sign " +(loggedIn?"in":"out");
    if( loggedIn ) {
        // Logout and go back to baseUser values
        userSave(0);
        setUser();
     } else {
        Auth.login()
     }
}

let saveIsQueued = false;
export function userSave(delay = 1*60*1000) {
    if( saveIsQueued && delay != 0) {
        return;
    }
    saveIsQueued = true;

    console.log(_user);
    if( Auth.isLocalhost() == false ) {
        setTimeout(async () => {
        _user.sessions[0]["date"] = Date.now();
        _user.sessions.unshift({...newSession});
        const response = await fetch('/api/databaseItems', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(_user)
            });
        const data = await response.json();
        saveIsQueued = false;
        }, delay);
    }
}

export function recordResult(notation){
    let grade = setResultsTable(notation);
    _user.sessions[0][grade] += 1;
    if( grade == "red" ) {
        if (!_user['missed'].includes(_globals.PGN)) {
            _user['missed'].push(_globals.PGN);
        }    
    }
    showTotalsBar(_user.sessions[0], "resultsBar");
    setSessionsTable();
}

function explainMove( mode ) {
    const pgn = _globals.PGN;
    const url = "https://claude.ai/new?q=explain why move ";
    let move = "";
    let modifier = "";
    if( mode == "best" ) {
        move =_globals.bestMove; 
        modifier = " is the best move after: ";
    } else {
        move = _globals.yourMove; 
        modifier = " is aa sub-optimal move after: ";   
    }
    window.open( url+move+modifier+pgn, '_blank' );
}

function getSessionCount(session) {
    let cnt = 0;
    const color = ["blue", "green","yellow","red"];
    Object.keys(session).forEach(key => {
        if( color.includes(key) )
            cnt += parseInt(session[key]);
    });
    return cnt;
}

function setSessionsTable() {
    const thead = document.querySelector("#sessionsTable thead");
    thead.innerHTML = '<tr><th>Results</th><th>Games</th></tr>';
        
    const tbody = document.querySelector("#sessionsTable tbody");
    tbody.innerHTML = "";
    _user.sessions.forEach(item => {
        setSessionRow(item, tbody);
    });
}

function setSessionRow(item, tbody) {
    const row = document.createElement("tr");
    const b= `<div class="resultsBar" style="width:100%" id=bar-${item.date}></div>`;
    const c= getSessionCount(item);
    if( c > 0 ) {
        row.innerHTML = `<td style="padding:8px 0px" >${b}</td><td>${c}</td>`;
        tbody.appendChild(row);
        showTotalsBar(item,`bar-${item.date}`);
    }
}

function setResultsTable(notation) {
    const data = _globals.peekSteps;
    let gradeId = "red";
    let bestPercent = 0;
    let gamesPlayed = data.reduce((sum, item) => sum + item.Count, 0);

    data.forEach(item => {
      item.Checked = item.Move == notation ? "&#x2705;" : "";
      const rawPercent = (item.Count / gamesPlayed) * 100;
      item.percent =
        rawPercent < 1 ? "<1" : Math.floor(rawPercent);
      bestPercent = data[0].percent;

      if( notation == item.Move) {
        if (item.percent == bestPercent)
            gradeId = "blue";
        else if (item.percent+5 > bestPercent)
            gradeId = "green";
        else if (item.percent > 5 )
            gradeId = "green";
        else
            gradeId = "yellow";
        }
    });
          
    const thead = document.querySelector("#resultTable thead");
    thead.innerHTML = `<tr><th></th><th>Move</th><th>Percentage of<br>${gamesPlayed} games</th></tr>`;
        
    const tbody = document.querySelector("#resultTable tbody");
    tbody.innerHTML = "";
        
    data.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.Checked}</td>
          <td>${item.Move}</td>
          <td>${item.percent}%</td>
        `;
        tbody.appendChild(row);
      });
    document.getElementById("copyPGN").value = _globals.PGN;

    show("messageBox","result-"+gradeId,"block");
    show("container-sb-body","sb-body-result","flex");
    
    // If user move is best trigger fireworks
    _globals.yourMove = notation;
    _globals.bestMove = _globals.peekSteps[0].Move

     if( _globals.bestMove == notation) {
        triggerFireworks();
    } else if( controlGet("showBestArrow") ) {
/*TBD unused        const moves = _globals.PGN
            .trim()
            .replace(/[.]/g, ' ')
            .split(/\s+/)
            .filter(item => {
                return item && !/^\d+$/.test(item);
            });
*/
        Board.createArrow();
    }
    console.log(`move: ${_globals.yourMove} grade:${gradeId} PGN:${_globals.PGN}`);
    return gradeId;
}


export function show(className, id, display) { 
    const elements = document.getElementsByClassName(className);

    for (let i = 0; i < elements.length; i++) {
        elements[i].style.display = 'none';
    }
    document.getElementById(id).style.display = display;
}

export function highlightCrown(crown) { 
    const elements = document.getElementsByClassName("crown-container");

    for (const e of elements) {
        if(e.id == `select-${crown}` )
            e.style.border = "var(--border-active)";
        else
            e.style.border = 'none';
    }
}


function copyPGN() {
  navigator.clipboard.writeText(_globals.PGN);
}

function pickColor(color){
    controlSet("preferColor", color);
    highlightCrown(color);
}

export function newGame() {
    const div = document.getElementById("splash");
    div.style.display = 'none';
    
    let moves = GameData.getOpening();
    show("container-sb-body","sb-body-playing","flex");

//TBD TESTING: moves = ['e4', ... ];
// castle,promote,enpassant tests
// moves=['e3','a5','Nf3','b5','Be2','c5','O-O','a4','b4','axb3','h3','bxa2','h4','axb1=r'];
// expaliner example "poisoned bishop"
// moves=['d4','Nf6','Bf4','d5','e3','c5','c3','Nc6','Nf3','Qb6','Qb3','c4','Qc2','Bf5']
    playMoves(moves);
}

function playMoves( moves) {
    // moves is an array not a PGN based string
    Board.initializeBoard();
    _globals.nextNode = 0;
    _globals.PGN = "";
    _globals.steps = [];
    for( const m of moves) {
        Board.playMove(m,false);
    }
}

function populateUserProfile() {
    // Hide login button, show image    
    const label = document.getElementById('menu-label');
    label.innerHTML = _user.idInfo.given_name;
    const img = document.getElementById('userAvatar');
    let pic = _user.idInfo.picture;
    img.src = pic;
    img.className = "avatar";
    img.alt = "Show personal history";
 
    img.addEventListener("click", () => {
        show("container-sb-body","sb-body-history","flex");
    });
}

// Save session when user leaves window
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState == 'hidden')  {
        _user.sessions[0]["date"] = Date.now();
        navigator.sendBeacon('/api/databaseItems', JSON.stringify( _user ));
    }
});

document.getElementById('ecoInput').addEventListener('input', (event) => {
    setCurrentEcoCode(event.target.value); });
  
document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
});
document.getElementById('select-random').addEventListener('click', () => {
    pickColor('random');
});
document.getElementById('select-black').addEventListener('click', () => {
    pickColor('black');
});
 
document.getElementById('bestMove').addEventListener('click', () => {
    explainMove("best");
});

document.getElementById('yourMove').addEventListener('click', () => {
    explainMove("yours" );
});

document.getElementById('copyPGN-btn').addEventListener('click', () => {
    copyPGN();
});

const buttons = document.querySelectorAll('.replay-button');
buttons.forEach(button => {
    if( button.dataset.state == controlGet("replay") ) {
        button.classList.add('active');
    }
    button.addEventListener('click', () => {
        const newState = button.dataset.state;
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        controlSet("replay", newState);
    });
});

let ctlr = document.getElementById('toggleSounds');
ctlr.checked = controlGet("playSounds");
ctlr.addEventListener('click', () => {
    controlSet("playSounds", !controlGet("playSounds"));
});

ctlr = document.getElementById('toggleHighlight');
ctlr.checked = controlGet("showHighlights");
ctlr.addEventListener('click', () => {
    controlSet("showHighlights", !controlGet("showHighlights"));
});

ctlr = document.getElementById('toggleArrows');
ctlr.checked = controlGet("showBestArrow");
ctlr.addEventListener('click', () => {
    controlSet("showBestArrow", !controlGet("showBestArrow"));
});


ctlr = document.getElementById('toggleTheme');
ctlr.checked = (controlGet("theme") === "modern");
ctlr.addEventListener('change', function() {
    const l = document.getElementById('themeLeftText');
    const r = document.getElementById('themeRightText');
    if(this.checked) {
        controlSet("theme", "modern");
        l.className = "textOff";
        r.className = "right-textOn";
    } else {
        controlSet("theme", "classic");
        l.className = "left-textOn";
        r.className = "textOff";
    }
    Board.initializeBoard();
});

document.addEventListener('keyup', (e) => {
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey)
        // prevent extra actions when trying to see console
        return;
    newGame();
});

function triggerFireworks() {
    confetti({ particleCount: 100,  spread: 70,
    origin: { y: 0.6 }
    });

    var duration = 3 * 1000;
    var animationEnd = Date.now() + duration;
    
    var interval = setInterval(function() {
        var timeLeft = animationEnd - Date.now();
    
        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        var particleCount = 50 * (timeLeft / duration);
        confetti({ particleCount, startVelocity: 30,
        spread: 360,
        origin: { x: Math.random(), y: Math.random() - 0.2 }
        });
        }, 250);
    }

// Two-header slider for picking number of moves played
const minSlider = document.getElementById('min-slider');
minSlider.addEventListener('input', updateSlider);
const maxSlider = document.getElementById('max-slider');
maxSlider.addEventListener('input', updateSlider);
const minHeader = document.getElementById('min-header');
const maxHeader = document.getElementById('max-header');
const progressBar = document.getElementById('progress-bar');
const minVal = parseInt(minSlider.min);
const maxVal = parseInt(maxSlider.max);

// Function to update the slider and headers
function updateSlider() {
    let val1 = parseInt(minSlider.value);
    let val2 = parseInt(maxSlider.value);

    // Ensure val1 is always less than or equal to val2 for correct display
    if (val1 > val2) {
        [val1, val2] = [val2, val1];
    }

    minHeader.textContent = val1;
    maxHeader.textContent = val2;
    controlSet("minimumTurns", val1);
    controlSet("maximumTurns", val2);

    // Calculate percentage for progress bar positioning
    const minPercent = ((val1 - minVal) / (maxVal - minVal)) * 100;
    const maxPercent = ((val2 - minVal) / (maxVal - minVal)) * 100;

    progressBar.style.left = minPercent + '%';
    progressBar.style.right = (100 - maxPercent) + '%';
}

// -------------------- ECO input -----------------

async function loadEcoOpenings() {
    try {
        const response = await fetch('data/eco-list.json');
        _globals.ecoOpenings = await response.json();
        
        console.log(`Loaded ${_globals.ecoOpenings.length} openings`);
        return;
        
    } catch (error) {
        console.error('Error loading openings:', error);
        return;
    }
}

function setCurrentEcoCode(code) {
    code = code.toUpperCase()
    const pattern = /^[A-E]\d{2}$/;
    
    _globals.ecoMoves = [];
    if( ! pattern.test(code) ) {
        _globals.ecoMoves = [];
        return;
    }
        
    controlSet("ecoCode", code);
    _globals.nextNode = 0;
    const eco = _globals.ecoOpenings.find(opening => opening.eco === code);
    
    let moves = eco['moves']
        .trim()
        .replace(/[.]/g, ' ')
        .split(/\s+/)
        .filter(item => {
            return item && !/^\d+/.test(item);
        });
    moves.forEach(move => {
        _globals.ecoMoves.push(move);
        GameData.incrementNode(move);
    });

    displayGamesCount(_globals.nextNode);
}

function peekCount(node = 0) {
    GameData.setPeekSteps(node);
    const data = _globals.peekSteps;
    return data.reduce((sum, item) => sum + item.Count, 0);
}

export function displayGamesCount(node = 0) {
    let cnt = peekCount(node);
    let label = document.getElementById( "gamesCount");
    label.innerHTML = `${cnt.toLocaleString()} games available`;
}

/* ----- Results bar -----*/
function showTotalsBar(results, barId) {
    const total = getSessionCount(results);

    const bar = document.getElementById(barId);
    bar.innerHTML = '';
    Object.entries(results).forEach(([color, value]) => {
        if( color == "date" ) return;
        if (value > 0) {
            const percentage = (value / total) * 100;
            
            const segment = document.createElement('div');
            segment.className = 'resultsSegment';
            segment.style.backgroundColor = color;
            if( color == "yellow" )
                segment.style.color = "black";
            segment.style.width = percentage + '%';
            segment.textContent = value;
            segment.title = `${color}: ${value} (${percentage.toFixed(1)}%)`;
            bar.appendChild(segment);
        }
    });
}

/* ---------------------- Styled dropdown ----------------------*/
 // ── Data ──────────────────────────────────────────────
  const mainConfig = {
    height: '60px',
    trigger: { avatarURL: 'images/bk.png', name: 'Anonymous' },
    gridItems: [
      { label: 'Game controls',  action: 'controls' },
      { label: 'New Game',       action: 'newGame' },
      { label: 'History',        action: 'history' },
      { label: 'Clear misses',   action: 'clearMissed', badge:  _user.missed.length },
      { label: 'Last result',    action: 'result' },
      { label: 'Delete sessions', action: 'delHistory', badge:  _user.sessions.length },
      { label: 'Info/Feedback',  action: 'info' },
      { label: 'Save session',   action: 'save' },
    ],
    footerItems: [
      { label: 'Sign in/out',   action: 'toggleLogin', variant: 'danger' },
        ],
  };

   const openingsConfig = {
    height: '30px',
    trigger: { name: 'Select popular openings' },
    gridItems: [],
    footerItems: [
        { label: "*** All Openings ***", action: 'openALL', badge: "" },
        { label: "Caro-Kann", action: 'openB10', badge: "B10" },
        { label: "Catalan", action: 'openE00', badge: "E00" },
        { label: "King's Gambit", action: 'openC30', badge: "C30" },
        { label: "Indian Defense", action: 'openA45', badge: "A45" },
        { label: "Queen's Gambit Accepted", action: 'openD20', badge: "D20" },
        { label: "Queen's Gambit Declined", action: 'openD30', badge: "D30" },
        { label: "Ruy Lopez", action: 'openC60', badge: "C60" },
        { label: "Sicilian", action: 'openB20', badge: "B20" },
        { label: "Slav", action: 'openD10', badge: "D10" },
        { label: "Vienna", action: 'openC25', badge: "C25" }
        ],
  };
  // ── Actions ───────────────────────────────────────────
  const actions = {
    controls:    () => show("container-sb-body","sb-body-settings","flex"),
    history:     () => show("container-sb-body","sb-body-history","flex"),
    result:      () => show("container-sb-body","sb-body-result","flex"),
    info:        () => First10.showInfoWindow('info'),
    newGame:     () => newGame(),
    clearMissed: () => { _user.missed = []; userSave(0); },
    delHistory:  () => { _user.sessions = [newSession]; _user.missed = []; userSave(0); },
    save:        () => userSave(0),
    toggleLogin:  () => toggleUserState(),

    openALL:    () => setCurrentEcoCode("*"),
    openB10:    () => setCurrentEcoCode("B10"),
    openE00:    () => setCurrentEcoCode("E00"),
    openC30:    () => setCurrentEcoCode("C30"),
    openA45:    () => setCurrentEcoCode("A45"),
    openD20:    () => setCurrentEcoCode("D20"),
    openD30:    () => setCurrentEcoCode("D30"),
    openC60:    () => setCurrentEcoCode("C60"),
    openB20:    () => setCurrentEcoCode("B20"),
    openD10:    () => setCurrentEcoCode("D10"),
    openC25:    () => setCurrentEcoCode("C25"),
  };

  // ── Builders ──────────────────────────────────────────
  function buildTrigger({ avatarURL, name }) {
    const btn = document.createElement('button');
    btn.className = 'dropdown-trigger';

    if( avatarURL ) {
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.id = `userAvatar`;
        avatar.setAttribute("src", avatarURL);
        btn.append(avatar);
    }
    const label = document.createElement('span');
    label.id = "menu-label";
    label.textContent = name;

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.textContent = '▼';

    btn.append(label, chevron);
    return btn;
  }

  function buildMenuItem({ label, action, variant, badge }) {
    const el = document.createElement('div');
    el.className = 'menu-item' + (variant ? ` ${variant}` : '');
    el.dataset.action = action;
    el.id = "menu-" + action;
    el.textContent = label;

    if (badge) {
      const b = document.createElement('span');
      b.className = 'item-badge';
      b.textContent = badge+'';
      el.appendChild(b);
    }

    el.addEventListener('click', () => pick(el));
    return el;
  }

  function buildMenu({ gridItems, footerItems }) {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';

     if( gridItems.length != 0 ) {
        // 2-column grid section
        const grid = document.createElement('div');
        grid.className = 'menu-grid';
        gridItems.forEach(item => grid.appendChild(buildMenuItem(item)));
        menu.appendChild(grid);

        // divider
        const divider = document.createElement('div');
        divider.className = 'menu-divider';
        menu.appendChild(divider);
    }

    // full-width footer items
    const single = document.createElement('div');
    single.className = 'menu-single';
    footerItems.forEach(item => single.appendChild(buildMenuItem(item)));
    menu.appendChild(single);

    return menu;
  }

  function buildDropdown(config) {
    const wrapper = document.createElement('div');
    wrapper.className = 'dropdown';
    wrapper.id = 'dd';
    wrapper.style.height = config.height;

    const trigger = buildTrigger(config.trigger);
    const menu = buildMenu(config);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      wrapper.classList.toggle('open');
    });

    wrapper.append(trigger, menu);
    return wrapper;
  }

  // ── Pick handler ──────────────────────────────────────
  function pick(el) {
    el.closest('.dropdown').classList.remove('open');
    const fn = actions[el.dataset.action];
    if (fn) fn();
  }

  // ── Close on outside click / Escape ───────────────────
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
    }
  });

  // ── Add Sidebar dropdown ─────────────────────────────────────────────
  document.getElementById('sb-header').appendChild(buildDropdown(mainConfig));
  document.getElementById('opening-names-menu').appendChild(buildDropdown(openingsConfig));
