

var navbar_change_pwsd = document.getElementById("navbar-reset-pswd");
var navbar_signout = document.getElementById("navbar-signout");

navbar_change_pwsd.addEventListener("click", function (e) {
    var navbar_email_elem = document.getElementById("navbar-email");
    email = navbar_email_elem.innerHTML;
    sendResetPswd(email);
});

navbar_signout.addEventListener("click", function (e) {
    signOut();
});

function signOutForm() {
    document.getElementById("signout-form").submit();
}


function signOut() {

    options = getDefaulOptions();

    fetch("/api_signout", options)
        .then(data => {
            if (data.status == 200) {
                // Do some stuff here
                window.location.href = "/login"
            } else {
                handleError(
                    data,
                    forbidden_message = "Forbidden Action. Try again in a few minutes."
                )
                //data.json().then((json) =>{
                //   tossError(json);
                //});
            }
        })
        .catch(err => {
            // Catch and display errors
            tossError({ "custom_message": "Sorry. Something went wrong." });
        })

}



function sendResetPswd(email) {

    options = postDefaulOptions();
    options['body'] = JSON.stringify({
        "email": email,
    });

    fetch("api_changepswd", options)
        .then(data => {
            if (data.status == 200) {
                // Do some stuff here
                tossSuccess("Check to your email inbox. If an account exists, an email as been sent to " + email + ".");
                function delay(time) {
                    return new Promise(resolve => setTimeout(resolve, time));
                }
                delay(5000).then(() => signOut());
            } else {
                handleError(
                    data,
                    forbidden_message = "Forbidden Action. Try again in a few minutes."
                )
                //data.json().then((json) =>{
                //   tossError(json);
                //});
            }
        })
        .catch(err => {
            // Catch and display errors
            tossError({ "custom_message": "Sorry. Something went wrong." });
        })
}

