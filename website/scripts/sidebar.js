// Globals
import { _globals } from './first10.js';

import * as GameData from './gameData.js';
import * as Board from './board.js';
import * as First10 from './first10.js';
        
export function init() {
     populateUserProfile();
     
     // Start by showing the newgame options
    pickColor('random');
    updateSlider();
    loadChessOpenings();

    minSlider.addEventListener('input', updateSlider);
    maxSlider.addEventListener('input', updateSlider);

    show("container-sb-body","sb-body-settings","flex");
 }

let gamesPlayed = 0;
let gradeColors = {"best":"Blue", "good":"Green",
"ok":"Green", "unpopular":"Yellow", "unseen":"Red"};
let sessionResults = {"blue":0, "green":0, "yellow":0, "red":0};
let sessionHistory = [];
let yourMove = "";
let bestMove = "";

export function recordResult(notation){
    let grade = setResultsTable(notation);
    sessionResults[grade] += 1;
    let a = { "${_globals.PGN}": grade };
    sessionHistory.push(a);
    showTotalsBar();
 }

function explainMove( mode ) {
    // Drop user move from game PGN
    const last = _globals.PGN.lastIndexOf(' '); 
    const pgn = _globals.PGN.substring(0, last);

    
    let url = "https://www.google.com/search?q=explain why move ";
    let move = "";
    let modifier = "";
    if( mode == "best" ) {
        move = bestMove; 
        modifier = " is the best move after: ";
    } else {
        move = yourMove; 
        modifier = " is aa sub-optimal move after: ";   
    }
    window.open( url+move+modifier+pgn, '_blank' );
}


function addToSession(grade, pgn) {
    updateSidebarSession(grade);
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
    
    _globals.bestMove = _globals.peekSteps[0].Move
    if(notation == _globals.bestMove) {
        triggerFireworks();
    }
    yourMove = notation;

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
  navigator.clipboard.writeText(_globals.PGN).then(() => {
    alert("PGN copied!");
  });
}

function pickColor(color){
    _globals.preferColor = color;
    highlightCrown(color);
}

function newGame() {
    const div = document.getElementById("splash");
    div.style.display = 'none';
    
    let moves = GameData.getOpening();

//TBD TESTING let moves = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'e5', 'Nf3', 'Nbd7', 'Bc4', 'Be7', 'O-O', 'O-O'];

    Board.initializeBoard();
    _globals.nextNode = 0;
    _globals.PGN = "";
    _globals.steps = [];
    for( const m of moves) {
        Board.playMove(m,false);
    }
}

function populateUserProfile() {
    // Hidden login, show profile
    const loginDiv = document.getElementById('loginDiv');
    loginDiv.style.display = "none";
    
    const img = document.getElementById('profileImage');
    img.style.display = "block";
    
    const imageUrl = _globals.user["pictureurl"];
    img.src = imageUrl;
    img.class = "profileImage";
    img.alt = "Show personal history";
   
    img.addEventListener('load', () => {
        console.log('Image loaded successfully');
    });

    img.addEventListener('error', (e) => {
        console.error('Image failed to load:', imageUrl, e);
    });
    
    img.addEventListener("click", () => {
        show("container-sb-body","sb-body-profile","flex");
    });
}

  
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
 
document.getElementById('splash-button').addEventListener('click', () => {
    First10.openingActions();
});
 


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
    newGame();
});

document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
});
document.getElementById('toggleReplayGames').addEventListener('click', () => {
    _globals.replayGames = !_globals.replayGames;
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
    const url = 'data/opening-names-eco.json';

    try {
        const response = await fetch(url);
        const data = await response.json();

        data.forEach(obj => {
            const [name, code] = Object.entries(obj)[0];

            // Create a new option element
            const option = document.createElement('option');
            option.text = name;   // e.g., "Caro-Kann"
            option.value = code;  // e.g., "B10-B19"
            
            dropdown.add(option);
        });
    } catch (error) {
        console.error('Error fetching chess data:', error);
    }
    dropdown.addEventListener('change', function() {
        const ecoCode = this.value;
        const ecoName = this.options[this.selectedIndex].text;
    
        if (selectedCode) {
            handleNameSelection(ecoName, ecoCode);
        }
    });
}

function handleNameSelection(name, code) {
    console.log(`User selected: ${name} with code range: ${code}`);
    
    // TBD 
    if (name === "Random") {
        alert("Choosing a random opening...");
    }
}

function explainWithGoogle() {
    const query = "why is " + bestMove + " the best move after " + _globals.PGN;

    const url = 'https://www.google.com/search?q=' + encodeURIComponent(query);

    // Open the new window/tab
    window.open(url, '_blank');
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
    const ecoInput = document.getElementById('ecoInput');
    ecoInput.addEventListener('input', updateValidation);

    function validateInput(value) {
      const pattern = /^[A-Ea-e]\d{2}$/;
      return pattern.test(value);
    }

    function updateValidation() {
      const value = ecoInput.value;
      
      if( (value === '') || validateInput(value)) {
        _eco.selected = value;
        }
    }

/* TBD
    input.addEventListener('blur', updateValidation);

    // Initial validation
    updateValidation();
*/
export function displayGamesCount(node = 0) {
    GameData.setPeekSteps(0);
    const data = _globals.peekSteps;
    let cnt = data.reduce((sum, item) => sum + item.Count, 0);
    let label = document.getElementById( "gamesCount");
    label.innerHTML = `${cnt.toLocaleString()} games available`;
    
/*
    data.forEach(opening => {
      console.log(`${opening.eco}: ${opening.name}`);
      console.log(`Moves: ${opening.moves}`);
    });
    
    // Example: Find a specific opening by ECO code
    const a12 = data.find(opening => opening.eco === 'A12');
    console.log(a12);
    
    // Example: Filter by name
    const englishOpenings = data.filter(opening => 
      opening.name.includes('English')
    );
    console.log(englishOpenings);
*/
}

/* ----- Results bar -----*/
function showTotalsBar() {
    const total = Object.values(sessionResults).reduce((sum, val) => sum + val, 0);

    const bar = document.getElementById('resultsBar');
    bar.innerHTML = '';
    Object.entries(sessionResults).forEach(([color, value]) => {
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
