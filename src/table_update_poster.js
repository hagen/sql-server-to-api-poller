const _   = require('lodash')
const sqs = require('../lib/sqs')

/*
A class to manage the querying and (optional) subsequent POST'ing of the resulting query data records
*/
function TableUpdatePoster(opts) {

  // { sqs, migration, sql, success, error }
  this.opts = opts;
}

//Query the table and if it has results, send them to the API
TableUpdatePoster.prototype.queryAndPostUpdateRecords = function() {

  var that = this;

  var sqlOpts = this.opts.sql;
  var queryOptions = sql.getNewQueryOptions();
  queryOptions.user = sqlOpts.user;
  queryOptions.password = sqlOpts.password;
  queryOptions.server = sqlOpts.server;
  queryOptions.database = sqlOpts.database;
  queryOptions.queryString = "SELECT * FROM " + sqlOpts.schema +
    "." + sqlOpts.table + " WHERE " + sqlOpts.updatedColumn + " " +
    "BETWEEN '" + sqlOpts.lowerDate + "' AND '" + sqlOpts.upperDate + "'";

  /**
   * Success handler
   */
  const onSuccess = (results) => {
    if (results) {
      that.pushToSQS(that.opts, results.recordset || [])
        .then(() => {
          that.opts.onSuccess(results)
        })
    } else {
      if (that.opts.onSuccess) {
        that.opts.onSuccess([])
      }
    }
  }

  /**
   * onErrors
   * @param  {[type]} err [description]
   * @return {[type]}     [description]
   */
  const onError = (err) => {
    if (that.opts.onError) {
      that.opts.onError(err)
    }
  }

  // Execute query returns a promise.
  sqlConn.executeQuery(queryOptions)
    .then(onSuccess)
    .catch(onError);
}

//Send of any records to the API
TableUpdatePoster.prototype.pushToSQS = function(opts, records) {

  const send = (chunk) => {
    return new Promise( ( resolve, reject ) => {
      setTimeout(() => {
        const params = {
          QueueUrl : sqs_url,
          Message : JSON.stringify({
            "schema": opts.sqlOptions.schema,
            "table": opts.sqlOptions.table,
            "ran_at": opts.sqlOptions.upperDate,
            "total_records": chunk.length,
            "records": chunk
          })
        }
        sqs.sendMessage(params)
          .then(() => {
            resolve(chunk)
          })
          .catch(reject)
      }, 200)
    })
  }

  // Chunk records into batches of 50
  // fire these at SQS. SQS can only receive 300 messages per second,
  // to we may need a slight throttle
  const proms = _.chunk(records, 50).map(send)

  // When all proms are done, we can concat the results and return
  return new Promise( ( resolve, reject ) => {
    Promise.all(proms)
      .then((results_sets) => {
        resolve(_.concat(...results_sets))
      })
      .catch(reject)
  })
}

module.exports = TableUpdatePoster;
