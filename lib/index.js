var format = function (model, request) {
  if (model.serialize) {
    return model.serialize(request);
  } else {
    return model;
  }
};

module.exports.register = function (server, options, next) {

  server.ext('onPreResponse', function (request, reply) {

    // Serialize a Collection
    if (request.response.source && request.response.source.models) {
      request.response.source = request.response.source.models.map(function (model) {
        return format(model, request);
      });

      reply.continue();
    } else if (request.response.source && request.response.source instanceof Array) { // Serialize Array of Models
      request.response.source = request.response.source.map(function (val) {
        return format(val, request);
      });

      reply.continue();
    } else if (request.response.source) { // Seralize or Pass Through Single Object
      request.response.source = format(request.response.source, request);

      reply.continue();
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
