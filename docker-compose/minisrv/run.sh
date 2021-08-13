#!/bin/bash

do_exit() {
	exit 1
}
trap do_exit SIGINT
trap do_exit SIGTERM

git pull
npm start
