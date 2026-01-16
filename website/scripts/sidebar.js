// Globals
import { _globals } from './first10.js';

import * as GameData from './gameData.js';
import * as Board from './board.js';
import * as First10 from './first10.js';
        
 export function init() {
    // Start by showing the newgame options
    pickColor("random");
    updateSlider();

    minSlider.addEventListener('input', updateSlider);
    maxSlider.addEventListener('input', updateSlider);

    show("container-sb-middle","sb-body-settings","flex");
 }

let gamesPlayed = 0;
let gradeColors = {"best":"Blue", "good":"Green",
"ok":"Green", "unpopular":"Yellow", "unseen":"Red"};

export function setResultsTable(notation) {
    const data = _globals.peekSteps;
    let gradeId = "resultRed";
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
            gradeId = "resultBlue";
        else if (item.percent+5 > bestPercent)
            gradeId = "resultGreen";
        else if (item.percent > 5 )
            gradeId = "resultGreen";
        else
            gradeId = "resultYellow";
        }
    });
          
    const thead = document.querySelector("#resultTable thead");
    thead.innerHTML = `<tr><th></th><th>Move</th><th>Percentage of<br>${gamesPlayed*3} games</th></tr>`;
        
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

    show("messageBox",gradeId,"block");
    show("container-sb-middle","sb-body-result","flex");
        
    if(notation == _globals.peekSteps[0].Move) {
        triggerFireworks();
    }
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
            e.style.border = "4px solid var(--color-yellow-muted)";
        else
            e.style.border = 'none';
    }
}


function copyPGN() {
  const input = _globals.PGN;
  navigator.clipboard.writeText(input.value).then(() => {
    alert("Copied!");
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

  
document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
});
document.getElementById('select-random').addEventListener('click', () => {
    pickColor('random');
});
document.getElementById('select-black').addEventListener('click', () => {
    pickColor('black');
});
 
document.getElementById('copyPGN-btn').addEventListener('click', () => {
    copyPGN();
});
 


document.getElementById('profileBtn').addEventListener('click', () => {
    show("container-sb-middle","sb-body-result","flex");
    if( _globals.userCookie ==  "" )
        First10.showGoogleSigninButton()
});
document.getElementById('settingsBtn').addEventListener('click', () => {
    show("container-sb-middle","sb-body-settings","flex");
});

document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
});
document.getElementById('newGameBtn').addEventListener('click', () => {
    show("container-sb-middle","sb-body-playing","flex");
    newGame(); // Start a new game
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


