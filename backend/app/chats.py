from app import db

def save_chat(userid,chat_name,chat_content):

    try:
        chat_ref = db \
            .collection("users") \
            .document(userid) \
            .collection("chats") \
            .document(chat_name)
        
        chat_ref.set(chat_content, merge=False)
        return{"message":""},200

    except Exception as e:
        #print(e)
        return {"message":"UNKNOWN"},400


def delete_chat(userid,chat_name):

    try:
        chat_ref = db \
            .collection("users") \
            .document(userid) \
            .collection("chats") \
            .document(chat_name)
        
        chat_ref.delete()
        return{"message":""},200

    except Exception as e:
        #print(e)
        return {"message":"UNKNOWN"},400


def get_saved_chats(userid):
    chats = {}
    
    try:
        chat_docs = db \
        .collection("users") \
        .document(userid) \
        .collection("chats") \
        .get() \
       
        for chat in chat_docs:
            chats[chat.id]={
                "name":chat.id,
                "data":chat.to_dict()
            }
        return chats,200
        
    except Exception as e:
        #print(e)
        return chats,400