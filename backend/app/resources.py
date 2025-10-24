from app import app,db
from flask import request,make_response

def save_resource(userid,resource_name,resource_content):

    try:
        resource_ref = db \
            .collection("users") \
            .document(userid) \
            .collection("free_resources") \
            .document(resource_name)
        
        resource_ref.set(resource_content, merge=False)
        return{"message":""},200

    except Exception as e:
        print(e)
        return {"message":"UNKNOWN"},400


def delete_resource(userid,resource_name):

    try:
        resource_ref = db \
            .collection("users") \
            .document(userid) \
            .collection("resources") \
            .document(resource_name)
        
        resource_ref.delete()
        return{"message":""},200

    except Exception as e:
        print(e)
        return {"message":"UNKNOWN"},400


def get_all_resources(userid):
    '''
    Fetches all free available resources
    in the database
    '''
    
    resources = {}
    try:
        resource_docs = db \
        .collection("users") \
        .document(userid) \
        .collection("resources") \
        .get() \
       
        for res in resource_docs:
            resources[res.id]={
                "name":res.id,
                "data":res.to_dict()
            }
        return resources,200
        
    except Exception as e:
        print(e)
        return resources,400
    

def get_resource(resource_name):
    '''
    Fetches a free available resource
    in the database
    '''
    try:
        resource_doc = db \
        .collection("free_resources") \
        .document(resource_name) \
        .get() \
        
        if resource_doc.exists:
            return resource_doc.to_dict(),200

        return {"message":"The resource does not exists"}, 400
        
    except Exception as e:
        print(e)
        return {"message":"There wase an error getting the resources"}, 400
    

@app.route('/api/save_resource',methods=["POST"])
def validate_token():       
    try:
        if request.method == 'POST':             
            
            # try to get the see if the free resource is 
            # available in the db. If not returns an error
            resource_name = request.json.get('resource_name')
            resource_dict,resource_code = get_resource(resource_name)
            if resource_code !=200:
                return make_response(resource_dict,resource_code)
            
            # if the resource is found it saves in the 
            saved_resp,saved_code = save_resource(resource_name,resource_dict)
            return make_response(userid,saved_resp,saved_code)



    except Exception as e:
        print(e)
        return make_response({'message': f'There was an unknown error.'}, 400)
    
    return make_response({'message': 'Forbidden'}, 403)
    


    

