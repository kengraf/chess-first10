import { _user } from './sidebar.js';

import * as GameData from './gameData.js';
import * as Board from './board.js'
import * as Sidebar from './sidebar.js'
import * as Auth from './auth.js'

// ------------ global variables ----------------

// Globals
export let _globals = {};

_globals.pgnURL = "data/first10.pgn";
_globals.PGN = "";
_globals.FEN = "";
_globals.nextNode = 0;
_globals.steps = [];
_globals.peekSteps = [];
_globals.playingAs = "white";
_globals.bestMove = "";
_globals.ecoMoves = [];

/* =========+++++== COOKIES ==++++++++++========= 
We do a few odd things with cookies to help with
localhost testing.
- Override cookies can be passed in as URL parameters,
for testing on localhost where we can't do real
authentication.  These users are anonymous with no history.
- "user" cookie is the user's Google sub value
- "session" cookie is a random UUID.
Both are stored in the history database to authorize
updates.
*/
_globals.userCookie = "";
_globals.sessionCookie = "";

// ---------- Code to run the game -------------
function init() {

	// It is OK if there are none
	Auth.checkSessionCookies();
	
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
		if( _globals.userCookie == "" ) {
			// Show splash page, dismiss button recurses
			showInfoWindow('hello');
			return;
		}
	}
	// Dismiss the splash page if still visible
	closeInfoWindow();
	
	if( showSignin ) {
		showSignin = false;
		if( _globals.userCookie == "" ) {
			Auth.login();
		} else {
			if( Auth.isLocalhost() == false ) {
				let data = fetchJSON('/v1/databaseItems');
				console.log(data);
				Sidebar.setUser(data);
			}
		}
	}

	// Show the game controls
	// Generate sidebar and UI elements
	Sidebar.init('container-sb');
	Sidebar.show("container-sb-body","sb-body-settings","flex");
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.json();
}

export function showInfoWindow(target) {
	const html = (target == 'hello') ? splashHTML : infoHTML;
	const div = document.getElementById('splash');
	div.style.display='grid';
	div.innerHTML = html;
	if (target == 'hello')  {
		document.getElementById('splash').addEventListener("click", (e) => {
				 closeInfoWindow(); openingActions()});
		}
	document.getElementById('dismiss').addEventListener("click", (e) => {
	 closeInfoWindow(); openingActions();});
}
export function closeInfoWindow(target) {
	document.getElementById('splash').style.display='none';
}

function readParameters() {
	const queryString = window.location.search;
	if( queryString == "" )
		return true;  // Using all defaults
		
	const urlParams = new URLSearchParams(queryString);
	
	let s = "";
	if( s = urlParams.get('cookies') ) {
		// Over-riding the actual cookies
		const cookies = s.split(";");
		for(const c of cookies) {
			const [name, value] = c.split(",");
			if( name == "user" ) {
				_globals.userCookie = value;
				Sidebar._user['sub'] = value;
			}
			if( name == "session" ) {
				_globals.sessionCookie = value;
			}
				}
	}

	return true;
}


const splashHTML = `<div class="splashCard">
<button class="dismiss" id="dismiss">✕</button>
<div class="title">
	Welcome to First 10
</div>
<div class="splashText">
	<ul>
	<li>First10 is a simple chess game focused on the opening 10 moves. Curated from over 1.6 million games played by masters. Play black, white, or let the game decide.</li>
	<li>Get AI explanations for your move and the move made by masters</li>
	<li>You can optionally focus on common openings and ECO codes.</li>
	<li>Logins are not required, but if you do. The game will keep track of your success and allow for replaying missed openings.</li>
	<li>To start a new game: Click on an empty square or press key.</li>
	<li>BETA WARNING: This game is in development and may not be fully functional.</li>
	</ul><br>
	<a class="button" href="https://github.com/kengraf/chess-first10/issues" target="_blank" rel="noopener noreferrer">
Request features or report issues here.
</a>

</div>
</div>`

const infoHTML = `<div class="splashCard">
	<button class="dismiss" id="dismiss">✕</button>
	<div class="title">
	Ask for new features
	</div>
	<div class="splashText">
		<div> This is done by submitting an issue to our Github repository.
		</div>
	<a class="button" href="https://github.com/kengraf/chess-first10/issues" target="_blank" rel="noopener noreferrer">
		Request features
	</a>
	</div>

	<div class="title">
	Submit a bug or issue
	</div>
	<div class="splashText">
	Same process as feature requests, but it is helpful to for you to cut&paste the browser log so the problem can be replicated.
	<br>
To cut & paste the log (most browsers).<br>
<ul>
<li>Right-click anywhere on the page → Inspect → click the Console tab.</li>
<br>Or use keyboard shortcuts:
<br>
<li>F12</li>
<li>Ctrl+Shift+J (Windows)</li>
<li>Cmd+Option+J (Mac)</li>
</ul>
</div>
<a class="button" href="https://github.com/kengraf/chess-first10/issues" target="_blank" rel="noopener noreferrer">
	Report issue here.
</a>
</div>`

// Catch all mistakes to stop user experience from freezing
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.message, `(${e.filename}:${e.lineno})`);
  if (e.error?.stack) console.error(e.error.stack);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  if (e.reason?.stack) console.error(e.reason.stack);
});

// Kick off execution
init();
