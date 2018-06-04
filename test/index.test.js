'use strict';

const Bluebird  = require('bluebird');
const bookshelf = require('bookshelf')(require('knex')({
  client: 'sqlite3',
  filename: './test.sqlite3'
}));
const chai = require('chai');
const Hapi = require('hapi');
const Lab  = require('lab');

const expect = chai.expect;
const { beforeEach, describe, it } = exports.lab = Lab.script();

const SerializeModel = bookshelf.Model.extend({
  tableName: 'models',
  serialize: function (request) {
    return {
      id: this.get('id'),
      user: request.auth.credentials.id
    };
  }
});

const SerializeModels = bookshelf.Collection.extend({
  model: SerializeModel
});

const PromiseModel = bookshelf.Model.extend({
  tableName: 'promises',
  serialize: function () {
    return Bluebird.resolve({
      id: this.get('id'),
      promisified: true
    });
  }
});

const PromiseModels = bookshelf.Collection.extend({
  model: PromiseModel
});

const ErrorModel = bookshelf.Model.extend({
  tableName: 'errors',
  serialize: function () {
    return Bluebird.reject(new Error());
  }
});

const ErrorModels = bookshelf.Collection.extend({
  model: ErrorModel
});

describe('serializer plugin', () => {

  let server;

  beforeEach(async () => {
    server = new Hapi.Server({ debug: false });

    await server.register([
      require('../lib/')
    ]);
  });

  it('should return data that is not serialized', async () => {
    server.route({
      method: 'GET',
      path: '/rawTest',
      handler: () => 'just data'
    });
    const res = await server.inject('/rawTest');

    expect(res.statusCode).to.eql(200);
    expect(res.result).to.eql('just data');
  });

  it('should return formatted collection', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => SerializeModels.forge([{ id: 1 }, { id: 2 }])
    });

    const res = await server.inject({
      method: 'GET',
      url: '/serializeTest',
      credentials: { id: 2 }
    });

    expect(res.result).to.eql([{ id: 1, user: 2 }, { id: 2, user: 2 }]);
  });

  it('should return formatted collection when serialize uses promise', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => PromiseModels.forge([{ id: 1 }, { id: 2 }])
    });

    const res = await server.inject('/serializeTest');

    expect(res.result).to.eql([
      { id: 1, promisified: true },
      { id: 2, promisified: true }
    ]);
  });

  it('should handle a rejection during serialize', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => ErrorModels.forge([{ id: 1 }, { id: 2 }])
    });

    const res = await server.inject({
      method: 'GET',
      url: '/serializeTest'
    });

    expect(res.statusCode).to.eql(500);
  });

  it('should return formatted array of models', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => [
        SerializeModel.forge({ id: 1 }),
        SerializeModel.forge({ id: 2 })
      ]
    });

    const res = await server.inject({
      method: 'GET',
      url: '/serializeTest',
      credentials: { id: 2 }
    });

    expect(res.result).to.eql([
      { id: 1, user: 2 },
      { id: 2, user: 2 }
    ]);
  });

  it('should handle formatting an array of models with promise', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => [
        PromiseModel.forge({ id: 1 }),
        PromiseModel.forge({ id: 2 })
      ]
    });

    const res = await server.inject({
      method: 'GET',
      url: '/serializeTest',
      credentials: { id: 2 }
    });

    expect(res.result).to.eql([
      { id: 1, promisified: true },
      { id: 2, promisified: true }
    ]);
  });

  it('should handle a rejection formatting an array of models', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => [
        ErrorModel.forge({ id: 1 }),
        ErrorModel.forge({ id: 2 })
      ]
    });

    const res = await server.inject('/serializeTest');

    expect(res.statusCode).to.eql(500);
  });

  it('should return formatted model', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => SerializeModel.forge({ id: 1 })
    });

    const res = await server.inject({
      method: 'GET',
      url: '/serializeTest',
      credentials: { id: 2 }
    });

    expect(res.result).to.eql({ id: 1, user: 2 });
  });

  it('should support a serialize method returning a promise', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => PromiseModel.forge({ id: 1 })
    });

    const res = await server.inject('/serializeTest');

    expect(res.result).to.eql({ id: 1, promisified: true });
  });

  it('should handle a rejection serializing one model', async () => {
    server.route({
      method: 'GET',
      path: '/serializeTest',
      handler: () => ErrorModel.forge({ id: 1 })
    });

    const res = await server.inject('/serializeTest');

    expect(res.statusCode).to.eql(500);
  });

  it('should return when no source provided', async () => {
    server.route({
      method: 'GET',
      path: '/noSource',
      handler: () => null
    });

    const res = await server.inject('/noSource');

    expect(res.result).to.eql(null);
  });

});
