import { _globals } from './first10.js';

import * as GameData from './gameData.js';
import * as Sidebar from './sidebar.js'

// JSON Object for _game
let _game = {
    startingPosition: "",  //FEN format
    castling: "kqKQ",
    enPassant: "-",
    moveCount: 0,
    steps: [],  // _move objects
    WorB: "w",
};

export function playMove(notation,isUserMove) {
    if( notation == null ) return;

    _move.notation = notation;
    _move.WorB = _game.WorB;
      // Handle the castling special case
    if ("0oO".includes(_move.notation[0])) {
        moveCastle(_move.notation);
    } else {
        
        _move.startSquare = {};
        _move.endSquare = {};
        if( ! parseMove(_move.notation) ) {
            console.log( `Bad move notation: ${_move.notation}` );
            return;
        }
        if( identifyPiece() ) {
            executeMove(_move);
        }
    }
    // TBD play sound here or at end of executemove?

/* TBD
    _move.delay = 2;
    if( _move.delay ) 
        await sleep( _move.delay * 1000 );
*/
    _game.WorB = _move.WorB = (_move.WorB == 'w') ? "b" : "w";
    GameData.updateNode(notation);
    if( isUserMove ) {
        Sidebar.setResultsTable(notation);
    }
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


// Current half move
let _move = {
    WorB: "w",
    notation: "", // i.e. R1xf1+
    delay: 0,  // if (-1) wait; else number of seconds
    par: 0, // scored value
    comment: "",
    altMove: {}, // move, optional
    startSquare: {}, // location before moving {alpha:'a5',file:0,rank:4}
    endSquare: {}, // location after, except enPassant and castling
    pieceType: "", // one of "prbnqk"
    disambiguate: "",  // Only used when 2 pieces can move to the end square
    promotionPiece: "", // one of "RNBQ"
    captureMove: false, // True only when move is a capture
    checkResult: false,
    mateResult: false,
    enPassant: "=",
};

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

function alpha2index( square ) {
    let cell = [];
    cell[0] = _fileToX[ square[0] ];
    cell[1] = 7- _rankToY[ square[1] ];
    return cell;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function nodeToSquareType(node) {
    let sq = {};
    if( node.className == "piece" )
        node = node.parentElement;
    let alpha = node.id;  // the square div is "id=a8"
    sq.alpha = alpha;
    sq.file = _fileToX[alpha[0]];
    sq.rank = _rankToY[alpha[1]];
    if( isNaN(sq.rank))
        return null;
    return sq;
}


// ------------ browser interactions ----------------
let _activePiece = null; // type of _move not node

function dropEvent(e) {
    if( _activePiece == null ) {
        _audioResult = _audioIllegal;
        return null;
    }
    
    if( validLandingSquare(e.currentTarget) ) {
        return userMove( _activePiece );
    } 
    resetClickDrag();
    _audioResult = _audioIllegal;
    return null;
}


function dragControl(event) {
    // constrain dragging to board
    const dragContainer = document.getElementById('board');

    const dragPiece = event.currentTarget;
    let shiftX = event.clientX - dragPiece.getBoundingClientRect().left;
    let shiftY = event.clientY - dragPiece.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
        let newX = pageX - shiftX - dragContainer.getBoundingClientRect().left;
        let newY = pageY - shiftY - dragContainer.getBoundingClientRect().top;

        // Constraints
        const maxX = dragContainer.clientWidth - dragPiece.offsetWidth;
        const maxY = dragContainer.clientHeight - dragPiece.offsetHeight;

        // Clamp values between 0 and Max
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        dragPiece.style.left = newX + 'px';
        dragPiece.style.top = newY + 'px';
        console.log(`X=${newX} Y=${newY}`);
    }

    function onMouseMove(event) {
        moveAt(event.pageX, event.pageY);
        console.log(`X=${event.pageX} Y=${event.pageY}`);
    }

    document.addEventListener('mousemove', onMouseMove);

    document.onmouseup = function() {
        document.removeEventListener('mousemove', onMouseMove);
        document.onmouseup = null;
    };
};

function clickEvent(e) {
    _audioResult = null;
    if( _activePiece ) {
        // Second click is an attempted or aborted move
        if( validLandingSquare(e.currentTarget) ) {
            return userMove( _activePiece );
        } else {
            resetClickDrag();
            _audioResult = _audioIllegal;
            return null;
        }
    } else {
        // set the startSquare
        if( isSquareOccupied(e.currentTarget) ) {
            _activePiece = pickedValidPiece( e.currentTarget );
            if( _activePiece ) {
                // Highlight the parent of the piece image
               highlightSquare( e.currentTarget, "click-overlay" );
                _moveTos = [];
               showPossibles( _activePiece );
               return null;
            }
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

function validLandingSquare(node) {
    if( _activePiece == null )
        // No preceding click or drag
        return false;
    if( isSquareOccupied(node) ) {
        let piece = getPieceFromNode(node);
        if( piece[0] == _activePiece.WorB )  // same color, no good
            return false;

        _activePiece.captureMove = true;
    } else {
        _activePiece.captureMove = false;
    }

// determine candidate square
    _activePiece.endSquare = nodeToSquareType( node );
    return true;
}

function pickedValidPiece(node) {
    let sq = {};
    if( !isSquareOccupied(node) ) {
        // Clicked an unoccupied square
        return null;
    }   
    let piece = getPieceFromNode(node);
    if( _game.WorB != piece[0] ) {
        // Wrong color piece
        return null;
    }
    sq.WorB = piece[0];
    sq.pieceType = piece[1];
    sq.startSquare = nodeToSquareType( node );
    return sq;
}

function getPieceFromNode(node) {
    if( node.className != "piece" )
        node = node.querySelector(`.piece`);
    if( node )
        return node.getAttribute('data-group');
    else
        return null;
}

window.addEventListener('resize', () => {
    resizeBoard(window.innerWidth, window.innerHeight);
});




// ---------- available spaces of a piece --------------
let _moveTos = [];  // alpha of piece i.e. "a8"
    const availFunctions = [
        (p) => availPawnSquares(p),
        (p) => availRookSquares(p),
        (p) => availKnightSquares(p),
        (p) => availBishopSquares(p),
        (p) => availQueenSquares(p),
        (p) => availKingSquares(p)
];

function probeOppOnSquare( x, y, ownColor ) {
    // Bounds check
    if( isNaN(x) || isNaN(y) )
        return false;
    if(  x < 0 || x > 7 ) return false;
    if(  y < 0 || y > 7 ) return false;

    let alpha = index2alpha(x,y);
    const square = document.getElementById(alpha);
    const piece = getPieceFromNode(square);

    if( !piece ) return false;
    if( ownColor == piece[0] ) 
        // Running into own color
        return false;

    highlightSquare( square, "probe-overlay" );
    _moveTos.push(alpha);
    return true;
}

function probeSquare( x, y, ownColor ) {
    // Bounds check
    if( isNaN(x) || isNaN(y) )
        return false;
    if( x < 0 || x > 7 ) return false;
    if( y < 0 || y > 7 ) return false;

    let alpha = index2alpha(x,y);
    const square = document.getElementById(alpha);
    const piece = getPieceFromNode(square);

    if( piece && ownColor.includes(piece[0]) ) 
        // Running into own color
        return false;

    highlightSquare( square, "probe-overlay" );
    _moveTos.push( alpha );
    return (piece == null);
}

function probeFile(piece, n, capture) {
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank;
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x, y+i, capture )) break; 
    }
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x, y-i, capture )) break; 
    }
}

function probeRank(piece, n, capture) {
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank;
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x+i, y, capture )) break; 
    }
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x-i, y, capture )) break; 
    }
}

function probeDiagonals(piece, n, capture) {
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank;
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x+i, y+i, capture )) break; 
    }
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x+i, y-i, capture )) break; 
    }
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x-i, y+i, capture )) break; 
    }
    for( let i=1; i<=n; i++) {
        if( !probeSquare( x-i, y-i, capture )) break; 
    }
}

function probeN(piece, n, capture) {
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank;
    for( let i=1; i<=n; i++) {
        y++;
        probeSquare( x, y, capture ); 
    }
}

function probeS(piece, n, capture) {
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank;
    for( let i=1; i<=n; i++) {
        y--;
        probeSquare( x, y, capture ); 
    }
}

function availPawnSquares(piece) {
    const probeFunc = [ 
        (p,n,c) => probeN(p,n,c),
        (p,n,c) => probeS(p,n,c),
    ];

    let distance = 1;
    let goNorth = true;
    if( piece.WorB == "w" ) {
        goNorth = !_flipped;
    }
    if( piece.WorB == "b" ) {
        goNorth = _flipped;
    }
    if( goNorth ) {
        if( piece.startSquare.rank == 1 ) distance++;
        probeFunc[0](piece, distance, "wb");
    } else {
        if( piece.startSquare.rank == 6 ) distance++;
        probeFunc[1](piece, distance, "wb");
    }

    // Capture moves
    distance = (goNorth) ? 1:-1;
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank + distance;
    probeOppOnSquare( x-1, y, piece.WorB );
    probeOppOnSquare( x+1, y, piece.WorB );
}

function availRookSquares(piece) {
    probeRank(piece, 7, piece.WorB );
    probeFile(piece, 7, piece.WorB );
}

function availKnightSquares(piece) {
    let x = piece.startSquare.file;
    let y = piece.startSquare.rank;
    probeSquare( x-1, y+2, piece.WorB  );
    probeSquare( x+1, y+2, piece.WorB  );
    probeSquare( x-1, y-2, piece.WorB  );
    probeSquare( x+1, y-2, piece.WorB  );
    probeSquare( x-2, y+1, piece.WorB  );
    probeSquare( x-2, y-1, piece.WorB  );
    probeSquare( x+2, y+1, piece.WorB  );
    probeSquare( x+2, y-1, piece.WorB  );
}

function availBishopSquares(piece) {
    probeDiagonals(piece, 7, piece.WorB);
}

function availQueenSquares(piece) {
    availRookSquares(piece);
    availBishopSquares(piece);
}

function availKingSquares(piece) {
    probeRank(piece, 1, piece.WorB);
    probeFile(piece, 1, piece.WorB);
    probeDiagonals(piece, 1, piece.WorB);
    
    // Castle spaces
    if( piece.WorB == "b" ) {
        if( _game.castling.includes("k")) probeSquare(6,7,piece.WorB);
        if( _game.castling.includes("q")) probeSquare(2,7,piece.WorB);
    } else {
        if( _game.castling.includes("K")) probeSquare(6,0,piece.WorB);
        if( _game.castling.includes("Q")) probeSquare(2,0,piece.WorB);
    }
}

function showPossibles(piece) {
    const funcIndex = "prnbqk".indexOf(piece.pieceType);
    if( availFunctions[funcIndex](piece) ) 
        return;  // function set global _moveTos array

}

function isChecked() {
    let piece = _activePiece;
    let checkingPieces = [];

    // Determine Opposing King square
    let king = (_game.WorB == "b") ? "wk" : "bk";
    let kingNode = document.querySelectorAll(`[data-group^="${king}"]`);
    let kingAlpha = kingNode[0].parentNode.id;

    // Temporary move the activePiece while eval of check
    pieceDelete(piece.startSquare.alpha);
    const img = pieceImageAdd( piece.WorB+piece.pieceType, piece.endSquare.alpha);

    let candidates = document.querySelectorAll(`[data-group^="${piece.WorB}"]`);
    for (const node of candidates) {
        let sq = pickedValidPiece( node );
        _moveTos = [];
        showPossibles(sq);
        if( _moveTos.includes(kingAlpha)) checkingPieces.push(node);
    }
    
    // Return activePiece, UI move made later
    img.remove();
    pieceAdd( piece.WorB+piece.pieceType, piece.startSquare.alpha);

    return checkingPieces;
}

function isMated() {
    let piece = _activePiece;
    const checkingPieces = isChecked();
    if( checkingPieces.length == 0 ) return false;
return false; // DEBUG and FIX

    // fix eval all squares around king
    let king = (_game.WorB == "b") ? "wk" : "bk";
    let kingNode = document.querySelectorAll(`[data-group^="${king}"]`);
    let sq = nodeToSquareType( kingNode );
    _moveTos = [];
    showPossibles(sq);
    let escapeSquares = _moveTos;
    // iterate if escape square is still check
    let candidates = document.querySelectorAll(`[data-group^="${piece.WorB}"]`);
    for( const escape of escapeSquares) {
        for (const node of candidates) {
            _moveTos = [];
            sq = nodeToSquareType( node );
            showPossibles(sq);
            if( _moveTos.includes(escape) == false )
                // King has an escape square
                return false;
        }
    }
    
    // If the King can't escape;; then check for blocking or capturing
    if( checkingPieces.length > 1 ) return true;

    //fix
    return false; 
}

// ------------ piece location and placement -----------
function disambiguate(move) {
    // Extra notation needed if two pieces of
    // same type can make move
    const colorType = move.WorB + move.pieceType;
    const candidates = document.querySelectorAll(`[data-group="${colorType}"]`);

    for (const node of candidates) {
        // Cycle thru all the pieces of that type.
        let sq = pickedValidPiece( node );
        _moveTos = [];
        showPossibles( sq );
        unhighlightSquare( document, "probe-overlay" );
        
        for( const m of _moveTos ) {
            if( m == move.endSquare.alpha) {
                if( sq.startSquare.alpha != move.startSquare.alpha ) {
                if( sq.startSquare.alpha[0] == move.startSquare.alpha[0] )
                    return move.startSquare.alpha[1];
                else 
                    return move.startSquare.alpha[0];
                }
            }
        }
    }
    return "";
}

// ------------------ Move Functions --------------------

function identifyPiece() {
    // Moving based on game notation
    const colorType = _move.WorB + _move.pieceType;
    const candidates = document.querySelectorAll(`[data-group="${colorType}"]`);
    if( !candidates ) {
        console.log(`No (${colorType}) on board; Bad move: ${_move.notation}`);
        return false;
    }

    let legalPieces = [];
    for (const node of candidates) {
        // Cycle thru all the pieces of that type.
        _moveTos = [];
        let move = pickedValidPiece( node );
        showPossibles( move );
        unhighlightSquare( document, "probe-overlay" );

        if( _moveTos.includes(_move.endSquare.alpha) )
            // This piece can move to target square
            legalPieces.push(move.startSquare);
    }
    
    if( _move.disambiguate != "" ) {
        // Use disabigate notation to filter pieces
        for( let i=0; i<legalPieces.length; ) {
            if( legalPieces[i].alpha.includes(_move.disambiguate) == false )
                // Not correct rank or file
                legalPieces.splice(i,1);
            else
                ++i;
        }
    }
            
    if( legalPieces.length == 0 ) {
        // No piece can reach square
        console.log(`No (${colorType}) can make move: ${_move.notation}`);
        return false;
    }

    if( legalPieces.length > 1 ) {
        // Multiple pieces could move
        console.log(`Multiple (${colorType}) can make move: ${_move.notation}`);
        return false;
    }

    // Identified piece
    _move.startSquare = legalPieces[0];
    return true;
}

function castleAttempt( move ) {
    // Look at the pending move as apossible castle
    if( move.pieceType != "k" ) return null;
    if( move.startSquare.alpha[0] != "e" ) return null;
    if( move.endSquare.alpha[0] == "g" ) {
        // Kingside attempt
        if( (move.WorB == "b") && _game.castling.includes("k") )
            // _game.castling is updated when the move is made
            return "O-O";
        if( (move.WorB == "w") && _game.castling.includes("K") )
            return "O-O";
    }
      
    if( move.endSquare.alpha[0] == "c" ) {
        // Queenside attempt
        if( (move.WorB == "b") && _game.castling.includes("q") )
            // _game.castling is updated when the move is made
            return "O-O-O";
        if( (move.WorB == "w") && _game.castling.includes("Q") )
            return "O-O-O";
    }
      

    return null;
}

function moveCastle(notation) {
    // Handle special castling notation
    if (notation.includes("O-O-O")) {
        // Queen side castle
        if( _move.WorB == "b" ) {
            if( _game.castling.includes("q") ) {
                movePiece("bk",  "e8",  "c8");
                movePiece("br",  "a8",  "d8");
                 _game.castling.replace("q", ""); 
            }
        } else {
            if( _game.castling.includes("Q") ) {
                movePiece("wk",  "e1",  "c1");
                movePiece("wr",  "a1",  "d1");
                 _game.castling.replace("Q", ""); 
            }
        }
        return;
    }
    if (notation.includes("O-O")) {
        // King side castle
        if( _move.WorB == "b" ) {
            if( _game.castling.includes("k") ) {
                movePiece("bk",  "e8",  "g8");
                movePiece("br",  "h8",  "f8");
                 _game.castling.replace("k", ""); 
            }
        } else {
            if( _game.castling.includes("K") ) {
                movePiece("wk",  "e1",  "g1");
                movePiece("wr",  "h1",  "f1");
                 _game.castling.replace("K", ""); 
            }
        }
    }
}

function parseMove(notation) {

    // enPassant option only lasts for a halfmove
    _move.enPassant = _game.enPassant;
    _move.disambiguate = "";
    _move.promotionPiece = "";
    _game.enPassant = '-';
    _move.checkResult = false;

    // Peel off the special ending states
    let lastC = notation.charAt(notation.length - 1);
    if( lastC == "+" ) {
        _move.checkResult = true;
        notation = notation.slice(0, -1);
        lastC = notation.charAt(notation.length - 1);
    }
    if( lastC == "#" ) {
        _move.mateResult = true;
        notation = notation.slice(0, -1);
        lastC = notation.charAt(notation.length - 1);
    }
    if( "RNBQ".includes(lastC) ) {
        // Promotion
        _move.promotionPiece = lastC;
        notation = notation.slice(0, -1);
    }

    // endSquare
    const regex = /[a-h][1-8]$/;
    let result = notation.match(regex);
    if ( result == null )
         return false;
    _move.endSquare.alpha = result[0];
    // Compute to integers for easier comparions
    _move.endSquare.file = _fileToX[result[0][0]];
    _move.endSquare.rank = _rankToY[result[0][1]];
    notation = notation.slice(0, -2);
    
    if( notation.length == 0 ) {
        // Unambiguous pawn move
        _move.pieceType = 'p';
        return true;
    }
    
    // Determine if move is a capture
    lastC = notation.charAt(notation.length - 1);
    _move.captureMove = (lastC == "x") ? true : false;
    if ( _move.captureMove ) {
        notation = notation.slice(0, -1);
    }

    // Determine piece type
    if ('RNBQK'.includes(notation[0])) {
        _move.pieceType = notation[0].toLowerCase();
        notation = notation.substring(1);
    } else {
        _move.pieceType = 'p';
    }

    if( notation.length == 0 )
        return true;
        
    // Determine if move is ambiguous
    if ( '12345678abcdefgh'.includes(notation[0]) ) {
       _move.disambiguate = notation[0];
       return true;
    } else {
        return false;
    }
    return (notation.length == 0);
}

function animateElement(element, keyframes, options) {
    return new Promise((resolve) => {
        const animation = element.animate(keyframes, options);
        animation.onfinish = resolve;
    });
}

export function resetPieces( fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w kqKQ - 0 0" ) {
    // FEN notation for initial board setup
    const parts = fen.split(" ");
    _game.initalBoard = parts[0];
    _game.WorB = _move.WorB = parts[1];
    _game.castling = parts[2];
    _game.enPassant = parts[3];
    _game.halfMoves = parts[4];
    _game.fullMoves = parts[5];
    _game.fen = fen
    _globals.nextNode = 0;
    _globals.PGN = "";
    _globals.steps = []

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

function executeMove(move) {  // Update the UI
    let floatAnimation = true;
    let imgSquare = document.getElementById(move.startSquare.alpha);
    const floatImage = imgSquare.querySelectorAll("[data-group]")[0];
    const boardDiv = document.getElementById("board");
    
    const x = move.startSquare.file * _squareSize;
    const y = (7 - move.startSquare.rank) * _squareSize;
    const xEnd = ((move.endSquare.file  * _squareSize));
    const yEnd = (((7 - move.endSquare.rank) * _squareSize));

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
    // Just the moved piece on square
    floatImage.remove();
    pieceDelete(move.endSquare.alpha);
    pieceAdd( move.WorB + move.pieceType, move.endSquare.alpha);

    // Put promoted piece on target square
    if( move.promotionPiece ) {
        pieceDelete(move.endSquare.alpha);
        pieceAdd( move.WorB + move.promotionPiece, move.endSquare.alpha);
    }
        
    if( move.enPassant == move.endSquare.alpha ) {
        //Nuke the passed pawn
        move.endSquare.rank += (move.WorB == "w") ? 1 : -1;    
        move.endSquare.alpha = index2alpha(move.endSquare.file, move.enfSquare.rank);
        pieceDelete(move.endSquare.alpha);
    }
}

function movePiece( piece, start, end ) {
    // Fix here is where all UI things happen
    pieceDelete(end);
    pieceDelete(start);
    pieceAdd( piece, end);
}

function pieceDelete(square) {
    const container = document.getElementById(square);
    if( container ) container.replaceChildren();
}

function pieceImageAdd( piece, square) {
    let container = document.getElementById(square);
    const img = document.createElement("img");
    let theme = _globals.boardTheme;
    img.className = "piece";
    img.setAttribute("data-group", piece);
    img.setAttribute("src", `/images/${theme}/${piece}.png` );
    container.appendChild(img);
    return img;
}

function pieceAdd( piece, square) {
    const img = pieceImageAdd( piece, square );
    
    // Add dragstart listener to the image
    img.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", e.currentTarget.id);
        e.dataTransfer.setDragImage(img, _squareSize/2,_squareSize/2);
//TBD bind drags to the board
//TBD   dragControl( e );
        _activePiece = pickedValidPiece( e.currentTarget );
        if( _activePiece ) {
            highlightSquare( e.currentTarget, "drag-overlay" );
            _moveTos = [];
            showPossibles( _activePiece );
        } else {
            e.preventDefault();
        }
    });

    // Undo any previous check
    unhighlightSquare( document, "check-overlay" );

    // Highlight checked King
    if( _move.checkResult || _move.mateResult ) { 
        const checkedKing = (piece[0] == "w") ? "bk" : "wk";
        const king = document.querySelectorAll(`[data-group="${checkedKing}"]`)[0];
        highlightSquare( king.parentElement, "check-overlay" );
        if( _move.mateResult ) {
            // Lay down the king
            king.style.transform = 'rotate(60deg)';  
        }
    }
}

// ------------- game control functions ----------------
function clearBoard() {
    for( let f=0; f<8; f++ ) {
        for( let r=0; r<8; r++ ) {
            pieceDelete(index2alpha(f,r));
        }
    }
}    

function resizeBoard(w,h) {
    // We want the largest square board without squeezing the sidebar
    console.log(`Viewport width: ${w}px, height: ${h}px`);
    w = document.documentElement.clientWidth;
        h = document.documentElement.clientHeight;

    let r = document.querySelector(':root');
    let side = document.getElementById('sb-container').offsetWidth;
    _squareSize = Math.floor(Math.min(w-side,h)/8);

    var width = (_squareSize*8); 
    r.style.setProperty('--board-size', `${width}px`);
    r.style.setProperty('--square-size', `${_squareSize}px`);
}


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
    resizeBoard(window.innerWidth, window.innerHeight);
    
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
            let sqName = _globals.boardTheme;
            sqName += ((rank+file)%2 == 0 ) ? "/darkSquare" : "/lightSquare";
            if(file == 0)sqName += `${gridRanks[rank]}`;
            if(rank == 0)sqName += `${gridFiles[file]}`;
            img = `url('/images/${sqName}.png')`;
           
            child.style.background = img;
            child.style.backgroundSize = "cover";
            container.appendChild(child);
        

            // Make squares clickable
            child.addEventListener("click", (e) => {
                let moveNotation = clickEvent(e);
                if( _audioResult == null ) _audioResult = _audioMove;
                try {
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

function unhighlightSquare( square, className ) {
    let elements = square.getElementsByClassName(className);
    Array.from(elements).forEach(element => {
        element.remove();
    });
}

function highlightSquare( square, className ) {
    let child = document.createElement("div");
    child.className = "square "+className;
    square.appendChild(child);
}

// ----------- game control functions ---------------- //
function resetClickDrag(check = false) {
    _activePiece = null;
    unhighlightSquare( document, "probe-overlay" );
    unhighlightSquare( document, "click-overlay" );
    unhighlightSquare( document, "drag-overlay" );
    if( check )
        unhighlightSquare( document, "check-overlay" );
}

function userMove( move = _activePiece ) {
    _audioResult = null;
    if( _moveTos.includes(move.endSquare.alpha) == false ) {
        // invalid move
        _audioResult = _audioIllegal;
        resetClickDrag();
        return null;
    }

    let note = move.pieceType.toUpperCase();
    if( note == "P" ) {
        note = "";
        if( move.captureMove ) {
            note = move.startSquare.alpha[0];
        }
    } else {
        note += disambiguate(move);
    }
    if( move.captureMove ) {
        note += "x";
    }
    note += move.endSquare.alpha;
    const castled = castleAttempt( move );
    if( castled ) note = castled;
    
    let checked = "";
    if( isChecked().length > 0 ) {
        checked = "+";
        if( isMated() )
            checked = "#";
    }
    note += checked;
    resetClickDrag();
    return note;
}

function getFEN() {
    let fen = "";
    let spaces = 0;

    for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
            const parent = document.getElementById(index2alpha(file,rank));
            const child = parent.children[0];

            if( child != null ) {
                if( spaces != 0 ) {
                    fen += `${spaces}`;
                    spaces = 0;
                }
                const dataGroup = child.getAttribute('data-group');
                let pieceColor = dataGroup[0];
                let pieceType = dataGroup[1];
                if( pieceColor == "w" ) pieceType = pieceType.toUpperCase();
                fen += pieceType;
            } else {
                spaces += 1;
            }
        }
        if( spaces != 0 ) {
            fen += `${spaces}`;
            spaces = 0;
        }
        if( rank > 0 ) fen += "/";
    }
    return fen;
}


function positionAndSizeLabel(parentDiv, type, label) {
  const labelDiv = document.createElement("div");
  const labelSize = _squareSize / 8; 

  labelDiv.style.width = labelSize + 'px';
  labelDiv.style.height = labelSize + 'px';
  labelDiv.style.fontSize = (labelSize / 4) + 'px';
  labelDiv.innerHTML = `${label}`;
  parentDiv.appendChild(labelDiv);  
}

/*
// Run the function initially and on window resize for responsiveness
TBD_positionAndSizeLabel();
window.addEventListener('resize', TBD_positionAndSizeLabel();
*/