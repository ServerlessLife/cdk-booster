#!/bin/bash

# Check bundling behavior in CDK logs
# Usage: ./check-bundling.sh <log-file> <should-bundle>
# where should-bundle is "true" or "false"

LOG_FILE="$1"
SHOULD_BUNDLE="$2"

if [ -z "$LOG_FILE" ] || [ -z "$SHOULD_BUNDLE" ]; then
    echo "Usage: $0 <log-file> <should-bundle>"
    echo "  log-file: Path to the CDK log file"
    echo "  should-bundle: 'true' if bundling is expected, 'false' if not"
    exit 1
fi

if [ ! -f "$LOG_FILE" ]; then
    echo "ERROR: Log file '$LOG_FILE' not found."
    exit 1
fi

BUNDLING_FOUND=$(grep -q "Bundling asset" "$LOG_FILE" && echo "true" || echo "false")

if [ "$SHOULD_BUNDLE" = "true" ]; then
    if [ "$BUNDLING_FOUND" = "false" ]; then
        echo "ERROR: Expected 'Bundling asset' not found in $LOG_FILE"
        exit 1
    else
        echo "SUCCESS: Bundling was found as expected in $LOG_FILE"
    fi
elif [ "$SHOULD_BUNDLE" = "false" ]; then
    if [ "$BUNDLING_FOUND" = "true" ]; then
        echo "ERROR: Unexpected 'Bundling asset' found in $LOG_FILE"
        exit 1
    else
        echo "SUCCESS: No bundling found as expected in $LOG_FILE"
    fi
else
    echo "ERROR: should-bundle must be 'true' or 'false'"
    exit 1
fi
