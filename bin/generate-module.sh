#!/bin/bash

# Script to generate a new module package for the TIDAL SDK
# Run it and follow the prompt

readonly PLACEHOLDER="template"
ROOT_DIR=$(git rev-parse --show-toplevel)
readonly ROOT_DIR
PACKAGES_DIR="$ROOT_DIR/packages"
readonly PACKAGES_DIR

# Validate that our root directory contains a 'Template' dir. The script won't work otherwise
check_correct_repo() {
    if ! find $PACKAGES_DIR -maxdepth 1 -type d | grep -q $PLACEHOLDER; then
        echo "Repository root does not contain a '$PLACEHOLDER' directory!"
        echo "Are you sure you are in the correct project for this script?"
        exit 1
    fi
}

uppercase() {
    local string=$1
    first=$(echo "$string" | cut -c1 | tr [a-z] [A-Z])
    second=$(echo "$string" | cut -c2-)
    echo "$first$second"
}

# Ask user for module name
get_user_input() {
    printf "\nEnter new module's name, using PascalCase\nExample: PlaybackEngine\n" >&2
    read -r input
    printf "\nDo you want to create a module named '%s'?" "$input" >&2

    read -r -p "(y/n)"
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted!" >&2
        exit 1
    fi
    echo "$input"
}

# Copy template files to new module location
copy_files() {
    echo "Copying files to '$PACKAGES_DIR/$1'..."
    rsync -a --exclude='*dist/*' --exclude='*node_modules/*' --prune-empty-dirs "$PACKAGES_DIR/$PLACEHOLDER"/* "$PACKAGES_DIR/$1"
}

# Joins strings, separated by a submitted delimiter
join_by() {
    local IFS="$1"
    shift
    echo "$*"
}

# Replace PLACEHOLDER in file names with the chosen module name
rename_files() {
    local dir_name="$PACKAGES_DIR/$1"
    local file_name=$2
    for file in $(find "$dir_name" -name "*$PLACEHOLDER*" -type f); do
        if [[ $file == *.ts ]]; then
            fixed=$(echo $file | sed "s/$PLACEHOLDER/$file_name/g")
            echo $fixed
            mv "$file" "$fixed"
        fi
    done
}

# Replace the PLACEHOLDER keyword inside files with the module name
rename_keywords() {
    local base_name=$1
    local dir_name=$PACKAGES_DIR/$base_name
    local camel_case=$2
    local pascal_case="$(echo "$(tr '[:lower:]' '[:upper:]' <<< "${camel_case:0:1}")${camel_case:1}")"
    local uppercase_placeholder="$(uppercase $PLACEHOLDER)"

    for file in $(find "$dir_name" -type f); do
        if [[ $file == *.ts || $file == *.html ]]; then
            sed -i '' "s/$uppercase_placeholder/$pascal_case/g" $file
            sed -i '' "s/$PLACEHOLDER/$camel_case/g" $file
        elif [[ $file == *.json ]]; then
            sed -i '' "s/$PLACEHOLDER/$base_name/g" $file
        fi
    done
}

check_correct_repo
input=$(get_user_input)
dir_name="$(join_by '-' $(echo $input | grep -Eo '[A-Z][a-z]+' | tr '\n' ' ' | tr '[:upper:]' '[:lower:]'))"
camel_case_name="$(echo "$(tr '[:upper:]' '[:lower:]' <<< "${input:1:1}")${input:2}")"
copy_files "$dir_name"
rename_files $dir_name $camel_case_name
rename_keywords "$dir_name" "$camel_case_name"

echo "Done! Module '$input' has been successfully created in '$PACKAGES_DIR/$dir_name'."
