var forever = require('forever-monitor');
var child = new (forever.Monitor)('./src/sql_poller.js', {
	max: 1,
	silent: false,
	args: []
});

child.on('exit', function () {
	console.log('sql_poller.js has exited');
});

child.start();
