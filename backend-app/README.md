# OF@TEIN++ Multi-Tenant-Portal Backend App

## Example Deployment in the Cloud

The example deployment is running on the Google Cloud Platform and accessible 
through this following information:

`host`: https://ofteinplusapi.main.202.28.193.102.xip.io/ <br>
`cluster`: `chula`, `gist`, `um`

## OFTEIN-Plusplus V2

Method | URL | Description | Payload | Params | Query | Example
--- | --- | --- | --- | --- | --- | ---
GET | `host`/v2/pods | view all pods | - | - | `userid`<br>`cluster` | [/v2/pods?userid=2&cluster=chula](https://ofteinplusapi.main.202.28.193.102.xip.io/v2/pods?userid=2&cluster=chula)
POST | `host`/v2/pods | create a pod | `yaml` | - | `cluster`<br>`userid` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
DELETE | `host`/v2/pods | delete specific pod | - | - | `cluster`<br>`userid`<br>`name` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)


## OFTEIN-Plusplus V1

Method | URL | Description | Payload | Params | Example
--- | --- | --- | --- | --- | ---
GET | `host`/clusters | view all clusters | - | - | [/clusters](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters)
GET | `host`/clusters/`cluster` | view cluster | - | `cluster` | [/clusters/`chula`](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/k3os1)
GET | `host`/clusters/`cluster`/pods | view all pods | - | `cluster` | [/clusters/`chula`/pods](https://ofteinplusapi.main.202.28.193.102.xip.io/clusters/k3os1/pods)
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
Query | <ul><li>passing data via "URL" for optional parameter</li><li>required some cases</li></ul> | limit, pagecursor <br> cluster, userid| <ul><li>[GET] /v2/pods </li><li>[PUT] /v2/pods </li></ul>

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
