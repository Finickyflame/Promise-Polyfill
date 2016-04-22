# Promise-Polyfill
[![Build Status](https://travis-ci.org/Finickyflame/Promise-Polyfill.svg?branch=master)](https://travis-ci.org/Finickyflame/Promise-Polyfill)

Add the functionalities to support Promises in older browsers.
The implementation is purely based on the [ECMA's specifications](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-constructor).

For more informations on how to use the Promise object, see [Mozzila's Promise reference](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)

## How to use

### Browser
```html
<script src="promise.js"></script>
<script>
  var promise = new Promise(function(resolve, reject) {
     ...
  });
</script>
```

## Features

- [x] [Promise executor](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-executor)
- [x] [Promise.prototype.catch](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.catch)
- [x] [Promise.prototype.then](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.then)
- [x] [Promise.all](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.all-resolve-element-functions)
- [x] [Promise.race](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.race)
- [x] [Promise.reject](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.reject)
- [x] [Promise.resolve](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.resolve)

##Licence
[The MIT License (MIT)](LICENSE)
