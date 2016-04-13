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
