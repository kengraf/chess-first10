import json
import re
import hashlib

nodes = [{"index":0,"count":0,"step":[], "next":[]}]
node_count = nodes[0]["count"]

def add_moves(moves):
    steps = re.sub(r'\d+\.', '', moves).split()
    cNode = nodes[0]
    for s in steps:
        if s not in cNode["step"]:
            # Create new node
            nodes[0]["count"] += 1
            newNode = {"index":nodes[0]["count"],"count":1,
                       "step":[],"next":[]}
            nodes.append(newNode);
            cNode["step"].append(s)
            cNode["next"].append(nodes[0]["count"])
            cNode = nodes[nodes[0]["count"]]
        else:
            i = cNode["step"].index(s)
            cNode = nodes[cNode["next"][i]]
            cNode["count"] += 1
        
    

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
    
def hash_moves(moves):
    m20 = moves.split("6.")[0]
    hasher = hashlib.md5()
    hasher.update(m20.encode('utf-8'))
    hash = hasher.hexdigest()    
#    print( f"{hash}: {m20}" )
                    
def parse_pgn_to_json(filename):
    """
    Parse a PGN file and convert it to JSON format.
    """
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    source = filename.split(".")[0]
    index = 1
    result = {"Game": f"{source}.{index}"}
    moves = ""
    in_moves_section = False
    
    # Split content into lines
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            if in_moves_section:
                # Game complete
                m = moves.split("10.")
                if good_game( result, len(m) ):
#                    print( f"{m[0]}")
                    add_moves(m[0])
#                    hash_moves(moves)
                    index += 1
                moves = ""
                result = {"Game": f"{source}.{index}"}
                
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
    
    # Add moves array to result
    if moves:
        hash_moves(moves)
    
    return result

# Main execution
if __name__ == "__main__":
    # Parse the PGN file
    pgn_data = parse_pgn_to_json('twic1621.pgn')
    
    # Convert to JSON string with pretty printing
    json_output = json.dumps(pgn_data, indent=2)
    
    with open('output.json', 'w', encoding='utf-8') as f:
        f.write(json_output)
    with open('nodes.data', 'w', encoding='utf-8') as f:
        for n in nodes:
            f.write(str(n)+"\n")

import json
import gzip

def compress_list_of_dicts(data):
    json_data = json.dumps(data)  # Convert to JSON string
    encoded = json_data.encode('utf-8') # Encode to bytes
    compressed = gzip.compress(encoded) # Compress bytes
    return compressed

def decompress_list_of_dicts(compressed_data):
    decompressed = gzip.decompress(compressed_data) # Decompress bytes
    json_data = decompressed.decode('utf-8') # Decode to string
    data = json.loads(json_data) # Convert back to list of dictionaries
    return data

compressed_data = compress_list_of_dicts(nodes)
print(f"Original size: {len(str(nodes))} bytes")
print(f"Compressed size: {len(compressed_data)} bytes")

decompressed_data = decompress_list_of_dicts(compressed_data)
print(f"Decompressed data: {decompressed_data}")