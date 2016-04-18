# Promise-Polyfill

Homemade polyfill of [ES6 Promise](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-constructor). 
The implementation is purely based on the ECMA's specifications.

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
- [ ] [Promise.race](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.race)
- [x] [Promise.reject](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.reject)
- [x] [Promise.resolve](http://www.ecma-international.org/ecma-262/6.0/#sec-promise.resolve)

