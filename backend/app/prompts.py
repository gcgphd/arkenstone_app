#from langchain_core.prompts import PromptTemplate


prompt = {
    "corporate_action":[
        "What is the object of the Corporate Action?",
        "What is the object of the offer?",
        "Which bonds are concerned?",
        "Who is entitled to participate?",
        "Who are elgible holders?",
        "What is the Corporate Action calendar?",
        "What is the Corporate Action schedule?",
        "What are the deadlines for this Corporate Action?",
        "Is this an exchange?",
        "Is this an offer to sell?",
        "Is this an offer to purchase?",
        "Is this a consent sollicitation?",
        "Does the offer contain shares?",
        "Does the offer contain loans?",
        "Does the offer contain sinkable bonds?",
        "Should noteholder be represented?",
        "How to confirm the representation?",
        "Is there any particular action for Switzerland?",
        "Which clearing system is concerned?",
        "Is there a consent fee?",
        "Who is the information and tabulation agent?",
        "Who is issuing and paying agent?",
        "Are there meeting provisions?",
        "Who is theregistered holder?",
        "Who is the registrar?",
        "Who is the transfer agent?",
        "What are the proposed amendment?s",
        "What are the proposed waiver?",
    ]
}

template = """Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

{context}

Question: {question}

Answer:"""
#chat_template = PromptTemplate.from_template(template)
