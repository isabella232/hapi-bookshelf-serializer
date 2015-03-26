var Boom        = require('boom');
var fs          = require('fs');
var Joi         = require('joi');
var path        = require('path');

var internals = {};

internals.schema = {
  directory: Joi.string().required()
};

internals.serializers = {};

internals.format = function (model, request) {
  var formattedModel = Joi.validate(model.toJSON(),
    internals.serializers[model.serializer], {
      stripUnknown: true,
      context: request
    });

  if (formattedModel.error) {
    throw formattedModel.error;
  } else {
    return formattedModel.value;
  }
};

module.exports.register = function (server, options, next) {

  try {
    Joi.assert(options, internals.schema, 'Invalid Configuration Object');
  } catch (ex) {
    return next(ex);
  }

  var serializerFiles = fs.readdirSync(options.directory);

  serializerFiles.forEach(function (file) {
    var serializerName = path.basename(file).replace(path.extname(file), '');
    internals.serializers[serializerName] = require(path.join(options.directory,
      file));
  });

  server.ext('onPreResponse', function (request, reply) {
    if (request.response.source && request.response.source.models) {
      try {
        var models = request.response.source.models.map(function (model) {
          return internals.format(model, request);
        });
        request.response.source = models;

        reply.continue();
      } catch (ex) {
        reply(Boom.badImplementation(ex.toString()));
      }
    } else if (request.response.source && request.response.source.serializer) {
      try {
        var model = internals.format(request.response.source, request);
        request.response.source = model;

        reply.continue();
      } catch (ex) {
        reply(Boom.badImplementation(ex.toString()));
      }
    } else if (request.response.source &&
      request.response.source instanceof Array) {
      try {
        request.response.source = request.response.source.map(function (val) {
          if (val.serializer) {
            return internals.format(val, request);
          } else {
            return val;
          }
        });

        reply.continue();
      } catch (ex) {
        reply(Boom.badImplementation(ex.toString()));
      }
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
