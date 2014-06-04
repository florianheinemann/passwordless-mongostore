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

describe('General TokenStore tests (no need to modify)', function() {
	describe('Tests', function() {
		it('should be an instance of TokenStore', function () {
			expect(TokenStoreFactory() instanceof TokenStore).to.be.true;
		})

		describe('store()', function() {
			it('should allow the storage of a new token', function () {
				expect(function() { TokenStoreFactory().store(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {}) }).to.not.throw;
			})

			it('should handle duplicate UIDs gracefully', function (done) {
				var store = TokenStoreFactory();
				store.store(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						expect(arguments.length).to.equal(0);

						store.store(uuid.v4(), chance.email(), 
							1000*60, 'http://' + chance.domain() + '/page.html', function() {
								expect(arguments.length).to.equal(0);
								done();
							})
					});

			})

			it('should return an error in the format of callback(error) in case of duplicate tokens', function (done) {
				var store = TokenStoreFactory();
				var token = uuid.v4();
				store.store(token, chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						expect(arguments.length).to.equal(0);

						store.store(token, chance.email(), 
							1000*60, 'http://' + chance.domain() + '/page.html', function() {
								expect(arguments.length).to.equal(1);
								done();
							})
					});

			})

			it('should throw exceptions for missing data', function () {
				var store = TokenStoreFactory();
				expect(function() { store.store('', chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {})}).to.throw(Error);
				expect(function() { store.store(uuid.v4(), '', 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {})}).to.throw(Error);
				expect(function() { store.store(uuid.v4(), chance.email(), 
					'', 'http://' + chance.domain() + '/page.html', function() {})}).to.throw(Error);
				expect(function() { store.store(uuid.v4(), chance.email(), 
					1000*60, '', function() {})}).to.not.throw();
				expect(function() { store.store(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html')}).to.throw(Error);
			})

			it('should callback in the format of callback() in case of success', function (done) {
				TokenStoreFactory().store(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						expect(arguments.length).to.equal(0);
						done();
					});
			})
		})

		describe('authenticate()', function() {
			it('should allow the authentication of a token', function () {
				expect(function() { TokenStoreFactory().authenticate(uuid.v4(),
					 function() {}) }).to.not.throw;
			})

			it('should throw exceptions for missing data', function () {
				var store = TokenStoreFactory();
				expect(function() { store.authenticate('', function() {})}).to.throw(Error);
				expect(function() { store.authenticate(uuid.v4()) }).to.throw(Error);
			})

			it('should callback in the format of callback(error, uid, referrer) in case of success', function (done) {
				TokenStoreFactory().authenticate(uuid.v4(), function() {
						expect(arguments.length).to.equal(3);
						done();
					});
			})

			it('should callback with callback(null, null, null) in case of an unknown token', function (done) {
				TokenStoreFactory().authenticate(uuid.v4(), function() {
						expect(arguments.length).to.equal(3);
						done();
					});
			})
		})

		describe('length()', function() {
			it('should return 0 for an empty TokenStore', function (done) {
				var store = TokenStoreFactory();
				store.length(function(err, count) {
					expect(count).to.equal(0);
					done();
				});
			})

			it('should return 2 after 2 tokens have been stored', function (done) {
				var store = TokenStoreFactory();
				store.store(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						store.store(uuid.v4(), chance.email(), 
							1000*60, 'http://' + chance.domain() + '/page.html', function() {
								store.length(function(err, count) {
									expect(count).to.equal(2);
									done();
								});
							})
					});
			})
		})

		describe('flow', function() {
			it('should validate an existing token', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token = uuid.v4();
				var referrer = 'http://' + chance.domain() + '/page.html';
				store.store(token, uid, 1000*60, referrer, function() {
					expect(arguments.length).to.equal(0);
					store.authenticate(token, function(error, user, ref) {
						expect(user).to.equal(uid);
						expect(ref).to.equal(referrer);
						expect(error).to.not.exist;
						done()
					})
				})
			})

			it('should validate an existing token several times if still valid', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token = uuid.v4();
				var referrer = 'http://' + chance.domain() + '/page.html';
				store.store(token, uid, 1000*60, referrer, function() {
					expect(arguments.length).to.equal(0);
					store.authenticate(token, function(error, user, ref) {
						expect(user).to.equal(uid);
						expect(ref).to.equal(referrer);
						expect(error).to.not.exist;

						store.authenticate(token, function(error, user, ref) {
							expect(user).to.equal(uid);
							expect(ref).to.equal(referrer);
							expect(error).to.not.exist;
							done();
						})
					})
				})
			})

			it('should not validate a not existing token', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token = uuid.v4();
				var referrer = 'http://' + chance.domain() + '/page.html';
				store.store(token, uid, 1000*60, referrer, function() {
					expect(arguments.length).to.equal(0);
					store.authenticate(uuid.v4(), function(error, user, ref) {
						expect(user).to.not.exist;
						expect(ref).to.not.exist;
						expect(error).to.not.exist;
						done();
					})
				})
			})

			it('should not validate a token which time has run up', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token = uuid.v4();
				var referrer = 'http://' + chance.domain() + '/page.html';
				store.store(token, uid, 100, referrer, function() {
					expect(arguments.length).to.equal(0);

					setTimeout(function() {
						store.authenticate(token, function(error, user, ref) {
							expect(user).to.not.exist;
							expect(ref).to.not.exist;
							expect(error).to.not.exist;
							done();
						})					
					}, 200);
				})
			})

			it('should validate a token if still valid, but not validate anymore if time has run up', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token = uuid.v4();
				var referrer = 'http://' + chance.domain() + '/page.html';
				store.store(token, uid, 100, referrer, function() {
					expect(arguments.length).to.equal(0);

					store.authenticate(token, function(error, user, ref) {
						expect(user).to.equal(uid);
						expect(ref).to.equal(referrer);
						expect(error).to.not.exist;

						setTimeout(function() {
							store.authenticate(token, function(error, user, ref) {
								expect(user).to.not.exist;
								expect(ref).to.not.exist;
								expect(error).to.not.exist;
								done();
							})					
						}, 200);
					})
				})
			})
		})
	})
})