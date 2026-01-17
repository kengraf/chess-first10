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

	// Generate sidebar and UI elements
	Sidebar.init('container-sb');
	
	if( _globals.sessionCookie == "" )
		// Show splash page
		document.getElementById('splash').style.display='grid';
	else if( _globals.userCookie == "" )
		// Prompt for login
		showGoogleSigninButton();
	
	populateUserProfile(_globals.userCookie);
		
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

function populateUserProfile(cookie) {
	if( cookie == "" )
		// No user login, do nothing
		return;
}

function dataFetch() {
	fetch('/v1/databaseItems')
	.then(response => response.json())
	.then(data => {
		scoreData = data;
		hunterData = data['hunter'];
		picHTML = `<img src="data:image/png;base64, ${hunterData.pictureBytes}" width="80" height="80" style="border-radius:50%;">`;
		document.getElementById('picture').innerHTML = picHTML

	})
	.catch(error => console.error('Error fetching data:', error));
}

function checkSessionCookies() {
	const cookies = document.cookie;
	let c = cookies.split('; ').find(row => row.startsWith('session='));
	if( c ) _globals.sessionCoookie = cookieString.split('=')[1];
	
	c = cookies.split('; ').find(row => row.startsWith('user='));
	if( c ) _globals.userCoookie = cookieString.split('=')[1];
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
		const sub = `uuid=${data["uuid"]}&idToken=${data["idToken"]}`;
		window.location.href = `/dashboard.html?${sub}`;
	})
	.catch(error => {
		console.error('Error verifying token:', error);
	});
}

// Render the Google Sign-In button
export function showGoogleSigninButton() {
    google.accounts.id.initialize({
        client_id: '1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com',
        callback: handleCredentialResponse,
    });
    google.accounts.id.prompt(); 
}

// Kick off execution
window.addEventListener('load', init );
