var winston = require("winston");

/*
Simple wrapper around winston. Need 2 logger instances due to the way the logging levels behave 
and can "trickle up" into one-anothers log files. Errors will pollute the "runmetadata" log if the
loggers were combined, as "run_metadata.log" must ONLY hold records of the last run datetime.
*/
function Logger(){
	
	//one logger for info and runmetadata
	this._logger = new winston.Logger({
		levels:{
		  info: 1,
		  runmetadata: 0
		},
		transports: [
			new winston.transports.Console(),
			new winston.transports.File({
				name: 'info-file',
				filename: 'logs/info.log',
				level: 'info',
				timestamp: true
			}),
			new winston.transports.File({
				name: 'run-metadata-file',
				filename: 'logs/run_metadata.log',
				level: 'runmetadata',
				timestamp: true
			})
		]
	});
	
	//a separate logger exclusively for errors
	this._errorLogger = new winston.Logger({
		transports: [
			new winston.transports.Console(),
			new winston.transports.File({
				name: 'error-file',
				filename: 'logs/errors.log',
				level: 'error',
				timestamp: true
			})
		]
	});
}

//Entry point for calling code, to log a message
Logger.prototype.log = function(levelName, data){
	
	if(levelName === "error"){
		
		this._errorLogger.log("error", data);
	}
	else{
		
		this._logger.log(levelName, data);
	}
}

//Grabs the lastrundate record out of the log
Logger.prototype.getLastRunDate = function(callback){

	var options = {
		from: new Date(1970, 1),
		until: new Date(),
		limit: 1,
		start: -1,
		transport: "run-metadata-file",
		fields: ["lastrundate"]
	};

	this._logger.query(options, function (err, result) {

		if (err) {

			throw err;
		}
		
		var lastrundate;
		if(result.length > 0){
			
			lastrundate = result[0].lastrundate;
		}

		callback(lastrundate);
	});
}

module.exports = (function(){return new Logger()})();
