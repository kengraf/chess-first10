import sys
import re
import random

NODES = [{"count":0, "steps":{}}] #  "steps" is array of json objects {"e4":1,"e5":2, etc...}
iNode = 0

def addGame(game):
    count = int(game.pop(0))
    if (count < 3): return
    while len(game):
        discardNumber = game.pop(0)
        add2nodes(count, game.pop(0)) # white
        add2nodes(count, game.pop(0)) # black
        
def add2nodes(count, step):
    global iNode, NODES

    if (step not in NODES[iNode]["steps"] ):
        NODES[iNode]["steps"][step] = len(NODES)
        iNode = len(NODES)
        NODES.append( {"count":count, "steps":{}} )
    else:
        iNode = NODES[iNode]["steps"][step]
        NODES[iNode]["count"] += count


def randomGameTest(turns):
    retVal = ""
    iNode = 0
    move = 1
    whiteTurn = True
    for _ in range(turns):
        totIndex = 0
        for step,index in NODES[iNode]["steps"].items():
            totIndex += NODES[index]['count']
        number = random.randint(0, totIndex)
        for step,index in NODES[iNode]["steps"].items():
            count = NODES[index]['count']
            if number > count:
                number -= count
            else:
                if whiteTurn:
                    retVal += f"{move}. "
                    move += 1
                whiteTurn = not whiteTurn
                retVal += f"{step} "
                break
        iNode = index
        
    for step,index in NODES[iNode]["steps"].items():
        retVal += f"\n\t{step} {NODES[index]['count']}"
                     
    return retVal     

   
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python nodeCreate.py <filename>")
        sys.exit(1)
    
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        content = f.read()
        f.close()
    
    lines = content.strip().split('\n')
    for line in lines:
        game = re.split(r'[ \t]', line)

        if (len(game) % 3) != 1:
            continue                    
        iNode = 0
        addGame(game)

    with open('first10.nodes', 'w', encoding='utf-8') as f:
        for n in NODES:
            f.write(f"{n['count']} {n['steps']}\n")    
