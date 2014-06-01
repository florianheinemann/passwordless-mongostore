'use strict';

var expect = require('chai').expect;
var MongoStore = require('../');
var TokenStore = require('passwordless').TokenStore;
var uuid = require('node-uuid');
var chance = new require('chance')();
var MongoClient = require('mongodb').MongoClient;

var testUri = 'mongodb://localhost/passwordless-mongostore-test';

function TokenStoreFactory() {
	return new MongoStore(testUri);
}

var dbcon = null

beforeEach(function(done) {
	MongoClient.connect(testUri, function(err, db) {
		dbcon = db;

		var dropCollection = function(collections, i) {
			if(i === 0) {
				done();
			} else {
				i--;
				collections[i].drop(function(a, b) {
					dropCollection(collections, i);
				})
			}
		}

		if(err) {
			return done(err);
		}

		db.collections(function(err, collections) {
			dropCollection(collections, collections.length);
		})
	})
})

afterEach(function(done) {
	if(dbcon) {
		dbcon.close(function() {
			done();
		})
		return;
	}
	done();
})

describe('Specific tests', function() {
	it('should not allow the instantiation with an empty constructor', function () {
		expect(function() { new MongoStore() }).to.throw(Error);
	})

	it('should allow proper instantiation', function () {
		expect(function() { TokenStoreFactory() }).to.not.throw;
	})

	it('should default to "passwordless-token" as collection name', function (done) {
		var store = TokenStoreFactory();

		MongoClient.connect(testUri, function(err, db) {
			db.collection('passwordless-token', {strict:true}, function(err, collection) {
console.log(collection)
				expect(err).to.exist;

				store.store(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', 
					function() {
						db.collection('passwordless-token', {strict:true}, function(err, collection) {
							expect(collection).to.exist;
							expect(err).to.not.exist;
							done();
						});
					});
			});
		})
	})
})