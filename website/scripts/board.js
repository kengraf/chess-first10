import { _globals } from './first10.js';

import * as GameData from './gameData.js';
import * as Sidebar from './sidebar.js'

import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm';
let chess = new Chess();

export function playMove(notation,isUserMove) {
    if( notation == null ) return;

    _currentMove = chess.move(notation);
    if( !_currentMove ) {
        console.log( `Bad move notation: ${notation}` );
        return;
    }

/* TBD: enable animation
    _move.delay = 2;
    if( _move.delay ) 
        await sleep( _move.delay * 1000 );
*/
    GameData.updateNode(notation,isUserMove);
    if( isUserMove ) {
        Sidebar.recordResult(notation);
    }
    console.log(`move: ${JSON.stringify(_currentMove)}`);
    drawCurrentMove();
    return;
}


// To make the ascii string notation to matrix work easier
let _fileToX = { a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7 };  // _fileToX["c"] = 2
let _rankToY = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:7 };  // _rankToY[5] = 4
let _boardFiles ='abcdefgh';  // Reverse when flipped
let _boardRanks = '87654321'; 
let _flipped = false;
let _positiveMove = false;
let _squareSize = 60;

//v2 this will replace _move
let _currentMove = {};
/*
color: 'w' or 'b'.
piece: 'p', 'n', 'b', 'r', 'q', or 'k'.
from: 'e2'.
to: 'e4'.
san: Standard Algebraic Notation ('Bxh7+', 'O-O').
flags: A string containing flags.
        'n': a normal move
        'b': a two-square pawn push
        'e': an en passant capture
        'c': a capture
        'p': a promotion
        'k': a kingside castle
        'q': a queenside castle
lan:  (e.g., 'e2e4').
before: FEN before the move was made.
after: FEN after the move was made.
captured: Piece type captured, can be absent.
promotion: Promoted iece type, can be absent.
*/

// ------------- helper/utility functions --------------

function index2alpha( file, rank ) {
    if( _flipped )
        return( "hgfedcba"[file] + "87654321"[rank] );
    else
        return( "abcdefgh"[file] + "12345678"[rank] );
}

function index2node( file, rank ) {
    return document.getElementById(index2alpha(file,rank));
}

function alpha2index( sq ) {
   let x = sq[0].charCodeAt(0)-'a'.charCodeAt(0);
   let y = sq[1].charCodeAt(0)-'1'.charCodeAt(0);
   if( _flipped ) {
        x = "76543210"[x];
        y = "76543210"[y];
    } else {
        x = "01234567"[x];
        y = "76543210"[y];
    }
    return [x,y];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ------------ browser interactions ----------------
let _activePiece = null; // type of _move not node

function dropEvent(e) {
    if( _activePiece == null ) {
        _audioResult = _audioIllegal;
        return null;
    }
    return validateMove(e.currentTarget);
}

function clickEvent(e) {
    _audioResult = null;
    if( _activePiece ) {
        // Second click is an attempted or aborted move
        return validateMove(e.currentTarget);
    } else {
        // set the startSquare
        if( isSquareOccupied(e.currentTarget) ) {
            _activePiece = pickedValidPiece( e.currentTarget );
            if( _activePiece ) {
                // Highlight the parent of the piece image
               highlightSquare( e.currentTarget, "click-overlay" );
               showPossibles( _activePiece );
               return null;
            }
        } else {
            Sidebar.newGame();
        }
    }
    _audioResult = _audioIllegal;
    return null;
}

function isSquareOccupied(node, className = "piece" ) {
    if( node.className != className )
        node = node.querySelector(`.${className}`);
    return (node != null);
}

function validateMove(node) {
     let from = _activePiece;
    let to = node.id;
    let possibles = chess.moves({square:from, verbose:true});
    for( const p of possibles)
        if( p.to == to) {
            resetClickDrag();
            return p.san;
        }
    _audioResult = _audioIllegal;
    return null;
}

function pickedValidPiece(node) {
    if( !isSquareOccupied(node) ) {
        // Clicked an unoccupied square
        return null;
    }
    if( node.className != 'piece' )
        node = node.querySelector('.piece');
    let piece = node.getAttribute('data-group');
    if( piece == null ) {
        // Empty square
        return null;
    }
    if( chess.turn() != piece[0]) {
        // Wrong color piece
        return null;
    } 
    return node.parentElement.id;
}

// ------------ piece location and placement -----------
function showPossibles( sq ) {
    const squares = chess.moves({square:sq,verbose:true});
    for( const s of squares ) {
        let cell = document.getElementById(s.to);
        highlightSquare( cell, "probe-overlay" );
    }
}

/* -------------- Move Arrow ----------------  */
function getSquareCenter(sq) {
    const element = document.getElementById(sq);
    const rect = element.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return [centerX,centerY];
}

export function createArrow() {
    const arrowSan = _globals.bestMove;
    chess.undo();  // Undo the user's move
    const bestMove = chess.move(arrowSan);

    const headSq = bestMove.to;
    const tailSq = bestMove.from;
    const container = document.getElementById("main-container");

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'arrow');
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';

  const [x1,y1] = getSquareCenter(tailSq);
  const [x2,y2] = getSquareCenter(headSq);
  
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

// ------------------ Move Functions --------------------
function animateElement(element, keyframes, options) {
    return new Promise((resolve) => {
        const animation = element.animate(keyframes, options);
        animation.onfinish = resolve;
    });
}

export function resetPieces( fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" ) {
    // FEN notation for initial board setup
    const parts = fen.split(" ");

    _globals.nextNode = 0;
    _globals.PGN = "";
    _globals.steps = [];

    chess.load(fen);

    const fenRanks = parts[0].split("/");
    if (fenRanks.length != 8) {
        console.log(`Invalid FEN:${fen}`);
        return;
        }
    
    // Go thru the ranks 8 to 1
    for (let rank = 7; rank >= 0; rank--) {
        let fileIndex = 0;
        for (const p of fenRanks[7-rank]) {
            if ('prnbqkPRNBQK'.includes(p)) {
                // FEN syntax white pieces are uppercase
                let lowPiece = p.toLowerCase();
                let piece = "";
                if (p == lowPiece) {
                    piece = "b" + p;
                }
                else {
                    piece = "w" + lowPiece;
                }
                pieceAdd(piece, `${"abcdefgh"[fileIndex]}${rank+1}` );
                fileIndex++;
            } else if(_boardRanks.includes(p)) {
                // skips empty squares
                fileIndex += parseInt(p, 10);
            }
        }
    }
}

function setRanksFiles() {
    if( _flipped ) {
        _fileToX = { a:7, b:6, c:5, d:4, e:3, f:2, g:1, h:0 };
        _rankToY = { 1:7, 2:6, 3:5, 4:4, 5:3, 6:2, 7:1, 8:0 };
        _boardFiles = 'hgfedcba';
        _boardRanks = '12345678';
    } else {
        _fileToX = { a:0, b:1, c:2, d:3, e:4, f:5, g:6, h:7 };
        _rankToY = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 7:6, 8:7 };
        _boardFiles ='abcdefgh';
        _boardRanks = '87654321'; 
    }
}

function drawCurrentMove() {  // Update the UI
    const move = _currentMove;
    let floatAnimation = true;
    let imgSquare = document.getElementById(move.from);
    const floatImage = imgSquare.querySelectorAll("[data-group]")[0];
    const boardDiv = document.getElementById("board");
    
    const x = move.from[1] * _squareSize;
    const y = (7 - "abcdefgh"[move.from[0]]) * _squareSize;
    const xEnd = (move.to[1] * _squareSize);
    const yEnd = (((7 - "abcdefgh"[move.to[0]]) * _squareSize));

     // Take the image out of the square and float it over the board
    boardDiv.appendChild(floatImage);

    // Move to end square
    const keyframes = [
        { transform: `translate(${x}px,${y}px)` },
        { transform: `translate(${xEnd}px,${yEnd}px)` }
        ];
    const options = { duration: 1000, iterations: 1, fill: "forwards" };

 /*
    // Create and play animation
    animateElement(floatImage, keyframes, options )
        .then(() => {
            floatAnimation = false;
        });

    while( floatAnimation )
        await sleep( 50 );
*/
    // TBD: Fix moving visual
    floatImage.remove();
    pieceDelete(move.to); // Remove any previous piece, if any
    pieceDelete(move.from); // Remove moving piece
    pieceAdd( move.color + move.piece, move.to);

    // King is correct, fix rook
    if( move.isKingsideCastle() ) {
        let rookFrom = (move.color == "w") ? "h1" : "h8";
        let rookTo = (move.color == "w") ? "f1" : "f8";
        pieceDelete(rookFrom);
        pieceAdd( move.color + "r", rookTo);
    }
    if( move.isQueensideCastle() ) {
        let rookFrom = (move.color == "w") ? "a1" : "a8";
        let rookTo = (move.color == "w") ? "d1" : "d8";
        pieceDelete(rookFrom);
        pieceAdd( move.color + "r", rookTo);
    }

    // Put promoted piece on target square
    if( move.isPromotion() ) {
        pieceDelete(move.to);
        pieceAdd( move.color + move.promotion, move.to);
    }
        
    if( move.isEnPassant() ) {
        // Nuke the passed pawn
        const passedPawn = move.to[0] + ((move.color == "w") ? "5" : "4");
        pieceDelete(passedPawn);
    }
}

function pieceDelete(square) {
    const container = document.getElementById(square);
    if( container ) container.replaceChildren();
}

function pieceImageAdd( piece, square) {
    let container = document.getElementById(square);
    const img = document.createElement("img");
    let theme = Sidebar.controlGet("theme");
    img.className = "piece";
    img.setAttribute("data-group", piece);
    img.setAttribute("src", `./images/${theme}/${piece}.png` );
    container.appendChild(img);
    return img;
}

function pieceAdd( piece, square) {
    const img = pieceImageAdd( piece, square );
    
    // Add dragstart listener to the image
    img.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", e.currentTarget.id);
        e.dataTransfer.setDragImage(img, _squareSize/2,_squareSize/2);
        _activePiece = pickedValidPiece( e.currentTarget );
        if( _activePiece ) {
            highlightSquare( e.currentTarget, "drag-overlay" );
            showPossibles( _activePiece );
        } else {
            e.preventDefault();
        }
    });

    // Undo any previous check
    unhighlightSquare( document, "check-overlay" );

    // Highlight checked King
    if( chess.isCheckmate() || chess.inCheck() ) { 
        const checkedKing = (piece[0] == "w") ? "bk" : "wk";
        const king = document.querySelectorAll(`[data-group="${checkedKing}"]`)[0];
        highlightSquare( king.parentElement, "check-overlay" );
        if( chess.isCheckmate() ) {
            // Lay down the king
            king.style.transform = 'rotate(60deg)';  
        }
    }
}

// ------------- game control functions ----------------
function resizeBoard() {
    const container = document.querySelector('.container');
    const containerRect = container.getBoundingClientRect();

    let sidebarWidth = 0;
    if (window.innerWidth > 768) {
        sidebarWidth = sidebar.classList.contains('collapsed') ? 50 : 300;
    }
    
    const bwidth = containerRect.width - sidebarWidth;
    const bheight = window.innerHeight;
    const boardSize = Math.min(bwidth, bheight);
    const board = document.querySelector('.board');
    board.style.width = boardSize + 'px';
    board.style.height = boardSize + 'px';

     _squareSize = Math.floor(boardSize/8);
    const r = document.querySelector(':root');
    r.style.setProperty('--square-size', `${_squareSize}px`);
}

 window.addEventListener('resize', () => {
    resizeBoard();
});

// Add audio files, use _audio*.play();
const _audioMove = new Audio("/audio/move.mp3");
const _audioWrong = new Audio("/audio/wrong.mp3");
const _audioCorrect = new Audio("/audio/correct.mp3");
const _audioIllegal = new Audio("/audio/illegal.mp3");
const _audioCapture = new Audio("/audio/capture.mp3");
let _audioResult = null;

export function initializeBoard() {
    let child, img  = null;
    // Populate the global variables
    resizeBoard();
    clearArrows();
    chess = new Chess(); // standard starting position
    
    setRanksFiles();
    let gridFiles = "abcdefgh";
    let gridRanks = "12345678";
    if(_globals.playingAs == "black") {
        gridFiles = "hgfedcba";
        gridRanks = "87654321";
    }
        
    
    // Define the squares, the pieces are added later
    const container = document.getElementById("board");

    container.innerHTML = ''; //kill any previous game
    
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            child = document.createElement("div");
            child.className = `square file-${file+1} rank${rank+1}`;
            child.id=`${gridFiles[file]}${gridRanks[rank]}`;
            let sqName = Sidebar.controlGet("theme");
            sqName += ((rank+file)%2 == 0 ) ? "/darkSquare" : "/lightSquare";
            if(file == 0)sqName += `${gridRanks[rank]}`;
            if(rank == 0)sqName += `${gridFiles[file]}`;
            img = `url('./images/${sqName}.png')`;
           
            child.style.background = img;
            child.style.backgroundSize = "cover";
            container.appendChild(child);
        

            // Make squares clickable
            child.addEventListener("click", (e) => {
                let moveNotation = clickEvent(e);
                if( _audioResult == null ) _audioResult = _audioMove;
                try {
                    if( Sidebar.controlGet("playSounds") )
                        _audioResult.play();
                } catch (error) {
                    console.error("Click event audio playback failed:", error);
                }
                playMove(moveNotation,true);
            });

            // Allow squares to respond to drag&drops
            child.addEventListener('dragenter', (e) => {
                e.preventDefault(); 
                highlightSquare( e.currentTarget, "drag-overlay" );
            });

            child.addEventListener("dragover", (e) => {
                e.preventDefault(); 
            });

            child.addEventListener("dragleave", (e) => {
                unhighlightSquare( e.currentTarget, "drag-overlay" );
            });

            // Add drop listener to drop zones
            child.addEventListener("drop", (e) => {
                e.preventDefault();

                let moveNotation = dropEvent(e);
                if( _audioResult == null ) _audioResult = _audioMove;
                try {
                    if( Sidebar.controlGet("playSounds"))
                        _audioResult.play();
                } catch (error) {
                     console.error("Drop event audio playback failed:", error);
                }
                playMove(moveNotation,true);
            });
        }
    }
    // Default opening position
    resetPieces()
}

// Clear all arrows
function clearArrows() {
  const arrows = document.querySelectorAll('.arrow');
  arrows.forEach(arrow => arrow.remove());
}
 
function unhighlightSquare( square, className ) {
    let elements = square.getElementsByClassName(className);
    Array.from(elements).forEach(element => {
        element.remove();
    });
}

function highlightSquare( square, className ) {
    if( Sidebar.controlGet("showHighlights") ) {
        let child = document.createElement("div");
        child.className = "square "+className;
        square.appendChild(child);
    }
}

// ----------- game control functions ---------------- //
function resetClickDrag() {
    _activePiece = null;
    unhighlightSquare( document, "probe-overlay" );
    unhighlightSquare( document, "click-overlay" );
    unhighlightSquare( document, "drag-overlay" );
    unhighlightSquare( document, "check-overlay" );
}
