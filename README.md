# plugin-jsonapi

## About

A [hapi](http://hapijs.com/) plugin for a jsonapi style output to all requests.  We are using the [jsonapi](http://jsonapi.org/) standard with our own [house rules](https://bitbucket.org/hxshortbreaks/apischema/src/master/houseRules.md) where we have adapted the standard to suit our needs as a business.

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


#### Linked Resources
The plugin will build the href for all the linked resources, the minimum required is **type**.
ex:
```
{
  ...
  "linked": {
    "faqs": [
      "type": "faqs"
    ]
  }
  ...
}
```
The plugin will build the href as:
```
{
  ...
  "linked": {
    "faqs": [
      "type": "faqs",
      "href": "/faqs/"
    ]
  }
  ...
}
```

* **Ids**
Ids is an array of strings, it can contain one or more strings
```
{
  ...
  "linked": {
    "faqs": [
      "ids": ["ID1", "ID2"],
      "type": "faqs"
    ]
  }
  ...
}
```
The plugin will build the href as:
```
{
  ...
  "linked": {
    "faqs": [
      "ids": ["ID1", "ID2"],
      "type": "faqs",
      "href": "/faqs/ID1,ID2"
    ]
  }
  ...
}
```

* **filter**
Filter is an object which allow add some query string parameters, this will be a key value pair.
The key will be used for the filter and the value is an array of strings.
```
{
  ...
  "linked": {
    "faqs": [
      "type": "faqs",
      "filter": {
        "productIds": ["ID1", "ID2"]
      }
    ]
  }
  ...
}
```
The plugin will build the href as:
```
{
  ...
  "linked": {
    "faqs": [
      "type": "faqs",
      "href": "/faqs/?filter%5BproductIds%5D=ID1,ID2"
    ]
  }
  ...
}
```

You can combine **ids** and **filter**.

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

Code is linted checked against the style guide with [make-up](https://github.com/holidayextras/make-up), running npm test will run all tests required.

## License
Copyright (c) 2016 Holiday Extras
Licensed under the MIT license.
