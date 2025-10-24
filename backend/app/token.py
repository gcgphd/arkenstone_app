import requests
from app import app
from flask import make_response,request
from firebase_admin import auth
from config import firebase_token_api
from .cookies import *
from .requests_utils import *


# @app.route('/api/test-cookies', methods=["GET"])
# def test_cookies():
#     print("Received cookies:", request.cookies)
#     return {"cookies": request.cookies}, 200


def get_firebase_token():
    return 'AIzaSyCg2tDAxZg_2rUt8fLXQdj5GiZOng1zsdc'

    # return access_secret_version(
    #     project_id='1053739766695',
    #     secret_id='firebase',
    #     version_id='fbconfig'
    # )


def verify_id_token(id_token):
    try:
        user = auth.verify_id_token(id_token,clock_skew_seconds=5)
        return user,200
    # if the auth token has expired we try exchange it for
    # a new token
    except auth.ExpiredIdTokenError as e:
        print(e)
        return {'message':'Auth Expired.'},505
    except Exception as e:
        print(e)
        return {'message':'Invalid Auth Credentials Provided.'},400


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


def token_auth(request):

    # get cookies from request
    cookies = request.cookies
    if not cookies:
        return make_response({'message':'Auth Required.'}, 401)
    
    id_token = cookies.get('idToken') 
    refresh_token = 'disabled' #cookies.get('refreshToken')
    
    # id desired cookies are not in the 
    # cookie need to redirect
    if not id_token:
         return make_response({'message':'Auth Required.'}, 401)

    # we verify the user using the tokens
    # if the verification is not succesful
    # we redirect again to the login page
    # else we serve the content of the page
    token_response,code = verify_token(id_token,refresh_token)

    if code != 200:
        return make_response(token_response,code)
    
    # finally if the user was not refreshed 
    # we need to return the original tokens in the response
    if token_response["refreshed"] is True:
        set_cookies({'idToken':token_response['id_token']},token_response)

    if token_response["refreshed"] is False:
        token_response['id_token'] = id_token

    #     user['refresh_token'] = refresh_token

    return make_response(token_response, 200)


@app.route('/api/validate-token',methods=["GET"])
def validate_token():       
    try:
        if request.method == 'GET': 
           return token_auth(request)
    except Exception as e:
        print(e)
        return make_response({'message': f'There was an error during authentication'}, 400)
    return make_response({'message': 'Forbidden'}, 403)



######## TO DEBUG / IMPROVE

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
    