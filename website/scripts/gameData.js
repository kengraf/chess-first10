import { _globals } from './first10.js';

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
	let steps = Math.floor( (rand/2)*(max-min+1) );
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

	// TBD use ECO
	// TBD use named opening
	return randomGame(steps);
}

function add_game_step(notation) {
	let len = _globals.steps.length;
	if( len % 2 == 0) {
		_globals.PGN += `${len/2+1}. `;
	}
	_globals.steps.push(notation);
	_globals.PGN += `${notation} `;
	console.log(_globals.PGN);
}

export function updateNode(notation) {

	_globals.peekSteps = [];
	for (const [step, index] of Object.entries(NODES[_globals.nextNode].steps)) {
		let fStep = {"Move":step, "Index":index,
		"Count":NODES[index].count};
		_globals.peekSteps.push(fStep);
	}
	_globals.peekSteps.sort((a, b) => b.Count - a.Count);
	console.log(_globals.peekSteps);

	add_game_step(notation);
	if( !(notation in NODES[_globals.nextNode].steps)) {
		// Bad move choice by user
		return;
	}
	_globals.nextNode = NODES[_globals.nextNode].steps[notation];
	

	console.log(_globals.nextNode);
}
	

function randomGame(steps) {
	if (typeof steps !== 'number' || steps < 2 || steps > 20) {
		throw new Error('Value must be a number between 0 and 19');
	}
	_globals.steps = [];
	_globals.PGN = "";
	_globals.nextNode = 0;
	let iNode = 0;
	let move = 1;
	
	for (let i = 0; i < steps; i++) {
		let totIndex = 0;
		for (const [step, index] of Object.entries(NODES[iNode].steps)) {
			totIndex += NODES[index].count;
		}
		
		let number = Math.floor(Math.random() * (totIndex + 1));
		
		let selectedStep, selectedIndex;
		for (const [step, index] of Object.entries(NODES[iNode].steps)) {
			const count = NODES[index].count;
			if (number > count) {
				number -= count;
			} else {

				add_game_step(step);
				selectedStep = step;
				selectedIndex = index;
				break;
			}
		}
		iNode = selectedIndex;
	}
	_globals.nextNode = iNode;
	return _globals.steps;
}

	
function addGame(game) {
	const count = parseInt(game.shift());
	while (game.length) {
		game.shift(); // discard number
		add2nodes(count, game.shift()); // white
		add2nodes(count, game.shift()); // black
	}
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
	return NODES;
}
