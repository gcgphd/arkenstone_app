from config import cookies_max_age,disabled_cookies


def set_cookies(cookie_dict,response):
    for k,v in cookie_dict.items():
         response.set_cookie(
            k,
            v,
            max_age=cookies_max_age,
            httponly=True,  # recommended for security
            samesite="Strict",  # required for cross-origin
            secure=True      # required if samesite="None"
        )

    # disabling listed tokens
    for cookie in disabled_cookies:
        response.set_cookie(cookie,'disabled', max_age=cookies_max_age)
    
    return response


def revoke_cookies(cookie_list,response):
    for c in cookie_list:
         response.set_cookie(c, '', expires=0, max_age=0, path='/',httponly=True, secure=True, samesite="None")
    return response