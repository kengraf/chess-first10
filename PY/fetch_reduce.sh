#!/bin/bash
for week in {920..1000}; do
    echo "Week: $week"
    curl -s https://theweekinchess.com/zips/twic${week}g.zip -o ${week}.zip
    unzip -qq -u ${week}.zip
    python fetch_reduce.py twic${week}.pgn
    wc first10.pgn
    rm ${week}.zip twic${week}.pgn
done
