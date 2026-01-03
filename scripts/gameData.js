let NODES = [{ count: 0, steps: {} }];
let iNode = 0;

export function getOpening() {
	// TBD set rounds 1-9
	// TBD set color w/r/b
	// TBD use ECO
	// TBD use named opening
//	return randomGame(5);
	return ["d4", "Nf6", "c4", "e6", "Nc3"];
}

function randomGame(turns) {
	if (typeof turns !== 'number' || turns < 2 || turns > 18) {
		throw new Error('Value must be a number between 0 and 19');
	}
	let retVal = [];
	let iNode = 0;
	let move = 1;
	
	for (let i = 0; i < turns; i++) {
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

				retVal.push(step);
				selectedStep = step;
				selectedIndex = index;
				break;
			}
		}
		iNode = selectedIndex;
	}	
	return retVal;
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
