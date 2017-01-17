#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export STARDOG_HOME="$DIR/db"

$DIR/stardog/bin/stardog-admin server start