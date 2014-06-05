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

		describe('storeOrUpdate()', function() {
			it('should allow the storage of a new token', function () {
				expect(function() { TokenStoreFactory().storeOrUpdate(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {}) }).to.not.throw;
			})

			it('should allow the update of details if the same UID is provided', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token1 = uuid.v4(), token2 = uuid.v4();
				// Storage of first token for uid
				store.storeOrUpdate(token1, uid, 
					1000*60, 'http://www.example.com/alice', function() {
						expect(arguments.length).to.equal(0);

						// Update of uid with new details (incl. new token)
						store.storeOrUpdate(token2, uid, 
							1000*60, 'http://www.example.com/tom', function() {
								expect(arguments.length).to.equal(0);

								// the old token should not be valid anymore
								store.authenticate(token1, function(err, ret_uid, ret_ref) {
									expect(err).to.not.exist;
									expect(ret_uid).to.not.exist;

									// but the new token should be valid and also return the new referrer
									store.authenticate(token2, function(err, ret_uid, ret_ref) {
										expect(err).to.not.exist;
										expect(ret_uid).to.equal(uid);
										expect(ret_ref).to.equal('http://www.example.com/tom')
										done();
									});
								})
							})
					});

			})

			it('should return an error in the format of callback(error) in case of duplicate tokens', function (done) {
				var store = TokenStoreFactory();
				var token = uuid.v4();
				store.storeOrUpdate(token, chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						expect(arguments.length).to.equal(0);

						store.storeOrUpdate(token, chance.email(), 
							1000*60, 'http://' + chance.domain() + '/page.html', function() {
								expect(arguments.length).to.equal(1);
								done();
							})
					});

			})

			it('should throw exceptions for missing data', function () {
				var store = TokenStoreFactory();
				expect(function() { store.storeOrUpdate('', chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {})}).to.throw(Error);
				expect(function() { store.storeOrUpdate(uuid.v4(), '', 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {})}).to.throw(Error);
				expect(function() { store.storeOrUpdate(uuid.v4(), chance.email(), 
					'', 'http://' + chance.domain() + '/page.html', function() {})}).to.throw(Error);
				expect(function() { store.storeOrUpdate(uuid.v4(), chance.email(), 
					1000*60, '', function() {})}).to.not.throw();
				expect(function() { store.storeOrUpdate(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html')}).to.throw(Error);
			})

			it('should callback in the format of callback() in case of success', function (done) {
				TokenStoreFactory().storeOrUpdate(uuid.v4(), chance.email(), 
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

			it('should callback in the format of callback(null, uid, referrer) in case of success', function (done) {
				TokenStoreFactory().authenticate(uuid.v4(), function() {
						expect(arguments.length).to.equal(3);
						expect(arguments[0]).to.not.exist;
						done();
					});
			})

			it('should callback with callback(null, null, null) in case of an unknown token', function (done) {
				TokenStoreFactory().authenticate(uuid.v4(), function() {
						expect(arguments.length).to.equal(3);
						for (var i = arguments.length - 1; i >= 0; i--) {
							expect(arguments[i]).to.not.exist;
						};
						done();
					});
			})
		})

		describe('remove()', function() {
			it('should fail silently for tokens that do not exist', function (done) {
				var store = TokenStoreFactory();
				store.remove(uuid.v4(), function(err) {
					expect(err).to.not.exist;
					done();
				});
			})

			it('should remove an existing token', function (done) {
				var store = TokenStoreFactory();
				var token = uuid.v4();
				store.storeOrUpdate(token, chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						store.remove(token, function(err) {
							expect(err).to.not.exist;
							store.authenticate(token, function(err, uid, ref) {
								expect(arguments.length).to.equal(3);
								for (var i = arguments.length - 1; i >= 0; i--) {
									expect(arguments[i]).to.not.exist;
								};
								done();
							})
						})
					})
			})

			it('should throw exceptions for missing data', function () {
				var store = TokenStoreFactory();
				expect(function() { store.remove('test')}).to.throw(Error);
				expect(function() { store.remove()}).to.throw(Error);
			})
		})

		describe('clear()', function() {
			it('should remove all data', function (done) {
				var store = TokenStoreFactory();
				store.storeOrUpdate(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {	
					store.storeOrUpdate(uuid.v4(), chance.email(), 
						1000*60, 'http://' + chance.domain() + '/page.html', function() {
						store.clear(function() {
							expect(arguments.length).to.equal(0);
							store.length(function(err, length) {
								expect(err).to.not.exist;
								expect(length).to.equal(0);
								done();
							})
						})	
					})
				})
			})

			it('should throw exceptions for missing data', function () {
				var store = TokenStoreFactory();
				expect(function() { store.clear()}).to.throw(Error);
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
				store.storeOrUpdate(uuid.v4(), chance.email(), 
					1000*60, 'http://' + chance.domain() + '/page.html', function() {
						store.storeOrUpdate(uuid.v4(), chance.email(), 
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
				store.storeOrUpdate(token, uid, 1000*60, referrer, function() {
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
				store.storeOrUpdate(token, uid, 1000*60, referrer, function() {
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
				store.storeOrUpdate(token, uid, 1000*60, referrer, function() {
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
				store.storeOrUpdate(token, uid, 100, referrer, function() {
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
				store.storeOrUpdate(token, uid, 100, referrer, function() {
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

			it('should extend the time a token is valid if UID is updated with new details', function (done) {
				var store = TokenStoreFactory();
				var uid = chance.email();
				var token1 = uuid.v4(), token2 = uuid.v4();
				var referrer = 'http://' + chance.domain() + '/page.html';
				// First storage of a token for uid
				store.storeOrUpdate(token1, uid, 100, referrer, function(err) {
					expect(err).to.not.exist;

					// should authenticate
					store.authenticate(token1, function(error, user, ref) {
						expect(user).to.equal(uid);
						expect(ref).to.equal(referrer);
						expect(error).to.not.exist;

						// update of uid token with a new one, which is valid for much longer
						store.storeOrUpdate(token2, uid, 1000*60, referrer, function(err) {
							expect(err).to.not.exist;

							// authenticate with the new token after 200ms which is beyond the validity of token1
							setTimeout(function() {
								store.authenticate(token2, function(error, user, ref) {
									expect(user).to.equal(uid);
									expect(ref).to.equal(referrer);
									expect(error).to.not.exist;

									// ... but token1 shouldn't work anymore
									store.authenticate(token1, function(error, user, ref) {
										expect(user).to.not.exist;
										expect(ref).to.not.exist;
										expect(error).to.not.exist;
										done();
									})	
								})					
							}, 200);
						})
					})
				})
			})
		})
	})
})