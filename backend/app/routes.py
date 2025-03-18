from app import app
from flask import request,render_template,jsonify,make_response,abort
from .users import user_info
from .auth import token_auth_step,set_cookies,revoke_cookies,token_required,token_auth_step_new
from .chats import save_chat,delete_chat,get_saved_chats
from .prompts import prompt
import re


# Define a set of rules to filter out malicious requests
rules = {
    'sql_injection': re.compile(r'(union|select|insert|delete|update|drop|alter).*', re.IGNORECASE),
    'xss_attack': re.compile(r'(<script>|<iframe>).*', re.IGNORECASE),
    'path_traversal': re.compile(r'(\.\./|\.\.).*', re.IGNORECASE),
    'file_transversal': re.compile(r'^.*\.(json|env|git|md)$', re.IGNORECASE),
    'non-ascii': re.compile(r'[^\x00-\x7F]', re.IGNORECASE),
}


########### Middleware #########################
# check against WAF rules
@app.before_request
def check_request_for_attacks():
    #if request.environ.get('HTTP_X_FORWARDED_FOR') is None:
    #    print(request.environ['REMOTE_ADDR'])
    #else:
    #    print(request.environ['HTTP_X_FORWARDED_FOR'])

    query_string = request.query_string.decode()

    # check forbidden characters is query string
    allowed_chars = re.compile(r'^[a-zA-Z,=&_]*$', re.IGNORECASE)
    if not (allowed_chars.search(query_string)):
        print(f"query string contains forbidden characters")
        abort(403, description=f'')

    # check forbidden characters in path
    forbidden_chars = re.compile(r'[<>%\$]', re.IGNORECASE)
    if forbidden_chars.search(request.path):
        print(f"path contains forbidden characters")
        abort(403, description=f'')

    # check lenght of query string
    if len(query_string) >= 40:
        print(f"detected too long query")
        abort(403, description=f'')
    if len(query_string.split('&')) > 2:
        print(f"detected too many query arguments")
        abort(403, description=f'')

    for attack_type, pattern in rules.items():
        # If any of the rules match, we block the request
        if pattern.search(request.path) or pattern.search(query_string):
            print(f"detected {attack_type}")
            abort(403, description=f'')
    



####### Routes ##################################
# Routes should render some page at the end, so
# we need to redirect and render a template if
# something is not correct

@app.route('/auth_expired')
def auth_expired():
    return make_response(render_template("auth_expired.html",redirect_target='index'))
    
@app.route('/change_pass')
def change_pass():
    return make_response(render_template("change_pass.html"))

@app.route('/saved_chats')
def saved_chats():
   
    # first we authenticate the request
    response,code = token_auth_step(request,'saved_chats')
    if code !=200:
        return response #<-- will redirect to login page

    # we try to obtain the user info
    uinfo,uinfo_code = user_info(response['id_token'])   
    if uinfo_code != 200:
        revoke_cookies(['idToken','refreshToken'],resp)
        return make_response(render_template("error_page.html"))
    
    # finally if everything goes smoothly
    # we try to render the template
    # we reinstall the cookies if the token was refreshed
    resp = make_response(render_template("saved_chats.html",user_email=uinfo["email"]))
    if response["refreshed"] :
        set_cookies({'idToken':response['id_token'],'refreshToken':response['refresh_token']},resp)

    return resp



@app.route('/')
@app.route('/index')
def index(): 

    # first we authenticate the request
    response,code = token_auth_step(request,'index')
    if code !=200:
        return response # <- this is a redirect to login

    # we try to obtain the user info
    uinfo,uinfo_code = user_info(response['id_token'])
    if uinfo_code != 200:          
        revoke_cookies(['idToken','refreshToken'],resp)
        return make_response(render_template("error_page.html"))
        
    # finally if everything goes smoothly
    # we try to render the template
    # we reinstall the cookies if the token was refreshed
    resp = make_response(render_template("index.html",user_email=uinfo["email"]))
    # if response["refreshed"] :
    #     set_cookies({'idToken':response['id_token'],'refreshToken':response['refresh_token']},resp)
    
    return resp



@app.route('/user_dashboard')
def user_dashboard(): 

    # first we authenticate the request
    response,code = token_auth_step(request,'user_dashboard')
    if code !=200:
        return response # <- this is a redirect to login

    # we try to obtain the user info
    uinfo,uinfo_code = user_info(response['id_token'])
    if uinfo_code != 200:          
        revoke_cookies(['idToken','refreshToken'],resp)
        return make_response(render_template("error_page.html"))
        
    print(uinfo)
    
    # finally if everything goes smoothly
    # we try to render the template
    # we reinstall the cookies if the token was refreshed
    resp = make_response(render_template("user_dashboard.html",user_email="popo"))
    
    # if response["refreshed"] :
    #     set_cookies({'idToken':response['id_token'],'refreshToken':response['refresh_token']},resp)
    
    return resp



@app.route('/login')
def login():   
    # login has a special argument "target"
    # that defines the page to redirect 
    # after signin/signup.
    args = request.args
    target = "index"
    if args.get("target"):
        target = args.get("target")

    params = {"target":target,"bla":"bla"}
    template = 'login.html'
    return render_template(template,params=params)#




####### APIs ##########################################
# All the APIs should return {},555 if some
# authentication or security sanity check fails
# 555 is the code to logout and revoke access tokens


def make_api_forbidden_response():
    resp = make_response(jsonify({}),555)
    revoke_cookies(['idToken','refreshToken'],resp)
    return resp


@app.route('/api_retrieve_chats', methods=['GET'])
def api_retrieve_chats():
    try:
        if request.method == 'GET':  
            
            # first we authenticate the request
            response,code = token_auth_step(request,'index')
            if code !=200:
                return make_api_forbidden_response()
            
            # we try to obtain the user info
            uinfo,uinfo_code = user_info(response['id_token'])   
            if uinfo_code != 200:
                return make_api_forbidden_response()
    
            # we try to fetch the saved chats
            chats,chat_code = get_saved_chats(uinfo["localId"])
            if chat_code != 200:
                return make_api_forbidden_response()
            
            # finally if everything goes smoothly
            # we try to render the template
            # we reinstall the cookies if the token was refreshed
            resp = make_response(jsonify(chats),200)
            if response["refreshed"] :
                set_cookies({'idToken':response['id_token'],'refreshToken':response['refresh_token']},resp)

            return resp
    
    except Exception as e:
        return {"custom_message":"Sorry something went wrong, we could not process your request."},400


@app.route('/api_savechat', methods=['POST'])
def api_savechat():
    try:
        if request.method == 'POST':  
            
            chat_content = request.json.get("chat_content")
            chat_name = request.json.get("chat_name")
            if not chat_content:
                return {"custom_message":"Chat content not specified"},400
            if not chat_name:
                return {"custom_message":"Chat name not specified"},400

            # sanity check on chat content
            sanity_check = True
            if len(chat_content["questions"]) != len(prompt["corporate_action"]):
                sanity_check = False
            if len(chat_content["answers"]) != len(prompt["corporate_action"]):
                sanity_check = False
            for i,q in enumerate(chat_content["questions"]):
                if f"{i+1}." not in q:
                    sanity_check = False
                    break
            if sanity_check is False:
                return make_api_forbidden_response()
            
            # first we authenticate the request
            response,code = token_auth_step(request,'index')
            if code !=200:
                return make_api_forbidden_response()
    
            # we try to fetch the saved chats
            chats,chat_code = get_saved_chats(response["user_id"])
            if chat_code != 200:
                return make_api_forbidden_response()

            # We set a maximum number of chats that can be saved
            if len(chats.keys())>=20:
                return {"custom_message":"A Maximum of 20 saved chats per user is allowed. Remove one before saving."},400

            # we try to save the chat
            saved,save_code = save_chat(response["user_id"],chat_name,chat_content)
            if save_code != 200:
                return saved
            
            # finally if everything goes smoothly
            # we try to render the template
            # we reinstall the cookies if the token was refreshed
            resp = make_response(saved,save_code)
            if response["refreshed"] :
                set_cookies({'idToken':response['id_token'],'refreshToken':response['refresh_token']},resp)
    
            return resp
    
    except Exception as e:
        return {"custom_message":"Sorry something went wrong, we could not process your request."},400


@app.route('/api_removechat', methods=['POST'])
def api_removechat():
    try:
        if request.method == 'POST':  
            chat_name = request.json.get("chat_name")
            if not chat_name:
                return {"custom_message":"Chat name not specified"},400

            # first we authenticate the request
            response,code = token_auth_step(request,'index')
            if code !=200:
                return make_api_forbidden_response()
            
            # we try to delete the chat
            saved,save_code = delete_chat(response["user_id"],chat_name)
            if save_code != 200:
                return saved
            
            # finally if everything goes smoothly
            # we try to render the template
            # we reinstall the cookies if the token was refreshed
            resp = make_response(saved,save_code)
            if response["refreshed"] :
                set_cookies({'idToken':response['id_token'],'refreshToken':response['refresh_token']},resp)
            
            return resp
        
    except Exception as e:
        return {"custom_message":"Sorry something went wrong, we could not process your request."},400

