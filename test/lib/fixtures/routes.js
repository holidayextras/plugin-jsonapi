/* eslint no-unneeded-ternary:0 */
'use strict'
const Joi = require('joi')

module.exports = [
  {
    method: 'GET',
    path: '/noResourceName',
    handler: function (request, reply) {
      return {}
    }
  },
  {
    method: 'GET',
    path: '/hasResourceName',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {}
    }
  },
  {
    method: 'GET',
    path: '/resourceNotDefined',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        foo: 'bar'
      }
    }
  },

  {
    method: 'GET',
    path: '/singleResourceObject',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: {
          id: '123456789',
          foo: 'bar'
        }
      }
    }
  },

  {
    method: 'GET',
    path: '/addHrefToResource',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: [{
          id: '123456789',
          foo: 'bar'
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/dontAddHrefToResource',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: [{
          foo: 'bar'
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/addHrefToResourceLinkWithTypeAndId',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: [{
          foo: 'bar',
          links: {
            anotherTest: {
              ids: [1],
              type: 'anotherTest'
            }
          }
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/addHrefToResourceLinkWithTypeAndMultipleIds',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: [{
          foo: 'bar',
          links: {
            anotherTest: {
              ids: [1, 2],
              type: 'anotherTest'
            }
          }
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/addHrefToResourceLinkWithNoType',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: [{
          foo: 'bar',
          links: {
            anotherTest: {
              ids: [1, 2]
            }
          }
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/addHrefToResourceLinkWithNoIds',
    config: {
      bind: {
        resourceName: 'test'
      }
    },
    handler: function (request, reply) {
      return {
        test: [{
          foo: 'bar',
          links: {
            anotherTest: {
              type: 'anotherTest'
            }
          }
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/primaryResource',
    config: {
      validate: {
        query: {
          include: Joi.string().optional()
        }
      },
      bind: {
        resourceName: 'primaryResource'
      }
    },
    handler: function (request, reply) {
      // setup the include proxy
      request.data = {
        query: {
          include: request.query.include
        }
      }
      return {
        primaryResource: [{
          foo: 'bar',
          links: {
            secondaryResource: {
              ids: [1],
              type: 'secondaryResource'
            }
          }
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/secondaryResource/{id}',
    config: {
      bind: {
        resourceName: 'secondaryResource'
      }
    },
    handler: function (request, reply) {
      return {
        secondaryResource: [{
          foo: 'bar'
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/primaryContextResource',
    config: {
      validate: {
        options: {
          allowUnknown: true
        },
        query: {
          include: Joi.string().optional()
        }
      },
      bind: {
        resourceName: 'primaryContextResource'
      }
    },
    handler: function (request, reply) {
      // setup the include and context proxy
      request.data = {
        query: {
          include: request.query.include,
          context: request.query.context
        }
      }
      return {
        primaryContextResource: [{
          foo: 'bar',
          links: {
            secondaryContextResource: {
              ids: [1],
              type: 'secondaryContextResource'
            }
          }
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/secondaryContextResource/{id}',
    config: {
      validate: {
        options: {
          allowUnknown: true
        }
      },
      bind: {
        resourceName: 'secondaryContextResource'
      }
    },
    handler: function (request, reply) {
      // note we're conditionally adding a boolean to flag whether the
      // additionalContextInfo context was proxied successfully
      return {
        secondaryContextResource: [{
          foo: 'bar',
          additionalContextInfo: request.query.context?.secondaryContextResource?.additionalContextInfo ? true : false
        }]
      }
    }
  },
  {
    method: 'GET',
    path: '/anotherPrimaryResource',
    config: {
      validate: {
        query: {
          include: Joi.string().optional()
        }
      },
      bind: {
        resourceName: 'anotherPrimaryResource'
      }
    },
    handler: function (request, reply) {
      // setup the include proxy
      request.data = {
        query: {
          include: request.query.include
        }
      }
      return {
        anotherPrimaryResource: [{
          foo: 'bar',
          links: {
            secondaryResourceWithLinked: {
              ids: [1],
              type: 'secondaryResourceWithLinked'
            }
          }
        }],
        linked: {
          primaryLinkedResource: [{
            hey: 'you guys'
          }]
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/secondaryResourceWithLinked/{id}',
    config: {
      bind: {
        resourceName: 'secondaryResourceWithLinked'
      }
    },
    handler: function (request, reply) {
      return {
        secondaryResourceWithLinked: [{
          foo: 'bar'
        }],
        linked: {
          secondaryLinkedResource: [{
            optimusPrime: 'isCool'
          }]
        }
      }
    }
  },
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      return require('./loutReply.js')
    }
  },
  {
    method: 'DELETE',
    path: '/delete',
    handler: function (request, reply) {
      return reply.response().code(204)
    }
  }
]
