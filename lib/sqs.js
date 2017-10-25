const secrets   = require('../config/secrets')
const AWS       = require('aws-sdk')
const sqs       = new AWS.SQS({ region : secrets.sqs.region })
const NUMBER_OF_MESSAGES = 'ApproximateNumberOfMessages'

/**
 * publish wrapper
 * @param  {[type]}   param [description]
 * @return {[type]}         [description]
 */
function sendMessage(params) {
  return new Promise( ( resolve, reject ) => {
    sqs.sendMessage(params, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

/**
 * publish wrapper
 * @param  {[type]}   param [description]
 * @return {[type]}         [description]
 */
function sendMessageBatch(params) {
  return new Promise( ( resolve, reject ) => {
    sqs.sendMessageBatch(params, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

/**
 * publish wrapper
 * @param  {[type]}   param [description]
 * @return {[type]}         [description]
 */
function receiveMessage(params) {
  return new Promise( ( resolve, reject ) => {
    sqs.receiveMessage(params, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

/**
 * publish wrapper
 * @param  {[type]}   param [description]
 * @return {[type]}         [description]
 */
function deleteMessage(params) {
  return new Promise( ( resolve, reject ) => {
    sqs.deleteMessage(params, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

/**
 * publish wrapper
 * @param  {[type]}   param [description]
 * @return {[type]}         [description]
 */
function getQueueAttributes(params) {
  return new Promise( ( resolve, reject ) => {
    sqs.getQueueAttributes(params, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}
/**
 * Returns the approx number of entries still in the queue.
 * This is used to decide whether the Lambda kicks itself off again.
 * @return {[type]} [description]
 */
function getApproxQueueDepth(queue_url) {
  return new Promise( ( resolve, reject ) => {
    const params = {
      QueueUrl : queue_url,
      AttributeNames : [NUMBER_OF_MESSAGES]
    }
    getQueueAttributes(params)
      .then((result) => {
        resolve(result.Attributes[NUMBER_OF_MESSAGES] ? parseInt(result.Attributes[NUMBER_OF_MESSAGES], 10) : 0 )
      })
      .catch(reject)
  })
}
module.exports = {
  sendMessage         : sendMessage,
  sendMessageBatch    : sendMessageBatch,
  receiveMessage      : receiveMessage,
  deleteMessage       : deleteMessage,
  getQueueAttributes  : getQueueAttributes,
  getApproxQueueDepth : getApproxQueueDepth
}
