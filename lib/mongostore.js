'use strict';

var util = require('util');
var TokenStore = require('passwordless-tokenstore');
var MongoClient = require('mongodb').MongoClient;

function MongoStore(connection) {
	if(!connection) {
		throw new Error('A valid connection string has to be provided');
	}

	TokenStore.call(this);

	this._uri = connection;
	this._db = null;
	this._collection = null;
	this._collectionName = 'passwordless-token';
}

util.inherits(MongoStore, TokenStore);

MongoStore.prototype.authenticate = function(token, callback) {
	if(!token || !callback) {
		throw new Error('TokenStore:authenticate called with invalid parameters');
	}

	this._get_collection(function(collection) {
		collection.findOne({hashedToken: token,
							ttl: { $gt: new Date() }}, function(err, item) {
			if(err) {
				callback(err);
			} else if(item) {
				callback(null, item.uid, item.originUrl);
			} else {
				callback(null, null, null);
			}
		});
	});
};

MongoStore.prototype.storeOrUpdate = function(token, uid, msToLive, originUrl, callback) {
	if(!token || !uid || !msToLive || !callback) {
		throw new Error('TokenStore:storeOrUpdate called with invalid parameters');
	}
	this._get_collection(function(collection) {
		var newRecord = {
			'hashedToken': token,
			'uid': uid,
			'ttl': new Date(Date.now() + msToLive),
			'originUrl': originUrl
		}

		// Insert or update
		collection.update( { 'uid': uid}, newRecord, {w:1, upsert:true}, function(err, result) {
			if(err) {
				callback(err);
			} else {
				callback();
			}
		});
	});
}

MongoStore.prototype.remove = function(hashedToken, callback) {
	if(!hashedToken || !callback) {
		throw new Error('TokenStore:remove called with invalid parameters');
	}
	this._get_collection(function(collection) {
		collection.remove( { 'hashedToken': hashedToken}, {w:1}, function(err, result) {
			if(err) {
				callback(err);
			} else {
				callback();
			}
		});
	});
}

MongoStore.prototype.clear = function(callback) {
	if(!callback) {
		throw new Error('TokenStore:clear called with invalid parameters');
	}
	this._get_collection(function(collection) {
		collection.remove( {}, {w:1}, function(err, result) {
			if(err) {
				callback(err);
			} else {
				callback();
			}
		});
	});
}

MongoStore.prototype.length = function(callback) {
	this._get_collection(function(collection) {
		collection.count(callback);
	});
}

MongoStore.prototype._connect = function(callback) {
	var self = this;
	if(self._db) {
		callback(self._db);
	} else {
		MongoClient.connect(self._uri, function(err, db) {
			if(err) {
				throw new Error('Error connecting to MongoDB: ' + err);
			} else {
				db.on('close', function() {
					self._db = null;
				});
				self._db = db;
				callback(db);
			}
		})
	}
}

MongoStore.prototype._get_collection = function(callback) {
	var self = this;
	if(self._collection) {
		callback(self._collection);
	} else {
		self._connect(function(db) {
			db.collection(self._collectionName, function(err, collection) {
				if(err) {
					throw new Error('Error connecting to collection: ' + err);
				} else {
					self._set_index(collection, callback);
				}
			});
		})		
	}
}

MongoStore.prototype._set_index = function(collection, callback) {
	var self = this;
	collection.ensureIndex( { 'hashedToken': 1 }, { unique: true }, function(err, index) {
		if(err) {
			throw new Error('Error creating index on hashedToken: ' + err);
		}
		collection.ensureIndex( { 'uid': 1 }, { unique: true }, function(err, index) {
			if(err) {
				throw new Error('Error creating index on uid: ' + err);
			}
			collection.ensureIndex( { "ttl": 1 }, { expireAfterSeconds: 0 }, function(err, index) {
				if(err) {
					throw new Error('Error creating ttl index on ttl: ' + err);
				}
				self._collection = collection;
				callback(collection);
			})
		})
	})
}

module.exports = MongoStore;