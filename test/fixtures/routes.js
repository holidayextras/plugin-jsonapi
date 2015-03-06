var Joi = require( 'joi' );

module.exports = [
	{
		method: 'GET',
		path: '/noResourceName',
		handler: function( request, reply ) {
			reply( {} );
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
		handler: function( request, reply ) {
			reply( {} );
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
		handler: function( request, reply ) {
			reply( {
				foo: 'bar'
			} );
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
		handler: function( request, reply ) {
			reply( {
				test: [ {
					id: '123456789',
					foo: 'bar'
				} ]
			} );
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
		handler: function( request, reply ) {
			reply( {
				test: [ {
					foo: 'bar'
				} ]
			} );
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
		handler: function( request, reply ) {
			reply( {
				test: [ {
					foo: 'bar',
					links: {
						anotherTest: {
							ids: [1],
							type: 'anotherTest'
						}
					}
				} ]
			} );
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
		handler: function( request, reply ) {
			reply( {
				test: [ {
					foo: 'bar',
					links: {
						anotherTest: {
							ids: [1,2],
							type: 'anotherTest'
						}
					}
				} ]
			} );
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
		handler: function( request, reply ) {
			reply( {
				test: [ {
					foo: 'bar',
					links: {
						anotherTest: {
							ids: [1,2]
						}
					}
				} ]
			} );
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
		handler: function( request, reply ) {
			reply( {
				test: [ {
					foo: 'bar',
					links: {
						anotherTest: {
							type: 'anotherTest'
						}
					}
				} ]
			} );
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
		handler: function( request, reply ) {
			// setup the include proxy
			request.data = {
				query: {
					include: request.query.include
				}
			};
			reply( {
				primaryResource: [ {
					foo: 'bar',
					links: {
						secondaryResource: {
							ids: [1],
							type: 'secondaryResource'
						}
					}
				} ]
			} );
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
		handler: function( request, reply ) {
			reply( {
				secondaryResource: [ {
					foo: 'bar'
				} ]
			} );
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
		handler: function( request, reply ) {
			// setup the include proxy
			request.data = {
				query: {
					include: request.query.include
				}
			};
			reply( {
				anotherPrimaryResource: [ {
					foo: 'bar',
					links: {
						secondaryResourceWithLinked: {
							ids: [1],
							type: 'secondaryResourceWithLinked'
						}
					}
				} ],
				linked: {
					primaryLinkedResource: [ {
						hey: 'you guys'
					} ]
				}
			} );
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
		handler: function( request, reply ) {
			reply( {
				secondaryResourceWithLinked: [ {
					foo: 'bar'
				} ],
				linked: {
					secondaryLinkedResource: [ {
						optimusPrime: 'isCool'
					} ]
				}
			} );
		}
	},
	{
		method: 'GET',
		path: '/',
		handler: function( request, reply ) {
			reply( require( './loutReply.js' ) );
		}
	},
	{
		method: 'DELETE',
		path: '/delete',
		handler: function( request, reply ) {
			reply().code( 204 );
		}
	}
];