/*
Functions used in the login page. To be included
in login.html script tags.
*/

// Variables

var icon_elem = document.getElementById("visibility-icon");



// Event Lsiteners

icon_elem.addEventListener("click", function (event) {
    changePasswordVisibility(icon_elem, "pswd");
});

var pswd_input_elem = document.getElementById("pswd");
pswd_input_elem.addEventListener("keypress", function (event) {

    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        submitSignin();
    }

});

var email_input_elem = document.getElementById("email");
email_input_elem.addEventListener("keypress", function (event) {

    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        submitSignin();
    }
});

var signin_button_elem = document.getElementById("signin-button");
signin_button_elem.addEventListener("click", function (event) {
    submitSignin();
});




// Functions

function changePasswordVisibility(icon_elem, pswd_input_id) {

    var data_show = icon_elem.getAttribute("data-show");
    var pswd_input = document.getElementById(pswd_input_id);

    if (data_show == "hidden") {
        icon_elem.setAttribute("data-show", "shown");
        icon_elem.innerHTML = "visibility_off";
        pswd_input.type = "text";
    }

    if (data_show == "shown") {
        icon_elem.setAttribute("data-show", "hidden");
        icon_elem.innerHTML = "visibility";
        pswd_input.type = "password";
    }
}



// Fetch APIs

function submitSignin() {

    showElement('save-loader', ['login-card']);

    var email_input = document.getElementById("email");
    var password_input = document.getElementById("pswd");

    //check inputs
    max_length = 50;
    length_check_fail = false;

    if (email_input.value.length > max_length) {
        length_check_fail = true
    }
    if (password_input.value.length > max_length) {
        length_check_fail = true
    }
    if (length_check_fail) {
        showElement('login-card', ['save-loader']);
        tossError({ "custom_message": "Your inputs are not correctly formatted." });
    }

    options = postDefaulOptions();
    options['body'] = JSON.stringify({
        "email": email_input.value,
        "password": password_input.value
    });


    fetch("/api_signin", options)
        .then(data => {
            if (data.status == 200) {
                // get redirect url
                redirectUrl();
            } else {

                showElement('login-card', ['save-loader']);
                handleError(
                    data,
                    forbidden_message = "Forbidden Action."
                )
                //if (data.status == 403){
                //    tossError({"custom_message":"Forbidden Action"})
                //}else{
                //    data.json().then((json) =>{
                //        tossError(json);
                //    });
                //}
            }
        })
        .catch(err => {
            // Catch and display errors
            console.log(err)
            showElement('login-card', ['save-loader']);
            tossError({ "custom_message": "Sorry. Something went wrong. Try again in a few moments." });
        })
}