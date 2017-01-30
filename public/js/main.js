$(document).ready(function () {

    let inputField = $('#inputField');

    function download(filename, text) {
        let pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        pom.setAttribute('download', filename);

        if (document.createEvent) {
            let event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            pom.dispatchEvent(event);
        }
        else {
            pom.click();
        }
    }

    // submit with ctrl + return
    $('body').keydown(function (event) {
        if (event.ctrlKey && event.keyCode == 13) {
            submit();
        }
    });

    // auto resize textarea
    inputField.on('keyup change breaks paste', function () {

        // count breaks in textarea
        let text = $(this).val(),
            matches = text.match(/\n/g),
            breaks = matches ? matches.length : 2;

        if (breaks > 4)
            $(this).attr('rows', breaks + 2);
    });

    // submit button
    $('#submitButton').on('click', function () {
       submit();
    });

    // download button
    $('#downloadButton').on('click', function () {
        download('triples.sparql', 'INSERT DATA {\n' + $('#outputField').text() + '\n }');
    });

    let submit = function () {
        let outField = $('#outputField');
        outField.text('');
        $('#submitButton').toggleClass('disabled', true);
        $('body').css('cursor', 'progress');

        $.post(
            '/',
            {
                text: inputField.val(),
                depth: $('#depthField').val()
            },
            function (response) {
                let txt = outField.text().trim();
                outField.text(txt + '\n' + response);
                enable();
            }
        );
    };

    let socket = io.connect('http://localhost:8008');
    socket.on('for_client', function (data) {
        let outField = $('#outputField');

        if (!data.finished) {
            let txt = outField.text().trim();
            outField.text(txt + '\n' + data.data);
        } else {
            setTimeout(function () {
                enable()
            }, 20000);
        }
        // socket.emit('for_server', {data: 'data'});
    });

    let enable = function () {
        $('#submitButton').toggleClass('disabled', false);
        $('body').css('cursor', 'default');
    }

});
