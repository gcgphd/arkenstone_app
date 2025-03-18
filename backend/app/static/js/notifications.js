const toastError = document.getElementById("toast-error");
const toastBootstrapError = bootstrap.Toast.getOrCreateInstance(toastError);

function showErrorToast(message) {
    var toast_msg = document.getElementById('toast-error-message');
    toast_msg.innerHTML = message;
    toastBootstrapError.show();
}

const toastSuccess = document.getElementById("toast-success");
const toastBootstrapSuccess = bootstrap.Toast.getOrCreateInstance(toastSuccess);

function showSuccessToast(message) {
    var toast_msg = document.getElementById('toast-success-message');
    toast_msg.innerHTML = message;
    toastBootstrapSuccess.show();
}


function tossSuccess(message) {
    showSuccessToast(message);
}


function tossError(obj) {
    //var alter_content = document.getElementById("alert-message");
    //alter_content.innerHTML = "An unknown error has been produced. Please contact us." //errors["UNKNOWN"]
    if ('message' in obj) {
        showErrorToast(obj['message'])
    }
    if ('custom_message' in obj) {
        showErrorToast(obj['custom_message'])
    }

    //halfmoon.toastAlert("error-alert", 7500);
}


function handleError(data, forbidden_message) {
    if (data.status == 403) {
        tossError({ "custom_message": forbidden_message });
    } else if (data.status == 555) {
        signOut();
    } else {
        data.json().then(
            (json) => { tossError(json); }
        )
            .catch(err => {
                tossError({ "": "" });
            })
    }
}