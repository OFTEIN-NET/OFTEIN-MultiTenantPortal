# OFTEIN-Plusplus

`host`: https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app <br>
`cluster`: `k3os1`, `k3d_c2`, `um`

Method | URL | Description | Payload | Params | Example
--- | --- | --- | --- | --- | ---
GET | `host`/clusters | view all clusters | - | - | [/clusters](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters)
GET | `host`/clusters/`cluster` | view cluster | - | `cluster` | [/clusters/`k3os1`](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3os1)
GET | `host`/clusters/`cluster`/pods | view all pods | - | `cluster` | [/clusters/`k3os1`/pods](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3os1/pods)
POST | `host`/clusters/`cluster`/pods | create a pod | `yaml` | `cluster` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/pods/`pod` | view pod | - | `cluster`<br>`pod` | [/clusters/`k3os1`/pods/`nginx-test`](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3os1/pods/nginx-test)
DELETE | `host`/clusters/`cluster`/pods/`pod` | delete pod | - | `cluster`<br>`pod` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/deployments | view all deployments | - | `cluster` | [/clusters/`k3os1`/deployments](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3os1/deployments)
POST | `host`/clusters/`cluster`/deployments | create a deployment | `yaml` | `cluster` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/deployments/`deployment` | view deployment | - | `cluster`<br>`deployment` | [/clusters/`k3os1`/deployments/`nginx-deployment`](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3os1/deployments/nginx-deployments)
DELETE | `host`/clusters/`cluster`/deployments/`deployment` | delete deployment | - | `cluster`<br>`deployment` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)

## Example Pod Yaml ([Demo](http://45.76.155.138:30002/))
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-test
spec:
  containers:
    - name: nginx
      image: nginx
      ports:
        - containerPort: 80
          hostPort: 30002
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