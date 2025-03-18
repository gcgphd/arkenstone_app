from app import app
from app import fb
from app import db
import firebase_admin
from firebase_admin import auth
from firebase_admin.auth import UserRecord
from datetime import datetime
from .auth import send_verify_email,get_user_info


def create_user(**kwargs) -> UserRecord:
    """
    auth.create_user() ref:
    https://firebase.google.com/docs/reference/admin/python/firebase_admin.auth#create_user
    """       
    try: 
        return {"message":"User Succesfully Created", "user": auth.create_user(**kwargs)},200
    except firebase_admin._auth_utils.EmailAlreadyExistsError as e:
        return {"message":"The user with the provided email already exists", "user":None},400
    except Exception as e:
        return {"message":"Ooops, an error was produced on our side. Try again later.", "user":None},500


def update_email(user_id: str, email: str) -> UserRecord:
    return auth.update_user(user_id, email=email)


def update_mobile(user_id: str, mobile_no: str) -> UserRecord:
    return auth.update_user(user_id, phone_number=mobile_no)


def update_display_name(user_id: str, display_name: str) -> UserRecord:
    return auth.update_user(user_id, display_name=display_name)


def set_password(user_id: str, password: str) -> UserRecord:
    return auth.update_user(user_id, password=password)


def user_info(id_token):
    try:
        # this is the request to API endpoint
        users,code = get_user_info(id_token)
        if code !=200:
            return users,code
           
        user = users.get('users')[0]
        if not user.get('emailVerified'):
            verif,verif_code = send_verify_email(id_token)
        
        return {
            "email":user.get("email"),
            "lastLoginAt": datetime.fromtimestamp(int(user.get("lastLoginAt"))/1000).strftime("%m-%d-%Y"),
            "localId":user.get("localId")
        }, 200
        
    except Exception as e:
        #print(e)
        return {'message': 'Cannot get user info'},400
    

    
    