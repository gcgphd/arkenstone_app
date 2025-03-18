from app import app
from flask import request,make_response,redirect,render_template,jsonify,g
from firebase_admin import auth
from config import access_secret_version,cookies_max_age,disabled_cookies
from functools import wraps
import requests
import json
import time

firebase_auth_api  = "https://identitytoolkit.googleapis.com/v1/accounts"
firebase_token_api =  "https://securetoken.googleapis.com/v1/token"


error_map =  {
    "INVALID_PASSWORD":"Invalid login credentials.",
    "INVALID_LOGIN_CREDENTIALS":"Invalid login credentials.",
    "WEAK_PASSWORD" : "Password should be at least 6 characters",
    #"EMAIL_NOT_FOUND":"The email was not found",
    #"EMAIL_EXISTS":"This email is already in use",
    #"INVALID_EMAIL":"The email associated with this account was not found",
    "USER_DISABLED":"User has been disabled",
    "UNKNOWN":"An unknown error has been produced. Please contact us.",
    "TOO_MANY_ATTEMPTS_TRY_LATER": "Access to this account has been temporarily disabled due to suspicious activity. If you are the owner, you can immediately restore it by resetting your password.",
}

def parse_error_message(r):
    if "message" in r.keys():
        for k,v in error_map.items():
            if k in r["message"]: return {"message":v}
    return {"message":error_map['UNKNOWN']}


def parse_request_error(r):
    try:
        error_msg= r.json().get('error')
        if not error_msg :  
            return {"message":error_map['UNKNOWN']}, r.status_code
        return parse_error_message(error_msg), r.status_code
    except Exception as e:
        print(e)
        return {'message':"UNKNOWN"}, 400


def get_firebase_token():

    return 'AIzaSyCg2tDAxZg_2rUt8fLXQdj5GiZOng1zsdc'

    # return access_secret_version(
    #     project_id='1053739766695',
    #     secret_id='firebase',
    #     version_id='fbconfig'
    # )


def set_cookies(cookie_dict,response):
    for k,v in cookie_dict.items():
         response.set_cookie(k,v, max_age=cookies_max_age)

    # disabling listed tokens
    for cookie in disabled_cookies:
        response.set_cookie(cookie,'disabled', max_age=cookies_max_age)
    
    return response


def revoke_cookies(cookie_list,response):
    for c in cookie_list:
         response.set_cookie(c, '', expires=0, max_age=0, path='/',httponly=True, secure=True, samesite="None")
    return response




def get_user_info(id_token: str):
    r={}
    firebase_token = get_firebase_token()
    try:
        payload = {
            "requestType":"VERIFY_EMAIL",
            "idToken": id_token,
        }

        r = requests.post(
            f"{firebase_auth_api}:lookup",
            params={"key":firebase_token},
            data=payload
        )

        r.raise_for_status()
        return r.json(),200
    
    except:
        return parse_request_error(r)


def send_verify_email(id_token: str):
    r={}
    firebase_token = get_firebase_token()
    try:
        payload = {
            "requestType":"VERIFY_EMAIL",
            "idToken": id_token,
        }

        r = requests.post(
            f"{firebase_auth_api}:sendOobCode",
            params={"key":firebase_token},
            data=payload
        )

        r.raise_for_status()
        return r.json(),200
    
    except:
        return parse_request_error(r)


def send_changepswd_email(email: str):
    r={}
    firebase_token =  get_firebase_token()
    try:
        payload = {
            "requestType":"PASSWORD_RESET",
            "email": email,
        }

        r = requests.post(
            f"{firebase_auth_api}:sendOobCode",
            params={"key":firebase_token},
            data=payload
        )

        r.raise_for_status()
        return r.json(),200
    
    except:
        return parse_request_error(r)


def signin_with_email_and_password(email: str, password: str, return_secure_token: bool = True):
    r = {}
    firebase_token = get_firebase_token()
    try:
        payload = json.dumps({
            "email": email,
            "password": password,
            "returnSecureToken": return_secure_token
        })

        r = requests.post(
            f"{firebase_auth_api}:signInWithPassword",
            params={"key":firebase_token},
            data=payload
        )
        r.raise_for_status()
        return r.json(),200
    
    except Exception as e:
        print(e)
        return parse_request_error(r)


def signup_with_email_and_password(email: str, password: str, return_secure_token: bool = True):
    r = {}
    firebase_token = get_firebase_token()
    try:
        payload = json.dumps({
            "email": email,
            "password": password,
            "returnSecureToken": return_secure_token
        })

        r = requests.post(
            f"{firebase_auth_api}:signUp",
            params={"key":firebase_token},
            data=payload
        )
        r.raise_for_status()
        return r.json(),200
    
    except:
        return parse_request_error(r)


def get_id_token_from_refresh(refresh_token):
    r={}
    firebase_token = get_firebase_token()
    try:
        payload = {
            "grant_type":"refresh_token",
            "refresh_token": refresh_token
        }
        
        r = requests.post(
            firebase_token_api,
            headers={"Content-Type":"application/x-www-form-urlencoded"},
            params={"key":firebase_token},
            data=payload
        )

        r.raise_for_status()
        return r.json(),200
    
    except :
        return parse_request_error(r)
    

def verify_id_token(id_token):
    try:
        user = auth.verify_id_token(id_token,clock_skew_seconds=5)
        return user,200
    # if the auth token has expired we try exchange it for
    # a new token
    except auth.ExpiredIdTokenError as e:
        print(e)
        return {'message':'Auth Token Expired.'},505
    except Exception as e:
        print(e)
        return {'message':'Invalid token provided.'},400
    

def verify_token(id_token,refresh_token):
    
    response,code = verify_id_token(id_token)
    response['refreshed'] =  False

    # code 505 means id Token Expired (custom code)
    # we try to get a new one usign refresh token
    if refresh_token != 'disabled':
        if code == 505:
            response,code = get_id_token_from_refresh(refresh_token)
            response['refreshed'] = True

    return response,code


def token_required(template):
    """ Decorator to enforce authentication via `token_auth_step`. """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user, code = token_auth_step(request, template)
            if code != 200:
                return user  # Redirect to login page if not authenticated
            
            g.user = user  # Store user data in Flask `g` object for route access
            return f(*args, **kwargs)
        
        return wrapper
    return decorator


def token_auth_step(request,template):

    # get cookies from request
    cookies = request.cookies
    if not cookies:
        resp = make_response(render_template("auth_expired.html",redirect_target=template))
        return resp, 304
    
    id_token = cookies.get('idToken')
    refresh_token = cookies.get('refreshToken')

    # id desired cookies are not in the 
    # cookie need to redirect
    if not id_token or not refresh_token:
        resp = make_response(render_template("auth_expired.html",redirect_target=template))
        return resp, 304

    # we verify the user using the tokens
    # if the verification is not succesful
    # we redirect again to the login page
    # else we serve the content of the page
    user,code = verify_token(id_token,refresh_token)


    if code != 200:
        resp = make_response(render_template("auth_expired.html",redirect_target=template))
        return resp, 304
    
    # finally if the user was not refreshed 
    # we need to return the original tokens in the response
    if user["refreshed"] is True:
        set_cookies({'idToken':user['id_token'],'refreshToken':user['refresh_token']},resp)

    if user["refreshed"] is False:
        user['id_token'] = id_token
        user['refresh_token'] = refresh_token

    return user, 200


def token_auth_step_new(request,render_on_fail,**kwargs):

    # get cookies from request
    cookies = request.cookies
    if not cookies:
        resp = make_response(render_template(f"{render_on_fail}.html",params=kwargs))
        return resp, 304
    
    id_token = cookies.get('idToken')
    refresh_token = cookies.get('refreshToken')

    # id desired cookies are not in the 
    # cookie need to redirect
    if not id_token or not refresh_token:
        resp = make_response(render_template(f"{render_on_fail}.html",params=kwargs))
        return resp, 304

    # we verify the user using the tokens
    # if the verification is not succesful
    # we redirect again to the login page
    # else we serve the content of the page
    user,code = verify_token(id_token,refresh_token)

    if code != 200:
        resp = make_response(render_template(f"{render_on_fail}.html",params=kwargs))
        return resp, 304
    
    # finally if the user was not refreshed 
    # we need to return the original tokens in the response
    if user["refreshed"] is True:
        set_cookies({'idToken':user['id_token'],'refreshToken':user['refresh_token']},resp)

    if user["refreshed"] is False:
        user['id_token'] = id_token
        user['refresh_token'] = refresh_token

    return user, 200



def make_signin_response(response,code):
    if code != 200:
        resp = make_response(jsonify(response), code)
        revoke_cookies(['idToken','refreshToken'],resp)
        return resp

    resp = make_response(jsonify({"message":"succesfully logged in"}),200)
    set_cookies({'idToken':response['idToken'],'refreshToken':response['refreshToken']},resp)
    #time.sleep(2)
    return resp


def check_input_forms(input_list):
    failed_check = False
    for val in input_list:
        if len(val) > 50 : failed_check = True
        if not isinstance(val,str) : failed_check = True
    return failed_check


@app.route('/api_signin', methods=['POST'])
def api_signin():
    try:
        if request.method == 'POST': 
            email = request.json.get('email')
            password = request.json.get('password')
            
            failed_check = check_input_forms([email,password])
            if failed_check:
                return {"message":"Your inputs are not correctly formatted"}, 400
            if not email:
                return {"message":"No Email Provided"}, 400
            if not password:
                return {"message":"No Password Provided"}, 400
        
            response,code = signin_with_email_and_password(email,password)
            return make_signin_response(response,code)
    except Exception as e:
        print(e)
        return {'message': f'There was an error logging in'}, 400
    return {'message': 'There was an error logging in'}, 400



@app.route('/api_signout', methods=['GET'])
def api_signout():

    if request.method == 'GET': 
        try:
            resp = make_response(jsonify({"message":"succesfully logged out"}),200)
            revoke_cookies(['idToken','refreshToken'],resp)
            return resp
        
        except Exception as e:
            print(e)
            return {'message': f'There was an error logging out'}, 400 
    return {'message': 'There was an error logging out'}, 400 


@app.route('/api_changepswd', methods=['POST'])
def api_changepswd():
    try: 
        if request.method == 'POST':         
                email = request.json.get("email")
                if not email:
                    return {"custom_message":"email not specified"},400
                
                failed_check = check_input_forms([email])
                if failed_check:
                    return {"message":"Your inputs are not correctly formatted"}, 400

                response,code = send_changepswd_email(email)
                if code != 200:
                    resp = make_response(jsonify(response), code)
                    resp = revoke_cookies(['idToken','refreshToken'],resp)
                    return resp

                resp = make_response(jsonify({"message":""}),200)
                return resp
        
    except Exception as e:
            print(e)
            return {'message': f'There was an error logging in'}, 400
    return {'message': 'Unknown Error'}, 400

