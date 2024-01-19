export "$(grep -vE "^(#.*|\s*)$" .env)"
CYPRESS_TEST_USER=$TEST_USER pnpm internal:cypress:open $1
