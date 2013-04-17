//     Kassics.js 0.0.4
//
//     (c) 2013, Jean-Christophe Hoelt, Fovea.cc
//     Kassics may be freely distributed under the MIT license.
//
//     Requires Underscore or similar javascript library.
//
// TODO:
// - Remove animations from CSS when removing an element.
// - Remove dependency over underscore.

(function () {
    'use strict';

    // Initial Setup
    // -------------

    // Save a reference to the global object (`window` in the browser, `exports`
    // on the server).
    var root = this;

    // Kassics is exported for both the browser and the server.
    var Kassics;
    if (typeof exports !== 'undefined') {
        Kassics = exports;
    } else {
        Kassics = root.Kassics = {};
    }

    // Keep in sync with package.json and readme
    Kassics.VERSION = "0.0.4";

    // Quality of effects, client could adjust, eventually per device.
    Kassics.qualityCoef = 1.0;


    // Kassics features an animation Scheduler, attached to each `Stage`
    // The animation scheduler will run the `idle(timestamp,dt)` method
    // regulary on registred object. Objects can register an unregister
    // to a Scheduler using `add()` and `remove()` methods.
    var Scheduler = function () {

        // Our collection of animations, organized by id.
        this.animations = {};

        // Auto-incremental animation id
        this.nextAnimationId = 0;

        // Timestamp of last call to idle. Used to compute dt (delta t)
        this.lastframe = 0;

        // requestAnimationFrame and cancelAnimationFrame may have
        // different names on different browsers.
        this.requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;
        this.cancelAnimationFrame = window.cancelAnimationFrame ||
            window.mozCancelAnimationFrame;

        this.performance = window.performance || {};
        this.performance.now = (function() {
                    return window.performance.now       ||
                           window.performance.mozNow    ||
                           window.performance.msNow     ||
                           window.performance.oNow      ||
                           window.performance.webkitNow ||
                           function() { return new Date().getTime(); };
                    })();

        // Enable to show performance statistics on the console.
        this.statistics = false;
    };

    _.extend(Scheduler.prototype, {

        // Perform the animations
        idle: function (timestamp) {

            if (this.statistics) {
                // Benchmark idle starts
                var t0 = this.performance.now();
            }

            // Calculate delta since last frame
            var dt = timestamp - this.lastframe;
            if (this.lastframe === 0)
                dt = 0;
            else if (dt > 200)
                dt = 200;
            this.lastframe = timestamp;

            // Call idle on all animations
            _.each(this.animations, function (a) {
                a.idle(timestamp, dt);
            });

            if (this.statistics) {
                // Benchmark idle ends
                var t1 = this.performance.now();

                // Adjust counters, show stats.
                this._numframe = 1 + (this._numframe || 0);
                this._totalidle = (t1-t0) + (this._totalidle || 0);
                this._totaldt = dt + (this._totaldt || 0);
                this._showStats();
            }
        },
 
        // Show averaged animations statistics every seconds.
        _showStats: _.throttle(function () {
            console.log('idle: ' + Math.round(this._totalidle/this._numframe) + 'ms, dt: ' + Math.round(this._totaldt/this._numframe) + 'ms');
        }, 1000),

        // Add an animation, return an animationID
        add: function (animation) {
            var cid = ++this.nextAnimationId;
            this.animations[cid] = animation;
            return cid;
        },

        // Clean the animation from id
        remove: function (animationID) {
            delete this.animations[cid];
        },

        // Starts the scheduling of animations.
        start: function () {

            // Check if the scheduler is already running, do nothing if so.
            if (this.started) return;
            this.started = true;
            var that = this;

            // If requestAnimationFrame is supported, that's the way to go.
            // reference to the appropriate requestAnimationFrame has been saved
            // in constructor.
            if (this.requestAnimationFrame) {
                function frame(timestamp) {
                    that.idle(timestamp);
                    if (that.started) {
                        that.requestID = that.requestAnimationFrame.call(window, frame);
                    }
                };
                this.requestID = that.requestAnimationFrame.call(window, frame);
            }
            else {
                // Fallback to setInterval.
                this.intervalID = window.setInterval(function () {
                    var timestamp = that.performance.now();
                    that.idle(timestamp);
                }, 17);
            }
        },

        // Stop running the animations.
        stop: function () {
            this.started = false;
            if (this.requestID) {
                this.cancelAnimationFrame(this.requestID);
                delete this.requestID;
            }
            if (this.intervalID) {
                window.clearInterval(this.intervalID);
                delete this.intervalID;
            }
        }
    });

    // Tiny browser family detection, necessary(?) evil to know the name of the CSS rules.
    var Browser = {

        // Retrieve browser informations
        init: function () {
            this.prefix = this.search(this.dataPrefix) || 'ms';
        },

        // Perfom browser detection, return the matching prefix
        search: function (data) {
            for (var i=0;i<data.length;i++) {
                var dataString = data[i].string;
                if (dataString) {
                    if (dataString.indexOf(data[i].subString) !== -1)
                    return data[i].prefix;
                }
                else if (data[i].prop)
                    return data[i].prefix;
            }
        },

        // Collection of browser detection formulas
        dataPrefix: [
            { string: navigator.userAgent, subString: "AppleWebKit", prefix: "webkit" },
            { prop: window.opera,          subString: "Opera",       prefix: "o" },
            { string: navigator.userAgent, subString: "MSIE",        prefix: "ms" },
            { string: navigator.userAgent, subString: "Mozilla",     prefix: "moz" }
        ]
    };
    Browser.init();

    // Preload the CSS rules names
    var cssTransform = '-' + Browser.prefix + '-transform';
    var cssKeyframes = '@keyframes';

    // Preload the Events names
    var eventAnimationEnd = 'animationend';

    // Fix browser specific CSS rules names
    if (Browser.prefix === 'webkit') {
        cssKeyframes = "@-webkit-keyframes";
        eventAnimationEnd = 'webkitAnimationEnd';
    }
    else if (Browser.prefix === 'o') {
        eventAnimationEnd = 'oanimationend';
    }

    // Translate an element.
    var k6position = function (x, y) {
        this.k6x = x;
        this.k6y = y;
        this.k6update();
    };

    // Resize an element.
    var k6size = function (w, h) {
        this.k6w = w;
        this.k6h = h;
        this.k6update();
    };

    // Update position of an image element
    var k6updateImage = Kassics.k6updateImage = function () {
        this.style.webkitTransform = 'translate3d(' + (this.k6x-0.5) + 'px,' + (this.k6y-0.5) + 'px,0) scale3d(' + this.k6w + ',' + this.k6h + ',1)';
    };

    // Update position of a text element
    var k6updateText = Kassics.k6updateText = function () {
        this.style.left = this.k6x + 'px';
        this.style.top = this.k6y + 'px';
        this.style.width = this.k6w + 'px';
        this.style.height = this.k6h + 'px';
    };

    // Update position of the stage
    var k6updateStage = Kassics.k6updateStage = function () {
        this.style.webkitTransform = 'translate3d(' + (this.k6x) + 'px,' + (this.k6y) + 'px,0) scale3d(' + this.k6w + ',' + this.k6h + ',1)';
    };

    // Change layer for an image.
    var k6layer = Kassics.k6layer = function (layer) {
        this.style.zIndex = layer;
    };

    // Change image opacity.
    var k6opacity = Kassics.k6opacity = function (opacity) {
        this.style.opacity = opacity;
    };

    // Set image draggable status.
    var k6draggable = Kassics.k6draggable = function (state) {
        var oldDraggable = this._k6drag;
        if (oldDraggable !== state) {
            this._k6drag = state;
            this.k6stage._onDragChanged(this);
        }
    };

    // frames, array of frame.
    // each frame: {
    //     p: profress,
    //     x,y: position,
    //     w,h: size,
    //     angle: rotation,
    //     opacity: alpha transparency
    // }
    // callback called when animation is finished.
    var k6animationID = 0;
    var k6animate = Kassics.k6animate = function (frames, callback) {

        var that = this;
        var name = 'k6a_' + (++k6animationID);
        var k6animation = this._k6animation || {};
        var cssframes;

        if (k6animation.cssframes) {

            // Update the existing CSS rule.
            cssframes = k6animation.cssframes;
            cssframes.name = name;

            // Clear animation.
            while (cssframes.length > 0) {
                var frame = cssframes[0];
                cssframes.deleteRule(frame.keyText);
            }

            // Call callback and clear ongoing animation callback
            var oldcallback = k6animation.callback;
            if (oldcallback) {
                oldcallback.call(this);
            }
        }
        else {
            // Create keyframes rule element
            document.styleSheets[0].insertRule(cssKeyframes + " " + name + " { }", 0);
            cssframes = k6animation.cssframes = document.styleSheets[0].cssRules[0];

            // Store animation datas in the element.
            this._k6animation = k6animation;
        }

        if (frames.length === 0) return;
        var duration = frames[frames.length - 1].t;

        // Firefox called appendRule `insertRule` before standardization.
        var appendRule = cssframes.appendRule || cssframes.insertRule;

        var idx = 0;
        for (var i in frames) {
            var kf = frames[i];
            var rule = Math.round(kf.t * 100 / duration) + "% { -webkit-transform: translate3d(" + kf.x + "px," + kf.y + "px,0) scale3d(" + kf.w + "," + kf.h + ", 1); opacity: " + kf.o + "; } ";
            appendRule.call(cssframes, rule);
        }

        this.style.webkitAnimation = name + ' ' + duration + 's linear 0s 1';

        if (callback) {
            var callbackOnce = _.once(function () {
                that.style.webkitAnimationName = 'none';
                that.removeEventListener(eventAnimationEnd, callbackOnce, false);
                callback();
            });
            k6animation.callback = callbackOnce;
            this.addEventListener(eventAnimationEnd, callbackOnce, false);
        }
    };

    var k6extendStage = function (stage, el) {
        // Set defaults
        k6extend(stage, el);

        // Set image specific methods
        el.k6update = k6updateStage;
    };

    var k6extendImage = function (stage, el) {
        // Set defaults
        k6extend(stage, el);

        // Set image specific methods
        el.k6update = k6updateImage;
    };

    var k6extendText = function (stage, el) {
        // Set defaults
        k6extend(stage, el);

        // Set image specific methods
        el.k6update = k6updateText;
    };

    // Adds Kassics API to a DOM element.
    var k6extend = function (stage, el) {
        // Setters
        el.k6position = k6position;
        el.k6size = k6size;
        el.k6layer = k6layer;
        el.k6draggable = k6draggable;
        el.k6opacity = k6opacity;
        el.k6animate = k6animate;
        el.k6stage = stage;

        // Events API
        el.k6listener = {};
        el.k6on = function (event, callback) {
            this.k6listener[event] = callback;
        };
        el.k6off = function (event) {
            delete this.k6listener[event];
        };
        el.k6trigger = function (event, data) {
            var callback = this.k6listener[event];
            if (callback)
                callback(event, data);
        };

        // Remove the element from Stage
        el.k6remove = function () {
            if (this._k6drag) {
                // Make sure the element is not being dragged by the user.
                // Also removing from Stages' draggables.
                this.k6draggable(false);
            }
            this.parentNode.removeChild(this);
        };
    };

    // Manage draggable elements.
    //
    var _dragStart = function (t) {
        // Draggable target.
        if (t.target && t.target._k6drag) {
            t.drag = t.target;
            t.dragStartX = t.x;
            t.dragStartY = t.y;
            t.dragTargetX = +t.target.k6x;
            t.dragTargetY = +t.target.k6y;
            t.drag.k6trigger('dragstart', {target:t.drag, x:t.dragTargetX, y:t.dragTargetY});
        }
    };

    var _dragMove = function (t) {
        if (t.drag) {
            var newX = t.x - t.dragStartX + t.dragTargetX;
            var newY = t.y - t.dragStartY + t.dragTargetY;
            t.drag.k6position(newX, newY);
            t.drag.k6trigger('dragmove', {target:t.drag, x:newX, y:newY});
        }
    };

    var _dragEnd = function (t) {
        if (t.drag) {
            var newX = t.x - t.dragStartX + t.dragTargetX;
            var newY = t.y - t.dragStartY + t.dragTargetY;
            t.drag.k6position(newX, newY);
            t.drag.k6trigger('dragend', {target:t.drag, x:newX, y:newY});
        }
    };

    // Kassics, a 2D drawing area.
    var Stage = Kassics.Stage = function (options) {
        this.options = options;
        var el = options.el;

        // Make sure it's not a jQuery element.
        while (el && typeof el.length !== 'undefined') {
            el = el[0];
        }
        this.setElement(el);

        // List of touches in progress
        this.touches = {};

        // List of draggable elements
        this.draggables = {};

        // Create a start the animation scheduler
        this.scheduler = new Scheduler();
        this.scheduler.start();
    };

    _.extend(Stage.prototype, {
        
        // Change the element to render to.
        setElement: function (el) {
            this.el = el;
            k6extendStage(this, el);
            this._configure();
        },

        // Configure our DOM element
        _configure: function () {
            this.el.style.width    = (this.options.width || 128) + 'px';
            this.el.style.height   = (this.options.height || 128) + 'px';
            this.el.style.overflow = 'hidden';
            this.el.style.display  = 'block';
            this.el.style.margin   = '0';
            this.el.style.padding  = '0';
        },

        // Add an element to the stage.
        // if options.image is set, returns a Kassics.Image.
        // if options.text is set, returns a Kassics.Text.
        add: function (options) {

            var image = options.image;
            var text = options.text;
            var el = text || image;

            // Generate an ID, store it in the element.
            el.id = _.uniqueId('k6_');

            // Make it a 'floating' image.
            el.style.display = 'block';
            el.style.position = 'absolute';
            if (image) {
                el.style.left = 0;
                el.style.top = 0;
                el.style.width  = '1px';
                el.style.height = '1px';
                k6extendImage(this, el);
            }
            else if (text) {
                k6extendText(this, el);
            }

            // Set initial values from options.
            el.k6layer(options.layer);
            el.k6draggable(options.draggable);

            el.k6x = options.x;
            el.k6y = options.y;
            el.k6w = options.width;
            el.k6h = options.height;
            el.k6update();

            // Append and return the el.
            this.el.appendChild(el);
            return el;
        },

        bindEvents: function () {
            this.unbindEvents();
            if (typeof document.body.ontouchstart === 'undefined') {
                // All browsers
                this.el.onmousedown = this.mousedown;
                this.el.onmousemove = this.mousemove;
                this.el.onmouseup = this.mouseup;
            } else {
                // Mobile browsers
                this.el.ontouchstart = this.touchstart;
                this.el.ontouchmove = this.touchmove;
                this.el.ontouchend = this.touchend;
            }
        },
        unbindEvents: function () {
            this.el.ontouchstart = null;
            this.el.ontouchmove = null;
            this.el.ontouchend = null;
            this.el.onmousedown = null;
            this.el.onmousemove = null;
            this.el.onmouseup = null;
        },

        // Called when an element changed its dragging status
        _onDragChanged: function (image) {
            var status = image._k6drag;

            if (status) {
                // Add to the list of draggables
                this.draggables[image.id] = image;
            }
            else {
                // Remove from the list of draggables
                delete this.draggables[image.id];

                // Stop dragging the element if it was being dragged.
                for (var identifier in this.touches) {
                    var touch = this.touches[identifier];
                    if (touch.drag === image) {
                        delete this.touches[identifier];
                        return;
                    }
                }
            }
        },

        mousedown: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = {x: e.clientX, y: e.clientY, target: e.target||e.srcElement};
            _dragStart(t);
            this.k6stage.touches[identifier] = t;
            return false;
        },
        mousemove: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = this.k6stage.touches[identifier];
            if (t) {
                t.x = e.clientX;
                t.y = e.clientY;
                _dragMove(t);
            }
            return false;
        },
        mouseup: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = this.k6stage.touches[identifier];
            if (t) {
                t.x = e.clientX;
                t.y = e.clientY;
                _dragEnd(t);
                delete this.k6stage.touches[identifier];
            }
            return false;
        },

        touchstart: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var stage = this.k6stage;
            for (var i in e.changedTouches) {
                var touch = e.changedTouches[i];
                if (touch.pageX) {
                    var x = touch.pageX;
                    var y = touch.pageY;
                    var target = null;

                    // iOS doesn't detect the target appropriately when using translate3d/scale3d.
                    // So I do it by hand to hide the bug.
                    var children = stage.draggables;
                    for (var j in children) {
                        var c = children[j];
                        if (c._k6drag) {
                            var left   = c.k6x - c.k6w / 2;
                            var right  = c.k6x + c.k6w / 2;
                            var top    = c.k6y - c.k6h / 2;
                            var bottom = c.k6y + c.k6h / 2;
                            if (x >= left && x <= right && y >= top && y <= bottom) {
                                target = c;
                                break;
                            }
                        }
                    }

                    // Start dragging.
                    var t = {x: x, y: y, target: target};
                    _dragStart(t);
                    stage.touches[touch.identifier] = t;
                }
            }
            return false;
        },

        touchmove: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var stage = this.k6stage;
            for (var i in e.changedTouches) {
                var touch = e.changedTouches[i];
                if (touch.pageX) {
                    var t = stage.touches[touch.identifier];
                    if (t) {
                        t.x = touch.pageX;
                        t.y = touch.pageY;
                        _dragMove(t);
                    }
                }
            }
        },

        touchend: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var stage = this.k6stage;
            for (var i in e.changedTouches) {
                var touch = e.changedTouches[i];
                if (touch.pageX) {
                    var t = stage.touches[touch.identifier];
                    if (t) {
                        t.x = touch.pageX;
                        t.y = touch.pageY;
                        _dragEnd(t);
                        delete stage.touches[touch.identifier];
                    }
                }
            }
        },
    });

    return Kassics;
}).call(this);
