#!/bin/sh

i=0
max=10
while [ $i -lt $max ]; do
	wget -c "https://loremflickr.com/256/256/puppy?random=${i}" -O "puppy${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/kitten?random=${i}" -O "kitten${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/bird?random=${i}" -O "bird${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/building?random=${i}" -O "building${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/spring?random=${i}" -O "spring${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/autumn?random=${i}" -O "autumn${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/summer?random=${i}" -O "summer${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/winter?random=${i}" -O "winter${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/waterfall?random=${i}" -O "waterfall${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/mountain?random=${i}" -O "mountain${i}.jpeg"
	wget -c "https://loremflickr.com/256/256/pattern?random=${i}" -O "pattern${i}.jpeg"
	true $((i++))
done
