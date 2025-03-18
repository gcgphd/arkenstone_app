/*
Functions used in the saved_chats page. To be included
in saved_chats.html script tags.
*/

// Variables

var chatData = {};
var chatTitlesTable = document.getElementById("chat-titles-table");



// Event Lsiteners

// fetch the user chats on load.
document.addEventListener("DOMContentLoaded", (event) => {
    retrieveChats();
});



// Functions

function addChatTitle(title){
        
    var tbody = document.createElement("tbody");
    var row = document.createElement("tr");
    row.setAttribute("class","p-0 m-0");
    row.setAttribute("id",title);

    var title_container = document.createElement("div");
    title_container.setAttribute("class","clickable-card hoverable-text d-flex justify-content-between mb-10");
    title_container.addEventListener("click",()=>{fillModal(title)});
    var title_text = document.createElement("div");
    title_text.setAttribute("class","align-top");
    title_text.innerHTML = title;
    title_container.appendChild(title_text);

    var cell = document.createElement("td");
    cell.setAttribute("class","p-0 m-0");
    cell.setAttribute("style","width:100%");
    cell.appendChild(title_container);


    var icon_trash = document.createElement("span");
    icon_trash.setAttribute("class","material-symbols-rounded hoverable-text align-top");
    icon_trash.setAttribute("style","font-size: 1em;cursor:pointer;");
    icon_trash.innerHTML = "delete";
    icon_trash.addEventListener("click",()=>{confirmDeleteModal(title)});

    var cell1 = document.createElement("td");
    cell1.setAttribute("class","pl-10 m-0");
    cell1.appendChild(icon_trash);


    row.appendChild(cell);
    row.appendChild(cell1);
    tbody.append(row);
    chatTitlesTable.appendChild(tbody);
}


function confirmDeleteModal(chat_title){
    var chatHistoryContent = document.getElementById("chat-history-content");
    chatHistoryContent.innerHTML = "";
    
    var question = document.createElement("div");
    question.setAttribute("style","font-size: 0.8em;");
    question.innerHTML = "Are you sure you want to delete " + chat_title + "?"

    var br = document.createElement("br");

    var button = document.createElement("input");
    button.setAttribute("class","btn btn-sm btn-primary");
    button.setAttribute("style","font-size: 0.8em;");
    button.setAttribute("type","button");
    button.setAttribute("value","Delete");
    button.addEventListener("click",()=>{submitDeleteChat(chat_title)});

    chatHistoryContent.appendChild(question);
    chatHistoryContent.appendChild(br);
    chatHistoryContent.appendChild(button);

    displayModal();

}


function fillModal(chat_title){
    var chatHistoryContent = document.getElementById("chat-history-content");
    chatHistoryContent.innerHTML = "";

    chat_info = chatData[chat_title]["data"];

    var title = document.createElement("div");
    title.setAttribute("class","m-0 mt-15");
    title.setAttribute("style","font-size:1.4em;font-weight:bold");
    title.setAttribute("data-type","question");
    title.innerHTML = chat_title;

    chatHistoryContent.appendChild(title);

    
    for (var i=0;i<chat_info["questions"].length;i++){
        var question = document.createElement("div");
        question.setAttribute("class","m-0 mt-15");
        question.setAttribute("style","font-size:0.7em");
        question.setAttribute("data-type","question");
        question.innerHTML = chat_info["questions"][i];

        var answer = document.createElement("div");
        answer.setAttribute("class","m-0 mt-5 p-5");
        answer.setAttribute("data-type","answer");
        answer.setAttribute("style","font-size:0.7em;background-color:#f3f4f7;border-radius:5px");
        answer.innerHTML = chat_info["answers"][i];

        chatHistoryContent.appendChild(question);
        chatHistoryContent.appendChild(answer);
    }

    displayModal();

}

function displayModal(){
    var trigger = document.getElementById("modal-trigger");
    trigger.click();
}

function hideModal(){
    var trigger = document.getElementById("modal-close");
    trigger.click();
}



// Fetch APIs

function retrieveChats(){
    
    var chat_card = document.getElementById('chat-titles-card');
    var loader = document.getElementById('save-loader');
    chat_card.style.display = "none";
    loader.style.display = "block";
    
    options = getDefaulOptions();

    fetch("api_retrieve_chats", options)
    .then(data => {
        if (data.status==200){
            data.json().then((json) =>{
                chatData = json;
                for (const [key, value] of Object.entries(chatData)) {
                    addChatTitle(value["name"]);
                    chat_card.style.display = "block";
                    loader.style.display = "none";
                }
            });
            
        }else{

            chat_card.style.display = "block";
            loader.style.display = "none";
            handleError(
                data,
                forbidden_message = "Forbidden Action. Try again in a few minutes."
            )

            //if (data.status == 555){
            //   signOut();
            //}else{
            //    data.json().then((json) =>{
            //        chat_card.style.display = "block";
            //        loader.style.display = "none";
            //        tossError(json);
            //    });
            //}
        }
    })
    .catch(err => {
        // Catch and display errors
        chat_card.style.display = "block";
        loader.style.display = "none";
        tossError({"custom_message":"Sorry. Something went wrong. Try again in a few moments."});
    })
}


function submitDeleteChat(chat_title){

    showElement("modal-loader",elems_hide = ["chat-titles-table"]);

    options = postDefaulOptions();
    options['body'] = JSON.stringify({"chat_name":chat_title});

    fetch("api_removechat", options)
        .then(data => {
            if (data.status==200){
                var row = document.getElementById(chat_title);
                row.remove();
                
                showElement("chat-titles-table",elems_hide = ["modal-loader"]);
                hideModal();
                tossSuccess("Chat Successfully Deleted!");
            }else{

                showElement("chat-titles-table",elems_hide = ["modal-loader"]);
                hideModal();
                handleError(
                    data,
                    forbidden_message = "Forbidden Action. Try again in a few minutes."
                )

                //if (data.status == 555){
                //    signOut();
                //}else{
                //    data.json().then((json) =>{                    
                //        showElement("chat-titles-table",elems_hide = ["modal-loader"]);
                //        hideModal();
                //        tossError(json);
                //    });
                //}
            }
        })
        .catch(err => {
            // Catch and display errors
            showElement("chat-titles-table",elems_hide = ["modal-loader"]);
            hideModal();
            tossError({"custom_message":"Sorry. Something went wrong. Try again in a few moments."});
        })
}