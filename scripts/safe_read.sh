#!/bin/bash
# Safe file read helper
# Usage: ./safe_read.sh <file> <start_line> <end_line>

FILE=$1
START=$2
END=$3

if [ ! -f "$FILE" ]; then
  echo "ERROR: File not found: $FILE"
  exit 1
fi

LINES=$(wc -l < "$FILE")
if [ -z "$LINES" ]; then
  LINES=0
fi

# Clamp range
S=$START
if [ $S -lt 1 ]; then S=1; fi
E=$END
if [ $E -gt $LINES ]; then E=$LINES; fi

echo "LINES=$LINES START=$S END=$E"
