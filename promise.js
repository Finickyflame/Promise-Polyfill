(function (window, undefined) {
    "use strict"

    if ("undefined" !== typeof window.Promise) {
        return;
    }

    window.Promise = (function () {
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
         * The abstract operation IsConstructor determines if argument, which must be an ECMAScript language value or a Completion Record, is a function object with a [[Construct]] internal method.
         * @function isConstructor
         * @static
         * @param {object} c
         * @return {boolean}
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-isconstructor}
         */
        function isConstructor(c) {
            return c !== null && "object" === typeof c && "function" === c.constructor;
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
                //console.log("Creating Job (" + name + ") - " + new Date());
            }

            Job.prototype.execute = function () {
                //console.log("Executing Job (" + this.name + ") - " + new Date());
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
         * @class CustomImmediateJobHandler
         * @extends JobHandler
         */
        function CustomImmediateJobHandler() {
            var run, clear;
            // The test against 'importScripts' prevents this implementation from being installed inside a web worker,
            // where 'postMessage' means something completely different and can't be used for this purpose.
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

                function onMessage(event) {
                    if (event.source === window &&
                        typeof event.data === "string" &&
                        event.data.indexOf(messagePrefix) === 0) {
                        handle = (+event.data.slice(messagePrefix.length));

                        var task = tasks[handle];
                        if (task) {
                            try {
                                task();
                            } finally {
                                clear(handle);
                            }
                        }
                    }
                }

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

        var jobFactory = (function () {
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

            return new JobHandlerFactory();
        })();

        var jobHandler = jobFactory.createJobHandler();


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
                //NextJob Completion(status)
            }
        }

        /**
         * The abstract operation PerformPromiseThen performs the �then� operation on promise using onFulfilled and onRejected as its settlement actions
         * @static
         * @function performPromiseThen
         * @param {} promise 
         * @param {} onFulfilled 
         * @param {} onRejected 
         * @param {} resultCapability 
         * @returns {object} resultCapability�s promise 
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
         * @function getCapabilitiesExecutor
         * @param {} capability 
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
         * @function newPromiseCapability
         * @param {} c 
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
         * @function promiseResolveThenableJob
         * @param {Promise} promiseToResolve
         * @param {} thenable
         * @param {} then
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
         * @function triggerPromiseReactions
         * @param {[]} reactions
         * @param {} argument
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-triggerpromisereactions}
         */
        function triggerPromiseReactions(reactions, argument) {
            for (var i = 0, length = reactions.length; i < length; i++) {
                jobHandler.enqueue("PromiseJobs", promiseReactionJob, [reactions[i], argument]);
            }
            return undefined;
        }


        /**
         * @static
         * @function fulfillPromise
         * @param {Promise} promise
         * @param {} value
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-fulfillpromise}
         */
        function fulfillPromise(promise, value) {
            // Assert: the value of promise's [[PromiseState]] internal slot is "pending".
            var reactions = promise._promiseFulfillReactions;
            promise._promiseResult = value;
            promise._promiseFulfillReactions = undefined;
            promise._promiseRejectReactions = undefined;
            promise._promiseState = enuPromiseState.fulfilled;
            return triggerPromiseReactions(reactions, value);
        }


        /**
         * @static
         * @function rejectPromise
         * @param {Promise} promise
         * @param {} reason
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-rejectpromise}
         */
        function rejectPromise(promise, reason) {
            // Assert: the value of promise's [[PromiseState]] internal slot is "pending".
            var reactions = promise._promiseRejectReactions;
            promise._promiseResult = reason;
            promise._promiseFulfillReactions = undefined;
            promise._promiseRejectReactions = undefined;
            promise._promiseState = enuPromiseState.rejected;
            return triggerPromiseReactions(reactions, reason);
        }

        /**
         * @static
         * @function createResolveFunction
         * @param {Promise} promise 
         * @param {object} alreadyResolved 
         * @returns {function} resolveFunction 
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
                var then = resolution.then;
                if ("undefined" === typeof then) {
                    return rejectPromise(promise, then);
                }
                if (!isCallable(then)) { //then._value?
                    return fulfillPromise(promise, then);
                }
                jobHandler.enqueue("PromiseJobs", promiseResolveThenableJob, [promise, resolution, then]);
                return undefined;
            };
            //f.length = 1;
            f._promise = promise;
            f._alreadyResolved = alreadyResolved;
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
            //f.length = 1;
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
         */
        Promise.all = function (iterable) {
            throw new Error("Not Implemented");
        };

        /**
         * @static
         * @function Promise.race
         * @param {function[]} iterable 
         * @returns {Promise} 
         * @see {@link http://www.ecma-international.org/ecma-262/6.0/#sec-promise.race}
         */
        Promise.race = function (iterable) {
            throw new Error("Not Implemented");
        };

        /**
         * @static
         * @function Promise.reject
         * @param {} reason
         */
        Promise.reject = function (reason) {
            throw new Error("Not Implemented");
        };

        /**
         * 
         * @function Promise.resolve
         * @static
         * @param {}
         */
        Promise.resolve = function () {
            throw new Error("Not Implemented");
        };

        return Promise;
    })();

})(window);