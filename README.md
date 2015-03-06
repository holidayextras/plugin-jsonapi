# plugin-jsonapi

[![Built with Grunt](https://cdn.gruntjs.com/builtwith.png)](http://gruntjs.com/)

## About

A hapijs plugin for a jsonapi style output to all requests.  We are using the [jsonapi](http://jsonapi.org/) standard with our own [house rules](https://bitbucket.org/hxshortbreaks/apischema/src/master/houseRules.md) where we have adapted the standard to suit our needs as a business.

## Getting Started

If you want to work on this repo you will need to install the dependencies
```
$ npm install
```

## Documentation

`plugin-jsonapi` works as a plugin to a hapijs server and automatically extends the `onPreResponse` request lifecycle event.  Once a request has left control of the handler we then layer the jsonapi sugar over the top to build any linked resources.

Jsonapi will look for 3 different properties in its response:

- Resource (what the client actually asked for)
- Meta (information about the resource e.g. pagination details)
- Linked resources (associated resources that were requested by the client in the form of `includes`)

#### Configuring your hapijs handler to use 'jsonapi'

When configuring your handler function you **MUST** have a bind property and define the resourceName.

```
bind: {
	resourceName: 'things' // always plural...
}
```

#### How to reply jsonapi stylee

When replying with a result from a handler, a successful payload can include all 3 aforementioned properties (resource, meta and linked) but must have at least a resource.  **Note importantly that the resource is always placed at the root, meta and linked are namespaced off the root.**

A fully fledged reply might be built something like this e.g.
```
/* here we are inside your handler, your logic goes before this */

var result = {};
// resource is always placed at the root of the result
result[this.resourceName] = resourceData; // `resourceData` must be an array of objects.
// meta is namespaced off the root and is optional
result.meta = {};
result.meta[this.resourceName] = {
	currency: 'GBP'
}
// linked is also namespaced off the root and is optional
result.linked = {};
result.linked[this.resourceName] = [ {
	linkedStuff: {} //more objects
} ]

reply( result );
```

## Contributing

Code is linted by ".jshintrc" and checked against the coding style guide "shortbreaks.jscs.json". We also use Mocha to test our code, to run all of this use ` $ grunt test `.

## License
Copyright (c) 2015 Shortbreaks
Licensed under the MIT license.