# Hapi Bookshelf Serializer
[![npm version](https://badge.fury.io/js/hapi-bookshelf-serializer.svg)](http://badge.fury.io/js/hapi-bookshelf-serializer)
[![Build Status](https://travis-ci.org/lob/hapi-bookshelf-serializer.svg)](https://travis-ci.org/lob/hapi-bookshelf-serializer)
[![Coverage Status](https://coveralls.io/repos/lob/hapi-bookshelf-serializer/badge.svg?branch=master)](https://coveralls.io/r/lob/hapi-bookshelf-serializer?branch=master)

This plugin takes [Bookshelf.js](http://bookshelfjs.org/) models that are returned via [Hapi](http://hapijs.com/)'s ```reply``` method and serializes them using a user-defined `serialize` method.

# Registering the Plugin
```javascript
var Hapi = require('hapi');

var server = new Hapi.Server();

server.register([
  require('hapi-bookshelf-serializer'),
], function (err) {
  // An error will be available here if anything goes wrong
});
```

# Defining Models
Models are defined just like all [Bookshelf.js](http://bookshelfjs.org/) models, except for one small addition. A `serialize` function is added with the following signature `function (request) { }`. All model properties can be accessed in the `serialize` function via `this.get()` and the function will be passed the current Hapi request as `request`. The `serialize` function can either return a static value or a `Promise`.

## Serializing Related Models
Currently there is no support in this module for automatically serializing all related models so you will need to call the function manually.

## Example
```javascript
// models/role.js
var bookshelf = require('bookshelf')(require('knex')(config));

module.exports = bookshelf.Model.extend({
  tableName: 'roles',
  serialize: function(request) {
    return {
      this.get('id'),
      this.get('name')
    };
  }
});

// models/user.js
var bookshelf = require('bookshelf')(require('knex')(config));
var Role      = require('./role.js');

module.exports = bookshelf.Model.extend({
  tableName: 'users',
  roles: this.belongsToMany(Role),
  serialize: function (request) {
    return {
      this.get('id'),
      this.get('email'),
      roles: this.related('roles').map(function (role) {
        return role.serialize(request);
      });
    };
  }
});
```

This plugin pairs well with the [hapi-bookshelf-models](https://github.com/lob/hapi-bookshelf-models) plugin which makes registering models from a directory super easy.
