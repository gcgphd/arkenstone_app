from config import cookies_max_age,disabled_cookies,is_prod


def set_cookies(cookie_dict,response):
    for k,v in cookie_dict.items():
         response.set_cookie(
            k,
            v,
            max_age=36000,
            httponly=True,    # recommended for security
            samesite="None" if is_prod else "Lax",
            secure=is_prod,
            path='/'  
        )

    # disabling listed tokens
    for cookie in disabled_cookies:
        response.set_cookie(cookie,'disabled', max_age=cookies_max_age)
    
    return response


def revoke_cookies(cookie_list,response):
    for c in cookie_list:
         response.set_cookie(c, '', expires=0, max_age=0 ,httponly=True, secure=True, samesite="Strict")
    return response