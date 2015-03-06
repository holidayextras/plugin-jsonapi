/* jslint node: true */
/* jshint -W030 */
/* jshint -W098 */ // ignore `is defined but never used`
'use strict';

/*
* @name /test/pluginJsonapiTest.js
* @description Root test file, there's a Grunt task to execute all this shizzle, powered by Mocha
* @since Mon Oct 27 2014
* @author Kevin Hodges <kevin.hodges@holidayextras.com>
*/

var should = require( 'chai' ).should();
var Hapi = require( 'hapi' );
var chai = require( 'chai' );

// declare our variables upfront or jshint will start
// bitching about `should` being defined but unused
var server;

describe( 'pluginJsonapi', function() {

	before( function( done ) {

		server = new Hapi.Server();
		server.route( require( './fixtures/routes' ) );
		// and then register this plugin to that server
		server.pack.register( require( '../lib/pluginJsonapi' ), function() {
			done();
		} );

	} );

	describe( 'resources', function() {

		it( 'should not try to add any jsonapiness to the lout documentation', function( done ) {
			server.inject( '/', function( reply ) {
				reply.result.should.equal( require( './fixtures/loutReply.js' ) );
				done();
			} );
		} );

		it( 'should not try to add any jsonapiness to any 204 (DELETE) responses', function( done ) {
			server.inject( { url: '/delete', method: 'DELETE' }, function( reply ) {
				reply.should.have.property( 'result' ).that.is.null;
				reply.statusCode.should.equal( 204 );
				done();
			} );
		} );

		it( 'should 500 if resourceName isnt bound to the handler config', function( done ) {
			server.inject( '/noResourceName', function( reply ) {
				reply.result.should.deep.equal( {
					statusCode: 500,
					error: 'Internal Server Error',
					message: 'An internal server error occurred'
				} );
				done();
			} );
		} );

		it( 'should return an empty object with a successfully configured handler', function( done ) {
			server.inject( '/hasResourceName', function( reply ) {
				reply.result.should.deep.equal( {} );
				done();
			} );
		} );

		it( 'should return an the reply "as is" if no resourceName found', function( done ) {
			server.inject( '/resourceNotDefined', function( reply ) {
				reply.result.should.deep.equal( { foo: 'bar' } );
				done();
			} );
		} );

	} );

	describe( 'hrefs', function() {

		it( 'should add href to resources with an id', function( done ) {
			server.inject( '/addHrefToResource', function( reply ) {
				reply.result.should.deep.equal( { test: [ { id: '123456789', foo: 'bar', href: '/test/123456789' } ] } );
				done();
			} );
		} );

		it( 'should not add href to resources without an id', function( done ) {
			server.inject( '/dontAddHrefToResource', function( reply ) {
				reply.result.should.deep.equal( { test: [ { foo: 'bar' } ] } );
				done();
			} );
		} );

		it( 'should add href to resource links that have a type and an id', function( done ) {
			server.inject( '/addHrefToResourceLinkWithTypeAndId', function( reply ) {
				reply.result.should.deep.equal( {
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
				} );
				done();
			} );
		} );

		it( 'should add href to resource links that have a type and multiple ids', function( done ) {
			server.inject( '/addHrefToResourceLinkWithTypeAndMultipleIds', function( reply ) {
				reply.result.should.deep.equal( {
					test: [
						{
							foo: 'bar',
							links: {
								anotherTest: {
									ids: [1,2],
									type: 'anotherTest',
									href: '/anotherTest/1,2'
								}
							}
						}
					]
				} );
				done();
			} );
		} );

		it( 'should not add href to resource links that have no type', function( done ) {
			server.inject( '/addHrefToResourceLinkWithNoType', function( reply ) {
				reply.result.should.deep.equal( {
					test: [
						{
							foo: 'bar',
							links: {
								anotherTest: {
									ids: [1,2]
								}
							}
						}
					]
				} );
				done();
			} );
		} );

		it( 'should not add href to resource links that have no ids', function( done ) {
			server.inject( '/addHrefToResourceLinkWithNoIds', function( reply ) {
				reply.result.should.deep.equal( {
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
				} );
				done();
			} );
		} );

	} );

	describe( 'include', function() {

		it( 'should fetch a single secondary resource and add it to the primary resource linked data', function( done ) {
			server.inject( '/primaryResource?include=secondaryResource', function( reply ) {
				reply.result.should.deep.equal( {
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
						secondaryResource: [ {
							foo: 'bar'
						} ]
					}
				} );
				done();
			} );
		} );

		it( 'should boost linked data from a secondary resource up to the primary resource linked data', function( done ) {
			server.inject( '/anotherPrimaryResource?include=secondaryResourceWithLinked', function( reply ) {
				reply.result.should.deep.equal( {
					"anotherPrimaryResource": [ {
						"foo": "bar",
						"links": {
							"secondaryResourceWithLinked": {
								"href": "/secondaryResourceWithLinked/1",
								"ids": [1],
								"type": "secondaryResourceWithLinked"
							}
						}
					} ],
					"linked": {
						"primaryLinkedResource": [ {
							"hey": "you guys"
						} ],
						"secondaryLinkedResource": [ {
							"optimusPrime": "isCool"
						} ],
						"secondaryResourceWithLinked": [ {
							"foo": "bar"
						} ]
					}
				} );

				done();
			} );
		} );

	} );

} );
