'use strict';

var util = require('util');
var TokenStore = require('passwordless').TokenStore;
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

MongoStore.prototype.authenticate = function(hashedToken, callback) {
	if(!hashedToken || !callback) {
		throw new Error('TokenStore:authenticate called with invalid parameters');
	}

	this._get_collection(function(collection) {
		collection.findOne({hashedToken: hashedToken,
							ttl: { $gt: Date.now() }}, function(err, item) {
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

MongoStore.prototype.store = function(hashedToken, uid, msToLive, originUrl, callback) {
	if(!hashedToken || !uid || !msToLive || !callback) {
		throw new Error('TokenStore:store called with invalid parameters');
	}

	this._get_collection(function(collection) {
		var newRecord = {
			'hashedToken': hashedToken,
			'uid': uid,
			'ttl': Date.now() + msToLive,
			'originUrl': originUrl
		}

		collection.insert(newRecord, {w:1}, function(err, result) {
			if(err) {
				callback(err);
			} else {
				callback();
			}
		});
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
					collection.ensureIndex( { 'hashedToken': 1 }, { unique: true }, function(err, index) {
						if(err) {
							throw new Error('Error creating index: ' + err);
						}
						self._collection = collection;
						callback(collection);
					})
				}
			});
		})		
	}
}

module.exports = MongoStore;