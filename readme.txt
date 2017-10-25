
*********************************************

CHANGES:

I added a "database" json node to the run_config.json file which can be specified at table level and global level, 
just like the existing "schema" field. Just let me know if this is ok of if it needs to change.

Right now, to help me debug things I've got the cron string to run 2x per minute, on the 1st and 30th seconds.

*********************************************

NOTES:

I tried to keep all logging in the main, sql_poller.js file

sql_poller.js is the main file
sql_poller_forever.js simply runs the main sql_poller.js file

*********************************************
3RD-PARTY MODULES USED:

forever-monitor: To start and run the script (sql_poller.js), indefinitely
https://github.com/foreverjs/forever-monitor

cron: for the cron-scheduling in the JavaScript
https://github.com/kelektiv/node-cron

request: for posting data to the API endpoint
https://www.npmjs.com/package/request

winston: for creating error, info, and run_metadata log files
https://github.com/winstonjs/winston#creating-your-own-logger

mssql: for querying SQL databases/managing connections
https://www.npmjs.com/package/mssql

*********************************************

HIGH-LEVEL PROCESS STEPS:

1.sql_poller.js Grabs the config file containing the table/database/api information.
2.sql_poller.js Starts the cron job, periodically callling the main function, pollAllTablesForChanges().
3.sql_poller.js Re-grabs the main config file and then grabs the lastrundate, from the run_metadata.log file.
4.sql_poller.js The tables get looped through, creating the same # of TableUpdatePoster instances.
5.table_update_poster.js Handles the querying of data and the subsequent POST'ing of that data, if any to post.
6.sql_poller.js Upon completion, the function tableProcessComplete() is called, where connections are cleaned up and success is logged
