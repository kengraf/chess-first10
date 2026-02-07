import { _globals, _user } from './first10.js';

import * as Sidebar from './sidebar.js'

let NODES = [{ count: 0, steps: {} }];
let iNode = 0;

export function getOpening() {
	let min = _globals.minimumTurns;
	let max = _globals.maximumTurns;
	var rand = 0;
	for (var i = 0; i < 2; i += 1) {
		rand += Math.random();
	}
	let steps = Math.floor( (rand/2)*(max-min) );
	steps = (steps+min)*2;

	
	_globals.playingAs = "white";
// Add a step for black or randomly
	if (_globals.preferColor == "black") {
		_globals.playingAs = "black";
		}
	if(_globals.preferColor == "random") {
		if (Math.random() > 0.5)
		_globals.playingAs = "black";
		}
		
	if( _globals.playingAs == "black" ) {
		steps++;
	}
	Sidebar.show("container-playAs",_globals.playingAs,"flex");

	Sidebar.displayGamesCount();
	return randomGame(steps);  // Constrained by ECO values
}

function add_game_step(notation) {
	let len = _globals.steps.length;
	if( len % 2 == 0) {
		_globals.PGN += `${len/2+1}. `;
	}
	_globals.steps.push(notation);
	incrementNode(notation);
		_globals.PGN += `${notation} `;

}

export function setPeekSteps(node) {
	_globals.peekSteps = [];
	for (const [step, index] of Object.entries(NODES[node].steps)) {
		let fStep = {"Move":step, "Index":index,
		"Count":NODES[index].count};
		_globals.peekSteps.push(fStep);
	}
	_globals.peekSteps.sort((a, b) => b.Count - a.Count);
}

export function incrementNode(notation) {
	_globals.nextNode = NODES[_globals.nextNode].steps[notation];
}

export function updateNode(notation) {

	setPeekSteps(_globals.nextNode);
	if( notation in NODES[_globals.nextNode].steps) {
		// Known move choice by user
		add_game_step(notation);
	}
}
	

function randomGame(steps) {

	_globals.steps = [];
	_globals.PGN = "";
	_globals.nextNode = 0;
	let iNode = 0;
	let move = 1;
	let ecoMoves = _globals.ecoMoves;
	
	let replay = false;
	if(_globals.Replay == 'random' ) 
		replay = Math.random() < 0.5;
	if(_globals.Replay == 'always')
		replay = true;
	if(replay) {
		const randomIndex = Math.floor(Math.random() * _user.missed.length);
		const replayPGN = _user.missed.splice(randomIndex, 1)[0];
		const replaySteps = replayPGN
			.trim()
			.replace(/[.]/g, ' ')
			.split(/\s+/)
			.filter(item => {
				return item && !/^\d+$/.test(item);
			});
		replaySteps.forEach(step => {
			add_game_step(step);
		});
		return _globals.steps;
	}
	
	for (let i = 0; i < steps; i++) {
		if( ecoMoves.length > i ) {
			// Use predetermined ECO based move
			let move = NODES[iNode].steps[ecoMoves[i]];
			add_game_step( ecoMoves[i] );
			iNode = move;
		} else {
			// Random move selection
			let totIndex = 0;
			for (const [step, index] of Object.entries(NODES[iNode].steps)) {
				totIndex += NODES[index].count;
			}
			
			let number = Math.floor(Math.random() * (totIndex + 1));
			
			let selectedIndex;
			for (const [step, index] of Object.entries(NODES[iNode].steps)) {
				const count = NODES[index].count;
				if (number > count) {
					number -= count;
				} else {
					add_game_step(step);
					selectedIndex = index;
					break;
				}
			}
			iNode = selectedIndex;
		}
	}
	_globals.nextNode = iNode;
	return _globals.steps;
}

function add2nodes(count, step) {
	if (!(step in NODES[iNode].steps)) {
		NODES[iNode].steps[step] = NODES.length;
		iNode = NODES.length;
		NODES.push({ count: count, steps: {} });
	} else {
		iNode = NODES[iNode].steps[step];
		NODES[iNode].count += count;
	}
}

export async function processNodesURL(url) {
	try {
		const response = await fetch(url);
		
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const content = await response.text();
		const lines = content.trim().split('\n');
		
		// Reset NODES for fresh processing
		NODES = [];
		
		for (const line of lines) {
			const spaceIndex = line.indexOf(' ');
			const count = parseInt(line.substring(0, spaceIndex));
			const jsonStr = line.substring(spaceIndex + 1).replace(/'/g, '"');
			const steps = JSON.parse(jsonStr);
			
			// Create node structure
			NODES.push({
				count: count,
				steps: steps
			});
		}
	} catch (error) {
		console.error("Error fetching or processing URL:", error);
		throw error;
	}
	Sidebar.displayGamesCount();
	return NODES;
}
