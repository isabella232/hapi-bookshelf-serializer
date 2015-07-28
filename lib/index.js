var Bluebird = require('bluebird');
var Boom     = require('boom');

var format = function (model, request) {
  if (model.serialize) {
    return Bluebird.resolve(model.serialize(request));
  } else {
    return Bluebird.resolve(model);
  }
};

module.exports.register = function (server, options, next) {

  server.ext('onPreResponse', function (request, reply) {

    // Serialize a Collection
    if (request.response.source && request.response.source.models) {
      Bluebird.map(request.response.source.models, function (model) {
        return format(model, request);
      })
      .then(function (models) {
        request.response.source = models;
        reply.continue();
      })
      .catch(function () {
        reply(Boom.badImplementation());
      });

    } else if (request.response.source && request.response.source instanceof Array) { // Serialize Array of Models
      Bluebird.map(request.response.source, function (model) {
        return format(model, request);
      })
      .then(function (models) {
        request.response.source = models;
        reply.continue();
      })
      .catch(function () {
        reply(Boom.badImplementation());
      });

    } else if (request.response.source) { // Seralize or Pass Through Single Object
      format(request.response.source, request)
      .then(function (model) {
        request.response.source = model;
        reply.continue();
      })
      .catch(function () {
        reply(Boom.badImplementation());
      });
    } else {
      reply.continue();
    }
  });
  next();
};

module.exports.register.attributes = {
  name: 'serializer',
  version: '1.1.0'
};
