import { _globals } from './first10.js';
import { _user } from './sidebar.js';
import * as Sidebar from './sidebar.js'

const CLIENT_ID = "1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com";

export function currentUsername() {
	return _user['idInfo']['given_name'];
}

export function login() {

	if( isLocalhost() ) {
		//  Fake OIDC for testing; retrieve local data
		useLocalCredential();
		return;
	}

	// Start the OIDC flow
	google.accounts.id.initialize({
		client_id: CLIENT_ID,
		callback: handleCredentialResponse,
		use_fedcm_for_prompt: true,
	});
	google.accounts.id.prompt(); 
}

/*
-------- Allow for faking the backend calls --------
python server used for test can't handle posts, queries
*/
export function isLocalhost(hostname = window.location.hostname) {
  return ['localhost', '127.0.0.1', '::1', ''].includes(hostname);
}

async function useLocalCredential() {
	try {
		const response = await fetch('/v1/verifyToken');
	
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		let text = await response.text();
		_user = JSON.parse(text).body;
		_user['sub'] = _globals.userCookie;
		// Add a new asession, in reverse cronological order
		if( !length(_user.sessions) || _user.sessions[0] == newSession)
			_user.sessions.unshift(newSession);
	
	} catch (error) {
		console.error(`Error fetching local credential: ${error}`);
	}
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
		_globals.userCookie = data["sub"];
		Sidebar.setUser(data);
	})
	.catch(error => {
		console.error('Error verifying token:', error);
	});
}

export function checkSessionCookies() {
	const cookies = document.cookie;

	let c = cookies.split('; ').find(row => row.startsWith('user='));
	if( c ) _globals.userCookie = c.split('=')[1];
}
