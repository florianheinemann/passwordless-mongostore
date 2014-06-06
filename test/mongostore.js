'use strict';

var expect = require('chai').expect;
var uuid = require('node-uuid');
var chance = new require('chance')();

var MongoStore = require('../');
var TokenStore = require('passwordless-tokenstore');

var MongoClient = require('mongodb').MongoClient;

var standardTests = require('passwordless-tokenstore-test');

var testUri = 'mongodb://localhost/passwordless-mongostore-test';
function TokenStoreFactory() {
	return new MongoStore(testUri);
}

var dbcon = null

var beforeEachTest = function(done) {
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
}

var afterEachTest = function(done) {
	if(dbcon) {
		dbcon.close(function() {
			done();
		})
		return;
	}
	done();
}

// Call all standard tests
standardTests(TokenStoreFactory, beforeEachTest, afterEachTest);

describe('Specific tests', function() {

	beforeEach(function(done) {
		beforeEachTest(done);
	})

	afterEach(function(done) {
		afterEachTest(done);
	})

	it('should not allow the instantiation with an empty constructor', function () {
		expect(function() { new MongoStore() }).to.throw(Error);
	})

	it('should not allow the instantiation with an empty constructor', function () {
		expect(function() { new MongoStore(123) }).to.throw(Error);
	})

	it('should allow proper instantiation', function () {
		expect(function() { TokenStoreFactory() }).to.not.throw;
	})

	it('should allow proper instantiation with options', function () {
		expect(function() { new MongoStore(testUri, { db: {numberOfRetries:2}}) }).to.not.throw;
	})

	it('should default to "passwordless-token" as collection name', function (done) {
		var store = TokenStoreFactory();

		MongoClient.connect(testUri, function(err, db) {
			db.collection('passwordless-token', {strict:true}, function(err, collection) {
				expect(err).to.exist;

				store.storeOrUpdate(uuid.v4(), chance.email(), 
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

	it('should change name of collection based on "mongostore.collection"', function (done) {
		var store = new MongoStore(testUri, { mongostore : { collection: 'whatsup' }});

		MongoClient.connect(testUri, function(err, db) {
			db.collection('whatsup', {strict:true}, function(err, collection) {
				expect(err).to.exist;

				store.storeOrUpdate(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', 
					function() {
						db.collection('whatsup', {strict:true}, function(err, collection) {
							expect(collection).to.exist;
							expect(err).to.not.exist;
							done();
						});
					});
			});
		})
	})
})