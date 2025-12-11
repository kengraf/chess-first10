import json
import re

def parse_pgn_to_json(filename):
    """
    Parse a PGN file and convert it to JSON format.
    Lines starting with '[' become metadata items.
    Lines starting with '1.' become a moves array.
    """
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = {}
    moves = []
    in_moves_section = False
    
    # Split content into lines
    lines = content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            in_moves_section = False
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
            # Remove move numbers and result notation
            # Split by spaces and filter out move numbers and result
            tokens = line.split()
            for token in tokens:
                # Skip move numbers (e.g., "1.", "2.", etc.)
                if re.match(r'\d+\.', token):
                    continue
                # Check if it's a result notation and store it
                if token in ['1-0', '0-1', '1/2-1/2', '*']:
                    result['result'] = token
                    continue
                # Add actual moves
                moves.append(token)
    
    # Add moves array to result
    if moves:
        result['moves'] = moves
    
    return result

# Main execution
if __name__ == "__main__":
    # Parse the PGN file
    pgn_data = parse_pgn_to_json('test.pgn')
    
    # Convert to JSON string with pretty printing
    json_output = json.dumps(pgn_data, indent=2)
    
    # Print the JSON output
    print(json_output)
    
    # Optionally save to a file
    with open('output.json', 'w', encoding='utf-8') as f:
        f.write(json_output)
    
    print("\nJSON file saved as 'output.json'")