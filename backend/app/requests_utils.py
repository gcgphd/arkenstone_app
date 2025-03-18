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
