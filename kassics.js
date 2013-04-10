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
        this.css(cssTransform, 'translate3d(' + x + 'px,' + y + 'px,0)');
        this.attr('k6x', x);
        this.attr('k6y', y);
    };

    // Resize an image.
    var k6size = function (w, h) {
        this.css('width', w);
        this.css('height', h);
    };

    // Change layer for an image.
    var k6layer = function (layer) {
        this.css('z-index', layer);
    };

    // Set image draggable status.
    var k6draggable = function (state) {
        var oldDraggable = this.attr('k6drag');
        var newDraggable = state ? 'true' : 'false';
        if (oldDraggable !== newDraggable) {
            this.attr('k6drag', newDraggable);
            this.kassics.stopDragging(this);
        }
    };

    // Change image opacity.
    var k6opacity = function (opacity) {
        this.css('opacity', opacity);
    };

    // Kassics, a 2D drawing area.
    var Stage = Kassics.Stage = function (options) {
        this.options = options;
        var images = this.images = {};
        this.setElement(options.el || $('<div />'));
        this.touches = {};
    };

    _.extend(Stage.prototype, {
        
        // Change the element to render to.
        setElement: function (el) {
            this.el = el;
            this.$el = el;
            this._configure();
        },

        // Configure our DOM element
        _configure: function () {
            this.$el.css('width', this.options.width || 100);
            this.$el.css('height', this.options.height || 100);
            this.$el.css('overflow', 'hidden');
            this.$el.css('display', 'block');
            this.$el.css('margin', '0');
            this.$el.css('padding', '0');
        },

        // Add an image to the stage
        // returns a Kassics.Image.
        add: function (options) {
            var $image = $(options.image);

            // Generate a CID, store it in the element.
            var cid = _.uniqueId('k6_');
            $image.attr('k6cid', cid);

            // Make it a 'floating' image.
            $image.css('display', 'block');
            $image.css('position', 'absolute');
            $image.css('left', 0);
            $image.css('top', 0);
            this._extendImage($image);

            // Set initial values from options.
            $image.k6layer(options.layer);
            $image.k6position(options.x, options.y);
            $image.k6size(options.width, options.height);
            $image.k6draggable(options.draggable);

            // Add to the registry
            this.images[cid] = $image;

            // Append and return the image.
            this.$el.append($image);
            return $image;
        },

        // Direct access to Kassics API from the image.
        _extendImage: function ($image) {
            var that = this;

            // Setters
            $image.k6position = k6position;
            $image.k6size = k6size;
            $image.k6layer = k6layer;
            $image.k6draggable = k6draggable;
            $image.k6opacity = k6opacity;
            $image.kassics = this;

            // Remove from Stage
            $image.k6remove = function () {
                var cid = this.attr('k6cid');
                delete that.images[cid];
                this.remove();
            }
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

        stopDragging: function ($image) {
            for (var identifier in this.touches) {
                var touch = this.touches[identifier];
                if (touch.$drag === $image) {
                    delete this.touches[identifier];
                    return;
                }
            }
        },

        _dragStart: function (t) {
            // Draggable target.
            if (t.$target.attr('k6drag') === 'true') {
                t.$drag = this.images[t.$target.attr('k6cid')];
                t.dragStartX = t.x;
                t.dragStartY = t.y;
                t.dragTargetX = +t.$target.attr('k6x');
                t.dragTargetY = +t.$target.attr('k6y');
                t.$drag.trigger('k6dragstart', {target:t.$drag, x:t.dragTargetY, y:t.dragTargetY});
            }
        },
        _dragMove: function (t) {
            if (t.$drag) {
                var newX = t.x - t.dragStartX + t.dragTargetX;
                var newY = t.y - t.dragStartY + t.dragTargetY;
                t.$drag.k6position(newX, newY);
                t.$drag.trigger('k6dragmove', {target:t.$drag, x:newX, y:newY});
            }
        },
        _dragEnd: function (t) {
            if (t.$drag) {
                var newX = t.x - t.dragStartX + t.dragTargetX;
                var newY = t.y - t.dragStartY + t.dragTargetY;
                t.$drag.k6position(newX, newY);
                t.$drag.trigger('k6dragend', {target:t.$drag, x:newX, y:newY});
            }
        },

        mousedown: function (e) {
            e.preventDefault();
            e.stopPropagation();
            var identifier = -(1 + e.which);
            var t = {x: e.clientX, y: e.clientY, $target: $(e.target)};
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
                var t = {x: touch.pageX, y: touch.pageY, $target: $(touch.target)};
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
