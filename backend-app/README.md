# OFTEIN-Plusplus

`host`: https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters <br>
`cluster`: `k3d_c1`, `k3d_c2`, `um`



Method | URL | Description | Payload | Params | Example
--- | --- | --- | --- | --- | ---
GET | `host`/clusters | View all clusters, check all cluster status | | | [/clusters](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters)
GET | `host`/clusters/`cluster` | View cluster from cluster name, check cluster status | | `cluster` | [/clusters/`k3d_c1`](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3d_c1)
GET | `host`/clusters/`cluster`/pods | View all pods from cluster name | | `cluster` | [/clusters/`k3d_c1`/pods](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3d_c1/pods)
POST | `host`/clusters/`cluster`/pods | Create a pod from cluster name and yaml| `yaml` | `cluster` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/pods/`pod` | View pod from cluster name and pod name | | `cluster`<br>`pod` | [/clusters/`k3d_c1`/pods/`nginx-test`](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3d_c1/pods/nginx-test)
DELETE | `host`/clusters/`cluster`/pods/`pod` | Delete pod from cluster name and pod name | | `cluster`<br>`pod` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/deployments | View all deployments from cluster name | | `cluster` | [/clusters/`k3d_c1`/deployments](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3d_c1/deployments)
POST | `host`/clusters/`cluster`/deployments | Create a deployment from cluster name and yaml| `yaml` | `cluster` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)
GET | `host`/clusters/`cluster`/deployments/`deployment` | View deployment from cluster name and deployment name | | `cluster`<br>`deployment` | [/clusters/`k3d_c1`/deployments/`nginx-deployment`](https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters/k3d_c1/deployments/nginx-deployments)
DELETE | `host`/clusters/`cluster`/deployments/`deployment` | Delete deployment from cluster name and deployment name | | `cluster`<br>`deployment` | [Postman](https://www.getpostman.com/collections/5772c6fec899640b516f)

