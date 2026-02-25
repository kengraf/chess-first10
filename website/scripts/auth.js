import { _globals } from './first10.js';
import { _user } from './sidebar.js';
import * as Sidebar from './sidebar.js'
import * as First10 from './first10.js'


const CLIENT_ID = "1030435771551-qnikf54b4jhlbdmm4bkhst0io28u11s4.apps.googleusercontent.com";

export async function authenticatedSession() {
	const data = await fetchUserData();
	if( data != null ) {
		setUserData(data);
		Sidebar.toggleUserState();
		return true;
	}
	return false;
}

async function fetchUserData() {
	// Requires proper cookie values for success
  const res = await fetch('/v1/databaseItems');
  if (!res.ok) {
	const body = await res.text(); // grab error body if server sends one
	console.log(`HTTP error: ${res.status}: ${body || res.statusText}`);
	return null;
  }
  return res.json();
}


export function currentUsername() {
	if( _user['idInfo'] && _user['idInfo']['given_name'] ) {	
		return _user['idInfo']['given_name'];
	}
	return "Anonymous";
}
export function login() {

	if( isLocalHost() ) {
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
	First10.openingActions();
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
	First10.openingActions();
}

export function checkSessionCookies() {
	const cookies = document.cookie;

	let c = cookies.split('; ').find(row => row.startsWith('user='));
	if( c ) _globals.userCookie = c.split('=')[1];
}
