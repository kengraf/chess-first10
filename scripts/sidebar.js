// Globals
import * as GameData from './gameData.js';
import * as Board from './board.js';
        
  
function newGame() {
    const div = document.getElementById("splash");
    div.style.display = 'none';
    
    Board.resetPieces();
    const moves = GameData.getOpening();

    for( const m of moves) {
        Board.playMove(m);
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

document.getElementById('profileBtn').addEventListener('click', () => {
    showProfle(); // Show profile or force login
});
document.getElementById('select-white').addEventListener('click', () => {
    pickColor('white');
});
document.getElementById('newGameBtn').addEventListener('click', () => {
    newGame(); // Start a new game
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    showSettings(); // Show possible settings in sidebar
});
