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
_globals.sessionCookie = "";
_globals.userCookie = "";
_globals.user = {"name":"", "email":"", "pictureurl":"","sub":"", "uuid":""};
_globals.showBestArrow = false;
_globals.playSounds = false;
_globals.replayGames = false;
_globals.showHighlights = false;
_globals.bestMove = ""

// ---------- Code to run the game -------------
function init() {

	// It is OK if there are none
	checkSessionCookies();
	
	if( ! readParameters() )
		// Reroute to error page
		window.location.href = '/error.html';
		
	// Generate the HTML board and pieces
	Board.initializeBoard();

	// Generate data structures
	GameData.processNodesURL('/data/first10.nodes');

	// Run through the initial user actions
	openingActions();
}

// ------- Manage the initial user actions --------
let showSplash = true;
let showSignin = true;
export function openingActions() {
	
	if( showSplash ) {
		showSplash = false;
		if( _globals.sessionCookie == "" ) {
			// Show splash page, the button ot dismiss recurses
			document.getElementById('splash').style.display='grid';
			return;
		}
	}
	// Dismiss the splash page if still visible
	document.getElementById('splash').style.display='none';
	
	if( showSignin ) {
		showSignin = false;
		if( _globals.userCookie == "" ) {
			// Prompt for login
			showGoogleSigninButton();
			return;
		}
	}

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

	if( s = urlParams.get('cookies') ) {
		// Over-riding the actual cookies
		const cookies = s.split(";");
		for(const c of cookies) {
			const [name, value] = c.split(",");
			if( name == "session" )
				_globals.sessionCookie = value;
			if( name == "user" )
				_globals.userCookie = value;
		}
	}

	return true;
}

/*
-------- Allow for faking the backend calls --------
python server used for test can't handle posts, queries
*/
export function isLocalHost(hostname = window.location.hostname) {
  return ['localhost', '127.0.0.1', '::1', ''].includes(hostname);
}

function dataFetch(url) {
//TBD fix for real data history/results
	fetch(url)
		.then(response => response.json())
		.then(data => {
			scoreData = data;	
		})
		.catch(error => console.error('Error fetching data:', error));
}

function checkSessionCookies() {
	const cookies = document.cookie;
	let c = cookies.split('; ').find(row => row.startsWith('session='));
	if( c ) _globals.sessionCoookie = c.split('=')[1];
	
	c = cookies.split('; ').find(row => row.startsWith('user='));
	if( c ) _globals.userCoookie = c.split('=')[1];
}

async function handleLocalCredential() {
	const response = await fetch('/v1/verifyToken');
	
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}
	
	let text = await response.text();
	_globals.user = JSON.parse(text);
	openingActions();
}

function handleCredentialResponse(response) {
	const idToken = response.credential;

	// Send the token to your backend via POST ---- GET
	fetch('https://chess-first10.kengraf.com/v1/verifyToken', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({ idToken }),
	})
	.then(response => {
		if (!response.ok) {
		throw new Error(`Token verification failed: ${response.status}`);
		}
		return response.json();
	})
	.then(data => {
		console.log('Data fetched:', data);
		_globals.userCookie = data["uuid"];
	})
	.catch(error => {
		console.error('Error verifying token:', error);
	});
	openingActions();
}

// Render the Google Sign-In button
export function showGoogleSigninButton() {
	if( isLocalHost() ) {
		//  Fake for testing; retrieve local data
		handleLocalCredential();
		return;
	}
		
    google.accounts.id.initialize({
        client_id: '1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com',
        callback: handleCredentialResponse,
		use_fedcm_for_prompt: true,
    });
    google.accounts.id.prompt(); 
}

// Kick off execution
init();
