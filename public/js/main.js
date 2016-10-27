$(document).ready(function () {

    var inputField = $('#inputField');

    // submit with ctrl + return
    inputField.keydown(function (event) {
        if(event.ctrlKey && event.keyCode == 13) {
            submit();
        }
    });

    // auto resize textarea
    inputField.on('keyup change breaks paste', function () {

        // count breaks in textarea
        var text = $(this).val(),
            matches = text.match(/\n/g),
            breaks = matches ? matches.length : 2;

        if(breaks > 4)
            $(this).attr('rows', breaks + 2);
    });

    // submit button
    $(".submitButton").on('click', function () {
        submit();
    });

    var submit = function () {
        $.post(
            '/',
            {
                text: inputField.val()
            },
            function (response) {
                $('#outputField').text(response);
            }
        );
    }

});
