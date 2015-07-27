var chai        = require('chai');
var expect      = chai.expect;
var Hapi        = require('hapi');
var bookshelf   = require('bookshelf')(require('knex')({
                  client: 'sqlite3',
                  filename: './test.sqlite3'
                }));

var SerializeModel = bookshelf.Model.extend({
  tableName: 'models',
  serialize: function (request) {
    return {
      id: this.get('id'),
      user: request.auth.credentials.id
    };
  }
});

var SerializeModels = bookshelf.Collection.extend({
  model: SerializeModel
});

describe('serializer plugin', function () {
  describe('serializer', function () {
    var server;

    beforeEach(function () {
      server = new Hapi.Server({ debug: false });
      server.connection({ port: 80 });

      server.register([
        require('../lib/'),
      ], function (err) {
        if (err) {
          throw err;
        }
      });
    });

    it('should return data that is not serialized', function (done) {
      server.route({
        method: 'GET',
        path: '/rawTest',
        handler: function (request, reply) {
          reply('just data');
        }
      });

      server.inject('/rawTest', function (res) {
        expect(res.statusCode).to.eql(200);
        expect(res.result).to.eql('just data');
        done();
      });
    });

    it('should return formatted collection', function (done) {
      server.route({
        method: 'GET',
        path: '/serializeTest',
        handler: function (request, reply) {
          reply(SerializeModels.forge([
            { id: 1 },
            { id: 2 }
          ]));
        }
      });

      server.inject({
        method: 'GET',
        url: '/serializeTest',
        credentials: {
          id: 2
        }
      }, function (res) {
        expect(res.result).to.eql([
          { id: 1, user: 2 },
          { id: 2, user: 2 }
        ]);
        done();
      });
    });

    it('should return formatted array of models', function (done) {
      server.route({
        method: 'GET',
        path: '/serializeTest',
        handler: function (request, reply) {
          reply([
            SerializeModel.forge({ id: 1 }),
            SerializeModel.forge({ id: 2 })
          ]);
        }
      });

      server.inject({
        method: 'GET',
        url: '/serializeTest',
        credentials: {
          id: 2
        }
      }, function (res) {
        expect(res.result).to.eql([
          { id: 1, user: 2 },
          { id: 2, user: 2 }
        ]);
        done();
      });
    });

    it('should return formatted model', function (done) {
      server.route({
        method: 'GET',
        path: '/serializeTest',
        handler: function (request, reply) {
          reply(SerializeModel.forge({ id: 1 }));
        }
      });

      server.inject({
        method: 'GET',
        url: '/serializeTest',
        credentials: {
          id: 2
        }
      }, function (res) {
        expect(res.result).to.eql({
          id: 1,
          user: 2
        });
        done();
      });
    });

    it('should return when no source provided', function (done) {
      server.route({
        method: 'GET',
        path: '/noSource',
        handler: function (request, reply) {
          reply();
        }
      });

      server.inject({
        method: 'GET',
        url: '/noSource'
      }, function (res) {
        expect(res.result).to.eql(null);
        done();
      });
    });

  });
});
