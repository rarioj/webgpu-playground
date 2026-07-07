#!/bin/bash

PICSUMIDS=("10" "11" "13" "15" "17" "19" "20" "23" "25" "29" "30" "31" "35" "37" "40" "41" "43" "45" "47" "50" "53" "55" "59" "60" "61" "65" "67" "70" "71" "73" "75" "79" "80" "83" "85" "89" "90" "95" "97" "143" "210" "307" "766" "1073")
DIMENSIONS=("1024" "512" "256" "128" "64" "32" "16")

for PICSUMID in "${PICSUMIDS[@]}"; do
	for DIMENSION in "${DIMENSIONS[@]}"; do
		wget -c "https://picsum.photos/id/${PICSUMID}/${DIMENSION}/${DIMENSION}.webp" -O "${PICSUMID}-${DIMENSION}.webp"
	done
done
