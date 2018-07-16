'use strict';

const Bluebird = require('bluebird');
const Boom     = require('boom');

const format = function (model, request) {
  if (model.serialize) {
    return Bluebird.resolve(model.serialize(request));
  } else {
    return Bluebird.resolve(model);
  }
};

function register (server) {

  server.ext('onPreResponse', (request, h) => {

    // Serialize a Collection
    if (request.response.source && request.response.source.models) {
      return Bluebird.map(request.response.source.models, (model) => {
        return format(model, request);
      })
      .then((models) => {
        request.response.source = models;
        return h.continue;
      })
      .catch((err) => {
        return Boom.badImplementation(err.message);
      });
    }

    // Serialize Array of Models
    if (request.response.source && request.response.source instanceof Array) {
      return Bluebird.map(request.response.source, (model) => {
        return format(model, request);
      })
      .then((models) => {
        request.response.source = models;
        return h.continue;
      })
      .catch((err) => {
        return Boom.badImplementation(err.message);
      });

    }
    // Seralize or Pass Through Single Object
    if (request.response.source) {
      return format(request.response.source, request)
      .then((model) => {
        request.response.source = model;
        return h.continue;
      })
      .catch((err) => {
        return Boom.badImplementation(err.message);
      });
    }

    return h.continue;
  });
}

exports.plugin = { register, name: 'serializer', version: '3.0.0' };
