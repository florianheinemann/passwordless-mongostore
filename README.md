# Passwordless-MongoStore

This module provides token storage for [Passwordless](https://github.com/florianheinemann/passwordless), a node.js module for express that allows website authentication without password using verification through email or other means. Visit the project's website https://passwordless.net for more details.

Tokens are stored in a MongoDB database and are hashed and salted using [bcrypt-nodejs](https://github.com/shaneGirish/bcrypt-nodejs).

**bcrypt-nodejs has the disadvantage of being slower than the native implementation of bcrypt but is easier to install on Windows machines. If you're looking for an implementation using the native version of bcrypt please use [passwordless-mongostore](https://www.npmjs.org/package/passwordless-mongostore).**

## Usage

First, install the module:

`$ npm install passwordless-mongostore-bcrypt-node --save`

Afterwards, follow the guide for [Passwordless](https://github.com/florianheinemann/passwordless). A typical implementation may look like this:

```javascript
var passwordless = require('passwordless');
var MongoStore = require('passwordless-mongostore-bcrypt-node');

var mongoURI = 'mongodb://localhost/passwordless-simple-mail';
passwordless.init(new MongoStore(mongoURI));

passwordless.addDelivery(
    function(tokenToSend, uidToSend, recipient, callback) {
        // Send out a token
    });
    
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());
```

## Initialization

```javascript
new MongoStore(uri, [options]);
```
* **uri:** *(string)* MongoDB URI as further described in the [MongoDB docs]( http://docs.mongodb.org/manual/reference/connection-string/)
* **[options]:** *(object)* Optional. This can include MongoClient options as described in the [docs]( http://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html#mongoclient-connect) and the ones described below combined in one object as shown in the example

Example:
```javascript
var mongoURI = 'mongodb://localhost/passwordless-simple-mail';
passwordless.init(new MongoStore(mongoURI, {
    server: {
        auto_reconnect: true
    },
    mongostore: {
        collection: 'token'
    }
}));
```

### Options
* **[mongostore.collection]:** *(string)* Optional. Name of the collection to be used. Default: 'passwordless-token'

## Hash and salt
As the tokens are equivalent to passwords (even though they do have the security advantage of only being valid for a limited time) they have to be protected in the same way. passwordless-mongostore uses [bcrypt-nodejs](https://github.com/shaneGirish/bcrypt-nodejs) with automatically created random salts. To generate the salt 10 rounds are used.

## Tests

`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
Florian Heinemann [@thesumofall](http://twitter.com/thesumofall/)
