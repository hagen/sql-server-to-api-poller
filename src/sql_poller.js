const fs = require("fs");
const logger = require("./logger.js"); //simple wrapper around winston, for logging errors and last-run metadata
const moment = require('moment')
let config; //the config file
const TableUpdatePoster = require("./table_update_poster.js"); //the component that polls & posts
let currentDateTime;
let lastRunDateTime;
let numTablesToProcess;
let numTablesProcessed;
let runCount = 0;

//global sql connection
sql = require("./sql_connection.js");
sqlConn = sql.getNewSQLConnection();

//Trigger the first occurrence
pollAllTablesForChanges();

//Establish the cron schedule
var CronJob = require('cron').CronJob;
var job = new CronJob({
  cronTime: config.interval,
  onTick: function() {
    runCount++;
    logger.log("info", "runCount::::" + runCount);
    pollAllTablesForChanges();
  },
  start: false
});
job.start();

/**
 * [pollAllTablesForChanges description]
 * @return {[type]} [description]
 */
function pollAllTablesForChanges() {

  // Use FS to re-read the config, in case it changes mid-flight.
  // Config is global
  config = JSON.parse(fs.readFileSync("./config/run_config.json"))

  const tables = config.tables;
  currentDateTime = new Date()
  numTablesToProcess = tables.length;
  numTablesProcessed = 0;

  /**
   * [beginPolling description]
   * @return {[type]} [description]
   */
  const beginPolling = () => {
    var tableUpdatePoster;
    for (var tblIx = 0; tblIx < tables.length; tblIx++) {

      tableUpdatePoster = new TableUpdatePoster(getTableDiffOptions(tables[tblIx]));
      tableUpdatePoster.queryAndPostUpdateRecords();
    }
  }

  //Get the last-run time and start the polling
  logger.getLastRunDate(function(lastrundate) {

    if (lastrundate) {
      lastRunDateTime = new Date(lastrundate);
    } else {
      lastRunDateTime = new Date(1900, 0, 1);
    }

    logger.log("runmetadata", {
      lastrundate: currentDateTime
    });

    beginPolling();
  })
}

//Creates the "options" parameter for a given TableUpdatePoster
function getTableDiffOptions(tableOptsFromJson) {

  var sqlOptions = getSqlOptions(tableOptsFromJson);
  var onSuccess = function(jsonRecords) {
    var tablePath = sqlOptions.server + "." + sqlOptions.schema + "." + sqlOptions.table;
    if (jsonRecords && jsonRecords.length > 0) {
      logger.log("info", `${jsonRecords.length} records updated for ${tablePath}`);
    } else {
      logger.log("info", "No records updated for " + tablePath);
    }
    tableProcessComplete();
  }

  var onError = function(err) {
    var tablePath = sqlOptions.server + "." + sqlOptions.schema + "." + sqlOptions.table;
    logger.log("error", "The following error occurred when working with " + tablePath);
    logger.log("error", err);
    tableProcessComplete();
  }

  return {
    sqs       : Object.assign({}, config.sqs),
    migration : Object.assign({}, config.migration),
    sql       : sqlOptions,
    onSuccess : onSuccess,
    onError   : onError
  };
}

//Closes all SQL connections and logs complete.
function tableProcessComplete() {

  numTablesProcessed++;
  if (numTablesProcessed === numTablesToProcess) {
    sqlConn.closeAll();
    logger.log("info", "process completed!");
  }
}

//Creates a SQL "options" object, to interact with the data properly
function getSqlOptions(tableOptsFromJson) {

  var getTableOptOrGlobalDefault = function(cfgFieldName) {
    if (tableOptsFromJson.hasOwnProperty(cfgFieldName)) {
      return tableOptsFromJson[cfgFieldName];
    } else if (config.global.hasOwnProperty(cfgFieldName)) {
      return config.global[cfgFieldName];
    }
    logger.log("error", "No property named: " + cfgFieldName + " was found.");
  }

  var sqlOptions = {};
  sqlOptions.user = getTableOptOrGlobalDefault("user");
  sqlOptions.password = getTableOptOrGlobalDefault("password");
  sqlOptions.database = getTableOptOrGlobalDefault("database");
  sqlOptions.server = getTableOptOrGlobalDefault("server");
  sqlOptions.schema = getTableOptOrGlobalDefault("schema");
  sqlOptions.table = getTableOptOrGlobalDefault("table");
  sqlOptions.updatedColumn = getTableOptOrGlobalDefault("update_column");
  sqlOptions.columnsToLower = getTableOptOrGlobalDefault("columns_to_lower");
  sqlOptions.lowerDate = moment(lastRunDateTime).utc().format('YYYY-MM-DD HH:mm:ss');
  sqlOptions.upperDate = moment(currentDateTime).utc().format('YYYY-MM-DD HH:mm:ss')

  return sqlOptions;
}
