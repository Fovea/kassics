(function () {

    $(document).ready(function () {
        test("Initialization test", function () {
            var el = document.getElementById("container");

            // Create stage
            var stage = new Kassics.Stage({ el: el, width: 512, height: 512 });
            ok(el.style.width === '512px' && el.style.height === '512px', "Stage initialization OK");

            // Create a text
            var spanEl = $('<h1>Initialization test</h1>')[0];
            var span = stage.add({
                text: spanEl,
                layer: 1,
                x: 0, y: 0, width: 256, height: 100
            });
            ok($("#k6_1").text() === "Initialization test", "Text added OK");
            ok(spanEl.style.width === '256px' && spanEl.style.height === '100px', "Text size OK");

            // Move the text
            span.k6position(100,10);
            ok(span.k6x === 100 && spanEl.style.left === '100px', "Text position.x OK");
            ok(span.k6y === 10 && spanEl.style.top === '10px', "Text position.y OK");

            // Create an image
            var imgEl = new Image();
            imgEl.src = 'http://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Une_grappe_de_cassis.JPG/220px-Une_grappe_de_cassis.JPG';
            var img = stage.add({
                image: imgEl,
                layer: 0,
                x: 200, y: 200, width: 100, height: 100
            });
            ok($("#k6_2")[0].src === imgEl.src, "Image added OK");
            ok(imgEl.style.webkitTransform === "translate3d(199.5px, 199.5px, 0px) scale3d(100, 100, 1)", "Image position OK");
        });
    });

}).call(this);
