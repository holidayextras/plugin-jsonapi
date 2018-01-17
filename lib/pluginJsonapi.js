'use strict'

var Boom = require('boom')
var _ = require('lodash')
var pluginName = 'pluginJsonapi'
var utilities = require('./utilities')

// some paths sinply don't want to be jsonapi'd
var ignorePaths = [
  '/', // Lout documentation and AWS healthcheck
  '/css/{path*}' // Lout documentation
]

// certain status codes shouldn't be jsonapi'd
var ignoreStatusCodes = [
  201, // Created (used on POST)
  204 // No Content (used on DELETE)
]

var proxyableKeys = [
  'contentVersion',
  'lang',
  'ticketRates'
]

var pluginJsonApi = module.exports = {}

pluginJsonApi.errorHandler = function errorHandler (request, reply, error) {
  request.log(['error', __filename, pluginName], {
    error: error.toString(),
    data: request.data
  })

  return Boom.internal(error)
}

pluginJsonApi.alsoMakeItSo = function alsoMakeItSo (request, reply) {
 // eslint-disable-line consistent-return
  try {
    // If there was no error and it's not one of our ignoredPaths or ignored status codes, jsonapi it
    if (request.response.isBoom || _.includes(ignorePaths, _.get(request, 'route.path')) || _.includes(ignoreStatusCodes, request.response.statusCode)) {
      // return early
      return reply.continue
    }

    // Make the response a bit more accessible
    var result = _.get(request, 'response.source')
    // check a bind configuration is present
    if (!_.get(request, 'route.settings.bind.resourceName')) {
      throw new Error('configuration bind.resourceName not found on handler')
    }

    // Get the current resource from the result
    var resources = result[request.route.settings.bind.resourceName]
    if (!resources) {
      // no resources, return early
      return reply.continue
    }

    var stateObject = {
      request: request,
      resources: resources,
      linked: result.linked,
      proxyableKeys: proxyableKeys
    }

    /*
     * Flow
     * collectIncludes() - store the includes for later
     * getSubResources() - get the sub resources which will be linked
     * getResources() - get the resources
     * resolveLinkedData() - resolve the sub resources which we have collected previously
     */
    return utilities.collectIncludes(stateObject)
    .then(utilities.collectProxyableValues)
    .then(utilities.getSubResources)
    .then(utilities.getResources)
    .then(utilities.resolveLinkedData)
    .then(function () {
      // all done
      return reply.continue
    })
    .fail(function (error) {
      return pluginJsonApi.errorHandler(request, reply, error)
    })
  } catch (error) {
    return pluginJsonApi.errorHandler(request, reply, error)
  }
}

/**
* Registers the plugin when the hapi server bootstraps - follows the convention for Hapi.js plugins
* @param {object} server - the hapi plugin object
* @param {object} options - any initial options needed to set up the plugin
* @returns {undefined} Nothing - calls the next plugin
*/
const register = function (server, options) {
  function makeItSo (request, reply) {
    return pluginJsonApi.alsoMakeItSo(request, reply)
  }

  // Extend the onPreResponse for EVERY request through the api
  server.ext('onPreResponse', makeItSo)

  // In order to test this functionality it needs to be exposed on the server.
  if (process.env.NODE_ENV === 'test') {
    server.expose('makeItSo', makeItSo)
  }
}

const pkg = require('../package.json')
const {version, name} = pkg

pluginJsonApi.plugin = {
  register,
  name,
  version,
  pkg
}
