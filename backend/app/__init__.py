import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_wtf import CSRFProtect 
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import firebase_admin
from firebase_admin import firestore,credentials
from google.cloud import storage
from google import genai
#from config import cred

# load env variables
load_dotenv()

# initialize flask app
app = Flask(__name__)

# Configure CORS to allow your frontend domain
CORS(app,origins="http://127.0.0.1:5173", supports_credentials=True)

# csrf protection
app.secret_key = b'_gfgfhghf347884748934?!-s1>'
#csrf = CSRFProtect(app) 

# csrf protection
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[
        "200 per day", 
        "50 per hour",
        "5 per second",
        "20 per minute"
        ],
    storage_uri="memory://",
)

app.config['MAX_CONTENT_LENGTH'] = 500 * 1000 * 1000    
app.config['UPLOAD_DIR'] = os.path.join(os.getcwd(),'uploads')



# initialize firebase

# Set the credentials environment variable
#os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\GGR\gandalf-projects\arkenstone_app\arkenstone-app-firebase-adminsdk-fbsvc-6af9dc5716.json"
#print(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))

# Initialize Firestore
#cred = credentials.Certificate(os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"))

with app.app_context():
    fb = firebase_admin.initialize_app() 
    db = firestore.client()
    storage_client = storage.Client()
    gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))


from app import signin,token,upload_image,upload_image_cdn,generate_from_disk,models
