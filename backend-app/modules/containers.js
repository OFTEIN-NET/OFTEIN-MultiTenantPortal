exports.plugin = {
    name: "containers",
    once: true,
    register: async (server, options) => {

        const Joi = require('joi');
        const Yaml = require('js-yaml');
        const FS   = require('fs');
        const Boom = require('@hapi/boom');

        const k8s = require('@kubernetes/client-node');

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        const createApiNamespace = (yaml, namespace) => {
            const cluster = new k8s.KubeConfig();
            cluster.loadFromFile(yaml);
            const k8sAppsApi = cluster.makeApiClient(k8s.AppsV1Api);
            const k8sCoreApi = cluster.makeApiClient(k8s.CoreV1Api);
            return {
                appsapi: k8sAppsApi,
                coreapi: k8sCoreApi,
                namespace: namespace
            }
        };

        // Initialize All API connector

        let clusters = {
            "chula": createApiNamespace('./configs/config_chula.yaml', "chula-ofteinplusplus-fedns"),
            "gist": createApiNamespace('./configs/config_gist.yaml', "default"),
            "um": createApiNamespace('./configs/config_um.yaml', "um-ofteinplusplus-fedns")
        };

        // Define Function
        const getcluster = async (cluster) => {
            let status = "down";
            let running = false;
            await listpod(cluster).then(() => {
                running = true;
                status = "up";
            }).catch((error) => {
                running = false;
                status = "down";
                console.log(error)
                if (error.response) status = error.response.statusMessage;
            });
            return {
                cluster: cluster,
                namespace: clusters[cluster].namespace,
                status: status,
                running: running
            }
        };

        const listclusters = (dev = false) => {
            return Promise.resolve().then(() => {
                return Promise.all(Object.keys(clusters).map((cluster) => getcluster(cluster)));
            })
        };

        // Prettier
        const prettier_single = (res, kind, dev = false) => {
            if (dev) return res;
            const item = res.body ? res.body : res;
            return {
                kind: item.kind || kind,
                name: item.metadata.name,
                namespace: item.metadata.namespace,
                creationTimestamp: item.metadata.creationTimestamp,
                spec: item.spec,
                status: item.status
            }
        };

        const prettier = (res, dev=false) => {
            if (dev) return res;
            let items = [];
            let kind;
            switch (res.body.kind) {
                case "PodList":
                    kind = "Pod";
                    break;
                case "DeploymentList":
                    kind = "Deployment";
                    break;
                default:
                    kind = res.body.kind;
                    break;
            }
            res.response.body.items.map((item) => items.push(prettier_single(item, kind)));
            return items;
        };

        // error handling
        const handlek8serror = (error) => {
            console.log(error);
            if (error.response) return new Boom.Boom(error.response.body.message, {
                statusCode: error.response.statusCode
            })
            else return new Boom.badImplementation();
        };

        // pod
        const createpod = (cluster, yaml, dev = false) => clusters[cluster].coreapi
            .createNamespacedPod(clusters[cluster].namespace, yaml)
            .then((res) => prettier_single(res, "Pod", dev));
        const listpod = (cluster, dev = false) => clusters[cluster].coreapi
            .listNamespacedPod(clusters[cluster].namespace)
            .then((res) => prettier(res, dev));
        const getpod = (cluster, pod, dev = false) => clusters[cluster].coreapi
            .readNamespacedPod(pod, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Pod", dev));
        const deletepod = (cluster, pod, dev = false) => clusters[cluster].coreapi
            .deleteNamespacedPod(pod, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Pod", dev));

        // deployment

        const createdeployment = (cluster, yaml, dev = false) => clusters[cluster].appsapi
            .createNamespacedDeployment(clusters[cluster].namespace, yaml)
            .then((res) => prettier_single(res, "Deployment", dev));
        const listdeployment = (cluster, dev = false) => clusters[cluster].appsapi
            .listNamespacedDeployment(clusters[cluster].namespace)
            .then((res) => prettier(res, dev));
        const getdeployment = (cluster, deployment, dev = false) => clusters[cluster].appsapi
            .readNamespacedDeployment(deployment, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Deployment", dev));
        const deletedeployment = (cluster, pod, dev = false) => clusters[cluster].appsapi
            .deleteNamespacedDeployment(pod, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Deployment", dev));


        server.route([

            {
                path: "/test/yaml",
                method: "POST",
                options: {
                    payload: {
                        maxBytes: 1024 * 1024 * 1,
                        multipart: {output: "file"},
                        parse: true
                    },
                    validate: {
                        payload: Joi.object({
                            yaml: Joi.any().meta({ swaggerType: "file" })
                        })
                    }
                },
                handler: async (request, h) => {
                    const yamlfile = Yaml.safeLoad(FS.readFileSync(request.payload.yaml.path, 'utf8'));
                    return yamlfile;
                }
            },
            {
                path: "/clusters",
                method: "GET",
                handler: async (request, h) => {
                    return listclusters().catch((error) => "Error")
                }
            },
            {
                path: "/clusters/{cluster}",
                method: "GET",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        })
                    }
                },
                handler: async (request, h) => {
                    return getcluster(request.params.cluster)
                }
            },
            {
                path: "/clusters/{cluster}/pods",
                method: "POST",
                options: {
                    payload: {
                        maxBytes: 1024 * 1024 * 1,
                        multipart: {output: "file"},
                        parse: true
                    },
                    validate: {
                        payload: Joi.object({
                            yaml: Joi.any().meta({ swaggerType: "file" })
                        }),
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => {
                    console.log("OK")
                    const yamlfile = Yaml.safeLoad(FS.readFileSync(request.payload.yaml.path, 'utf8'));

                    return createpod(request.params.cluster, yamlfile, request.query.dev)
                        .catch((error) => handlek8serror(error))
                }
            },
            {
                path: "/clusters/{cluster}/pods/{pod}",
                method: "DELETE",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters)),
                            pod: Joi.string().required()
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => {
                    console.log(request.params)
                    return deletepod(request.params.cluster, request.params.pod, request.query.dev)
                        .catch((error) => handlek8serror(error))
                }
            },
            {
                path: "/clusters/{cluster}/pods",
                method: "GET",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => listpod(request.params.cluster, request.query.dev)
                    .catch((error) => handlek8serror(error))

            },
            {
                path: "/clusters/{cluster}/deployments",
                method: "GET",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => listdeployment(request.params.cluster, request.query.dev)
                    .catch((error) => handlek8serror(error))

            },
            {
                path: "/clusters/{cluster}/deployments",
                method: "POST",
                options: {
                    payload: {
                        maxBytes: 1024 * 1024 * 1,
                        multipart: {output: "file"},
                        parse: true
                    },
                    validate: {
                        payload: Joi.object({
                            yaml: Joi.any().meta({ swaggerType: "file" })
                        }),
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => {
                    const yamlfile = Yaml.safeLoad(FS.readFileSync(request.payload.yaml.path, 'utf8'));
                    console.log(yamlfile)
                    return createdeployment(request.params.cluster, yamlfile, request.query.dev)
                        .catch((error) => handlek8serror(error))
                }
            },
            {
                path: "/clusters/{cluster}/deployments/{deployment}",
                method: "DELETE",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters)),
                            deployment: Joi.string().required()
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => {
                    return deletedeployment(request.params.cluster, request.params.deployment, request.query.dev)
                        .catch((error) => handlek8serror(error))
                }
            },
            {
                path: "/clusters/{cluster}/deployments/{deployment}",
                method: "GET",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters)),
                            deployment: Joi.string().required()
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => getdeployment(request.params.cluster, request.params.deployment, request.query.dev)
                    .catch((error) => handlek8serror(error))
            },
            {
                path: "/clusters/{cluster}/pods/{pod}",
                method: "GET",
                options: {
                    validate: {
                        params: Joi.object({
                            cluster: Joi.string().valid(...Object.keys(clusters)),
                            pod: Joi.string().required()
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false)
                        })
                    }
                },
                handler: async (request, h) => getpod(request.params.cluster, request.params.pod, request.query.dev)
                    .catch((error) => handlek8serror(error))
            },

        ]);
    }


}

