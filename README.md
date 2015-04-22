# Hapi Bookshelf Serializer
[![npm version](https://badge.fury.io/js/hapi-bookshelf-serializer.svg)](http://badge.fury.io/js/hapi-bookshelf-serializer)
[![Build Status](https://travis-ci.org/lob/hapi-bookshelf-serializer.svg)](https://travis-ci.org/lob/hapi-bookshelf-serializer)
[![Coverage Status](https://coveralls.io/repos/lob/hapi-bookshelf-serializer/badge.svg?branch=master)](https://coveralls.io/r/lob/hapi-bookshelf-serializer?branch=master)

This plugin takes [Bookshelf.js](http://bookshelfjs.org/) models that are returned via [Hapi](http://hapijs.com/)'s ```reply``` method and serializers them using [Joi](https://github.com/hapijs/joi) schemas.

# Registering the Plugin
```javascript
var Hapi = require('hapi');

var server = new Hapi.Server();

server.register([
  {
    register: require('hapi-bookshelf-serializer'),
    options: {
      directory: 'path/to/serializers' // Required
    }
  }
], function (err) {
  // An error will be available here if anything goes wrong
});
```

# Options
- ```directory``` directory where your serializers are defined

# Defining Serializers
The serializers are just [Joi](https://github.com/hapijs/joi) schemas that are applied using the ```stripUnknown``` option. Below is a basic example of related serializers.

## Example
```javascript
// Target Object
{
  id: 1,
  name: 'Test User',
  roles: [
    {
      id: 1,
      name: 'admin'
    }
  ]
}

// serializers/role.js
var Joi = require('joi');

module.exports = {
  id: Joi.number().integer().required(),
  name: Joi.string().required()
};

// serializers/user.js
var Joi  = require('joi');
var Role = require('./role.js');

module.exports = {
  id: Joi.number().integer().required(),
  name: Joi.string().required(),
  roles: Joi.array().includes(Role)
};
```

## Request Context

The Hapi request object is provided via Joi's context. This allows you to conditionally serialize fields. For example, you can hide specific keys from non-admin users.

```javascript
// serializers/user.js
var Joi = require('joi');

module.exports = Joi.object().keys({
  id: Joi.string().required(),
  email: Joi.string().when('$auth.credentials.admin', {
    is: true,
    otherwise: Joi.strip()
  })
});
```

# Defining Models
Models are defined just like all [Bookshelf.js](http://bookshelfjs.org/) models, except for one small addition. A ```serializer``` property is added which references a serializer registered with this plugin. The model is matched to a serializer via a string comparison. Below is an example for defining models that could be used with the serializers above.

## Example
```javascript
// models/role.js
var bookshelf = require('bookshelf')(require('knex')(config));

module.exports = bookshelf.Model.extend({
  tableName: 'roles',
  serializer: 'role'
});

// models/user.js
var bookshelf = require('bookshelf')(require('knex')(config));
var Role      = require('./role.js');

module.exports = bookshelf.Model.extend({
  tableName: 'users',
  serializer: 'user',
  roles: this.belongsToMany(Role)
});
```

# Using `serialize` Instead of `serializer`
The `serializer` provides most of the functionality that you would need for doing serialization. But we have run into cases where the logic via Joi is either too complex or not possible at all. As an alternative you can define a `serialize` function on the model that will be executed before the data is returned. All model properties can be accessed in the `serialize` function via `this.get()` and the function will be passed the current Hapi request as `request`.

## Example
```javascript
// models/user.js
var bookshelf = require('bookshelf')(require('knex')(config));

module.exports = bookshelf.Model.extend({
  tableName: 'users',
  serialize: function (request) { // Hapi Request Object
    return {
      id: this.get('id'),
      name: this.get('name'),
      type: 'user'
    };
  }
});
```

## Serializing Related Models
Currently there is no support in this module for automatically serializing all related models so you will need to call the function manually.

### Example
```javascript
// models/user.js
var bookshelf = require('bookshelf')(require('knex')(config));

module.exports = bookshelf.Model.extend({
  tableName: 'users',
  roles: this.belongsToMany(Role)
  serialize: function (request) { // Hapi Request Object
    return {
      id: this.get('id'),
      name: this.get('name'),
      roles: this.related('roles').map(function (role) {
        return role.serialize(request);
      }),
      type: 'user'
    };
  }
});

```

This plugin pairs well with the [hapi-bookshelf-models](https://github.com/lob/hapi-bookshelf-models) plugin which makes registering models from a directory super easy.
