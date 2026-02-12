// Globals
import { _globals, _user } from './first10.js';

import * as GameData from './gameData.js';
import * as Board from './board.js';
import * as First10 from './first10.js';
        
export function init() {
     populateUserProfile();
     
     // Start by showing the newgame options
    pickColor('random');
    updateSlider();
    loadEcoOpenings();
    loadChessOpenings();
    setSessionsTable();

    minSlider.addEventListener('input', updateSlider);
    maxSlider.addEventListener('input', updateSlider);

    show("container-sb-body","sb-body-settings","flex");
 }

let gamesPlayed = 0;
let gradeColors = {"best":"Blue", "good":"Green",
"ok":"Green", "irregular":"Yellow", "miss":"Red"};
let sessionResults = {"blue":0, "green":0, "yellow":0, "red":0};

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
    const best = bestMove();

     if( best == notation) {
        triggerFireworks();
    } else if( _globals.showBestArrow ) {
        const moves = _globals.PGN
            .trim()
            .replace(/[.]/g, ' ')
            .split(/\s+/)
            .filter(item => {
                return item && !/^\d+$/.test(item);
            });

        playMoves(moves);
        _globals.bestMove = best;
        const sq = Board.findBestMove();
        createArrow( sq[0], sq[1] );
    }
    return gradeId;
}

/* -------------- Move Arrow ----------------  */
function getSquareCenter(sq) {
    const element = document.getElementById(sq);
    const rect = element.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return [centerX,centerY];
}

function createArrow( headSq, tailSq ) {
  const container = document.getElementById("board");

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'arrow');
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';

  const [x1,y1] = getSquareCenter(headSq);
  const [x2,y2] = getSquareCenter(tailSq);
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.sqrt(dx * dx + dy * dy);

  // Create line
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('class', 'arrow-line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);

  // Create arrowhead
  const headLength = 25;
  const headWidth = 20;
  
// Shorten the line so arrowhead base aligns with endpoint
  const adjustedX2 = x2 - headLength * Math.cos(angle);
  const adjustedY2 = y2 - headLength * Math.sin(angle);
  
  line.setAttribute('x2', adjustedX2);
  line.setAttribute('y2', adjustedY2);

const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  arrowHead.setAttribute('class', 'arrow-head');
  
  // Calculate arrowhead points
  const p1x = x2;
  const p1y = y2;
  const p2x = x2 - headLength * Math.cos(angle) - headWidth * Math.sin(angle);
  const p2y = y2 - headLength * Math.sin(angle) + headWidth * Math.cos(angle);
  const p3x = x2 - headLength * Math.cos(angle) + headWidth * Math.sin(angle);
  const p3y = y2 - headLength * Math.sin(angle) - headWidth * Math.cos(angle);
  
  arrowHead.setAttribute('points', `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`);

  svg.appendChild(line);
  svg.appendChild(arrowHead);
  container.appendChild(svg);
  
  return svg;
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
    _globals.preferColor = color;
    highlightCrown(color);
}

function newGame() {
    const div = document.getElementById("splash");
    div.style.display = 'none';
    
    let moves = GameData.getOpening();

//TBD TESTING: moves = ['e4', ... ];
// bad arrow when playing Ne3    
//    moves=['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Bc4','Ngf6'];
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
    // Hide login, show profile
    const loginDiv = document.getElementById('loginDiv');
    loginDiv.style.display = "none";
    
    const img = document.getElementById('profileImage');
    img.style.display = "block";
    
    img.src = _user["idInfo"]["picture"];
    img.class = "profileImage";
    img.alt = "Show personal history";
   
    img.addEventListener('load', () => {
        console.log('Image loaded successfully');
    });

    img.addEventListener('error', (e) => {
        console.error('Image failed to load:', img.src, e);
    });
    
    img.addEventListener("click", () => {
        show("container-sb-body","sb-body-profile","flex");
    });
}

// Save session when user leaves window
document.addEventListener('visibilitychange', function () {
    if (document.visibilityState == 'hidden')  {
        let s = sessionResults;
        s["date"] = Date.now();
        _user.sessions.push(s);
        navigator.sendBeacon('/v1/databaseItems', JSON.stringify( _user.sessions ));
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
 
document.getElementById('splash-button').addEventListener('click', () => { First10.openingActions(); });
 
document.getElementById('loginDiv').addEventListener('click', () => {
    if( _globals.userCookie ==  "" )
        First10.showGoogleSigninButton()
   else
        show("container-sb-body","sb-body-result","flex");

});
document.getElementById('settingsBtn').addEventListener('click', () => {
    show("container-sb-body","sb-body-settings","flex");
});
document.getElementById('newGameBtn').addEventListener('click', () => {
    show("container-sb-body","sb-body-playing","flex");
    newGame();
});

document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
});

const buttons = document.querySelectorAll('.replay-button');
buttons.forEach(button => {
  button.addEventListener('click', () => {
      const newState = button.dataset.state;
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      _globals.Replay = newState;
  });
});

document.getElementById('toggleSounds').addEventListener('click', () => {
    _globals.playSounds = !_globals.playSounds;
});
document.getElementById('toggleHighlight').addEventListener('click', () => {
    _globals.showHighlights = !_globals.showHighlights;
});
document.getElementById('toggleArrows').addEventListener('click', () => {
    _globals.showBestArrow = !_globals.showBestArrow;
});
document.getElementById('themeToggle').addEventListener('change', function() {
    const l = document.getElementById('themeLeftText');
    const r = document.getElementById('themeRightText');
    if(this.checked) {
        _globals.boardTheme = "Modern";
        l.className = "textOff";
        r.className = "right-textOn";
    } else {
        _globals.boardTheme = "Classic";
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

function handleCodeSelection(code) {
    
    if ( count == 0) {
        alert("No ECO(${code}) based games in dataset");
        _globals.ecoMoves = [];
    }
}

function explainWithGoogle() {
    const query = "why is " + _globals.bestMove + " the best move after " + _globals.PGN;

    const url = 'https://www.google.com/search?q=' + encodeURIComponent(query);

    // Open the new window/tab
    window.open(url, '_blank');
}

function bestMove() {
    _globals.bestMove = _globals.peekSteps[0].Move
    return _globals.bestMove;
}

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
const maxSlider = document.getElementById('max-slider');
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
    _globals.maximumTurns = val2;
    _globals.minimumTurns = val1;

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
        
    _globals.ecoCode = code;
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

export function displayGamesCount(node = 0) {
    GameData.setPeekSteps(node);
    const data = _globals.peekSteps;
    let cnt = data.reduce((sum, item) => sum + item.Count, 0);
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
