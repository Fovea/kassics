//     Kassics.js 0.0.1

//     (c) 2013, Jean-Christophe Hoelt, Fovea.cc
//     Kassics may be freely distributed under the MIT license.

//     Requires JQuery and Underscore or similar javascript libraries.

(function () {
    'use strict';

    // Initial Setup
    // -------------

    // Save a reference to the global object (`window` in the browser, `exports`
    // on the server).
    var root = this;

    // Exported for both the browser and the server.
    var Kassics;
    if (typeof exports !== 'undefined') {
        Kassics = exports;
    } else {
        Kassics = root.Kassics = {};
    }

    // Keep in sync with package.json and readme
    Kassics.VERSION = "0.0.2";

    // Quality of effects
    // Adjust per device
    Kassics.qualityCoef = 1.0;

    // Animations scheduler.
    // constructor
    var Scheduler = function () {
        this.animations = {};
        this.nextAnimationId = 0;
        this.lastframe = 0;

        this.requestAnimationFrame = window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;

        this.cancelAnimationFrame = window.cancelAnimationFrame ||
            window.mozCancelAnimationFrame;

    };

    _.extend(Scheduler.prototype, {

        // Perform the animations
        idle: function (timestamp) {

            // Calculate delta since last frame
            var dt = timestamp - this.lastframe;
            if (this.lastframe === 0)
                dt = 0;
            else if (dt > 200)
                dt = 200;
            this.lastframe = timestamp;

            // console.log('frame(t=' + timestamp + ', dt=' + dt + ')');

            // Call idle on all animations
            _.each(this.animations, function (a) {
                a.idle(timestamp, dt);
            });
        },

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
                this.intervalID = window.setInterval(17, function () {
                    var timestamp = +new Date();
                    idle(timestamp);
                });
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

    // TODO: get rid of JQuery and Underscore, use something like this:
    //
    // mini-pico-tiny convenience micro-framework, ymmv
    // (borrowed from http://mir.aculo.us)
    //
    // function $(id) { return document.getElementById(id); }
    // function html(id, html){ $(id).innerHTML = html; }
    // function css(id, style){ $(id).style.cssText += ';'+style; }

    // Tiny browser family detection, necessary(?) evil to know the name of the CSS rules.
    var Browser = {
        init: function () {
            this.prefix = this.search(this.dataPrefix) || 'ms';
        },
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
        dataPrefix: [
            { string: navigator.userAgent, subString: "AppleWebKit", prefix: "webkit" },
            { prop: window.opera,          subString: "Opera",       prefix: "o" },
            { string: navigator.userAgent, subString: "MSIE",        prefix: "ms" },
            { string: navigator.userAgent, subString: "Mozilla",     prefix: "moz" }
        ]
    };
    Browser.init();

    // Preload the CSS transform rule name
    var cssTransform = '-' + Browser.prefix + '-transform';

    // Translate an image.
    var k6position = function (x, y) {
        // this.setAttribute('k6x', x);
        // this.setAttribute('k6y', y);
        this.k6x = x;
        this.k6y = y;
        this.style.webkitTransform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    };

    // Resize an image.
    var k6size = function (w, h) {
        this.style.width = w + 'px';
        this.style.height = h + 'px';
    };

    // Change layer for an image.
    var k6layer = function (layer) {
        this.style.zIndex = layer;
    };

    // Change image opacity.
    var k6opacity = function (opacity) {
        this.style.opacity = opacity;
    };

    var k6update = function (p) {
        this.style.width = p.k6w + 'px';
        this.style.height = p.k6h + 'px';
        this.style.opacity = p.k6a;
        this.style.webkitTransform = 'translate3d(' + p.k6x + 'px,' + p.k6y + 'px,0)';
    };

    // Set image draggable status.
    var k6draggable = function (state) {
        var oldDraggable = this.getAttribute('k6drag');
        var newDraggable = state ? 'true' : 'false';
        if (oldDraggable !== newDraggable) {
            this.getAttribute('k6drag', newDraggable);
            this.k6stage.stopDragging(this);
        }
    };

    // Adds Kassics API to a DOM element.
    var extendDOM = function (stage, el) {
        // Setters
        el.k6position = k6position;
        el.k6size = k6size;
        el.k6layer = k6layer;
        el.k6draggable = k6draggable;
        el.k6opacity = k6opacity;
        el.k6update = k6update;
        el.k6stage = stage;
        el.k6listeners = {};

        // Events API
        el.k6on = function (event, callback) {
            this.k6listeners[event] = callback;
        };
        el.k6off = function (event) {
            delete this.k6listeners[event];
        };
        el.k6trigger = function (event, data) {
            var callback = this.k6listeners[event];
            if (callback)
                callback(data);
        };

        // Remove from Stage
        el.k6remove = function () {
            this.parentNode.removeChild(this);
        };
    }


    // Kassics, a 2D drawing area.
    var Stage = Kassics.Stage = function (options) {
        this.options = options;
        var el = options.el;
        while (el && typeof el.length !== 'undefined') {
            el = el[0];
        }
        this.setElement(el || new Div());
        this.touches = {};
        this.scheduler = new Scheduler();
        this.scheduler.start();
        extendDOM(this, el);
    };

    _.extend(Stage.prototype, {
        
        // Change the element to render to.
        setElement: function (el) {
            this.el = el;
            this.$el = $(el);
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

        // Add an image to the stage
        // returns a Kassics.Image.
        add: function (options) {
            var image = options.image;

            // Generate a CID, store it in the element.
            var cid = _.uniqueId('k6_');
            image.id = cid;

            // Make it a 'floating' image.
            image.style.display = 'block';
            image.style.position = 'absolute';
            image.style.left = 0;
            image.style.top = 0;
            extendDOM(this, image);

            // Set initial values from options.
            image.k6layer(options.layer);
            image.k6position(options.x, options.y);
            image.k6size(options.width, options.height);
            image.k6draggable(options.draggable);

            // Append and return the image.
            this.el.appendChild(image);
            return image;
        },

        bindEvents: function () {
            this.unbindEvents();
            if (typeof document.body.ontouchstart === 'undefined') {
                // All browsers
                this.$el.on('mousedown', _.bind(this.mousedown, this));
                this.$el.on('mousemove', _.bind(this.mousemove, this));
                this.$el.on('mouseup', _.bind(this.mouseup, this));
            } else {
                // Mobile browsers
                this.$el.on('touchstart', _.bind(this.touchstart, this));
                this.$el.on('touchmove', _.bind(this.touchmove, this));
                this.$el.on('touchend', _.bind(this.touchend, this));
            }
        },
        unbindEvents: function () {
            this.$el.off('touchstart');
            this.$el.off('touchmove');
            this.$el.off('touchend');
            this.$el.off('mousedown');
            this.$el.off('mousemove');
            this.$el.off('mouseup');
        },

        stopDragging: function (image) {
            for (var identifier in this.touches) {
                var touch = this.touches[identifier];
                if (touch.drag === image) {
                    delete this.touches[identifier];
                    return;
                }
            }
        },

        _dragStart: function (t) {
            // Draggable target.
            if (t.target.getAttribute('k6drag') === 'true') {
                t.drag = t.target;
                t.dragStartX = t.x;
                t.dragStartY = t.y;
                t.dragTargetX = +t.target.getAttribute('k6x');
                t.dragTargetY = +t.target.getAttribute('k6y');
                t.drag.k6trigger('dragstart', {target:t.drag, x:t.dragTargetY, y:t.dragTargetY});
            }
        },
        _dragMove: function (t) {
            if (t.drag) {
                var newX = t.x - t.dragStartX + t.dragTargetX;
                var newY = t.y - t.dragStartY + t.dragTargetY;
                t.drag.k6position(newX, newY);
                t.drag.k6trigger('dragmove', {target:t.drag, x:newX, y:newY});
            }
        },
        _dragEnd: function (t) {
            if (t.drag) {
                var newX = t.x - t.dragStartX + t.dragTargetX;
                var newY = t.y - t.dragStartY + t.dragTargetY;
                t.drag.k6position(newX, newY);
                t.drag.k6trigger('dragend', {target:t.drag, x:newX, y:newY});
            }
        },

        mousedown: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = {x: e.clientX, y: e.clientY, target: e.target};
            this._dragStart(t);
            this.touches[identifier] = t;
            return false;
        },
        mousemove: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = this.touches[identifier];
            if (t) {
                t.x = e.clientX;
                t.y = e.clientY;
                this._dragMove(t);
            }
            return false;
        },
        mouseup: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = this.touches[identifier];
            if (t) {
                t.x = e.clientX;
                t.y = e.clientY;
                this._dragEnd(t);
            }
            return false;
        },

        touchstart: function (event) {
            event.preventDefault();
            var e = event.originalEvent;
            for (var i in e.changedTouches) {
                var touch = e.changedTouches[i];
                var t = {x: touch.pageX, y: touch.pageY, target: touch.target};
                this._dragStart(t);
                this.touches[touch.identifier] = t;
            }
            return false;
        },

        touchmove: function (event) {
            event.preventDefault();
            var e = event.originalEvent;
            for (var i in e.changedTouches) {
                var touch = e.changedTouches[i];
                var t = this.touches[touch.identifier];
                if (t) {
                    t.x = touch.pageX;
                    t.y = touch.pageY;
                    this._dragMove(t);
                }
            }
        },

        touchend: function (event) {
            event.preventDefault();
            var e = event.originalEvent;
            for (var i in e.changedTouches) {
                var touch = e.changedTouches[i];
                var t = this.touches[touch.identifier];
                if (t) {
                    t.x = touch.pageX;
                    t.y = touch.pageY;
                    this._dragEnd(t);
                    delete this.touches[touch.identifier];
                }
            }
        },
    });

    return Kassics;
}).call(this);
