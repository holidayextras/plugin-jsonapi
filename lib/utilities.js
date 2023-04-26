/* eslint valid-jsdoc:0 */
'use strict'

const _ = require('lodash')
const Q = require('q')
const path = require('path')
const qs = require('qs')
const url = require('url')

const utilities = module.exports = {}

// collect the includes for the sub resources
utilities.collectIncludes = function collectIncludes (stateObject) {
  // Before we start doing anything intensive, scratch out the includes
  if (_.get(stateObject, 'request.data.query.include')) {
    stateObject.includes = stateObject.request.data.query.include.split(',')
  }

  return Q.resolve(stateObject)
}

utilities.collectProxyableValues = function collectProxyableValues (stateObject) {
  const queryData = _.get(stateObject, 'request.data.query')

  stateObject.proxiedValues = _.reduce(queryData, function (matchedValues, queryValue, queryKey) {
    if (_.includes(stateObject.proxyableKeys, queryKey)) {
      matchedValues[queryKey] = queryValue
    }
    return matchedValues
  }, {})

  return Q.resolve(stateObject)
}

// From a type and an array of ids or filters, create a href to find things on
// There may also be context to pass on to the new url
utilities._buildHref = function _buildHref (hrefParameters, context, query = {}) {
  let ids = _.isArray(hrefParameters.ids) ? hrefParameters.ids.join(',') : hrefParameters.ids
  let queryString = ''
  if (_.has(context, hrefParameters.type)) {
    // build the url parts of context
    query.context = {}
    query.context[hrefParameters.type] = context[hrefParameters.type]
  }

  if (!_.isUndefined(hrefParameters.filter)) {
    // add the filters to the query
    query.filter = _.reduce(hrefParameters.filter, function (result, filterValues, filter) {
      // filterValues is an array of strings
      // now we need to join the array to have a string
      // so we can have a query string like "filter[productIds]=ID1,ID2"
      if (_.isArray(filterValues)) {
        result[filter] = filterValues.join(',')
      }

      return result
    }, {})
  }

  if (!_.isUndefined(hrefParameters.context)) {
    // add the filters to the query
    query.context = hrefParameters.context
  }

  // get all the query object into a querystring using qs
  queryString = qs.stringify(query)

  if (_.isUndefined(ids) || ids === '') {
    // add the trailing slash
    ids = '/'
  }

  // using nodes querystring doesn't seem to work, nor does passing the qs query into query
  return url.format({
    pathname: '/' + path.join(hrefParameters.type, ids),
    search: queryString
  })
}

// add the sub resource request to the list so they will be included in the linked resources
utilities._addSubResourceRequest = function _addSubResourceRequest (subResourceRequests, link) {
  // Ensure there's scope for the requested type
  if (!subResourceRequests[link.type]) {
    subResourceRequests[link.type] = {
      ids: []
    }
  }
  // Avoiding duplicates, add the ids for this link to the stack
  subResourceRequests[link.type].ids = _.union(subResourceRequests[link.type].ids, link.ids)

  if (link.filter) {
    if (!subResourceRequests[link.type].filter) {
      subResourceRequests[link.type].filter = {}
    }

    _.forEach(link.filter, function (value, filter) {
      if (!subResourceRequests[link.type].filter[filter]) {
        subResourceRequests[link.type].filter[filter] = []
      }

      // Avoiding duplicates, add the values for this link to the stack
      subResourceRequests[link.type].filter[filter] = _.union(subResourceRequests[link.type].filter[filter], value)
    })
  }

  if (link.context) {
    subResourceRequests[link.type].context = link.context
  }
}

// get resources links and build their URLs
utilities._getResourcesLinks = function _getResourcesLinks (links) {
  // Loop each resource in the links and where we have a 'type' and 'id' or 'filter', build a href
  _.forEach(links, function (link) {
    const hrefParameters = {
      type: link.type
    }

    // Need type and ids or/and filter to build the href
    if (link.type && (!_.isEmpty(link.ids) || !_.isEmpty(link.filter))) {
      if (!_.isEmpty(link.ids)) {
        hrefParameters.ids = link.ids
      }

      if (!_.isEmpty(link.filter)) {
        hrefParameters.filter = _.cloneDeep(link.filter)
        delete link.filter
      }

      if (!_.isEmpty(link.context)) {
        hrefParameters.context = link.context
      }

      // Build the relevant href
      // note we don't pass in any context properties to links as they
      // are as the name suggests, contextual
      link.href = utilities._buildHref(hrefParameters)
    }
  })
}

// get the resources
utilities.getResources = function getResources (stateObject) {
  // Controllers should return an array of resources but double check here
  const resourceArray = (_.isArray(stateObject.resources)) ? stateObject.resources : [stateObject.resources]

  // Loop the resources and pad out any required hrefs
  _.forEach(resourceArray, function (resource) {
    // build a href for the resource if there's an id property
    if (resource.id) {
      resource.href = utilities._buildHref({
        type: stateObject.request.route.settings.bind.resourceName,
        ids: resource.id
      })
    }

    // If there's no links then there's no actions to take
    if (resource.links) {
      utilities._getResourcesLinks(resource.links)
    }
  })

  return Q.resolve(stateObject)
}

// get the sub resources which are selected from the 'include' in the query string
utilities.getSubResources = function getSubResources (stateObject) {
  // Controllers should return an array of resources but double check here
  const resourceArray = (_.isArray(stateObject.resources)) ? stateObject.resources : [stateObject.resources]

  if (!stateObject.includes) {
    // no resources to include
    return Q.resolve(stateObject)
  }

  stateObject.subResourceRequests = {}
  // Loop the resources and pad out any required hrefs
  _.forEach(resourceArray, function (resource) {
    // If there's no links then there's no actions to take
    if (resource.links) {
      // Loop all the includes and if required pad out our subResourceRequest array
      _.forEach(stateObject.includes, function (include) {
        if (stateObject.linked && stateObject.linked[include]) {
          // We already have these resources
          return
        }
        if (resource.links[include]) {
          utilities._addSubResourceRequest(stateObject.subResourceRequests, resource.links[include])
        }
      })
    }
  })

  return Q.resolve(stateObject)
}

// request the sub resources.
utilities._requestSubResource = async function _requestSubResource (request, info, type, proxiedValues) {
  const hrefParameters = {
    type,
    ids: info.ids
  }

  if (info.filter) {
    // add the filters
    hrefParameters.filter = info.filter
  }

  if (info.context) {
    // add the filters
    hrefParameters.context = info.context
  }

  // Where will we find this resource?
  // if a `context` is available, proxy it to sub resources
  const subResourceUrl = utilities._buildHref(hrefParameters, request.data?.query?.context, proxiedValues)

  let headerHost = _.get(request, 'auth.artifacts.host')
  if (_.get(request, 'auth.artifacts.port')) {
    headerHost += ':' + request.auth.artifacts.port
  }

  const headers = {
    host: headerHost
  }
  if (request.headers && request.headers.referrer) {
    headers.referrer = request.headers.referrer
  }

  const auth = {
    ...request.auth
  }
  if (!auth.credentials) {
    auth.credentials = {}
  }
  if (!auth.strategy) {
    auth.strategy = {}
  }

  const response = await request.server.inject({
    url: subResourceUrl,
    auth,
    headers
  })

  // Append the result to our linked property if it responded without an error
  if (!response.result.error) {
    return response.result
  } else {
    // Return an empty object, we can send out as much content as we have, except this one...
    return {}
  }
}

// resolve the the sub resources and attach them to the linked element
utilities.resolveLinkedData = function resolveLinkedData (stateObject) {
  if (_.isEmpty(stateObject.subResourceRequests)) {
    // return early
    return Q.resolve()
  }

  const result = _.get(stateObject.request, 'response.source')
  const proxyDeferreds = []

  // send the sub resources
  _.forEach(stateObject.subResourceRequests, function (info, type) {
    proxyDeferreds.push(utilities._requestSubResource(stateObject.request, info, type, stateObject.proxiedValues))
  })

  return Q.all(proxyDeferreds)
    .then(function (subResources) {
      if (!result.linked) {
        result.linked = {}
      }

      // Promise chain returns an array, so...
      _.forEach(subResources, function (subResource) {
      // Shard off the meta and merge that with the meta for the same type at the root ensuring
      // It's an object if singular resource, an array if multiple
        _.merge(result.meta, subResource.meta)

        // Before we delete them, boost any linked data onto the primary resource
        _.merge(result.linked, subResource.linked)

        // Lose the meta and linked before we merge in the actual resource
        delete subResource.meta
        delete subResource.linked

        // and finaly boost the primary resource as linked data itself
        _.merge(result.linked, subResource)
      })

      return Q.resolve()
    })
}
