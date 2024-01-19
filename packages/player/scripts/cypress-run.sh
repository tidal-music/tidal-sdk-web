export "$(grep -vE "^(#.*|\s*)$" .env)"
CYPRESS_TEST_USER=$TEST_USER pnpm internal:cypress:run $1
