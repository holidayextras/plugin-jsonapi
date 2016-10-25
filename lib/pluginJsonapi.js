/* eslint valid-jsdoc:0 */
'use strict';

var Boom = require( 'boom' );
var _ = require( 'lodash' );
var path = require( 'path' );
var pluginName = 'pluginJsonapi';
var Q = require( 'q' );
var qs = require( 'qs' );
var url = require( 'url' );

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

  /**
  * From a type and an array of ids, create a href to find things on
  * There may also be context and or filters to pass on to the new url
  * @param {Object} hrefParameters
  * @param {Object} context
  */
  function _buildHref( hrefParameters, context ) {
    var ids = _.isArray( hrefParameters.ids ) ? hrefParameters.ids.join( ',' ) : hrefParameters.ids;

    var queryString = '';
    var query = {};

    if ( !_.isUndefined( context ) && !_.isUndefined( context[hrefParameters.type] ) ) {
      // build the url parts of context
      query.context = {};
      query.context[hrefParameters.type] = context[hrefParameters.type];
    }

    if ( !_.isUndefined( hrefParameters.filter ) ) {
      // add the filters to the query
      query.filter = _.reduce( hrefParameters.filter, function( result, filterValues, filter ) {
        // filterValues is an array of strings
        // now we need to join the array to have a string
        // so we can have a query string like "filter[productIds]=ID1,ID2"
        if ( _.isArray( filterValues ) ) {
          result[filter] = filterValues.join( ',' );
        }
        return result;
      }, {} );
    }

    // get all the query object into a querystring using qs
    queryString = qs.stringify( query );

    if ( _.isUndefined( ids ) || ids === '' ) {
      // add the trailing slash
      ids = '/';
    }

    // using nodes querystring doesn't seem to work, nor does passing the qs query into query
    return url.format( {
      pathname: '/' + path.join( hrefParameters.type, ids ),
      search: queryString
    } );
  }

  /**
  * Takes responsibility for gathering all the sub resources and updating the root result
  * @param {Object} request
  * @param {Array} subResourceRequests
  */
  function _resolveLinkedData( request, subResourceRequests ) {
    var result = request.response.source;
    var resolvedDeferred = Q.defer();
    var proxyDeferreds = [];

    _.each( subResourceRequests, function( info, type ) {
      var proxyDeferred = Q.defer();
      proxyDeferreds.push( proxyDeferred.promise );
      var hrefParameters = {
        type: type,
        ids: info.ids
      };

      if ( info.filter ) {
        // add the filters
        hrefParameters.filter = info.filter;
      }

      // Where will we find this resource?
      // if a `context` is available, proxy it to sub resources
      var subResourceUrl = _buildHref( hrefParameters, request.url.query.context );

      request.server.inject( {
        url: subResourceUrl,
        credentials: request.auth.credentials,
        artifacts: request.auth.artifacts,
        headers: {
          host: 'theworks-production.t-bob.co.uk'
        }
      }, function( response ) {
        // Append the result to our linked property if it responded without an error
        if ( !response.result.error ) {
          proxyDeferred.resolve( response.result );
        } else {
          // Return an empty array, we can send out as much content as we have, except this one...
          proxyDeferred.resolve( {} );
        }
      } );
    } );

    Q.all( proxyDeferreds ).then( function( subResources ) {

      if ( !result.linked ) {
        result.linked = {};
      }
      // Promise chain returns an array, so...
      _.each( subResources, function( subResource ) {
        // Shard off the meta and merge that with the meta for the same type at the root ensuring
        // It's an object if singular resource, an array if multiple
        _.merge( result.meta, subResource.meta );
        // Before we delete them, boost any linked data onto the primary resource
        _.merge( result.linked, subResource.linked );
        // Lose the meta and linked before we merge in the actual resource
        delete subResource.meta;
        delete subResource.linked;
        // and finaly boost the primary resource as linked data itself
        _.merge( result.linked, subResource );
      } );

      resolvedDeferred.resolve();

    } );

    return resolvedDeferred.promise;

  }

  /**
  * From a type and an array of ids, create a href to find things on
  * @param {Array} subResourceRequests - existing set of resources to append to
  * @param {Object} link - the resource we are polling
  */
  function _addSubResourceRequest( subResourceRequests, link ) {
    // Ensure there's scope for the requested type
    if ( !subResourceRequests[link.type] ) {
      subResourceRequests[link.type] = { ids: [] };
    }
    // Avoiding duplicates, add the ids for this link to the stack
    subResourceRequests[link.type].ids = _.union( subResourceRequests[link.type].ids, link.ids );

    if ( link.filter ) {
      subResourceRequests[link.type].filter = link.filter;

      // remove the filter from reply
      delete link.filter;
    }
  }

  /**
  * JSONapiify the result
  * @param {Object} request
  * @param {Object} reply
  */
  function makeItSo( request, reply ) {

    try {
      // If there was no error and it's not one of our ignoredPaths or ignored status codes, jsonapi it
      if ( !request.response.isBoom && ( !_.contains( ignorePaths, request.route.path ) ) && ( !_.contains( ignoreStatusCodes, request.response.statusCode ) ) ) {
        // Scoped variable to group resrouces on 'type'
        var subResourceRequests = {};
        // Make the response a bit more accessible
        var result = request.response.source;
        // check a bind configuration is present
        if ( !request.route.settings.bind ) {
          throw new Error( 'configuration bind.resourceName not found on handler' );
        }
        // Get the current resource from the result
        var resources = result[request.route.settings.bind.resourceName];
        if ( resources ) {
          // Controllers should return an array of resources but double check here
          var resourceArray = ( _.isArray( resources ) ) ? resources : [resources];
          // Before we start doing anything intensive, scratch out the includes
          var includes = [];
          if ( request.data && request.data.query && request.data.query.include ) {
            includes = request.data.query.include.split( ',' );
          }
          // Loop the resources and pad out any required hrefs
          _.each( resourceArray, function( resource ) {
            // build a href for the resource if there's an id property
            if ( resource.id ) {
              resource.href = _buildHref( {
                type: request.route.settings.bind.resourceName,
                ids: resource.id
              } );
            }

            // If there's no links then there's no actions to take
            if ( resource.links ) {

              // Loop each resource in the links and where we have a 'type' and 'id', build a href
              _.each( resource.links, function( value ) {
                var hrefParameters = {
                  type: value.type
                };

                // Need type and ids or/and filter to build the href
                if ( value.type && ( _.size( value.ids ) || _.size( value.filter ) ) ) {

                  if ( _.size( value.ids ) ) {
                    hrefParameters.ids = value.ids;
                  }

                  if ( _.size( value.filter ) ) {
                    hrefParameters.filter = _.cloneDeep( value.filter );

                    if ( !_.size( includes ) ) {
                      // remove the filter when we do not have any includes
                      delete value.filter;
                    }
                  }

                  // Build the relevant href
                  // note we don't pass in any context properties to links as they
                  // are as the name suggests, contextual
                  value.href = _buildHref( hrefParameters );
                }
              } );
              // Loop all the includes and pad out our subResourceRequest array
              _.each( includes, function( include ) {
                // If we have links to the requested include, chalk it up
                if ( resource.links && resource.links[include] ) {
                  _addSubResourceRequest( subResourceRequests, resource.links[include] );
                }
              } );
            }
          } );
        }

        // If there's some subResourceRequests, resolve them
        if ( _.keys( subResourceRequests ).length ) {
          _resolveLinkedData( request, subResourceRequests ).then( function() {
            return reply.continue();
          } );
        } else {
          // No sub resources required so we don't set a linked property
          return reply.continue();
        }

      } else {
        return reply.continue();
      }

    } catch ( error ) {
      request.log( ['error', __filename, pluginName], {
        error: error.toString(),
        data: request.data
      } );
      return reply( Boom.internal( error ) );
    }

  }

  // Extend the onPreResponse for EVERY request through the api
  server.ext( 'onPreResponse', makeItSo );
  // In order to test this functionality it needs to be exposed on the server.
  if ( process.env.NODE_ENV === 'test' ) {
    server.expose( 'makeItSo', makeItSo );
  }
  next();

}

exports.register = pluginJsonapi;

exports.register.attributes = {
  pkg: require( '../package.json' )
};
