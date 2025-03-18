#### before deploying
remove .env from .gitignore
gcloud run deploy dynacat --source . --region=europe-west8 --allow-unauthenticated --cpu 1 --min-instances 0 --max-instances 10

#### to deploy
gcloud run deploy dynacat --source . --region=europe-west8 --allow-unauthenticated


#### security
- In order to prevent from email enumeration attempts, self-service signup has been disabled.
- securities are protected in a secret manager vault.
- rate limiter applied.
- refresh token has been disabled.
- cookies max age have been set to 30 minutes.
- CSRF token implemented to protect from Cross Site Request Forgery.