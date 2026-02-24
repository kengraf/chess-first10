import { _globals } from './first10.js';
import { _user } from './sidebar.js';
import * as Sidebar from './sidebar.js'

const CLIENT_ID = "1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com";

export function logout() {
	document.cookie = "user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
	document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

	// Set back to anonymous user and defaults
	Sidebar.setUser();

	// Clear all cookies
	document.cookie.split('; ').forEach(cookie => {
    	const name = cookie.split('=')[0];
    	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  	});
}

export function activeSession() {
	return (_globals.sessionCookie != "");
}

export function currentUsername() {
	if( _user['idinfo'] && _user['idinfo']['given_name'] ) {	
		return _user['idinfo']['given_name'];
	}
	return "Anonymous";
}
export function login() {

     if( activeSession() )
		return;

	if( isLocalHost() ) {
		//  Fake for testing; retrieve local data
		useLocalCredential();
	} else {
		google.accounts.id.initialize({
			client_id: CLIENT_ID,
			callback: handleCredentialResponse,
			use_fedcm_for_prompt: true,
		});
		google.accounts.id.prompt(); 
	}
}

/*
-------- Allow for faking the backend calls --------
python server used for test can't handle posts, queries
*/
export function isLocalHost(hostname = window.location.hostname) {
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
	
	} catch (error) {
		console.error('Error fetching local credential:', error);
	}
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
		_globals.userCookie = data["sub"];
		Sidebar.setUser(data);
	})
	.catch(error => {
		console.error('Error verifying token:', error);
	});
	openingActions();
}

export function checkSessionCookies() {
	const cookies = document.cookie;

	let c = cookies.split('; ').find(row => row.startsWith('user='));
	if( c ) _globals.userCookie = c.split('=')[1];
}
