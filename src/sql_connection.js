var sql = require("mssql");

/*
A class to provide easy-querying for the calling code, that manages a collection of Connection Pools internally.
*/
function SQLConnection(){

	this._poolCache = {};
}

//The entry-point that the calling-code uses for querying.
SQLConnection.prototype.executeQuery = function(queryOpts){

	return new Promise(function(resolve, reject) {
		this.getConnectionPool(queryOpts, function(pool){
			pool.request()
				.query(queryOpts.queryString, function (err, result) {
					if (err) reject(err)
					else resolve(result)

					// if(err && queryOpts.onError){
					//
					// 	queryOpts.onError(err);
					// }
					// else{
					//
					// 	queryOpts.onSuccess(result);
					// }
				})
		})
	}.bind(this))
}

//Closes a given connection
SQLConnection.prototype.closeConn = function(queryOpts){

	var tmpPool = this._poolCache[this.getPoolKey(queryOpts)];
	if(tmpPool && tmpPool.connected === true){

		tmpPool.close();
	}
}

//Closes all connections
SQLConnection.prototype.closeAll = function(){

	var tmpPool;
	for(var poolKey in this._poolCache){

		tmpPool = this._poolCache[poolKey];

		if(tmpPool && tmpPool.connected === true){

			tmpPool.close();
		}
	}
}

//Either gets a new pool, a cached&connected pool, or a cached pool & reconnects it for use.
SQLConnection.prototype.getConnectionPool = function(queryOpts, successCallback){

	var that = this;
	var poolKey = this.getPoolKey(queryOpts);
	var cachedPool = this._poolCache[poolKey];
	if(cachedPool && cachedPool.connected === true){

		successCallback(cachedPool);
	}
	else if(cachedPool && cachedPool.connected === false){

		this.waitOnCachedPoolToConnect(cachedPool, successCallback, queryOpts.onError);
	}
	else{

		this._poolCache[poolKey] = this.createNewPool(queryOpts, successCallback);
	}
}

//Creates a brand-new pool.
SQLConnection.prototype.createNewPool = function(queryOpts, successCallback){

	var config = {
		user: queryOpts.user,
		password: queryOpts.password,
		server: queryOpts.server,
		database: queryOpts.database,
		pool: queryOpts.pool || {max:10, min:0, idleTimeoutMillis:30000}
	}

	var pool = 	new sql.ConnectionPool(config, function(err){

		if(err && queryOpts.onError){

			queryOpts.onError(err);
		}
		else{

			successCallback(pool);
		}
	});

	pool.on('error', function(err){

		if(err && queryOpts.onError){

			queryOpts.onError(err);
		}
	});

	return pool;
}

//Reconnects a cached pool
SQLConnection.prototype.waitOnCachedPoolToConnect = function(cachedPool, successCallback, errorCallback){

	var checkIfPoolIsConnectedYet = setInterval(function(){

		if(cachedPool.connected === true){

			clearInterval(checkIfPoolIsConnectedYet);

			successCallback(cachedPool);
		}
		else if(cachedPool.connected === false && cachedPool.connecting === false){

			cachedPool.connect(cachedPool.config, function(err){

				clearInterval(checkIfPoolIsConnectedYet);

				if(err && errorCallback){

					errorCallback(err);
				}
				else{

					successCallback(cachedPool);
				}
			});
		}
	}, 100);
}

//Returns the cache key
SQLConnection.prototype.getPoolKey = function(queryOpts){

	return queryOpts.database + queryOpts.password + queryOpts.server + queryOpts.user;
}

//Object that holds the options for querying a database.
function QueryOptions(){

	this.onError;//callback(error)
	this.onSuccess;//callback(results)
	this.queryString = "";
	this.user = "";
	this.password = "";
	this.server = "";
	this.database = "";
}

module.exports = {

	getNewSQLConnection:function(){

		return new SQLConnection();
	},
	getNewQueryOptions:function(){

		return new QueryOptions();
	}

};
