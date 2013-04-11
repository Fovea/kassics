//     Kassics Particles
//
//     (c) 2013, Jean-Christophe Hoelt, Fovea.cc
//     Kassics may be freely distributed under the MIT license.
//
//     Requires Kassics already loaded.
//
(function () {

    var root = this;

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
        randomizeParticle: function (p) {
            var d = this.def;
            p.x = d.emiterCenterX + (Math.random() - 0.5) * d.emiterSizeX;
            p.y = d.emiterCenterY + (Math.random() - 0.5) * d.emiterSizeY;

            p.vx = d.initialVX + plusOrMinus() * d.initialVXRandom;
            p.vy = d.initialVY + plusOrMinus() * d.initialVYRandom;
            p.age = 0.0;
            p.lifeTimeFactor = randomFactor(d.lifeTimeRandom);
            p.alphaFactor = randomFactor(d.alphaRandom);
            p.sizeFactor = randomFactor(d.sizeRandom);
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
            this.randomizeParticle(p);
            this.particles[++this.particleId] = p;
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

            var t0 = +new Date();

            var dt = dtMs / 1000.0;
            var toDelete = [];

            // Preload lifeTime
            var defLifeTime = this.def.lifeTime;
            var defGravityY = this.def.gravityY;

            // Animate particles
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
                p.k6image.k6opacity(0);
                delete this.particles[i];
                this.pool.push(p);
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

            var t1 = +new Date();

            // Move elements on the view
            this.refreshStage();

            var t2 = +new Date();

            this.numframe = 1 + (this.numframe || 0);
            this.totalidle = (t1-t0) + (this.totalidle || 0);
            this.totalrefresh = (t2-t1) + (this.totalrefresh || 0);
            this.showStats();
        },
        showStats: _.throttle(function () {
            console.log('idle: ' + Math.round(this.totalidle/this.numframe) + 'ms, refresh: ' + Math.round(this.totalrefresh/this.numframe) + 'ms');
        }, 1000),

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

            var k6update = this.def.stage.el.k6update;

            for (var i in this.particles) {
                var p = this.particles[i];
                var age = p.age;
                var size;

                var halfLife = p.lifeTimeFactor * defHalfTime;
                if (age < halfLife) {
                    var coef = age / halfLife;
                    var oneMinusCoef = (1.0 - coef);
                    size = p.k6w = p.k6h = p.sizeFactor * (defSize0 * oneMinusCoef + defSize1 * coef);
                    p.k6a = p.alphaFactor * (defAlpha0 * oneMinusCoef + defAlpha1 * coef);
                }
                else {
                    var lifeTime = p.lifeTimeFactor * defLifeTime;
                    var coef = (age - halfLife) / (lifeTime - halfLife);
                    var oneMinusCoef = (1.0 - coef);
                    size = p.k6w = p.k6h = p.sizeFactor * (defSize1 * oneMinusCoef + defSize2 * coef);
                    p.k6a = p.alphaFactor * (defAlpha1 * oneMinusCoef + defAlpha2 * coef);
                }

                p.k6x = p.x - size * 0.5;
                p.k6y = p.y - size * 0.5;

                k6update.call(p.k6image, p);
            }
        }
    });

    return ParticleEmiter;

}).call(this);
