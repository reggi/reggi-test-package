#!/usr/bin/env bash
TMP_DIR=$(mktemp -d)
git clone --depth 1 --single-branch --branch oidc https://github.com/npm/cli.git "$TMP_DIR/cli"
cd "$TMP_DIR/cli"
npm install
npm install -g .
cd -
npm config set loglevel silly
