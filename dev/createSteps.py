import json
import re
import hashlib

openings = {}

def create_steps(filename):
	"""
	Parse a PGN file and convert it to JSON format.
	"""
	try:
		with open(filename, 'r', encoding='utf-8') as f:
			content = f.read()
	except:
		return

    # Split content into lines
	lines = content.strip().split('\n')
	
	for line in lines:
		line = line.strip()
		steps = re.split(r'[. \t]+',line)
		count = steps[0]
		moves = (len(steps)-2)//3
		for i in range(moves):
			print(f'{steps[i*3+2]} {steps[i*3+3]}')
		print()
	return

import sys

# Main execution
if __name__ == "__main__":
	if len(sys.argv) < 2:
		print("Usage: python createSteps.py <filename>")
		sys.exit(1)
	
	create_steps(sys.argv[1])
	
	with open('gameSteps.json', 'w', encoding='utf-8') as f:
		for o in openings:
			if openings[o]["count"] > 10:
				f.write(f'{openings[o]["count"]}\t{openings[o]["moves"]}\n')

