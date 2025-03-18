from app import app
from flask import request,render_template,jsonify,make_response
from .users import user_info
from .routes import make_api_forbidden_response
from .auth import token_auth_step,set_cookies,revoke_cookies,token_auth_step_new
from .resources import save_resource, get_free_resource



@app.route('/free_resources/<string:resource_name>')
def free_resources(resource_name): 
    '''
    This routes saves a free resource to the
    user profile
    '''

    # first we authenticate the request
    response,code = token_auth_step_new(
        request, 
        render_on_fail='login', 
        render_on_login=f"/free_resources/{resource_name}", 
    )
    if code !=200:
        return response # <- this is a redirect to login


    # fetch the specific resource 
    resource_content,resource_code = get_free_resource(resource_name)
    if resource_code == 200 and resource_content:
        # save resource to client profile if resource fetched
        save_resource(response["user_id"],resource_name,resource_content)
    else:
        print(f"resource {resource_name} not found")

   
    # finally if everything goes smoothly
    # we try to render the template
    # we reinstall the cookies if the token was refreshed
    resp = make_response(render_template("user_dashboard.html"))
    
    return resp

    

@app.route('/api_saveresource', methods=['POST'])
def api_saveresource():
    try:
        if request.method == 'POST':  
            
            resource_content = request.json.get("resource_content")
            resource_name = request.json.get("resource_content")
            if not resource_content:
                return {"custom_message":"Resource content not specified"},400
            if not resource_name:
                return {"custom_message":"Resource name not specified"},400

      
            # first we authenticate the request
            response,code = token_auth_step(request,'index')
            if code !=200:
                return make_api_forbidden_response()
    
            # we try to fetch the saved chats
            # chats,chat_code = get_saved_chats(response["user_id"])
            # if chat_code != 200:
            #     return make_api_forbidden_response()

            # we try to save the resource
            resource_name = "midjourney_tuto"
            resource_content = {"link":"blabla","title":"bloblob","instructions":"popopopopo"}
            saved,save_code = save_resource(
                response["user_id"],
                resource_name,
                resource_content
            )
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



