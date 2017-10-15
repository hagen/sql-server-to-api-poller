# sql-server-to-api-poller
This README is to serve as the specification for an SQL Server poller,
that'll post all updated records to an API endpoint.

# Background
SQL Server editions greater than SQL Express, support replication through the bin log/ tlog (usually).
But many .Net applications ship with SQL Express embedded and as a result, lose the ability
to attach to the bin log for updates. Accordingly, it's impossible to check for updates to SQL Express
tables without checking periodically.
I'd like to build a NodeJS service that'll check n number of tables for updates, and for each found, push
the updated record to an API endpoint.

# Polling SQL Server
Polling is a PITA. It's memory intensive, places a burden on the DB that could result in no records
being read, and is generally shitty practice. But thems the punches. We gotta roll with them.
I need to specify, withing each instance, all tables ([schema].[table]) that should be checked.
For each table, I'll also specify a timestamp type column that can be checked to see when the record
was last updated.
Config to select the tables might look like this:
```json
{    
    "update_column" : "updated_at", // Global options, which can be over-ridden
    "interval" : "5 * * * * * *", // Cron syntax
    "tables" : [{
        "schema" : "dbo",
        "table" : "widgets",
        "update_column" : "updated_ts"
    },{
        "schema" : "dbo",
        "table" : "invoices"
    },{
        "schema" : "dbo",
        "table" : "line_items"
    },{
        "schema" : "airport",
        "table" : "flights"
    }]
}
```
Although the `tables` property could define each and every options for each and every table,
it could make sense to have global options, which are over-ridden by the `tables` config. So,
`updated_at` might be the default column to check here, but for the table dbo.widgets, the column
to check is actually `updated_ts`.

# Remembering _last run_
Implementation is totally up to you, however, you probably need to remember the last time you checked
for updates. For example, if you're checking every 5 minutes for an update, you'll need to know when you
last checked for an update to be sure that your WHERE clause is updated accordingly.

## Run 1
* Last run doesn't exist, so check for all records
* lower = 1900-01-01T00:00:00 (beginning of time)
* upper = NOW() (2017-10-10T12:00:01 UTC)
```SQL
SELECT * FROM {{schema.table}} WHERE UTC({{update_column}}) IS BETWEEN {{lower}} and {{upper}}
```
Because there may be updates during our process, we must delimit the query with an upper limit.
This ensures that any updates don't affect the total number of records we are processing.
We will pick up the update in the next run.
Record the 'upper' as our 'lower' for the next time round.

## Run 2 (10 minues later)
* Current time is 2017-10-10T12:10:10 UTC
* lower = 2017-10-10T12:00:01 UTC (last run upper limit)
* upper = NOW() (2017-10-10T12:10:10 UTC)
```SQL
SELECT * FROM {{schema.table}} WHERE UTC({{update_column}}) IS BETWEEN {{lower}} and {{upper}}
```

## Run 3 (another 5 minutes later)
* Current time is 2017-10-10T12:20:30 UTC
* lower = 2017-10-10T12:10:10 UTC (last run upper limit)
* upper = NOW() (2017-10-10T12:20:30 UTC)
```SQL
SELECT * FROM {{schema.table}} WHERE UTC({{update_column}}) IS BETWEEN {{lower}} and {{upper}}
```

And so on, ad infinitum. At each run, total records processed, per table, should be recorded. Consider
using Winston (npm package winston) to log to local file. NPM package forever can also be used, which 
will route console output to local files. I'm happy with either.

# Stop/start
The service should pick up where it left off upon restart.

# API endpoint
All updated records should be posted to an API endpoint. With a large volume of records, posting
one by one is not going to work. So for all processed records for a given table, these can be POSTed
as a collection.
```CURL
POST https://api.domain.tld/v1/arbitrary/path/to/service
```
This should be a configurable option. Building on the config from before, this might now become:
```json
{    
    "api" : {
        "url" : "",
        "headers" : {

        }, // All headers should be configurable, to support Auth and other Header-based mechanisms
        "method" : "post",
    },
    "update_column" : "updated_at", // Global options, which can be over-ridden
    "interval" : "5 * * * * * *", // Cron syntax
    "tables" : [{
        "schema" : "dbo",
        "table" : "widgets",
        "update_column" : "updated_ts"
    },{
        "schema" : "dbo",
        "table" : "invoices"
    },{
        "schema" : "dbo",
        "table" : "line_items"
    },{
        "schema" : "airport",
        "table" : "flights"
    }]
}
```
I imagine it'll closely mirror the _request npm module_ config, as you'll probably need to use request to push the data out.

## POST body
In order to send lots of records, they can be combined into a JSON array. However, the object POSTed
must also include information about where the data has come from, which will dictate how it is handled
by the API. Another example:
```JSON
{
    "schema" : "schema",
    "table" : "table_name",
    "ran_at" : "<timestamp UTC>",
    "total_records" : 3,
    "records" : [{ ... }, { ... }, { ... }]
}
```
Each object in the records collection, represents a single line in the table. Data types in the DB
will be converted to their JS equivalent. 