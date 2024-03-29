#!/bin/bash

readonly FILE=$1

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && cd .. && pwd)
readonly ROOT_DIR

VERSION_FILE="$ROOT_DIR/$FILE"
readonly VERSION_FILE

echo "Checking version entry in '$ROOT_DIR/$VERSION_FILE'"

last_commit="$(git rev-parse @)"
previous_commit="$(git rev-parse @~)"

# Check if the submitted file exists and is correctly named
verify_file_validity() {
    file=$1
    if [ ! -f "$file" ]; then
        echo "File '$file' not found. Cannot check for version bump in '$DIR'"
        exit 1
    fi
    if [ ! "${file: -12}" == "package.json" ]; then
        echo "File '$file' is not a \"package.json\" and cannot be analyzed."
        exit 1
    fi
}

# Compare two version entries
is_version_bump() {
    result="false"
    old_version=$1
    new_version=$2

    old_version=${old_version##*:}
    new_version=${new_version##*:}

    if  [[ "$new_version" > "$old_version" ]]; then
        result="true"
    fi
    echo $result
}

verify_file_validity "$FILE"

version_diff="$(git diff $previous_commit $last_commit $ROOT_DIR/$FILE)"
should_build_release=false

if [ -n "$version_diff" ]; then
    old_version_prefix='.*-  "version": "'
    new_version_prefix='.*+  "version": "'

    old_version="$(printf "$version_diff" |
        grep "$old_version_prefix" |
        grep -Eo "(0|[1-9]\d*)\..*" |
        tr -d "\",|")"

    new_version="$(printf "$version_diff" |
        grep "$new_version_prefix" |
        grep -Eo "(0|[1-9]\d*)\..*" |
        tr -d "\",|")"

    should_build_release=$(is_version_bump "$old_version" "$new_version")
fi

if [ "$should_build_release" == "true" ]; then
    echo "Version bump detected"
    exit 0
else
    echo "No version bump detected"
    exit 1
fi
