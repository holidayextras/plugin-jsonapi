/* eslint no-unused-expressions:0 */
'use strict'

const Hapi = require('@hapi/hapi')
const Qs = require('qs')

const pluginJsonapi = require('../../lib/pluginJsonapi')
const pluginName = 'plugin-jsonapi'
let server

process.env.NODE_ENV = 'test'

describe('pluginJsonapi', function () {
  before(async function () {
    // stub out some of the calls the plugin makes
    server = new Hapi.Server({
      port: 1234,
      router: {
        stripTrailingSlash: false
      },
      query: {
        parser: (query) => Qs.parse(query)
      }
    })

    // the plugin expects a few functions to return stuff to register properly
    // simulate that here so we don't try and talk to them
    server.methods.getService = sinon.stub().returns({
      sources: [{}]
    })
    server.methods.getDataLoggingWrapper = sinon.stub().returns(null)
    server.methods.getConfig = sinon.stub().returns({
      cache: false
    }) // not testing the cache either
    console.log(pluginJsonapi)
    await server.register([
      pluginJsonapi
    ])
    await server.validator(require('joi'))
    server.route(require('./fixtures/routes'))
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
    it('should not try to add any jsonapiness to the lout documentation', async function () {
      const reply = await server.inject('/')
      expect(reply.result).to.equal(require('./fixtures/loutReply'))
    })

    it('should not try to add any jsonapiness to any 204 (DELETE) responses', async function () {
      const reply = await server.inject({
        url: '/delete',
        method: 'DELETE'
      })
      expect(reply).to.have.property('result').that.is.null
      expect(reply.statusCode).to.equal(204)
    })

    it('should 500 if resourceName isnt bound to the handler config', async function () {
      const reply = await server.inject('/noResourceName')
      expect(reply.result).to.deep.equal({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An internal server error occurred'
      })
    })

    it('should return an empty object with a successfully configured handler', async function () {
      const reply = await server.inject('/hasResourceName')
      expect(reply.result).to.deep.equal({})
    })

    it('should return an the reply "as is" if no resourceName found', async function () {
      const reply = await server.inject('/resourceNotDefined')
      expect(reply.result).to.deep.equal({ foo: 'bar' })
    })

    it('should handle a single object resource', async function () {
      const reply = await server.inject('/singleResourceObject')
      expect(reply.result).to.deep.equal({
        test: {
          id: '123456789',
          foo: 'bar',
          href: '/test/123456789'
        }
      })
    })
  })

  describe('hrefs', function () {
    it('should add href to resources with an id', async function () {
      const reply = await server.inject('/addHrefToResource')
      expect(reply.result).to.deep.equal({
        test: [
          {
            id: '123456789',
            foo: 'bar',
            href: '/test/123456789'
          }
        ]
      })
    })

    it('should not add href to resources without an id', async function () {
      const reply = await server.inject('/dontAddHrefToResource')
      expect(reply.result).to.deep.equal({
        test: [
          { foo: 'bar' }
        ]
      })
    })

    it('should add href to resource links that have a type and an id', async function () {
      const reply = await server.inject('/addHrefToResourceLinkWithTypeAndId')
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
    })

    it('should add href to resource links that have a type and multiple ids', async function () {
      const reply = await server.inject('/addHrefToResourceLinkWithTypeAndMultipleIds')
      expect(reply.result).to.deep.equal({
        test: [
          {
            foo: 'bar',
            links: {
              anotherTest: {
                ids: [1, 2],
                type: 'anotherTest',
                href: '/anotherTest/1,2'
              }
            }
          }
        ]

      })
    })

    it('should not add href to resource links that have no type', async function () {
      const reply = await server.inject('/addHrefToResourceLinkWithNoType')
      expect(reply.result).to.deep.equal({
        test: [
          {
            foo: 'bar',
            links: {
              anotherTest: {
                ids: [1, 2]
              }
            }
          }
        ]

      })
    })

    it('should not add href to resource links that have no ids', async function () {
      const reply = await server.inject('/addHrefToResourceLinkWithNoIds')
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
    })
  })

  describe('when "including"', function () {
    it('should fetch a single secondary resource and add it to the primary resource linked data', async function () {
      const reply = await server.inject('/primaryResource?include=secondaryResource')
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
    })

    it('should fetch a single secondary resource with context info and add it to the primary resource linked data', async function () {
      const reply = await server.inject('/primaryContextResource?include=secondaryContextResource&context[secondaryContextResource][additionalContextInfo]=true')
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
    })

    it('should boost linked data from a secondary resource up to the primary resource linked data', async function () {
      const reply = await server.inject('/anotherPrimaryResource?include=secondaryResourceWithLinked')
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
    })
  })

  describe('#errorHandler', function () {
    it('should call the request log with an error', function () {
      const request = {
        log: sandbox.spy(),
        data: 'DATA'
      }

      const requestLogSpy = request.log
      const reply = sandbox.stub()
      const error = new Error('ERROR_HANDLER')

      const expectedRequestLogWithArgument2 = {
        error: 'Error: ERROR_HANDLER',
        data: 'DATA'
      }

      pluginJsonapi.errorHandler(request, reply, error)
      expect(requestLogSpy.args[0][1]).to.be.deep.equal(expectedRequestLogWithArgument2)
    })
  })

  // having to skip these as not to sure how to test reply.continue
  describe.skip('#alsoMakeItSo', function () {
    it('should return early when isBoom is true', function () {
      const request = {
        response: {
          isBoom: true
        }
      }

      const reply = {
        continue: sandbox.spy()
      }
      const replyContinueSpy = reply.continue

      pluginJsonapi.alsoMakeItSo(request, reply)
      expect(replyContinueSpy).to.be.calledOnce()
    })

    it('should throw an error when the request.route.settings.bind.resourceName is not set', function () {
      const errorHandlerSpy = sandbox.spy(pluginJsonapi, 'errorHandler')
      const request = {
        log: sandbox.spy(),
        response: {
          source: 'SOURCE'
        }
      }

      const requestLogSpy = request.log

      const reply = sandbox.stub()

      pluginJsonapi.alsoMakeItSo(request, reply)
      expect(errorHandlerSpy).to.be.calledOnce()

      expect(requestLogSpy.args[0][1].error).to.be.equal('Error: configuration bind.resourceName not found on handler')
    })

    it('should return early when no resources are found', function () {
      const request = {
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

      const reply = {
        continue: sandbox.spy()
      }
      const replyContinueSpy = reply.continue

      pluginJsonapi.alsoMakeItSo(request, reply)
      expect(replyContinueSpy).to.be.calledOnce()
    })
  })
})
