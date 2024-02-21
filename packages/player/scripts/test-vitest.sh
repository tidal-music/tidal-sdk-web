export "$(grep -vE "^(#.*|\s*)$" .env)"
VITE_TEST_USER=$TEST_USER npm run _vitest $1
