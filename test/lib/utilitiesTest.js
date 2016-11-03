'use strict';

var utilities = require('../../lib/utilities');
var _ = require('lodash');
var Q = require('q');

describe('utilities', function() {

  afterEach(function() {
    sandbox.restore();
  });

  describe('#collectIncludes', function() {
    it('should collect the include and add it to the stateObject', function() {
      var stateObject = {};
      _.set(stateObject, 'request.data.query.include', 'foo');

      var expected = _.cloneDeep(stateObject);
      expected.includes = ['foo'];

      return expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(expected);
    });

    it('should return foo and bar in an array on the stateObject', function() {
      var stateObject = {};
      _.set(stateObject, 'request.data.query.include', 'foo,bar');
      var expected = stateObject;
      expected.includes = ['foo', 'bar'];

      return expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(expected);
    });

    it('should return early as no include found', function() {
      return expect(utilities.collectIncludes({})).to.eventually.deep.equal({});
    });
  });


  describe('#getResources', function() {

    beforeEach(function() {
      sandbox.stub(utilities, '_buildHref').returns('HREF');
    });

    it('should return early as there are no ids on the resource', function() {
      var stateObject = {
        resources: 'RESOURCES'
      };

      return expect(utilities.getResources(stateObject)).to.eventually.deep.equal(stateObject);
    });

    it('should build a href for the resource', function() {
      var stateObject = {
        resources: [
          {
            id: 'ID'
          }
        ]
      };
      _.set(stateObject, 'request.route.settings.bind.resourceName', 'TYPE');

      var expected = _.cloneDeep(stateObject);
      expected.resources = [
        {
          id: 'ID',
          href: 'HREF'
        }
      ];

      return expect(utilities.getResources(stateObject)).to.eventually.deep.equal(expected);
    });
  });


  describe('#getSubResources', function() {
    it('should add a sub resource', function() {
      var stateObject = {
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
      };

      var expected = _.cloneDeep(stateObject);
      expected.subResourceRequests = {
        LINK1: {
          ids: ['LINK_ID1']
        }
      };

      return expect(utilities.getSubResources(stateObject)).to.eventually.deep.equal(expected);
    });

    it('should not attach any sub resources as nothing is included', function() {
      var stateObject = {
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
      };

      return expect(utilities.getSubResources(stateObject)).to.eventually.deep.equal(stateObject);
    });
  });



  describe('#resolveLinkedData', function() {

    beforeEach(function() {
      sandbox.stub(utilities, '_requestSubResource').returns(Q.resolve({
        SUBRESOURCE1: [
          {
            linked: 'SUBRESOURCE1_LINKED',
            meta: 'SUBRESOURCE1_META'
          }
        ]
      }));
    });


    it('should return early as no sub reources are provided', function() {

      return expect(utilities.resolveLinkedData({})).to.eventually.be.undefined();
    });


    it('should attach the sub reources as linked', function() {
      var stateObject = {
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
      };

      var expected = {
        result: 'RESULT',
        linked: {
          SUBRESOURCE1: [
            {
              linked: 'SUBRESOURCE1_LINKED',
              meta: 'SUBRESOURCE1_META'
            }
          ]
        }
      };

      return utilities.resolveLinkedData(stateObject)
      .then(function() {
        return expect(stateObject.request.response.source).to.be.deep.equal(expected);
      });
    });
  });
});
