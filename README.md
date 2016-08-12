# statful-client-javascript
Staful client for Javascript. This client is intended to gather metrics and send them to Statful.

[![Build Status](https://travis-ci.org/statful/statful-client-javascript.svg?branch=master)](https://travis-ci.org/statful/statful-client-javascript)
[![devDependency Status](https://david-dm.org/statful/statful-client-javascript/dev-status.svg)](https://david-dm.org/statful/statful-client-javascript#info=devDependencies)


## Table of Contents

* [Supported Versions](#supported-versions)
* [Installation](#installation)
* [Quick Start](#quick-start)
* [Reference](#reference)
* [Authors](#authors)
* [License](#license)


## Supported Versions

It supports every browser that has full support for the ECMAScript 5 specification.


## Installation

```
bower install --save statful-client-javascript
```

or
 
```
npm install --save statful-client-javascript
```


## Quick Start

After installing Statful Client you are ready to use it. The quickest way is to do the following:

```javascript
    <script type="text/javascript" src="bower_components/statful-client-javascript/dist/statful.min.js"></script>

    <script>    
        // Init statful       
        statful.initialize({
            dryrun: false,
            debug: false,
            app: 'exampleApp',          
            flushInterval: 5000
        });
        
        // Send a metric
        statful.counter('page_load');
    </script>
```

## Reference

Detailed reference if you want to take full advantage from Statful.

### Global configuration

The custom options that can be set on config param are detailed below.

| Option | Description | Type | Default | Required |
|:---|:---|:---|:---|:---|
| dryRun | Defines if metrics should be output to the logger instead of being send. | `boolean` | `false` | **NO** |
| debug | Defines logs should be sent to console. | `boolean` | `false` | **NO** |
| app | Defines the application global name. If specified sets a global tag `app=setValue`. | `string` | **undefined** | **NO** |
| namespace | Defines the global namespace. | `string` | `web` | **NO** |
| flushInterval | Defines the periodicity of buffer flushes in **miliseconds**. | `number` | `10000` | **NO** |
| timeout | Defines the timeout. | `number` | `2000` | **NO** |
| tags | Defines the global tags. | `object` | `{}` | **NO** |
| aggregations | Defines the global aggregations. | `object` | `[]` | **NO** |
| aggregationFrequency | Defines the global aggregation frequency. | `number` | `10` | **NO** |


### Methods

```javascript
- staful.counter('myCounter', 1, {agg: ['sum']});
- staful.gauge('myGauge', 10, { tags: { host: 'localhost' } });
- staful.timer('myCounter', 200, {namespace: 'sandbox'});
```
These methods receive a metric name and a metric value as arguments and send a counter/gauge/timer metric. If the options parameter is omitted, the default values are used.
Read the methods options reference bellow to get more information about the default values.

| Option | Description | Type | Default for Counter | Default for Gauge | Default for Timer |
|:---|:---|:---|:---|:---|:---|
| agg | Defines the aggregations to be executed. These aggregations are merged with the ones configured globally, including method defaults.<br><br> **Valid Aggregations:** `avg, count, sum, first, last, p90, p95, min, max` | `array` | `['avg', 'p90']` | `[last]` | `['avg', 'p90', 'count']` |
| aggFreq | Defines the aggregation frequency in **seconds**. It overrides the global aggregation frequency configuration.<br><br> **Valid Aggregation Frequencies:** `10, 30, 60, 120, 180, 300` | `number` | `10` | `10` | `10` |
| namespace | Defines the namespace of the metric. It overrides the global namespace configuration. | `string` | `web` | `web` | `web` |
| tags | Defines the tags of the metric. These tags are merged with the ones configured globally, including method defaults. | `object` | `{}` | `{}` | `{ unit: 'ms' }` |


### User Timing
    
Support for the [user-timing](http://www.w3.org/TR/user-timing/) specification is available.

#### Performance Mark

```
statful.registerMark('mark_start');
statful.registerMark('mark_end');
```

#### Performance Measure sent to Statful as a Timer

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

## Authors

[Mindera - Software Craft](https://github.com/Mindera)

## License

Statful Javascript Client is available under the MIT license. See the [LICENSE](https://raw.githubusercontent.com/statful/statful-client-objc/master/LICENSE) file for more information.
