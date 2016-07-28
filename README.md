# statful-client-javascript
Statful client for Javascript applications.

[![Build Status](https://travis-ci.org/statful/statful-client-javascript.svg?branch=master)](https://travis-ci.org/statful/statful-client-javascript)
[![devDependency Status](https://david-dm.org/statful/statful-client-javascript/dev-status.svg)](https://david-dm.org/statful/statful-client-javascript#info=devDependencies)


## Install

```
bower install --save statful-client-javascript
```

or
 
```
npm install --save statful-client-javascript
```


## Timings

All methods that provider timing mechanism are based in the [user-timing](http://www.w3.org/TR/user-timing/) specification.

### Configuration parameters

- **dryrun**: enable dryrun mode - ie. do not actually flush metrics out
- **environment**: environment to be used as tag - ie. development, production, etc.
- **namespace**: namespace to be used as metrics prefix - ie web, application, mobile, etc.
- **tags**: global tags
- **aggregations**: global aggregations
- **aggregationFrequency**: aggregation frequency
- **timer**, counter, gauge, other: metric type defaults
- **registerResourceErrors**: enable resource error tracking
- **resourceErrorsNameTracking**: track resource names on resource error tracking
- **resourceErrorsTypeBlacklist**: resource error type blacklist
- **registerResourceLoading**: enable resource loading tracking
- **resourceLoadingTrackingInterval**: resource loading tracking interval
- **resourceLoadingTypeBlacklist**: resource type blacklist
- **resourceLoadingPathFilter**: resource path whitelist
- **resourceLoadingNameTracking**: track resource names
- **flushInterval**: metrics flush interval

### Register metrics

#### Timers

```
statful.registerTimer('your.timer.metric.name', 100, {
    tags: {tagKey: 'foo'}
});
```

#### Counters

```
// Register counters

// Increment 1 (default)
statful.registerCounter('your.counter.metric.name');

// Increment 5
statful.registerCounter('your.counter.metric.name', {metricValue: 5});

// Increment 5 with custom tag and aggregation
statful.registerCounter('your.counter.metric.name', {
    metricValue: 5,
    tags: {tagKey: 'foo'},
    aggregations: ['avg']
});
```

#### Gauges

```
// Register a gauge with custom tag, aggregations and aggregation frequency
statful.registerGauge('your.gauge.metric.name', 345, {
    tags: {tagKey: 'foo'},
    aggregations: ['avg', 'last'],
    aggregationFrequency: 30
});
```

### User Timing

Support for the [user-timing](http://www.w3.org/TR/user-timing/) specification is available.

#### Performance Mark

```
statful.registerMark('mark_start');
statful.registerMark('mark_end');
```

#### Performance Measure sent to Telemetron as a Timer

```
// Measure and Timer between two marks

statful.registerMark('mark_start');
statful.registerMark('mark_end');

var options = {
    startMark: 'mark_start',
    endMark: 'mark_end'
    tags: {mark: my_tag}
}

statful.registerMeasure('measure_name', 'metric_name' options);
```

```
// Measure and Timer from the navigationStart eent until the current time

var options = {
    tags: {mark: my_tag}
}

statful.registerMeasure('measure_name', 'metric_name' options);
```

You can omit both start and end mark names:

* if startMark is missing it will be measured from the navigationStart event
* if endMark is missing it will be measured until the current high precision time

### Resource Timing

Support for the [resource-timing](https://www.w3.org/TR/resource-timing/) specification is available and controlled as:

```
 statful.initialize({    
    registerResourceLoading: true,    
    resourceLoadingTrackingInterval: 5000,    
    resourceLoadingTrackingExclusions: [],    
    resourceLoadingNameTracking: {}
    ...
 });
```

Please note that not all browsers support the resource timing specification and therefore don't support resource tracking.

#### Configuration

You can enable or disable resource loading tracking by setting the `registerResourceLoading` attribute accordingly.

A blacklist of resource types can be defined to limit the type of resources tracked by setting the `resourceLoadingTypeBlacklist` attribute. 
This array should contain define types according to the resource timing specification which at the time are: link, css, script, img, object, subdocument, preflight, xmlhttprequest, svg, other.

You can apply a global resource filtering function based on the resource name by setting the `resourceLoadingPathFilter` attribute. This should be a callback function that receives the resource name and should return true or false to either include or exclude it.

If you want to capture the name of the resources being tracked as a tag you should use the `resourceLoadingNameTracking` attribute.

The way this works is that yu create an attribute in that object matching the initiatorType you want to track the name of and assign it a callback function which returns the parsed.

Example: Let's say you wanted to:

* track the script names
* remove the revisions of your bundle
* exclude the external jquery request
* exclude all img tags

```
// original resource name is foo.1234asdf.js
// parsed resource name is foo.js
var scriptCaptureFunc = function (name) {
    var captured = /(\w+.)(\w+.)(\w+)$/.exec(name);
    return captured[1] + captured[3];
};

// filter everything that's not jquery
var srcFilterFunc = function (name) {
   return name !== 'https://ajax.googleapis.com/ajax/libs/jquery/2.2.0/jquery.min.js';
};

statful.initialize({   
    registerResourceLoading: true,  
    resourceLoadingTrackingInterval: 5000,    
    resourceLoadingTypeBlacklist: ['img'],    
    resourceLoadingPathFilter: srcFilterFunc,    
    resourceLoadingNameTracking: {
      script: scriptCaptureFunc
    }
    ...
});
```
#### Cross Origin Requests

To being able to fully track asset loaded using cross origin requests please follow the [specification](https://www.w3.org/TR/resource-timing/#cross-origin-resources).

### Resource Loading Error

Support for the resource loading error specification is available and controlled as:

```
 statful.initialize({    
    registerResourceErrors: false,  
    resourceErrorsNameTracking: {},
    resourceErrorsTypeBlacklist: []
    ...
 });
```

**IMPORTANT:** If you want to track errors in every added resource you have to include and configure client, before all other things, in your header.

That is controlled by a metric with name: '<namespace>'.counter.resource.error.

#### Configuration

You can enable or disable resources loading errors tracking by setting the `registerResourceErrors` attribute accordingly.

A blacklist of resource types can be defined to limit the type of resources tracked by setting the `resourceErrorsTypeBlacklist` attribute. 
This array should use the following available resource types: img, script, link.

If you want to capture a custom name of the resources being tracked as a tag, instead of default behaviour that captures all resource path as a tag (including http://), you should use the `resourceErrorsNameTracking` attribute. The way this works is that you create an attribute in that object matching the resource type you want to track the name of and assign it a callback function which returns the parsed.

Example: Let's say you wanted to:
- track the resources loading errors
- remove the revisions of your bundle
- exclude all img resources

```
// original resource name is foo.1234asdf.js
// parsed resource name is foo.js
var scriptCaptureFunc = function (name) {
    var captured = /(\w+.)(\w+.)(\w+)$/.exec(name);
    return captured[1] + captured[3];
};

statful.initialize({    
    registerResourceErrors: true,   
    resourceErrorsNameTracking: {
      script: scriptCaptureFunc
    },    
    resourceErrorsTypeBlacklist: ['img']
    ...
});
```

### Development

```
// install deps
$ npm install && bower install

// run watch
$ grunt dev

// build dist
$ grunt
```

