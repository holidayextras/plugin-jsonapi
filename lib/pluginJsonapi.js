/* eslint valid-jsdoc:0 */
'use strict';

var Boom = require('boom');
var _ = require('lodash');
var pluginName = 'pluginJsonapi';
var utilities = require('./utilities');

function pluginJsonapi( server, options, next ) {

  // some paths sinply don't want to be jsonapi'd
  var ignorePaths = [
    '/', // Lout documentation and AWS healthcheck
    '/css/{path*}' // Lout documentation
  ];

  // certain status codes shouldn't be jsonapi'd
  var ignoreStatusCodes = [
    201, // Created (used on POST)
    204 // No Content (used on DELETE)
  ];


  function errorHandler( request, reply, error ) {
    request.log( ['error', __filename, pluginName], {
      error: error.toString(),
      data: request.data
    } );

    return reply(Boom.internal(error));
  }

  /**
  * JSONapiify the result
  * @param {Object} request
  * @param {Object} reply
  */
  function makeItSo( request, reply ) { // eslint-disable-line consistent-return

    try {
      // If there was no error and it's not one of our ignoredPaths or ignored status codes, jsonapi it
      if (request.response.isBoom || _.includes(ignorePaths, request.route.path) || _.includes(ignoreStatusCodes, request.response.statusCode)) {
        // return early
        return reply.continue();
      }

      // Make the response a bit more accessible
      var result = _.get(request, 'response.source');
      // check a bind configuration is present
      if ( !_.get(request, 'route.settings.bind')) {
        throw new Error('configuration bind.resourceName not found on handler');
      }

      // Get the current resource from the result
      var resources = result[request.route.settings.bind.resourceName];
      if (!resources) {
        // no resources, return early
        return reply.continue();
      }

      var stateObject = {
        request: request,
        resources: resources
      };

      /*
       * Flow
       * collectIncludes() - store the includes for later
       * getSubResources() - get the sub resources which will be linked
       * getResources() - get the resources
       * resolveLinkedData() - resolve the sub resources which we have collected previously
       */
      utilities.collectIncludes(stateObject)
      .then(utilities.getSubResources)
      .then(utilities.getResources)
      .then(utilities.resolveLinkedData)
      .then(function() {
        // all done
        return reply.continue();
      })
      .fail(function(error) {
        return errorHandler(request, reply, error);
      })
      .done();

    } catch ( error ) {
      return errorHandler(request, reply, error);
    }
  }

  // Extend the onPreResponse for EVERY request through the api
  server.ext('onPreResponse', makeItSo);

  // In order to test this functionality it needs to be exposed on the server.
  if (process.env.NODE_ENV === 'test') {
    server.expose('makeItSo', makeItSo);
  }

  next();
}

exports.register = pluginJsonapi;

exports.register.attributes = {
  pkg: require('../package.json')
};
