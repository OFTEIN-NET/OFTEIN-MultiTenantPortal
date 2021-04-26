# OF@TEIN++ Multi-Tenant-Portal Backend App

## Example Deployment in the Cloud

The example deployment is running on the Google Cloud Platform and accessible 
through this following information:

`host`: https://api.iotcloudserve.net/ <br>
`frontend`: https://oftein.iotcloudserve.net <br>
`cluster`: `chula`, `gist`, `um`

There are 4 user types in our scenario.
* `public`: A person who hasn't logged in yet.
* `authed`: A person who has logged in, but has not yet been verified by admin.
* `user`: A person who has logged in and been verified by admin.
* `admin`

There are 4 ways to create/promote new user.
* `public` logins
    * then `authed` sends verification-email to admin-email via `/sendemail` .
    * then `admin` checks verification-email and clicks the verification-link inside.
* `admin` lists all users via `/users`
    * then `admin` intentionally promotes specific user to be `user` or `admin` via `/promoteaccount`.
* `admin` promotes `user` to be `admin` via `/promoteaccount`.
* `admin` adds `public` to be `user` or `admin` directly via `/promoteaccount`.

There is only 1 way to demote user.
* `admin` lists all users via `/users`
    * then `admin` demotes `user` to be `authed`
* `admin` cannot be demoted.


## OFTEIN-Plusplus V3

Method | Auth-Level | URL | Description | Payload | Params | Query | Example | Remark
--- | --- | --- | --- | --- | --- | --- | --- | ---
GET | `admin`<br>`user` | `host`/v3/pod | view all pods | - | - | `cluster`<br>`token` | | `cluster` is optional
POST | `admin`<br>`user` | `host`/v3/pod | create a pod | `yaml` | - | `cluster`<br>`token` |
DELETE | `admin`<br>`user` | `host`/v3/pod | delete specific pod | - | - | `cluster`<br>`token`<br>`name` | 
GET | `admin`<br>`user` | `host`/v3/deployment | view all deployments | - | - | `cluster`<br>`token` |  | `cluster` is optional
POST | `admin`<br>`user` | `host`/v3/deployment | create a deployment | `yaml` | - | `cluster`<br>`token` |
DELETE | `admin`<br>`user` | `host`/v3/deployment | delete specific deployment | - | - | `cluster`<br>`token`<br>`name` | 
GET | `admin`<br>`user` | `host`/v3/service | view all services | - | - | `cluster`<br>`token` |  | `cluster` is optional
POST | `admin`<br>`user` | `host`/v3/service | create a service | `yaml` | - | `cluster`<br>`token` |
DELETE | `admin`<br>`user` | `host`/v3/service | delete specific service | - | - | `cluster`<br>`token`<br>`name` | 
GET | `admin`<br>`user` | `host`/v3/ingress | view all ingress(es) | - | - | `cluster`<br>`token` |  | `cluster` is optional
POST | `admin`<br>`user` | `host`/v3/ingress | create an ingress | `yaml` | - | `cluster`<br>`token` |
DELETE | `admin`<br>`user` | `host`/v3/ingress | delete specific ingress | - | - | `cluster`<br>`token`<br>`name` | 

## To get user info
Method | Auth-Level | URL | Description | Payload | Params | Query | Example | Remark
--- | --- | --- | --- | --- | --- | --- | --- | ---
GET | `authed`<br>`admin`<br>`user` | `host`/info | get user infomation | - | - | `token` | - | - |

## A new user asking for permission
Method | Auth-Level | URL | Description | Payload | Params | Query | Remark | Example
--- | --- | --- | --- | --- | --- | --- | --- | ---
GET | `authed`<br>`admin`<br>`user` | `host`/admins | <ul><li>to list all admins</li><li>to let authed-user selecting admin</li></ul> | - | - | `page`<br>`limit`<br>`token` | `page` and `limit` are not required
GET | `authed` | `host`/sendemail | `authed` asks for permission | - | - | `admin`<br>`token` | `admin` must be admin-email selected from `/admins`

* Verification link will be valid for 7 days.


## Admin listing all users and promoting by himself
Method | Auth-Level | URL | Description | Payload | Params | Query | Remark | Example
--- | --- | --- | --- | --- | --- | --- | --- | ---
GET | `admin` | `host`/users | to list all users for maintenance | - | - | `page`<br>`limit`<br>`token` | `page` and `limit` are not required
GET | `admin` | `host`/promoteaccount | promote specific account | - | - | `email`<br>`admin`<br>`token` | `admin` must be boolean in order to set to be admin or not (default is false) and `email` must be user-email
GET | `admin` | `host`/demoteaccount | demote specific account | - | - | `email`<br>`token` | `email` must be user-email

* `admin` could add accounts directly via `/promoteaccount`

## OFTEIN-Plusplus V2 (deprecated)

Method | URL | Description | Payload | Params | Query | Example
--- | --- | --- | --- | --- | --- | ---
GET | `host`/v2/pods | view all pods | - | - | `userid`<br>`cluster` | [/v2/pods?userid=2&cluster=chula](https://ofteinplusapi.main.202.28.193.102.xip.io/v2/pods?userid=2&cluster=chula)
POST | `host`/v2/pods | create a pod | `yaml` | - | `cluster`<br>`userid` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
DELETE | `host`/v2/pods | delete specific pod | - | - | `cluster`<br>`userid`<br>`name` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/v2/deployments | view all deployments | - | - | `userid`<br>`cluster` | [/v2/deployments?userid=2&cluster=chula](https://ofteinplusapi.main.202.28.193.102.xip.io/v2/deployments?userid=2&cluster=chula)
POST | `host`/v2/deployments | create a deployment | `yaml` | - | `cluster`<br>`userid` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
DELETE | `host`/v2/deployments | delete specific deployment | - | - | `cluster`<br>`userid`<br>`name` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)


## OFTEIN-Plusplus V1 (deprecated excludes /clusters)

Method | URL | Description | Payload | Params | Example
--- | --- | --- | --- | --- | ---
GET | `host`/clusters | view all clusters | - | - | [/clusters](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters)
GET | `host`/clusters/`cluster` | view cluster | - | `cluster` | [/clusters/`chula`](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/chula)
GET | `host`/clusters/`cluster`/pods | view all pods | - | `cluster` | [/clusters/`chula`/pods](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/chula/pods)
POST | `host`/clusters/`cluster`/pods | create a pod | `yaml` | `cluster` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/pods/`pod` | view pod | - | `cluster`<br>`pod` | [/clusters/`chula`/pods/`nginx-test`](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/chula/pods/nginx-test)
DELETE | `host`/clusters/`cluster`/pods/`pod` | delete pod | - | `cluster`<br>`pod` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/deployments | view all deployments | - | `cluster` | [/clusters/`chula`/deployments](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/chula/deployments)
POST | `host`/clusters/`cluster`/deployments | create a deployment | `yaml` | `cluster` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/deployments/`deployment` | view deployment | - | `cluster`<br>`deployment` | [/clusters/`chula`/deployments/`nginx-deployment`](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/chula/deployments/nginx-deployments)
DELETE | `host`/clusters/`cluster`/deployments/`deployment` | delete deployment | - | `cluster`<br>`deployment` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)

## Payload, Param, Query explanation
Type | Description | Usecase | Used in
--- | --- | --- | ---
Payload | <ul><li>passing data via "payload"</li><li>used for uploading file</li></ul> | yaml | <ul><li>[POST] /clusters/`cluster`/pods</li><li>[POST] /clusters/`cluster`/deployments</li></ul>
Param | <ul><li>passing data via "URL"</li><li>always required | pod, deployment, cluster</li></ul> | <ul><li>[GET] /clusters </li><li>[GET] /clusters/`cluster`</li><li>[GET] /clusters/`cluster`/pods</li><li>[POST] /clusters/`cluster`/pods</li><li>[GET] /clusters/`cluster`/pods/`pod`</li><li>[DELETE] /clusters/`cluster`/pods/`pod`</li><li>[GET] /clusters/`cluster`/deployments</li><li>[POST] /clusters/`cluster`/deployments</li><li>[GET] /clusters/`cluster`/deployments/`deployment`</li><li>[DELETE] /clusters/`cluster`/deployments/`deployment`</li></ul>
Query | <ul><li>passing data via "URL" for optional parameter</li><li>required some cases</li></ul> | cluster, userid, name| <ul><li>[GET] /v2/pods </li><li>[POST] /v2/pods </li></ul>

## Example Pod Yaml 
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
    - name: nginx
      image: nginx
      ports:
        - containerPort: 80
          hostPort: 30002
      resources:
        limits:
          cpu: 1
          memory: 1Gi
        requests:
          cpu: 0.5
          memory: 0.5Gi
```

## Example Deployment Yaml 
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 1
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
        - name: nginx
          image: nginx:1.14.2
          ports:
            - containerPort: 80
              hostPort: 30003
```
