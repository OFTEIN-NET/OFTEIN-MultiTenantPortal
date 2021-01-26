# Backend App Deployment in Google Cloud Platform

### To deploy on cloudrun
##### Push container on google registry
* gcloud auth login
* gcloud config set project oftein-plusplus
* gcloud auth configure-docker
* gcloud builds submit --config cloudbuild.yaml

##### Endpoints
* Datastore - https://console.cloud.google.com/datastore/welcome?project=oftein-plusplus
* Service Account - https://console.cloud.google.com/iam-admin/serviceaccounts
* Cloud Run - https://console.cloud.google.com/run?organizationId=0&project=oftein-plusplus
* Container Registry - https://console.cloud.google.com/gcr/images/oftein-plusplus?project=oftein-plusplus