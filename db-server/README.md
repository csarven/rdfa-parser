# How to setup stardog server

You need to download stardog database and a community key-file 
from http://stardog.com

create the folders, extract stardog files to `./db-server/stardog` 
and move the key-file to `./db-server/db`

run `npm run-script start-db-server` to start and 
`npm run-script stop-db-server` to stop the server

server should reachable at http://localhost:5820/
