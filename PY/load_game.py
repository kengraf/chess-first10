import ast

# Read and the compiled move nodes.parse the file
nodes = {}
with open('nodes.data', 'r') as f:
	for line in f:
		line = line.strip()
		if line:
			# Each line(node) is a dictionary string
			nodes.append(ast.literal_eval(line))

# Only the 10 moves (20 stesp) are stored
# User controls
color2play = "white" # white|black|random
selector = "first" # random|weighted|first|last
depth = 6 # random|3-10
pgn = ""	# Format: "1. e4 e5 2.d4 ..."
steps = (depth-1)*2
if color2play == "black":
	steps += 1

node = nodes[0]
for s in range(steps):
	if s % 2 == 0:
		pgn += f"{s//2+1}. "	# Add move number
	match selector:
		case "first":
			step = node["step"][0]
			next = node["next"][0]
		case "last":
			numSteps = len(node["step"])-1
			step = node["step"][numSteps]
			next = node["next"][numSteps]
		case "random":
			print("Restarting the service.")
		case "weighted":
			print("Restarting the service.")
		case _:
			print("Unknown command.")
	pgn += f"{step} "
	node = nodes[next]
print(pgn)
