#!/bin/bash

PICSUMIDS=("10" "15" "20" "25" "30" "35" "40" "45" "50" "55" "60" "65" "70" "75" "80" "85" "90" "95" "143" "210" "307" "766" "1073")
DIMENSIONS=("512" "256" "128" "64" "32" "16")

for PICSUMID in "${PICSUMIDS[@]}"; do
	for DIMENSION in "${DIMENSIONS[@]}"; do
		wget -c "https://picsum.photos/id/${PICSUMID}/${DIMENSION}/${DIMENSION}.webp" -O "${PICSUMID}-${DIMENSION}.webp"
	done
done
