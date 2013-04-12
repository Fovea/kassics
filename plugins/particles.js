//     Kassics Particles
//
//     (c) 2013, Jean-Christophe Hoelt, Fovea.cc
//     Kassics may be freely distributed under the MIT license.
//
//     Requires Kassics already loaded.
//
(function () {

    var root = this;

    var USE_KASSICS_ANIMATIONS = false;

    // Adds a particle emiter class to Kassics.
    var ParticleEmiter = root.Kassics.ParticleEmiter = function (options) {
        this.def = {
            stage: options.stage || null,
            image: options.image || null,
            layer: options.layer || 1,
            emiterSizeX: options.emiterSizeX || 0.0,
            emiterSizeY: options.emiterSizeY || 0.0,
            emiterCenterX: options.emiterCenterX || 0.0,
            emiterCenterY: options.emiterCenterY || 0.0,
            gravityY: options.gravityY || 1.0,
            alpha0: options.alpha0 || 0.0,
            alpha1: options.alpha1 || 1.0,
            alpha2: options.alpha2 || 0.0,
            alphaRandom: options.alphaRandom || 0.0,
            halfTime: options.halfTime || 1.0,
            lifeTime: options.lifeTime || 3.0,
            lifeTimeRandom: options.lifeTimeRandom || 0.0,
            size0: options.size0 || 0.0,
            size1: options.size1 || 64.0,
            size2: options.size2 || 0.0,
            sizeRandom: options.sizeRandom || 0.0,
            initialVX: options.initialVX || 0.0,
            initialVY: options.initialVY || 0.0,
            initialVXRandom: options.initialVXRandom || 1.0,
            initialVYRandom: options.initialVYRandom || 1.0,
            emissionRate: options.emissionRate || 0.0,
            emissionRateRandom: options.emissionRateRandom || 0.0
        };

        // Living particles
        this.particles = {};
        this.particleId = 0;

        // Pool of dead particles waiting for resurection
        this.pool = [];

        // Time before next particle is emited.
        this.nextParticleTime = 0.1;
    };

    function randomFactor(r) {
        var vcoef = 2.0 * Math.random();
        if (vcoef > 1.0)
            vcoef = 1.0 + r * (vcoef - 1.0);
        else
            vcoef = 1.0 + vcoef * (1.0 / (1.0 + r) - 1.0);
        return vcoef;
    }
    function plusOrMinus() {
        return 2.0 * (Math.random() - 0.5);
    }

    _.extend(ParticleEmiter.prototype, {

        start: function () {
            if (this.def.stage && !this.animationID) {
                this.animationID = this.def.stage.scheduler.add(this);
            }
        },
        stop: function () {
            if (this.def.stage && this.animationID) {
                this.def.stage.scheduler.remove(this.animationID);
                delete this.animationID;
            }
        },

        // Initialize an existing particle
        launchParticle: function (p) {
            var d = this.def;
            p.x = d.emiterCenterX + (Math.random() - 0.5) * d.emiterSizeX;
            p.y = d.emiterCenterY + (Math.random() - 0.5) * d.emiterSizeY;

            p.vx = d.initialVX + plusOrMinus() * d.initialVXRandom;
            p.vy = d.initialVY + plusOrMinus() * d.initialVYRandom;
            p.age = 0.0;
            p.lifeTimeFactor = randomFactor(d.lifeTimeRandom);
            p.alphaFactor = randomFactor(d.alphaRandom);
            p.sizeFactor = randomFactor(d.sizeRandom);
            
            if (USE_KASSICS_ANIMATIONS) {
                // Make frames
                // while (p.age
                // while (p.age > p.lifeTimeFactor * defLifeTime) {

                // note: x(t) = x0 + t * vx0
                //       y(t) = y0 + t * vy0 + t^2 * gravity/2
                 
                var t1 = p.lifeTimeFactor * d.halfTime;
                var t2 = p.lifeTimeFactor * d.lifeTime;
                var frame0 = {
                    t: 0,
                    x: p.x,
                    y: p.y,
                    w: p.sizeFactor * d.size0,
                    h: p.sizeFactor * d.size0,
                    o: p.alphaFactor * d.alpha0
                };
                var frame1 = {
                    t: t1,
                    x: p.x + t1 * p.vx,
                    y: p.y + t1 * p.vy + t1*t1 * d.gravityY * 0.5,
                    w: p.sizeFactor * d.size1,
                    h: p.sizeFactor * d.size1,
                    o: p.alphaFactor * d.alpha1
                };
                var frame2 = {
                    t: t2,
                    x: p.x + t2 * p.vx,
                    y: p.y + t2 * p.vy + t2*t2 * d.gravityY * 0.5,
                    w: p.sizeFactor * d.size2,
                    h: p.sizeFactor * d.size2,
                    o: p.alphaFactor * d.alpha2
                };

                var that = this;
                var removeParticle = function () {
                    p.k6image.k6size(0,0);
                    delete that.particles[p.id];
                    that.pool.push(p);
                };

                p.k6image.k6animate([frame0, frame1, frame2], removeParticle);
            }
        },

        // Emit a new particle. Return a particle identifier.
        addParticle: function () {
            var d = this.def;
            var p;
            if (this.pool.length > 0) {
                p = this.pool.shift();
            }
            else {
                // Clone image
                var image = new Image();
                image.src = d.image.src;

                // Create a k6 image
                var k6image = d.stage ? d.stage.add({
                    image: image,
                    layer: d.layer,
                    x: 0,
                    y: 0,
                    width:  0,
                    height: 0
                }) : null;

                p = {
                    k6image: k6image,
                };
            }
            p.id = ++this.particleId;
            this.particles[p.id] = p;
            this.launchParticle(p);
            return this.particleId;
        },

        /*
        // Remove particle with given identifier.
        removeParticle: function (identifier) {
            var p = this.particles[identifier];
            if (p) {
                p.k6image.k6remove();
                delete this.particles[identifier];
                this.freeParticle = p;
            }
        },

        // Remove all particles
        removeAll: function () {
            // TODO
            for (var i in this.particles) {
                var p = this.particles[i];
                p.k6image.k6remove();
            }
            this.particles = {};
        },
        */

        // Animate particles.
        // dt is the number of seconds since last call.
        idle: function (timestampMs, dtMs) {

            var dt = dtMs / 1000.0;
            var toDelete = [];

            // Preload lifeTime
            var defLifeTime = this.def.lifeTime;
            var defGravityY = this.def.gravityY;

            // Animate particles
            if (!USE_KASSICS_ANIMATIONS) {
                for (var i in this.particles) {
                    var p = this.particles[i];
                    p.x += dt * p.vx;
                    p.y += dt * p.vy;
                    p.vy += dt * defGravityY;
                    p.age += dt;
                    if (p.age > p.lifeTimeFactor * defLifeTime) {
                        toDelete.push(i);
                    }
                }

                // Remove dead particles
                for (var j in toDelete) {
                    var i = toDelete[j];
                    var p = this.particles[i];
                    p.k6image.k6size(0,0);
                    delete this.particles[i];
                    this.pool.push(p);
                }
            }
        
            // Automatic particle emission
            if (this.def.emissionRate > 0.0 && Kassics.qualityCoef > 0.0) {

                // Keep local refs to some variables.
                var emissionRate = this.def.emissionRate;
                var emissionRateRandom = this.def.emissionRateRandom;
                var qualityCoef = Kassics.qualityCoef;

                var maxNext = 4.0 / (emissionRate * qualityCoef);
                if (this.nextParticleTime > maxNext) this.nextParticleTime = maxNext;

                this.nextParticleTime -= dt;
                while (this.nextParticleTime < 0.0) {
                    this.addParticle();
                    this.nextParticleTime += 1.0 / (randomFactor(emissionRateRandom) * qualityCoef * emissionRate);
                }
            }

            // Move elements on the view
            if (!USE_KASSICS_ANIMATIONS) {
                this.refreshStage();
            }
        },

        refreshStage: function () {
            if (!this.def.stage)
                return;
            // code from "draw" goes here.
            var defHalfTime = this.def.halfTime;
            var defLifeTime = this.def.lifeTime;
            var defSize0 = this.def.size0;
            var defSize1 = this.def.size1;
            var defSize2 = this.def.size2;
            var defAlpha0 = this.def.alpha0;
            var defAlpha1 = this.def.alpha1;
            var defAlpha2 = this.def.alpha2;

            // Keep a local ref to k6update as an optimization
            var k6update = this.def.stage.el.k6update;

            if (defAlpha0 + defAlpha1 + defAlpha2 === 3) {
                for (var i in this.particles) {
                    var p = this.particles[i];
                    var age = p.age;
                    var size;
                    var image = p.k6image;

                    var halfLife = p.lifeTimeFactor * defHalfTime;
                    if (age < halfLife) {
                        var coef = age / halfLife;
                        var oneMinusCoef = (1.0 - coef);
                        size = image.k6w = image.k6h = p.sizeFactor * (defSize0 * oneMinusCoef + defSize1 * coef);
                    }
                    else {
                        var lifeTime = p.lifeTimeFactor * defLifeTime;
                        var coef = (age - halfLife) / (lifeTime - halfLife);
                        var oneMinusCoef = (1.0 - coef);
                        size = image.k6w = image.k6h = p.sizeFactor * (defSize1 * oneMinusCoef + defSize2 * coef);
                    }

                    image.k6x = p.x; // - size * 0.5;
                    image.k6y = p.y; // - size * 0.5;

                    k6update.call(image);
                }
            }
            else {
                for (var i in this.particles) {
                    var p = this.particles[i];
                    var age = p.age;
                    var size, alpha;
                    var image = p.k6image;

                    var halfLife = p.lifeTimeFactor * defHalfTime;
                    if (age < halfLife) {
                        var coef = age / halfLife;
                        var oneMinusCoef = (1.0 - coef);
                        size = image.k6w = image.k6h = p.sizeFactor * (defSize0 * oneMinusCoef + defSize1 * coef);
                        alpha = p.alphaFactor * (defAlpha0 * oneMinusCoef + defAlpha1 * coef);
                    }
                    else {
                        var lifeTime = p.lifeTimeFactor * defLifeTime;
                        var coef = (age - halfLife) / (lifeTime - halfLife);
                        var oneMinusCoef = (1.0 - coef);
                        size = image.k6w = image.k6h = p.sizeFactor * (defSize1 * oneMinusCoef + defSize2 * coef);
                        alpha = p.alphaFactor * (defAlpha1 * oneMinusCoef + defAlpha2 * coef);
                    }

                    image.k6x = p.x; // - size * 0.5;
                    image.k6y = p.y; // - size * 0.5;

                    k6update.call(image);
                    image.style.opacity = alpha;
                }
            }
        }
    });

    return ParticleEmiter;

}).call(this);
