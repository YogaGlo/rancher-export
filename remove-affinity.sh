#!/bin/bash

if [ -x $1 ]; then
	echo "Enter an environment name. It's a directory under 'export'. If unsure, stop now and seek help."
	exit 1
fi

cd ./export/$1

find . -type f -name "*.yml" -exec sed -i.bak '/affinity/d' {} +
find . -type f -name "*.bak" -exec rm {} +
