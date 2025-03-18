/*
Functions used in the login page. To be included
in login.html script tags.
*/


// Event Lsiteners

var resetpswd_button_elem = document.getElementById("reset-pswd-button");
resetpswd_button_elem.addEventListener("click", function (event){
    submitChangePswd();
});



// Functions


function submitChangePswd(){
    var email_input = document.getElementById("email");
    sendResetPswd(email_input.value);
}


// Fetch APIs

function signOut(){

    options = getDefaulOptions();
    
    fetch("api_signout", options)
        .then(data => {
            if (data.status==200){
                // Do some stuff here
                window.location.href = "/login"
            }else            
            {
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
            tossError({"custom_message":"Sorry. Something went wrong."});
        })    

}


function sendResetPswd(email){

    max_length = 50;
    if (email.length > max_length){
        tossError({"custom_message":"Your inputs are not correctly formatted."});
    }
    

    options = postDefaulOptions();
    options['body'] = JSON.stringify({
        "email": email, 
    });

    
    fetch("api_changepswd", options)
        .then(data => {
            if (data.status==200){
                // Do some stuff here
                tossSuccess("Check to your email inbox. If an account exists, an email as been sent to "+ email +".");
                function delay(time) {
                    return new Promise(resolve => setTimeout(resolve, time));
                }
                delay(5000).then(() => signOut());
            }else{
            
                handleError(
                    data,
                    forbidden_message = "Forbidden Action. Try again in a few minutes."
                )
    
                // data.json().then((json) =>{
                //   tossError(json);
                //});
            }
        })
        .catch(err => {
            // Catch and display errors
            tossError({"custom_message":"Sorry. Something went wrong."});
        })
}

