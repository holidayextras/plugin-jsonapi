'use strict';

var utilities = require('../../lib/utilities');
var _ = require('lodash');

describe('utilities', function() {

  afterEach(function() {
    sandbox.restore();
  });

  describe('#collectIncludes', function() {
    it('here', function() {
      var stateObject = {};
      _.set(stateObject, 'request.data.query.include', 'foo');
      var expected = stateObject;
      expected.includes = ['foo'];

      expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(expected);
    });

    it('here2', function() {
      var stateObject = {};
      _.set(stateObject, 'request.data.query.include', 'foo,bar');
      var expected = stateObject;
      expected.includes = ['foo', 'bar'];

      expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(expected);
    });

    it('here3', function() {
      var stateObject = {};
      expect(utilities.collectIncludes(stateObject)).to.eventually.deep.equal(stateObject);
    });
  });


  describe('#getResources', function() {

    beforeEach(function() {
      sandbox.stub(utilities, '_getResourcesLinks').returns('RESOURCE_LINKS');
      sandbox.stub(utilities, '_buildHref').returns('HREF2');
    });

    it('here', function() {
      var stateObject = {
        resources: [
          {
            id: 'ID2'
          }
        ]
      };
      _.set(stateObject, 'request.route.settings.bind.resourceName', 'TYPE');

      var expected = {
        resources: [
          {
            id: 'ID',
            href: 'HREF'
          }
        ]
      };

      expect(utilities.getResources(stateObject)).to.eventually.deep.equal(expected);
    });


  });

});
