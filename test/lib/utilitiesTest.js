'use strict'

const utilities = require('../../lib/utilities')
const _ = require('lodash')
const Q = require('q')

describe('utilities', function () {
  afterEach(function () {
    sandbox.restore()
  })

  describe('#collectIncludes', function () {
    it('should collect the include and add it to the stateObject', function () {
      const stateObject = {}
      _.set(stateObject, 'request.data.query.include', 'foo')

      const expected = _.cloneDeep(stateObject)
      expected.includes = ['foo']

      return expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(expected)
    })

    it('should return foo and bar in an array on the stateObject', function () {
      const stateObject = {}
      _.set(stateObject, 'request.data.query.include', 'foo,bar')
      const expected = stateObject
      expected.includes = ['foo', 'bar']

      return expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(expected)
    })

    it('should return early as no include found', function () {
      return expect(utilities.collectIncludes({})).to.eventually.deep.equal({})
    })
  })

  describe('#getResources', function () {
    beforeEach(function () {
      sandbox.stub(utilities, '_buildHref').returns('HREF')
    })

    it('should return early as there are no ids on the resource', function () {
      const stateObject = {
        resources: 'RESOURCES'
      }

      return expect(utilities.getResources(stateObject)).to.eventually.deep.equal(stateObject)
    })

    it('should build a href for the resource', function () {
      const stateObject = {
        resources: [
          {
            id: 'ID'
          }
        ]
      }
      _.set(stateObject, 'request.route.settings.bind.resourceName', 'TYPE')

      const expected = _.cloneDeep(stateObject)
      expected.resources = [
        {
          id: 'ID',
          href: 'HREF'
        }
      ]

      return expect(utilities.getResources(stateObject)).to.eventually.deep.equal(expected)
    })
  })

  describe('#getSubResources', function () {
    it('should add a sub resource', function () {
      const stateObject = {
        resources: [
          {
            id: 'ID',
            links: {
              LINK1: {
                ids: ['LINK_ID1'],
                type: 'LINK1'
              }
            }
          }
        ],
        includes: ['LINK1']
      }

      const expected = _.cloneDeep(stateObject)
      expected.subResourceRequests = {
        LINK1: {
          ids: ['LINK_ID1']
        }
      }

      return expect(utilities.getSubResources(stateObject)).to.eventually.deep.equal(expected)
    })

    it('should not attach any sub resources as nothing is included', function () {
      const stateObject = {
        resources: [
          {
            id: 'ID',
            links: {
              LINK1: {
                ids: ['LINK_ID1'],
                type: 'LINK1'
              }
            }
          }
        ]
      }

      return expect(utilities.getSubResources(stateObject)).to.eventually.deep.equal(stateObject)
    })

    it('should not attach any already linked sub resources', function () {
      const stateObject = {
        resources: [
          {
            id: 'ID',
            links: {
              LINK1: {
                ids: ['LINK_ID1'],
                type: 'LINK1'
              }
            }
          }
        ],
        includes: ['LINK1'],
        linked: {
          LINK1: []
        }
      }

      const expected = _.cloneDeep(stateObject)
      expected.subResourceRequests = {}

      return expect(utilities.getSubResources(stateObject)).to.eventually.deep.equal(expected)
    })

    it('should not attach any already linked sub resources, but still add unlinked ones', function () {
      const stateObject = {
        resources: [
          {
            id: 'ID',
            links: {
              LINK1: {
                ids: ['LINK_ID1'],
                type: 'LINK1'
              },
              LINK2: {
                ids: ['LINK_ID2'],
                type: 'LINK2'
              }
            }
          }
        ],
        includes: ['LINK1', 'LINK2'],
        linked: {
          LINK1: []
        }
      }

      const expected = _.cloneDeep(stateObject)
      expected.subResourceRequests = {
        LINK2: {
          ids: ['LINK_ID2']
        }
      }
      return expect(utilities.getSubResources(stateObject)).to.eventually.deep.equal(expected)
    })
  })

  describe('#resolveLinkedData', function () {
    beforeEach(function () {
      sandbox.stub(utilities, '_requestSubResource').returns(Q.resolve({
        SUBRESOURCE1: [
          {
            linked: 'SUBRESOURCE1_LINKED',
            meta: 'SUBRESOURCE1_META'
          }
        ]
      }))
    })

    it('should return early as no sub reources are provided', function () {
      return expect(utilities.resolveLinkedData({})).to.eventually.be.undefined()
    })

    it('should attach the sub reources as linked', function () {
      const stateObject = {
        request: {
          response: {
            source: {
              result: 'RESULT'
            }
          }
        },
        subResourceRequests: {
          SUBRESOURCE1: {
            linked: 'SUBRESOURCE1_LINKED'
          }
        }
      }

      const expected = {
        result: 'RESULT',
        linked: {
          SUBRESOURCE1: [
            {
              linked: 'SUBRESOURCE1_LINKED',
              meta: 'SUBRESOURCE1_META'
            }
          ]
        }
      }

      return utilities.resolveLinkedData(stateObject)
        .then(function () {
          return expect(stateObject.request.response.source).to.be.deep.equal(expected)
        })
    })
  })

  describe('#_buildHref', function () {
    it('should return an URL the type and id', function () {
      const hrefParameters = {
        ids: ['ID'],
        type: 'TYPE'
      }

      const expected = '/TYPE/ID'

      expect(utilities._buildHref(hrefParameters)).to.be.equal(expected)
    })

    it('should return an URL the type and the ids as comma separated list', function () {
      const hrefParameters = {
        ids: ['ID1', 'ID2'],
        type: 'TYPE'
      }

      const expected = '/TYPE/ID1,ID2'

      expect(utilities._buildHref(hrefParameters)).to.be.equal(expected)
    })

    it('should return an URL the type and the filter added as a query string', function () {
      const hrefParameters = {
        type: 'TYPE',
        filter: {
          FILTER: ['FILTER_VALUE']
        }
      }

      const expected = '/TYPE/?filter%5BFILTER%5D=FILTER_VALUE'

      expect(utilities._buildHref(hrefParameters, undefined, {})).to.be.equal(expected)
    })

    it('should return an URL the type, ids and the filter added as a query string', function () {
      const hrefParameters = {
        ids: ['ID1', 'ID2'],
        type: 'TYPE',
        filter: {
          FILTER: ['FILTER_VALUE']
        }
      }

      const expected = '/TYPE/ID1,ID2?filter%5BFILTER%5D=FILTER_VALUE'

      expect(utilities._buildHref(hrefParameters, undefined, {})).to.be.equal(expected)
    })

    it('should return an URL the type and the context added as a query string', function () {
      const hrefParameters = {
        type: 'TYPE',
        context: {
          CONTEXT: ['CONTEXT_VALUE']
        }
      }

      const expected = '/TYPE/?context%5BCONTEXT%5D%5B0%5D=CONTEXT_VALUE'

      expect(utilities._buildHref(hrefParameters, undefined, {})).to.be.equal(expected)
    })

    it('should return an URL the type, ids and the context added as a query string', function () {
      const hrefParameters = {
        ids: ['ID1', 'ID2'],
        type: 'TYPE',
        context: {
          CONTEXT: ['CONTEXT_VALUE']
        }
      }

      const expected = '/TYPE/ID1,ID2?context%5BCONTEXT%5D%5B0%5D=CONTEXT_VALUE'

      expect(utilities._buildHref(hrefParameters, undefined, {})).to.be.equal(expected)
    })
  })

  describe('#_addSubResourceRequest', function () {
    it('should add the link to the subResources', function () {
      const link = {
        ids: ['ID'],
        type: 'TYPE'
      }

      const subResources = {}

      const expected = {
        TYPE: {
          ids: ['ID']
        }
      }

      utilities._addSubResourceRequest(subResources, link)
      expect(subResources).to.be.deep.equal(expected)
    })

    it('should add a new id to the already existing subResource', function () {
      const link = {
        ids: ['ID2'],
        type: 'TYPE'
      }

      const subResources = {
        TYPE: {
          ids: ['ID1']
        }
      }

      const expected = {
        TYPE: {
          ids: ['ID1', 'ID2']
        }
      }

      utilities._addSubResourceRequest(subResources, link)
      expect(subResources).to.be.deep.equal(expected)
    })

    it('should add the link to the subResources (new filter)', function () {
      const link = {
        filter: {
          FILTER: ['FILTER_VALUE']
        },
        type: 'TYPE'
      }

      const subResources = {}

      const expected = {
        TYPE: {
          ids: [],
          filter: {
            FILTER: ['FILTER_VALUE']
          }
        }
      }

      utilities._addSubResourceRequest(subResources, link)
      expect(subResources).to.be.deep.equal(expected)
    })

    it('should add a new filter id to the alredy existed subResource (new filter)', function () {
      const link = {
        filter: {
          FILTER: ['FILTER_VALUE2']
        },
        type: 'TYPE'
      }

      const subResources = {
        TYPE: {
          ids: [],
          filter: {
            FILTER: ['FILTER_VALUE1']
          }
        }
      }

      const expected = {
        TYPE: {
          ids: [],
          filter: {
            FILTER: ['FILTER_VALUE1', 'FILTER_VALUE2']
          }
        }
      }

      utilities._addSubResourceRequest(subResources, link)
      expect(subResources).to.be.deep.equal(expected)
    })

    it('should add the link to the subResources (new context)', function () {
      const link = {
        context: {
          CONTEXT: ['CONTEXT_VALUE']
        },
        type: 'TYPE'
      }

      const subResources = {}

      const expected = {
        TYPE: {
          ids: [],
          context: {
            CONTEXT: ['CONTEXT_VALUE']
          }
        }
      }

      utilities._addSubResourceRequest(subResources, link)
      expect(subResources).to.be.deep.equal(expected)
    })
  })

  describe('#_getResourcesLinks', function () {
    beforeEach(function () {
      sandbox.stub(utilities, '_buildHref').returns('HREF')
    })

    it('should build the href for the resource', function () {
      const links = [
        {
          ids: ['ID'],
          type: 'TYPE'
        }
      ]

      const expected = [
        {
          ids: ['ID'],
          type: 'TYPE',
          href: 'HREF'
        }
      ]

      utilities._getResourcesLinks(links)
      expect(links).to.be.deep.equal(expected)
    })

    it('should build the href for the resource and remove the filter', function () {
      const links = [
        {
          filter: 'FILTER',
          type: 'TYPE'
        }
      ]

      const expected = [
        {
          type: 'TYPE',
          href: 'HREF'
        }
      ]

      utilities._getResourcesLinks(links)
      expect(links).to.be.deep.equal(expected)
    })
  })

  describe('#collectProxyableValues', function () {
    const stateObject = {
      request: {
        data: {
          query: {
            agent: 'CCP01',
            customerCode: 'Q',
            ticketRates: {
              startDate: '2017-10-09T00:00:00.000Z',
              bucket: 'CBF',
              numAdults: '2',
              numChildren: '2',
              numInfants: '0',
              numInfants1: '0',
              numInfants2: '',
              adults: '2',
              children: '2',
              infants: '0'
            },
            context: {
              hotelProducts: {
                checkinDate: '2017-10-09'
              }
            }
          }
        }
      },
      proxyableKeys: [
        'contentVersion',
        'lang',
        'ticketRates',
        'agent',
        'customerCode'
      ]
    }

    const expectedStateObject = {
      request: {
        data: {
          query: {
            agent: 'CCP01',
            customerCode: 'Q',
            ticketRates: {
              startDate: '2017-10-09T00:00:00.000Z',
              bucket: 'CBF',
              numAdults: '2',
              numChildren: '2',
              numInfants: '0',
              numInfants1: '0',
              numInfants2: '',
              adults: '2',
              children: '2',
              infants: '0'
            },
            context: {
              hotelProducts: {
                checkinDate: '2017-10-09'
              }
            }
          }
        }
      },
      proxyableKeys: [
        'contentVersion',
        'lang',
        'ticketRates',
        'agent',
        'customerCode'
      ],
      proxiedValues: {
        agent: 'CCP01',
        customerCode: 'Q',
        ticketRates: {
          startDate: '2017-10-09T00:00:00.000Z',
          bucket: 'CBF',
          numAdults: '2',
          numChildren: '2',
          numInfants: '0',
          numInfants1: '0',
          numInfants2: '',
          adults: '2',
          children: '2',
          infants: '0'
        }
      }
    }

    it('should build up an object of values to be proxied back up', function () {
      return utilities.collectProxyableValues(stateObject)
        .then(function (result) {
          expect(result).to.deep.equal(expectedStateObject)
        })
    })
  })
})
