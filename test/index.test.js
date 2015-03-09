var chai        = require('chai');
var expect      = chai.expect;
var Hapi        = require('hapi');
var path        = require('path');
var bookshelf   = require('bookshelf')(require('knex')({
                  client: 'sqlite3',
                  filename: './test.sqlite3'
                }));

var TestModel   = bookshelf.Model.extend({
  tableName: 'models',
  serializer: 'model'
});

var TestModels  = bookshelf.Collection.extend({
  model: TestModel
});

var ContextModel  = bookshelf.Model.extend({
  tableName: 'contextModels',
  serializer: 'contextModel'
});

describe('serializer plugin', function () {
  describe('initialization', function () {
    it('should fail to load with bad schema', function () {
      var server = new Hapi.Server();

      server.register([
        {
          register: require('../lib/'),
          options: {}
        }
      ], function (err) {
        expect(err).to.be.instanceof(Error);
      });
    });
  });

  describe('serializing', function () {
    var server;

    beforeEach(function () {
      server = new Hapi.Server({ debug: false });
      server.connection({ port: 80 });

      server.register([
        {
          register: require('../lib/'),
          options: {
            directory: path.join(__dirname + '/serializers')
          }
        }
      ], function (err) {
        if (err) {
          throw err;
        }
      });
    });

    it('should format a serialized model', function (done) {
      server.route({
        method: 'GET',
        path: '/modelTest',
        handler: function (request, reply) {
          reply(TestModel.forge({ id: '1', name: 'hello' }));
        }
      });

      server.inject('/modelTest', function (res) {
        expect(res.result).to.eql({ id: 1, name: 'hello', object: 'model' });

        done();
      });
    });

    it('should throw an error on bad model', function (done) {
      server.route({
        method: 'GET',
        path: '/modelTest',
        handler: function (request, reply) {
          reply(TestModel.forge({ id: '1' }));
        }
      });

      server.inject('/modelTest', function (res) {
        expect(res.statusCode).to.eql(500);
        done();
      });
    });

    it('should format a serialized collection', function (done) {
      server.route({
        method: 'GET',
        path: '/collectionTest',
        handler: function (request, reply) {
          reply(TestModels.forge([
            { id: 1, name: 'test1' },
            { id: 2, name: 'test2' }
          ]));
        }
      });

      server.inject('/collectionTest', function (res) {
        expect(res.result).to.eql([
          { id: 1, name: 'test1', object: 'model' },
          { id: 2, name: 'test2', object: 'model' }
        ]);

        done();
      });
    });

    it('should throw an error for bad collection', function (done) {
      server.route({
        method: 'GET',
        path: '/collectionTest',
        handler: function (request, reply) {
          reply(TestModels.forge([
            { id: 1 },
            { id: 2 }
          ]));
        }
      });

      server.inject('/collectionTest', function (res) {
        expect(res.statusCode).to.eql(500);

        done();
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

    it('should have access to the request via context', function (done) {
      server.route({
        method: 'GET',
        path: '/contextTest',
        handler: function (request, reply) {
          reply(ContextModel.forge({ id: '1', name: 'hello' }));
        }
      });

      server.inject({
        method: 'GET',
        url: '/contextTest',
        headers: {
          default: 'test'
        }
      }, function (res) {
        expect(res.result).to.eql({
          id: 1,
          name: 'hello',
          default: 'test',
          object: 'contextModel'
        });
        done();
      });
    });
  });
});
