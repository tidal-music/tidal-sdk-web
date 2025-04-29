export "$(grep -vE "^(#.*|\s*)$" .env)"
TEST_USER=$TEST_USER pnpm run wtr $1
