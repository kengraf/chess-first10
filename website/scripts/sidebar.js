// Globals
import { _globals } from './first10.js';

import * as GameData from './gameData.js';
import * as Board from './board.js';
import * as First10 from './first10.js'

const userDefaults = {};

userDefaults.controls = {
        "preferColor": "random",
        "minimumTurns": 1,
        "maximumTurns": 10,
        "ecoCode": "",
        "showBestArrow": false,
        "playSounds": false,
        "replay": "never",
        "showHighlights": false,
        "theme": "classic",
        "animation": false	//TBD fix
    };
userDefaults.idInfo = {"sub":"", picture:"/images/bk.png"};
userDefaults.sessions = [];
userDefaults.missed = [];
export let _user = userDefaults;

export function init() {
     populateUserProfile();
     
     // Start by showing the newgame options
    pickColor(controlGet("preferColor"));
    updateSlider();
    loadEcoOpenings();
    loadChessOpenings();
    setSessionsTable();
    setCurrentEcoCode(controlGet("ecoCode"));

    show("container-sb-body","sb-body-settings","flex");
 }

let gamesPlayed = 0;
let sessionResults = {"blue":0, "green":0, "yellow":0, "red":0};

export function setUser(data = userDefaults) {
    if( ! data.hasOwnProperty("sessions") ) data['sessions'] = [];
    if( ! data.hasOwnProperty("missed") ) data['missed'] = [];
    if( ! data.hasOwnProperty("controls") ) data['controls'] = userDefaults.controls;
    if( ! data.hasOwnProperty("idInfo") ) data['idInfo'] = userDefaults.idInfo;
    _user = data;
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
    const hasAuth = _globals.isAuthenicated;
    const el = document.getElementById('menu-toggleLogin');
    if( hasAuth ) {
        // Go back to anonymous
        setUser();
        el.textContent = "Sign in";
     } else {
        el.textContent = "Sign out";
     }
    _globals.isAuthenicated = !hasAuth;
}

let saveIsQueued = false;
export function userSave(delay = 5*60*1000) {
    if( saveIsQueued ) {
        return;
    }
    saveIsQueued = true;
    const saveUser = _user;  // Don't alter current state
    const s = sessionResults;
    s["date"] = Date.now();
    _user.sessions.push(s);
    saveUser.sessions.push(s);
    console.log(saveUser);
    setTimeout(async () => {
      const response = await fetch('/v1/databaseItems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveUser)
        });
    const data = await response.json();
    saveIsQueued = false;
    }, delay);
}

export function recordResult(notation){
    let grade = setResultsTable(notation);
    sessionResults[grade] += 1;
    if( grade == "red" ) {
        if (!_user['missed'].includes(_globals.PGN)) {
            _user['missed'].push(_globals.PGN);
        }    
    }
    showTotalsBar(sessionResults, "resultsBar");
    setSessionsTable();
}

function explainMove( mode ) {
    const pgn = _globals.PGN;
    const url = "https://www.google.com/search?q=explain why move ";
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


function addToSession(grade, pgn) {
    updateSidebarSession(grade);
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
        
    setSessionRow(sessionResults, tbody);
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
    gamesPlayed = data.reduce((sum, item) => sum + item.Count, 0);

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
        const moves = _globals.PGN
            .trim()
            .replace(/[.]/g, ' ')
            .split(/\s+/)
            .filter(item => {
                return item && !/^\d+$/.test(item);
            });

        Board.createArrow();
    }
    console.log('move: ${_globals.yourMove} grade:${gradeId} PGN:${_globals.PGN}');
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
            e.style.border = "4px solid var(--color-yellow-vibrant)";
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
    const img = document.getElementById('userAvatar');
    let pic = (_user["idInfo"] && _user["idInfo"]["picture"]) ? _user["idInfo"]["picture"] : "images/bk.png";
    img.src = pic;
    img.class = "userAvatar";
    img.alt = "Show personal history";
   
    img.addEventListener('load', () => {
        console.log('Image loaded successfully');
    });

    img.addEventListener('error', (e) => {
        console.error('Image failed to load:', img.src, e);
    });
    
    img.addEventListener("click", () => {
        show("container-sb-body","sb-body-history","flex");
    });
}

// Save session when user leaves window
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState == 'hidden')  {
        let s = sessionResults;
        s["date"] = Date.now();
        _user.sessions.push(s);
        navigator.sendBeacon('/v1/databaseItems', JSON.stringify( _user ));
    }
});

document.getElementById('ecoInput').addEventListener('input', () => { setCurrentEcoCode(event.target.value); });
  
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

document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
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
ctlr.checked = controlGet("showArrows");
ctlr.addEventListener('click', () => {
    controlSet("showArrows", !controlGet("showArrows"));
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

async function loadChessOpenings() {
    const dropdown = document.getElementById('opening-names-dropdown');
    const allOption = document.createElement('option');
    allOption.text = "*** all openings ***";
    allOption.value = "*";
    dropdown.add(allOption);
    const url = 'data/opening-names-eco.json';

    try {
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(obj => {
            const [name, code] = Object.entries(obj)[0];

            // Create a new option element
            const option = document.createElement('option');
            option.text = name;   // e.g., "Caro-Kann"
            option.value = code;  // e.g., "B10"
            
            dropdown.add(option);
        });
    } catch (error) {
        console.error('Error fetching chess data:', error);
    }
    dropdown.addEventListener('change', function() {
        const ecoCode = this.value;
    
        if (ecoCode) {
            setCurrentEcoCode(ecoCode);
        }
    });
}

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
    code.toUpperCase()
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
  const config = {
    trigger: { avatarURL: 'images/bk.png', name: 'anonymous' },

    // 2-column grid items
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

    // full-width items below divider
    footerItems: [
      { label: 'Sign in',       action: 'toggleLogin', variant: 'danger' },
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
    delHistory:  () => { _user.sessions = _user.missed = []; userSave(0); },
    save:        () => userSave(0),
    toggleLogin:  () => toggleUserState(),
  };

  // ── Builders ──────────────────────────────────────────
  function buildTrigger({ avatarURL, name }) {
    const btn = document.createElement('button');
    btn.className = 'dropdown-trigger';

    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.id = `userAvatar`;
    avatar.setAttribute("src", avatarURL);
  
    const label = document.createElement('span');
    label.textContent = name;

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.textContent = '▼';

    btn.append(avatar, label, chevron);
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

    // 2-column grid section
    const grid = document.createElement('div');
    grid.className = 'menu-grid';
    gridItems.forEach(item => grid.appendChild(buildMenuItem(item)));
    menu.appendChild(grid);

    // divider
    const divider = document.createElement('div');
    divider.className = 'menu-divider';
    menu.appendChild(divider);

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
  document.getElementById('sb-header').appendChild(buildDropdown(config));
