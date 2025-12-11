import json
import re
import hashlib

openings = {}

def good_game( result, n):
    if n == 1: 
        return False
    try:
        if int(result["WhiteElo"]) < 2200:
            return False
        if int(result["BlackElo"]) < 2200:
            return False
    except:
        return False;
    return True
    
def hash_add_opening(moves, count=1):
    
    hasher = hashlib.md5()
    hasher.update(moves.encode('utf-8'))
    hash = hasher.hexdigest()    
    if hash in openings:
        openings[hash]["count"] += count
    else:       
        openings[hash] = {"count":count,"moves":moves}

def read_previously_reduced(openings):
    try:
        with open('first10.pgn', 'r', encoding='utf-8') as f:
            content = f.read()
            f.close()
    except:
        return        
    lines = content.strip().split('\n')
    for line in lines:
        cntMoves = line.strip().split("\t")
        if len(cntMoves) != 2:
            continue
        hash_add_opening(cntMoves[1], int(cntMoves[0]))
                    
def parse_pgn_to_json(filename):
    """
    Parse a PGN file and convert it to JSON format.
    """
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
    except:
        return
    
    source = filename.split(".")[0]
    moves = ""
    result = {}
    in_moves_section = False
    
    # Split content into lines
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            if in_moves_section:
                # Move section complete
                m = moves.split("10.")
                if good_game( result, len(m) ):
                    hash_add_opening(m[0].strip())
                moves = ""
                result = {}
            continue
        
        # Parse metadata lines (starting with '[')
        if line.startswith('['):
            in_moves_section = False
            # Extract key and value from [Key "Value"]
            match = re.match(r'\[(\w+)\s+"([^"]*)"\]', line)
            if match:
                key = match.group(1)
                value = match.group(2)
                result[key] = value
        
        # Parse moves (starting with '1.' or continuation of moves)
        elif line.startswith('1.') or in_moves_section:
            in_moves_section = True
            # Concat remaining lines in to move string
            moves += line
    
    # Add last game to openings
    if moves:
        hash_add_opening(moves.split("10.")[0].strip())
    
    return

import sys

# Main execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fetch_reduce.py <filename>")
        sys.exit(1)
    
    new_pgn = sys.argv[1]
    
    read_previously_reduced("first10.pgn")
    
    parse_pgn_to_json(new_pgn)

    with open('first10.pgn', 'w', encoding='utf-8') as f:
        for o in openings:
            if openings[o]["count"] > 10:
                f.write(f'{openings[o]["count"]}\t{openings[o]["moves"]}\n')

