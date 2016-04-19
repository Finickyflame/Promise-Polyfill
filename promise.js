(function (global, undefined) {
    "use strict"

    if ("function" !== typeof Object.create) {
        /**
         * The Object.create() method creates a new object with the specified prototype object and properties.
         * @function Object.create
         * @param proto
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create}
         */
        Object.create = (function () {
            var f = function () { };
            return function (proto) {
                if (arguments.length > 1) {
                    throw Error('Second argument not supported');
                }
                if (proto !== Object(proto) && proto !== null) {
                    throw TypeError('Argument must be an object or null');
                }
                if (proto === null) {
                    throw Error('null [[Prototype]] not supported');
                }
                f.prototype = proto;
                var result = new f();
                f.prototype = null;
                return result;
            };
        })();
    }
    if ("function" !== typeof Function.prototype.bind) {
        /**
         * The bind() method creates a new function that, when called, has its this keyword set to the provided value, with a given sequence of arguments preceding any provided when the new function is called.
         * @function Function.prototype.bind
         * @param {} thisArg - The value to be passed as the this parameter to the target function when the bound function is called. The value is ignored if the bound function is constructed using the new operator.
         * @returns {} 
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind}
         */
        Function.prototype.bind = function (thisArg) {
            if ("function" !== typeof this) {
                throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
            }
            var s = this;
            var args = Array.prototype.slice.call(arguments, 1);
            var f = function () { };
            var bound = function() {
                s.apply(this instanceof f ? this : thisArg, args.concat(Array.prototype.slice.call(arguments)));
            };
            if (this.prototype) {
                f.prototype = this.prototype;
            }
            bound.prototype = new f();
            return bound;
        };
    }

    if ("undefined" !== typeof global.Promise && !global.debugPromise) {
        return;
    }

    var Promise = (function () {
        /**
         * @enum enuPromiseState
         */
        var enuPromiseState = {
            "pending": "pending",
            "fulfilled": "fulfilled",
            "rejected": "rejected"
        };

        /**
         * @enum enuReactionHandler
         */
        var enuReactionHandler = {
            "identity": function (argument) {
                return argument;
            },
            "thrower": function (argument) {
                throw argument;
            }
        };

        /**
         * @class PromiseReaction
         * @param {object} capabilities - (PromiseCapability) The capabilities of the promise for which this record provides a reaction handler.
         * @param {string} handler - (enuReactionHandler) The function that should be applied to the incoming value, and whose return value will govern what happens to the derived promise. If [[Handler]] is "Identity" it is equivalent to a function that simply returns its first argument. If [[Handler]] is "Thrower" it is equivalent to a function that throws its first argument as an exception.
         */
        function PromiseReaction(capabilities, handler) {
            this._capabilities = capabilities;
            this._handler = handler;
        }

        /**
         * @class PromiseCapability
         * @param {object} promise - An object that is usable as a promise.
         * @param {function} resolve - The function that is used to resolve the given promise object.
         * @param {function} reject - The function that is used to reject the given promise object.
         */
        function PromiseCapability(promise, resolve, reject) {
            this._promise = promise;
            this._resolve = resolve;
            this._reject = reject;
        }

        var Iterator = (function () {
            /**
             * @class Iterator
             * @param {any[]} iterable 
             */
            function Iterator(iterable) {
                this._index = undefined;
                if (!iterable || "undefined" === typeof iterable.length)
                    throw new TypeError("Invalid iterable");
                this.length = (this._iterable = iterable).length;
            }

            /**
             * @function Iterator.prototype.next
             * @param {any} [value] 
             * @returns {boolean} - the iterator has successfully advanced to the next element; false if the iterator has passed the end of the collection. 
             */
            Iterator.prototype.next = function (value) {
                this._index = "undefined" !== typeof this._index ? this._index + 1 : 0;
                return this._index < this.length;
            };

            /**
             * @function Iterator.prototype.getCurrent
             * @returns {any} 
             */
            Iterator.prototype.getCurrent = function () {
                return this._iterable[this._index];
            };

            /**
             * @function Iterator.prototype.reset
             */
            Iterator.prototype.reset = function () {
                this._index = 0;
            };
            return Iterator;
        })();

        /**
         * @class IteratorRecord
         * @param {Iterator} iterator 
         */
        function IteratorRecord(iterator) {
            this._iterator = iterator;
            this._done = false;
        }


        var jobHandler = (function () {
            var JobHandler = (function (undefined) {
                /**
                 * @class Job
                 * @param {string} name
                 * @param {function} action
                 * @param {any[]} [args]
                 */
                function Job(name, action, args) {
                    this.name = name;
                    this.action = action;
                    this.args = args;
                }

                Job.prototype.execute = function () {
                    this.action.apply(undefined, this.args);
                };

                /**
                 * @class JobHandler
                 * @param {number} [buffer] - available queue space. Default: 100
                 */
                function JobHandler(run, clear, buffer) {
                    if ("undefined" === buffer)
                        buffer = 100;
                    this._run = run;
                    this._clear = clear;
                    this._queue = new Array(buffer);
                    this._queueIds = new Array(buffer);
                    this._length = 0;
                }

                JobHandler.prototype.isSupported = function () {
                    return "undefined" !== typeof this._queue
                        && "undefined" !== typeof this._run
                        && "undefined" !== typeof this._clear;
                };

                JobHandler.prototype.enqueue = function (name, action, args) {
                    if (!this.isSupported())
                        throw new TypeError();

                    if ("function" !== typeof action)
                        throw new TypeError("Unexpected action value. Expected type: function");

                    if (null != typeof args && ("object" !== typeof args || "undefined" === typeof args.length))
                        throw new TypeError("Unexpected args value. Expected type: Array, null or undefined");

                    this._queue[this._length] = new Job(name, action, args);
                    this._queueIds[this._length++] = this._run(this._process.bind(this), 0);
                };

                JobHandler.prototype._process = function () {
                    for (var i = 0; i < this._length; i++) {
                        this._execute(i);
                        this._remove(i);
                    }
                    this._length = 0;
                };

                JobHandler.prototype._execute = function (index) {
                    this._queue[index].execute();
                };

                JobHandler.prototype._remove = function (index) {
                    this._clear(this._queueIds[index]);
                    this._queue[index] = undefined;
                    this._queueIds[index] = undefined;
                };


                return JobHandler;
            })();

            /**
             * @class ImmediateJobHandler
             * @extends JobHandler
             */
            function ImmediateJobHandler() {
                var run = window.setImmediate && window.setImmediate.bind(window);
                var clear = window.clearImmediate && window.clearImmediate.bind(window);
                JobHandler.call(this, run, clear);
            }
            ImmediateJobHandler.prototype = Object.create(JobHandler.prototype);

            /**
             * Based on the setImmediate polyfill
             * @class CustomImmediateJobHandler
             * @extends JobHandler
             * @see {@link https://github.com/YuzuJS/setImmediate}
             */
            function CustomImmediateJobHandler() {
                var run, clear;
                if (window.postMessage && !window.importScripts) {
                    var nextHandle = 1;
                    var tasks = {};
                    var messagePrefix = "setImmediate$" + Math.random() + "$";


                    run = function (handler) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        tasks[nextHandle] = function () {
                            if (typeof handler === "function") {
                                handler.apply(undefined, args);
                            } else {
                                (new Function("" + handler))();
                            }
                        };
                        var handle = nextHandle++;
                        window.postMessage(messagePrefix + handle, "*");
                        return handle;
                    };

                    clear = function (handle) {
                        delete tasks[handle];
                    };

                    var onMessage = function (event) {
                        if (event.source == window &&
                            typeof event.data === "string" &&
                            event.data.indexOf(messagePrefix) === 0) {
                            var handle = (+event.data.slice(messagePrefix.length));

                            var task = tasks[handle];
                            if (task) {
                                try {
                                    task();
                                } finally {
                                    clear(handle);
                                }
                            }
                        }
                    };

                    if (window.addEventListener) {
                        window.addEventListener("message", onMessage, false);
                    } else {
                        window.attachEvent("onmessage", onMessage);
                    }
                }

                JobHandler.call(this, run, clear);
            }
            CustomImmediateJobHandler.prototype = Object.create(JobHandler.prototype);

            /**
             * @class MsImmediateJobHandler
             * @extends JobHandler
             */
            function MsImmediateJobHandler() {
                var run = window.msSetImmediate && window.msSetImmediate.bind(window);
                var clear = window.msClearImmediate && window.msClearImmediate.bind(window);
                JobHandler.call(this, run, clear);
            }
            MsImmediateJobHandler.prototype = Object.create(JobHandler.prototype);

            /**
             * @class TimeoutJobHandler
             * @extends JobHandler
             */
            function TimeoutJobHandler() {
                var run = window.setTimeout && window.setTimeout.bind(window);
                var clear = window.clearTimeout && window.clearTimeout.bind(window);
                JobHandler.call(this, run, clear);
            }
            TimeoutJobHandler.prototype = Object.create(JobHandler.prototype);

            /**
             * @class PromiseJobFactory
             */
            function JobHandlerFactory() {
                this._handlers = [ImmediateJobHandler, MsImmediateJobHandler, CustomImmediateJobHandler, TimeoutJobHandler];
            }

            /**
             * function createJobHandler
             * @returns {JobHandler} 
             */
            JobHandlerFactory.prototype.createJobHandler = function () {
                var length = this._handlers.length;
                var handler;
                for (var i = 0; i < length; i++) {
                    var handler = new this._handlers[i]();
                    if (handler.isSupported()) {
                        return handler;
                    }
                }
                throw new Error("No job handler supported.");
            };
            var jobFactory = new JobHandlerFactory();
            return jobFactory.createJobHandler();
        })();

        /**
         * @static
         * @function createAllResolveFunction
         * @param {object} alreadyCalled 
         * @param {number} index 
         * @param {any[]} values 
         * @param {PromiseCapability} capabilities 
         * @param {object} remainingElements 
         * @returns {function} - Promise.all resolve Function 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.all-resolve-element-functions}
         */
        function createAllResolveFunction(alreadyCalled, index, values, capabilities, remainingElements) {
            var f = function (x) {
                var alreadyCalled = f._alreadyCalled;
                if (alreadyCalled._value)
                    return undefined;
                alreadyCalled._value = true;
                var index = f._index;
                var values = f._values;
                var promiseCapability = f._capabilities;
                var remainingElementsCount = f._remainingElements;
                values[index] = x;
                remainingElementsCount._value = remainingElementsCount._value - 1;
                if (remainingElementsCount._value == 0)
                    return promiseCapability._resolve(values);
                return undefined;
            };
            f._alreadyCalled = alreadyCalled;
            f._index = index;
            f._values = values;
            f._capabilities = capabilities;
            f._remainingElements = remainingElements;
            return f;
        }

        /**
         * @static
         * @function createRejectFunction
         * @param {Promise} promise 
         * @param {object} alreadyResolved 
         * @returns {function} - reject function 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise-reject-functions}
         */
        function createRejectFunction(promise, alreadyResolved) {
            var f = function (reason) {
                var promise = f._promise;
                var alreadyResolved = f._alreadyResolved;
                if (alreadyResolved._value)
                    return undefined;
                alreadyResolved._value = true;
                return rejectPromise(promise, reason);
            };
            f._promise = promise;
            f._alreadyResolved = alreadyResolved;
            return f;
        }

        /**
         * @static
         * @function createResolveFunction
         * @param {Promise} promise 
         * @param {object} alreadyResolved 
         * @returns {function} - resolveFunction 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise-resolve-functions}
         */
        function createResolveFunction(promise, alreadyResolved) {
            var f = function (resolution) {
                var promise = f._promise;
                var alreadyResolved = f._alreadyResolved;
                if (alreadyResolved._value)
                    return undefined;
                alreadyResolved._value = true;
                if (resolution === promise) {
                    return rejectPromise(promise, new TypeError());
                }
                if ("object" !== typeof resolution) {
                    return fulfillPromise(promise, resolution);
                }
                var then;
                try {
                    then = resolution.then;
                } catch (ex) {
                    return rejectPromise(promise, then);
                }
                if (!isCallable(then)) {
                    return fulfillPromise(promise, resolution);
                }
                jobHandler.enqueue("PromiseJobs", promiseResolveThenableJob, [promise, resolution, then]);
                return undefined;
            };
            f._promise = promise;
            f._alreadyResolved = alreadyResolved;
            return f;
        }
        
        /**
         * @static
         * @function createResolvingFunctions
         * @param {Promise} promise
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-createresolvingfunctions}
         */
        function createResolvingFunctions(promise) {
            var alreadyResolved = { _value: false };
            var resolve = createResolveFunction(promise, alreadyResolved);
            var reject = createRejectFunction(promise, alreadyResolved);
            return { _resolve: resolve, _reject: reject };
        }

        /**
         * @static
         * @function fulfillPromise
         * @param {Promise} promise
         * @param {any} value
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-fulfillpromise}
         */
        function fulfillPromise(promise, value) {
            var reactions = promise._promiseFulfillReactions;
            promise._promiseResult = value;
            promise._promiseFulfillReactions = undefined;
            promise._promiseRejectReactions = undefined;
            promise._promiseState = enuPromiseState.fulfilled;
            return triggerPromiseReactions(reactions, value);
        }

        /**
         * @static
         * @function getCapabilitiesExecutor
         * @param {PromiseCapability} capability 
         * @returns {function} executor
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-getcapabilitiesexecutor-functions}
         */
        function getCapabilitiesExecutor(capability) {
            function f(resolve, reject) {
                var promiseCapability = f._capability;
                if (promiseCapability instanceof PromiseCapability) {
                    if ("undefined" !== typeof promiseCapability._resolve)
                        throw new TypeError();
                    if ("undefined" !== typeof promiseCapability._reject)
                        throw new TypeError();
                    promiseCapability._resolve = resolve;
                    promiseCapability._reject = reject;
                }
            }

            f._capability = capability;
            return f;
        }

        /**
         * @static
         * @function ifAbruptRejectPromise
         * @param {function} value 
         * @param {PromiseCapability} capability 
         * @returns {any} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-ifabruptrejectpromise}
         */
        function ifAbruptRejectPromise(value, capability) {
            try {
                value();
            } catch (ex) {
                try {
                    var rejectResult = capability._reject.call(undefined, ex);
                    return rejectResult;
                } catch (ex2) {
                    return capability._promise;
                }
            }
        }

        /**
         * @function isCallable
         * @static
         * @param {object} argument 
         * @returns {boolean} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-iscallable}
         */
        function isCallable(argument) {
            return argument !== null && "function" === typeof argument;
        }

        /**
         * The abstract operation IsPromise checks for the promise brand on an object.
         * @function isPromise
         * @static
         * @param {object} x 
         * @returns {boolean} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-ispromise}
         */
        function isPromise(x) {
            return x !== null && "object" === typeof x && "undefined" !== x._promiseState;
        }

        /**
         * @static 
         * @function newPromiseCapability
         * @param {Promise} c 
         * @returns {PromiseCapability} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-newpromisecapability}
         */
        function newPromiseCapability(c) {
            var promiseCapability = new PromiseCapability();
            var executor = getCapabilitiesExecutor(promiseCapability);
            var promise = new c(executor);
            if (!isCallable(promiseCapability._resolve))
                throw new TypeError();
            if (!isCallable(promiseCapability._reject))
                throw new TypeError();
            promiseCapability._promise = promise;
            return promiseCapability;
        }

        /**
         * @static
         * @function performPromiseAll
         * @param {IteratorRecord} iteratorRecord 
         * @param {Promise} constructor 
         * @param {PromiseCapability} resultCapability 
         * @returns {Promise} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-performpromiseall}
         */
        function performPromiseAll(iteratorRecord, constructor, resultCapability) {
            var values = [];
            var remainingElementCount = { _value: 1 };
            var index = 0;
            while (iteratorRecord._iterator.next()) {
                var nextValue = iteratorRecord._iterator.getCurrent();
                values.push(undefined);
                var nextPromise = constructor.resolve(nextValue);
                var resolveElement = createAllResolveFunction({ _value: false }, index, values, resultCapability, remainingElementCount);
                remainingElementCount._value = remainingElementCount._value + 1;
                var result = nextPromise.then(resolveElement, resultCapability._reject);
                index = index + 1;
            }
            iteratorRecord._done = true;
            remainingElementCount._value = remainingElementCount._value - 1;
            if (remainingElementCount._value === 0) {
                resultCapability._resolve.call(undefined, values);
            }
            return resultCapability._promise;
        }

        /**
         * @static
         * @function performPromiseRace
         * @param {IteratorRecord} iteratorRecord 
         * @param {PromiseCapability} promiseCapability 
         * @param {Promise} c 
         * @returns {Promise} 
         */
        function performPromiseRace(iteratorRecord, promiseCapability, c) {
            while (iteratorRecord._iterator.next()) {
                var nextValue = iteratorRecord._iterator.getCurrent();
                var nextPromise = c.resolve(nextValue);
                nextPromise.then(promiseCapability._resolve, promiseCapability._reject);
            }
            iteratorRecord._done = true;
            return promiseCapability._promise;
        }

        /**
         * The abstract operation PerformPromiseThen performs the “then” operation on promise using onFulfilled and onRejected as its settlement actions
         * @static
         * @function performPromiseThen
         * @param {Promise} promise 
         * @param {function} onFulfilled 
         * @param {function} onRejected 
         * @param {PromiseCapability} resultCapability 
         * @returns {Promise} - resultCapability’s promise 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-performpromisethen}
         */
        function performPromiseThen(promise, onFulfilled, onRejected, resultCapability) {
            if (!isCallable(onFulfilled))
                onFulfilled = enuReactionHandler.identity;
            if (!isCallable(onRejected))
                onRejected = enuReactionHandler.thrower;

            var fulfillReaction = new PromiseReaction(resultCapability, onFulfilled);
            var rejectReaction = new PromiseReaction(resultCapability, onRejected);

            if (promise._promiseState === enuPromiseState.pending) {
                promise._promiseFulfillReactions.push(fulfillReaction);
                promise._promiseRejectReactions.push(rejectReaction);

            } else if (promise._promiseState === enuPromiseState.fulfilled) {
                var value = promise._promiseResult;
                jobHandler.enqueue("PromiseJobs", promiseReactionJob, [fulfillReaction, value]);

            } else if (promise._promiseState === enuPromiseState.rejected) {
                var reason = promise._promiseResult;
                jobHandler.enqueue("PromiseJobs", promiseReactionJob, [rejectReaction, reason]);
            }
            return resultCapability._promise;
        }

        /**
         * @static
         * @function promiseReactionJob
         * @param {PromiseReaction} reaction
         * @param {any} argument
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promisereactionjob}
         */
        function promiseReactionJob(reaction, argument) {
            if (reaction instanceof PromiseReaction) {
                var promiseCapability = reaction._capabilities;
                var handler = reaction._handler;
                var handlerResult = null;
                var status = null;
                try {
                    if (handler === enuReactionHandler.identity) {
                        handlerResult = argument;
                    } else {
                        handlerResult = handler.call(undefined, argument);
                    }
                    status = promiseCapability._resolve(handlerResult);
                } catch (ex) {
                    status = promiseCapability._reject.call(undefined, ex);
                }
            }
        }

        /**
         * @static
         * @function promiseResolveThenableJob
         * @param {Promise} promiseToResolve
         * @param {object} thenable
         * @param {function} then
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promiseresolvethenablejob}
         */
        function promiseResolveThenableJob(promiseToResolve, thenable, then) {
            var resolvingFunctions = createResolvingFunctions(promiseToResolve);
            try {
                var thenCallResult = then.call(thenable, [resolvingFunctions._resolve, resolvingFunctions._reject]);
            } catch (ex) {
                var status = resolvingFunctions._reject.call(undefined, thenCallResult);
            }
        }

        /**
         * @static
         * @function rejectPromise
         * @param {Promise} promise
         * @param {any} reason
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-rejectpromise}
         */
        function rejectPromise(promise, reason) {
            var reactions = promise._promiseRejectReactions;
            promise._promiseResult = reason;
            promise._promiseFulfillReactions = undefined;
            promise._promiseRejectReactions = undefined;
            promise._promiseState = enuPromiseState.rejected;
            return triggerPromiseReactions(reactions, reason);
        }

        /**
         * @static
         * @function triggerPromiseReactions
         * @param {function[]} reactions
         * @param {any} argument
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-triggerpromisereactions}
         */
        function triggerPromiseReactions(reactions, argument) {
            for (var i = 0, length = reactions.length; i < length; i++) {
                jobHandler.enqueue("PromiseJobs", promiseReactionJob, [reactions[i], argument]);
            }
            return undefined;
        }
        
        /**
         * The Promise object is used for deferred and asynchronous computations. 
         * A Promise represents an operation that hasn't completed yet, but is expected in the future.
         * @class Promise
         * @returns {function} executor - Function object with two arguments resolve and reject.
         * @example new Promise(function(resolve, reject) { ... });
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise-executor}
         */
        function Promise(executor) {
            if ("function" !== typeof executor)
                throw new TypeError("Promise resolver must be function");
            this._promiseState = enuPromiseState.pending;
            this._promiseResult = undefined;
            this._promiseFulfillReactions = [];
            this._promiseRejectReactions = [];

            var resolvingFunctions = createResolvingFunctions(this);
            try {
                var completion = executor.call(undefined, resolvingFunctions._resolve, resolvingFunctions._reject);
            } catch (ex) {
                var status = resolvingFunctions._reject.call(undefined, completion);
            }
        }

        /**
         * @function catch
         * @param {function} onRejected
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.catch}
         */
        Promise.prototype["catch"] = function (onRejected) {
            return Promise.prototype.then.call(this, null, onRejected);
        };

        /**
         * @function then
         * @param {function} onFulfilled
         * @param {function} onRejected
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.prototype.then}
         */
        Promise.prototype.then = function (onFulfilled, onRejected) {
            var promise = this;
            if (!isPromise(promise))
                throw new TypeError("Invalid operation on a promise function");
            var c = promise.constructor;
            var resultCapability = newPromiseCapability(c);
            return performPromiseThen(promise, onFulfilled, onRejected, resultCapability);
        };

        /**
         * @static
         * @function Promise.all
         * @param {function[]} iterable
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.all}
         */
        Promise.all = function (iterable) {
            var c = this;
            var result;
            var iterator;
            var abruptResult;

            var promiseCapability = newPromiseCapability(c);
            if (abruptResult = ifAbruptRejectPromise(function () {
                iterator = new Iterator(iterable);
            }, promiseCapability)) {
                return abruptResult;
            }
            var iteratorRecord = new IteratorRecord(iterator);
            if (abruptResult = ifAbruptRejectPromise(function () {
                result = performPromiseAll(iteratorRecord, c, promiseCapability);
            }, promiseCapability)) {
                return abruptResult;
            }
            return result;
        };

        /**
         * The race function returns a new promise which is settled in the same way as the first passed promise to settle. 
         * It resolves all elements of the passed iterable to promises as it runs this algorithm.
         * @static
         * @function Promise.race
         * @param {function[]} iterable 
         * @returns {Promise} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.race}
         */
        Promise.race = function (iterable) {
            var c = this;
            var result;
            var iterator;
            var abruptResult;

            var promiseCapability = newPromiseCapability(c);
            if (abruptResult = ifAbruptRejectPromise(function () {
                iterator = new Iterator(iterable);
            }, promiseCapability)) {
                return abruptResult;
            }
            var iteratorRecord = new IteratorRecord(iterator);
            if (abruptResult = ifAbruptRejectPromise(function () {
                result = performPromiseRace(iteratorRecord, promiseCapability, c);
            }, promiseCapability)) {
                return abruptResult;
            }
            return result;
        };

        /**
         * The reject function returns a new promise rejected with the passed argument.
         * @static
         * @function Promise.reject
         * @param {any} reason
         * @returns {Promise}
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.reject}
         */
        Promise.reject = function (reason) {
            var c = this;
            var promiseCapability = newPromiseCapability(c);
            var rejectResult = promiseCapability._reject.call(undefined, r);
            return promiseCapability._promise;
        };
        
        /**
         * The resolve function returns either a new promise resolved with the passed argument, or the argument itself if the argument is a promise produced by this constructor.
         * @static
         * @function Promise.resolve
         * @param {Promise} x 
         * @returns {Promise} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.resolve}
         */
        Promise.resolve = function (x) {
            var c = this;
            if (isPromise(x)) {
                var xConstructor = x.constructor;
                if (c === xConstructor)
                    return x;
            }
            var promiseCapability = newPromiseCapability(c);
            var resolveResult = promiseCapability._resolve.call(undefined, x);
            return promiseCapability._promise;
        };

        return Promise;
    })();

    if (global.debugPromise)
        global.PromisePolyfill = Promise;
    if ("undefined" === typeof global.Promise)
        global.Promise = Promise;
})(window);
