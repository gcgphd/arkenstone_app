from app import db

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


def get_resources(userid):
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
    

def get_free_resource(resource_name):
    '''
    lists all free available resources
    '''
    try:
        resource_doc = db \
        .collection("free_resources") \
        .document(resource_name) \
        .get() \
        
        if resource_doc.exists:
            return resource_doc.to_dict(),200

        return {},200
        
    except Exception as e:
        print(e)
        return {},400
    

