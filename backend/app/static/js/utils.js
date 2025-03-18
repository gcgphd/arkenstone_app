// Variables

var csrf_token_input = document.getElementById("csrf-token");
var csrf_token = csrf_token_input.value


// Functions

function postDefaulOptions() {

    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token
        },
        body: JSON.stringify({})
    };
}

function getDefaulOptions() {

    return {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrf_token
        }
    };
}


function getUrlParam(param) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}


function getQueryString() {
    let queryString = "";

    for (let key in window.urlParams) {

        if (key == "render_on_login") continue;

        if (queryString !== "") queryString += "&"; // Add '&' only if not the first parameter
        queryString += encodeURIComponent(key) + "=" + encodeURIComponent(window.urlParams[key]);
    }

    return queryString;
}


function constructUrl(baseUrl) {
    var queryString = getQueryString(); // Call the function to generate the query string
    return queryString ? `${baseUrl}?${queryString}` : baseUrl; // Append only if queryString is not empty
}


function redirectUrl() {
    // get redirect url
    // if the url params have a render_on_login key
    // this is the redirect url after succesfull login
    redirect_url = "/";

    if (window.urlParams) {
        if (window.urlParams["render_on_login"]) {
            redirect_url = window.urlParams["render_on_login"];
        }
    }

    // Here we add a logic to get window parameters
    console.log("redirecting to: " + constructUrl(redirect_url));
    window.location.href = constructUrl(redirect_url);
}


function showElement(elem_show, elems_hide) {
    elems_hide.forEach(id => {
        document.getElementById(id).style.display = "none";
    })

    document.getElementById(elem_show).style.display = "block";
}

