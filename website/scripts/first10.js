import * as GameData from './gameData.js';
import * as Board from './board.js'
import * as Sidebar from './sidebar.js'

// ------------ global variables ----------------

// Globals
export let _globals = {};

_globals.gameOptions = { 
			"worb": ["w", "r", "b"],
			"theme": ["classic", "modern" ],
			"eco": ["tbd"],
			"url":"data/first10.pgn"};
_globals.boardTheme = _globals.gameOptions.theme[0];
_globals.pgnURL = _globals.gameOptions.url[0];
_globals.minimumTurns = 1;
_globals.maximumTurns = 10;
_globals.PGN = ""; // local instead?
_globals.FEN = "";
_globals.nextNode = 0;
_globals.steps = [];
_globals.peekSteps = [];
_globals.playingAs = "white";
_globals.preferColor = "white";
/*
// ---------- Code to run the game -------------

*/

function init() {
	if( ! readParameters() )
		// Reroute to error page
		window.location.href = '/error.html';
		
	// Generate the HTML board and pieces
	Board.initializeBoard();

	// Generate data structures
	GameData.processNodesURL('/data/first10.nodes');

	// Generate sidebar and UI elements
	Sidebar.init('container-sb');
}


function readParameters() {
	const queryString = window.location.search;
	if( queryString == "" )
		return true;  // Using all defaults
		
	const urlParams = new URLSearchParams(queryString);
	
	let s = "";
	if( s = urlParams.get('theme')) {
		if (_globals.gameOptions.theme.includes(s)) {
			_globals.boardTheme = s;
		}
	}

	if( s = urlParams.get('url') ) {
		_globals.pgnURL = s;
	};

	return true;
}

// Kick off execution
init();
