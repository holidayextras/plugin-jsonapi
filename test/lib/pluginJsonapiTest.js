/* eslint no-unused-expressions:0 */
'use strict'

var Hapi = require('hapi')

var pluginJsonapi = require('../../lib/pluginJsonapi')
var pluginName = 'plugin-jsonapi'
var server

process.env.NODE_ENV = 'test'

describe('pluginJsonapi', function () {
  before(function (done) {
    // stub out some of the calls the plugin makes
    server = new Hapi.Server()
    server.connection({
      port: 1234,
      router: {
        stripTrailingSlash: false
      }
    })
    server.route(require('./fixtures/routes'))

    // the plugin expects a few functions to return stuff to register properly
    // simulate that here so we don't try and talk to them
    server.methods.getService = sinon.stub().returns({
      sources: [{}]
    })
    server.methods.getDataLoggingWrapper = sinon.stub().returns(null)
    server.methods.getConfig = sinon.stub().returns({
      cache: false
    }) // not testing the cache either
    server.register([
      {
        register: pluginJsonapi
      }, {
        register: require('hapi-qs')
      } ], function () {
      done()
    })
  })

  afterEach(function () {
    sandbox.restore()
  })

  describe('#register', function () {
    it('should allow us to access the plugin off the hapi server', function (done) {
      expect(server.plugins[pluginName]).to.not.be.undefined
      done()
    })
  })

  describe('#makeItSo', function () {
    describe('check the function is created', function () {
      it('should expose makeItSo as a function on the plugin', function (done) {
        expect(server.plugins[pluginName].makeItSo).to.be.a('function')
        done()
      })
    })
  })
  describe('resources', function () {
    it('should not try to add any jsonapiness to the lout documentation', function (done) {
      server.inject('/', function (reply) {
        expect(reply.result).to.equal(require('./fixtures/loutReply'))
        done()
      })
    })

    it('should not try to add any jsonapiness to any 204 (DELETE) responses', function (done) {
      server.inject({
        url: '/delete',
        method: 'DELETE'
      }, function (reply) {
        expect(reply).to.have.property('result').that.is.null
        expect(reply.statusCode).to.equal(204)
        done()
      })
    })

    it('should 500 if resourceName isnt bound to the handler config', function (done) {
      server.inject('/noResourceName', function (reply) {
        expect(reply.result).to.deep.equal({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        })
        done()
      })
    })

    it('should return an empty object with a successfully configured handler', function (done) {
      server.inject('/hasResourceName', function (reply) {
        expect(reply.result).to.deep.equal({})
        done()
      })
    })

    it('should return an the reply "as is" if no resourceName found', function (done) {
      server.inject('/resourceNotDefined', function (reply) {
        expect(reply.result).to.deep.equal({ foo: 'bar' })
        done()
      })
    })

    it('should handle a single object resource', function (done) {
      server.inject('/singleResourceObject', function (reply) {
        expect(reply.result).to.deep.equal({
          test: {
            id: '123456789',
            foo: 'bar',
            href: '/test/123456789'
          }
        })
        done()
      })
    })
  })

  describe('hrefs', function () {
    it('should add href to resources with an id', function (done) {
      server.inject('/addHrefToResource', function (reply) {
        expect(reply.result).to.deep.equal({
          test: [
            {
              id: '123456789',
              foo: 'bar',
              href: '/test/123456789'
            }
          ]
        })
        done()
      })
    })

    it('should not add href to resources without an id', function (done) {
      server.inject('/dontAddHrefToResource', function (reply) {
        expect(reply.result).to.deep.equal({
          test: [
            { foo: 'bar' }
          ]
        })
        done()
      })
    })

    it('should add href to resource links that have a type and an id', function (done) {
      server.inject('/addHrefToResourceLinkWithTypeAndId', function (reply) {
        expect(reply.result).to.deep.equal({
          test: [
            {
              foo: 'bar',
              links: {
                anotherTest: {
                  ids: [1],
                  type: 'anotherTest',
                  href: '/anotherTest/1'
                }
              }
            }
          ]
        })
        done()
      })
    })

    it('should add href to resource links that have a type and multiple ids', function (done) {
      server.inject('/addHrefToResourceLinkWithTypeAndMultipleIds', function (reply) {
        expect(reply.result).to.deep.equal({
          test: [
            {
              foo: 'bar',
              links: {
                anotherTest: {
                  ids: [ 1, 2 ],
                  type: 'anotherTest',
                  href: '/anotherTest/1,2'
                }
              }
            }
          ]
        })
        done()
      })
    })

    it('should not add href to resource links that have no type', function (done) {
      server.inject('/addHrefToResourceLinkWithNoType', function (reply) {
        expect(reply.result).to.deep.equal({
          test: [
            {
              foo: 'bar',
              links: {
                anotherTest: {
                  ids: [ 1, 2 ]
                }
              }
            }
          ]
        })
        done()
      })
    })

    it('should not add href to resource links that have no ids', function (done) {
      server.inject('/addHrefToResourceLinkWithNoIds', function (reply) {
        expect(reply.result).to.deep.equal({
          test: [
            {
              foo: 'bar',
              links: {
                anotherTest: {
                  type: 'anotherTest'
                }
              }
            }
          ]
        })
        done()
      })
    })
  })

  describe('when "including"', function () {
    it('should fetch a single secondary resource and add it to the primary resource linked data', function (done) {
      server.inject('/primaryResource?include=secondaryResource', function (reply) {
        expect(reply.result).to.deep.equal({
          primaryResource: [
            {
              foo: 'bar',
              links: {
                secondaryResource: {
                  ids: [1],
                  type: 'secondaryResource',
                  href: '/secondaryResource/1'
                }
              }
            }
          ],
          linked: {
            secondaryResource: [
              { foo: 'bar' }
            ]
          }
        })
        done()
      })
    })

    it('should fetch a single secondary resource with context info and add it to the primary resource linked data', function (done) {
      server.inject('/primaryContextResource?include=secondaryContextResource&context[secondaryContextResource][additionalContextInfo]=true', function (reply) {
        expect(reply.result).to.deep.equal({
          primaryContextResource: [
            {
              foo: 'bar',
              links: {
                secondaryContextResource: {
                  ids: [1],
                  type: 'secondaryContextResource',
                  href: '/secondaryContextResource/1'
                }
              }
            }
          ],
          linked: {
            secondaryContextResource: [
              {
                foo: 'bar',
                additionalContextInfo: true
              }
            ]
          }
        })
        done()
      })
    })

    it('should boost linked data from a secondary resource up to the primary resource linked data', function (done) {
      server.inject('/anotherPrimaryResource?include=secondaryResourceWithLinked', function (reply) {
        expect(reply.result).to.deep.equal({
          anotherPrimaryResource: [
            {
              foo: 'bar',
              links: {
                secondaryResourceWithLinked: {
                  href: '/secondaryResourceWithLinked/1',
                  ids: [1],
                  type: 'secondaryResourceWithLinked'
                }
              }
            }
          ],
          linked: {
            primaryLinkedResource: [
              { hey: 'you guys' }
            ],
            secondaryLinkedResource: [
              { optimusPrime: 'isCool' }
            ],
            secondaryResourceWithLinked: [
              { foo: 'bar' }
            ]
          }
        })

        done()
      })
    })
  })

  describe('#errorHandler', function () {
    it('should call the request log with an error', function () {
      var request = {
        log: sandbox.spy(),
        data: 'DATA'
      }

      var requestLogSpy = request.log
      var reply = sandbox.stub()
      var error = new Error('ERROR_HANDLER')

      var expectedRequestLogWithArgument2 = {
        error: 'Error: ERROR_HANDLER',
        data: 'DATA'
      }

      pluginJsonapi.errorHandler(request, reply, error)
      expect(requestLogSpy.args[0][1]).to.be.deep.equal(expectedRequestLogWithArgument2)
    })
  })

  describe('#alsoMakeItSo', function () {
    it('should return early when isBoom is true', function () {
      var request = {
        response: {
          isBoom: true
        }
      }

      var reply = {
        continue: sandbox.spy()
      }
      var replyContinueSpy = reply.continue

      pluginJsonapi.alsoMakeItSo(request, reply)
      expect(replyContinueSpy).to.be.calledOnce()
    })

    it('should throw an error when the request.route.settings.bind.resourceName is not set', function () {
      var errorHandlerSpy = sandbox.spy(pluginJsonapi, 'errorHandler')
      var request = {
        log: sandbox.spy(),
        response: {
          source: 'SOURCE'
        }
      }

      var requestLogSpy = request.log

      var reply = sandbox.stub()

      pluginJsonapi.alsoMakeItSo(request, reply)
      expect(errorHandlerSpy).to.be.calledOnce()

      expect(requestLogSpy.args[0][1].error).to.be.equal('Error: configuration bind.resourceName not found on handler')
    })

    it('should return early when no resources are found', function () {
      var request = {
        response: {
          isBoom: false,
          source: {
            foo: 'bar'
          }
        },
        route: {
          settings: {
            bind: {
              resourceName: 'RESOURCE_NAME'
            }
          }
        }
      }

      var reply = {
        continue: sandbox.spy()
      }
      var replyContinueSpy = reply.continue

      pluginJsonapi.alsoMakeItSo(request, reply)
      expect(replyContinueSpy).to.be.calledOnce()
    })
  })
})
