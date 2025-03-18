
// Variables

var chatHistory = []
var uploadedFiles = new FormData();
var allowedExtensions = ['.pdf'];

var uploadedList = document.getElementById('uploaded-files');
var fileUpload = document.getElementById('file-upload-area');
var submitButton  = document.getElementById('btn-submit');
var newChatButton = document.getElementById('btn-new-chat');
var submitSaveButton = document.getElementById('btn-submit-save');
var chatnameInput = document.getElementById("chatname");

// Event Lsiteners

submitButton.addEventListener('click', ()=>{
    submitFiles();
});

newChatButton.addEventListener('click', ()=>{
    newChat();
})

submitSaveButton.addEventListener('click', ()=>{
    submitSaveChat();
})


chatnameInput.addEventListener("keypress", function (event){
    
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        submitSaveChat();
    }
    
});


fileUpload.addEventListener('click', function () {
    var input = document.getElementById('file-upload');

    input.onchange = function (event) {
        addFilesToDataTransfer(event.target.files);
    }

    input.click();
});

fileUpload.addEventListener('dragover', function (event) {
    event.preventDefault();
    fileUpload.style.backgroundColor = '#F4F5F6';
});

fileUpload.addEventListener('dragleave', function (event) {
    event.preventDefault();
    fileUpload.style.backgroundColor = '';
});

fileUpload.addEventListener('drop', function (event) {
    event.preventDefault();
    fileUpload.style.backgroundColor = '';
    addFilesToDataTransfer(event.dataTransfer.files);
});




// Functions


function newChat(){
    // Clear all inputs for a new Chat
    uploadedFiles = new FormData();
    uploadedList.innerHTML = "" 

    var chatnameInput = document.getElementById("chatname");
    chatnameInput.value = "";

    showElement("upload-card",elems_hide = ["loader","chat-history-card"]);
    chatHistory = [];

    chatHistoryContent = document.getElementById("chat-history-content");
    chatHistoryContent.innerHTML = "";

    var fileUpload = document.getElementById('file-upload');
    fileUpload.value = "";     
}   


function toggleEdit(elemid){
    elem = document.getElementById(elemid);
    if (elem.getAttribute("contenteditable") == "true"){
        elem.setAttribute("contenteditable","false");
    }else{
        elem.setAttribute("contenteditable","true");
        elem.setAttribute("style","font-size:1.2em;background-color:#f3f4f7;border-radius:5px;padding:5px");
        elem.click()
    }
}


function addFilesToDataTransfer(file_list){

    for (let i = 0; i < file_list.length; i++) {
        const file = file_list[i]

        if (checkFileExtension(file)){
            if (checkFileType(file)){
                if (checkNFiles()){
                    uploadedFiles.append(file.name,file,file.name)
                    addFileNameToList(file)
                }
            }
        }  
    }
}


function checkFileSize(file){
    fsize = Math.round((file.size / 1024));
    if(fsize > 1024*150){
        tossError({"custom_message":"File size cannot be greater than 150 mb"});
        return false
    }
    return true
}


// check if there is some file to submit
function checkNFiles(){
    nfiles = Array.from(uploadedFiles.entries(), ([key, prop]) => ({key})).length 
    max_files = 20;
    if (nfiles+1 > max_files){
        tossError({"custom_message":"Number of uploaded files cannot be more than "+max_files});
        return false
    }
    return true
}


function checkFileExtension(file) {
    var fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (allowedExtensions.includes(fileExtension)) {
        //console.log('Valid file extension:', fileExtension);
        return true
        // Perform further actions with the valid file
    } else {
        tossError({"custom_message":"Invalid file extension: "+fileExtension});
        return false
    }
}


function checkFileType(file) {
    if(file.type != 'application/pdf'){
        tossError({"custom_message":"The file type is not correct. Upload only PDF files."});
        return false
    }
    return true
}


function addFileNameToList(file){

    var div = document.createElement("div");
    div.setAttribute("style","font-size:1em;background-color:#f3f4f7;border-radius:5px;padding:10px");
    div.setAttribute("class","d-flex justify-content-between mb-10");
    div.id = file.name;
    div.innerHTML = file.name;
    
    var span = document.createElement("span");
    span.setAttribute("class","material-symbols-rounded hoverable-text");
    span.setAttribute("style","font-size: 1.6em;cursor: pointer;");
    span.innerHTML = "delete";
    span.addEventListener("click",() => removeFileNameFromList(file.name));

    div.appendChild(span);
    uploadedList.appendChild(div);

}


function removeFileNameFromList(filename){
    uploadedFiles.delete(filename);
    var file_elem = document.getElementById(filename);
    file_elem.remove();
}


function fillChatHistory(chat){
    
    chatHistory.push(chat);
    showElement("chat-history-card",elems_hide = ["loader"]);

    var chatHistoryContent = document.getElementById("chat-history-content");
    for (var i=0;i<chat.length;i++){
        
        var question = document.createElement("div");
        question.setAttribute("class","m-0 mt-15");
        question.setAttribute("style","font-size:0.7em");
        question.setAttribute("data-type","question");
        question.innerHTML = (i+1) + ". " + chat[i][0];

        var answer = document.createElement("div");
        answer.setAttribute("class","m-0 mt-5 p-5");
        answer.setAttribute("data-type","answer");
        answer.setAttribute("style","font-size:0.7em;background-color:#f3f4f7;border-radius:5px");
        answer.innerHTML = chat[i][1];

        chatHistoryContent.appendChild(question);
        chatHistoryContent.appendChild(answer);

    }   

}



// APIs


function submitFiles(){        
    // check if there is some file to submit
    var nfiles = Array.from(uploadedFiles.entries(), ([key, prop]) => ({key})).length
    if (nfiles <=0 ){
        tossError({"custom_message":"Cannot process your request. Upload some file first."});
        return
    }

    // check total file size
    var tot_size = 0
    var max_mb = 500*1024;

    for (let [key, prop] of uploadedFiles.entries()) {
        tot_size+=prop.size
    }
    tot_size_mb = Math.round((tot_size / 1024));
    if (tot_size_mb > max_mb){
        tossError({"custom_message":"Total file size should be less than 500Mb"});
        return
    }

    showElement("loader",elems_hide = ["upload-card"]);


    options = postDefaulOptions();
    delete options["headers"]["Content-Type"];
    options["body"] = uploadedFiles;

    fetch("/start_chat", options)
        .then(data => {
            if (data.status==200){
                // Do some stuff here
                data.json().then((json) => {
                    fillChatHistory(json);
                });
            }
            else{  
                showElement("upload-card",elems_hide = ["loader","chat-history-card"]);
                
                handleError(
                    data,
                    forbidden_message = "Forbidden Action. Your Input File may be corrupted or not readable."
                )
                
                //if (data.status == 403){
                //    tossError({"custom_message":"Forbidden Action. Your Input File may be corrupted or not readable."});    
                //}else if (data.status == 555){
                //    signOut();
                //}else{
                //    data.json().then((json) =>{tossError(json);});
                //}
            }
        })
        
        .catch(err => {
            // Catch and display errors
            console.log(err);
            showElement("upload-card",elems_hide = ["loader","chat-history-card"]);
            tossError({"custom_message":"Sorry something went wrong, we could not process your request."});
        })
    
}


function submitSaveChat(){
    var chat_data = {}
    chat_data["chat_content"] = {}

    var form = document.getElementById("save-form");
    var loader = document.getElementById("save-loader");
    var save_icon = document.getElementById("save-icon");
    var chatname_input = document.getElementById("chatname");

    if (chatname_input.value.replace(/\s/g,'') == ""){
        tossError({"custom_message":"Please specify a chatname."})
        return
    }else{
        chat_data["chat_name"] = chatname_input.value;
    }

    const questions = Array.from(document.querySelectorAll('[data-type="question"]'));
    const answers = Array.from(document.querySelectorAll('[data-type="answer"]'));
    chat_data["chat_content"]["questions"] = questions.map(x => x.innerHTML);
    chat_data["chat_content"]["answers"] = answers.map(x => x.innerHTML);

    form.style.display = "none";
    loader.style.display = "block";

    options = postDefaulOptions();
    options["body"] =  JSON.stringify(chat_data);

    fetch("api_savechat", options)
        .then(data => {
            if (data.status==200){
                tossSuccess("Chat Successfully Saved!");
            }else{
                handleError(
                    data,
                    forbidden_message = "Forbidden Action. The chat name or the chat content may contain forbidden characters"
                )
                //if (data.status == 403){
                //    tossError({"custom_message":"Forbidden Action. The chat name or the chat content may contain forbidden characters."});
                //}
                //else if (data.status == 555){
                //    signOut();
                //}else{
                //    data.json().then((json) =>{tossError(json);});
                //}
            }
            form.style.display = "block";
            loader.style.display = "none";
            save_icon.click();
        })
        .catch(err => {
            // Catch and display errors
            // console.log(err);
            form.style.display = "block";
            loader.style.display = "none";
            save_icon.click();
        })
}


