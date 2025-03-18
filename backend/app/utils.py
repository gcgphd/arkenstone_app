def clear_chroma_store(vectorstore,ids):
    '''
    given a list of ids in the ChromaDB
    iteratively clears the database.
    '''
    
    # delete the documents                
    # cannot remove everything in one time
    # if the lenght of ids is >166 (limit of Chroma)
    n = len(ids) // 166
    m = len(ids) % 166

    if len(ids)<=166:
        vectorstore._collection.delete(ids=ids)
    else:
        for i in range(n): 
            vectorstore._collection.delete(ids=ids[i*166:(i+1)*166])
        if m>0 :
            vectorstore._collection.delete(ids=ids[n*166:])