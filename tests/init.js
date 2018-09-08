(function () {

    $(document).ready(function () {
            var el = document.getElementById("container");

            // Create stage
            var stage = new Kassics.Stage({ el: el, width: 512, height: 512 });
            stage.bindEvents();

            // Create a text
            var spanEl = $('<h1>Initialization test</h1>')[0];
            var span = stage.add({
                text: spanEl,
                layer: 1,
                x: 0, y: 0, width: 256, height: 100,
                draggable: true
            });

            // Move the text
            span.k6position(100,10);

            // Create an image
            var imgEl = new Image();
            imgEl.src = 'http://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Une_grappe_de_cassis.JPG/220px-Une_grappe_de_cassis.JPG';
            var img = stage.add({
                image: imgEl,
                layer: 0,
                draggable: true,
                x: 200, y: 200, width: 100, height: 100
            });

            imgEl.k6on('dragstart', function(event, data) {
                console.log('position is ' + data.x + ',' + data.y);
            });
            imgEl.k6on('dragmove', function(event, data) {
                console.log('position is ' + data.x + ',' + data.y);
            });
            imgEl.k6on('dragend', function(event, data) {
                console.log('position is ' + data.x + ',' + data.y);
            });
    });

}).call(this);
