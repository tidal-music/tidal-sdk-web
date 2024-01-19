export "$(grep -vE "^(#.*|\s*)$" .env)"
TEST_USER=$TEST_USER npm run wtr $1
