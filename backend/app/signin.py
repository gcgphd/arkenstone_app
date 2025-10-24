from app import app
from flask import request,make_response,jsonify
from .cookies import *
from .token import *
from .requests_utils import *
from config import firebase_auth_api
import requests
import json


def make_signin_response(response,code):
    
    if code != 200:
        resp = make_response(jsonify(response), code)
        revoke_cookies(['idToken'],resp)
        return resp

    data = {
        "email":response.get("email"),
        "token":response.get("idToken"),
        "registered":response.get("registered")
    }
    resp = make_response(data,200)
    set_cookies({'idToken':response['idToken']},resp)
    #time.sleep(2)
    return resp



def check_input_forms(input_list):
    failed_check = False
    for val in input_list:
        if len(val) > 50 : failed_check = True
        if not isinstance(val,str) : failed_check = True
    return failed_check



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



@app.route('/signin', methods=['POST'])
def signin():
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



@app.route('/signout', methods=['GET'])
def signout():

    if request.method == 'GET': 
        try:
            resp = make_response(jsonify({"message":"succesfully logged out"}),200)
            revoke_cookies(['idToken'], resp)
            return resp
        
        except Exception as e:
            print(e)
            return {'message': f'There was an error logging out'}, 400 
    return {'message': 'There was an error logging out'}, 400 




