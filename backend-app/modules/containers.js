exports.plugin = {
    name: "containers",
    once: true,
    register: async (server, options) => {

        await server.register(require("../plugins/mysql"));

        const Joi = require('joi');
        const Yaml = require('js-yaml');
        const FS   = require('fs');
        const Boom = require('@hapi/boom');
        let Wreck = require('@hapi/wreck');
        Wreck = Wreck.defaults({ timeout: 3000});

        const k8s = require('@kubernetes/client-node');

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        const createApiNamespace = (yaml, namespace) => {
            const cluster = new k8s.KubeConfig();
            cluster.loadFromFile(yaml);
            const clusterinfo = Yaml.safeLoad(FS.readFileSync(yaml, 'utf8'));
            const url = clusterinfo.clusters[0].cluster.server;
            const k8sAppsApi = cluster.makeApiClient(k8s.AppsV1Api);
            const k8sCoreApi = cluster.makeApiClient(k8s.CoreV1Api);
            return {
                appsapi: k8sAppsApi,
                coreapi: k8sCoreApi,
                namespace: namespace,
                url: url
            }
        };

        // Initialize All API connector

        let clusters = {
            "chula": createApiNamespace('./configs/config_chula.yaml', "chula-ofteinplusplus-fedns"),
            "gist": createApiNamespace('./configs/config_gist.yaml', "gist-ofteinplusplus-fedns"),
            // "gist_demo": createApiNamespace('./configs/config_gist_old.yaml', "default"),
            "um": createApiNamespace('./configs/config_um.yaml', "um-ofteinplusplus-fedns")
        };

        // Define Function
        const getcluster = async (cluster) => {
            let status = "up";
            let running = true;

            await Wreck.get(`${clusters[cluster].url}/livez?verbose`)
                .catch((error) => {
                    if (error.output.statusCode >= 500) {
                        running = false;
                        status = "down";
                    }
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

        // cluster #todo
        const currentstatuscluster = (cluster, dev = false) => clusters[cluster].coreapi
            .listComponentStatus()

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
        // const updatepod = (cluster, pod, yaml, dev = false) => clusters[cluster].coreapi
        //     .patchNamespacedPod(pod, clusters[cluster].namespace, yaml)
        //     .then((res) => prettier_single(res, "Pod", dev));


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

        const upsertinfo = (type, cluster, name, user, yaml) => {
            const sql = `INSERT INTO new_schema.${type}s (cluster, name, user, yaml)
                            VALUES
                              (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              cluster = ?,
                              name = ?,
                              user = ?,
                              yaml = ?`
            return server.app.mysql.query(sql, [cluster, name, user, JSON.stringify(yaml), cluster, name, user, JSON.stringify(yaml)])
        }

        const deleteinfo = (type, cluster, name, user) => {
            const sql = `DELETE FROM new_schema.${type}s WHERE cluster = ? AND name = ? AND user = ?`;
            return server.app.mysql.query(sql, [cluster, name, user])
        }

        const getinfo = (type, cluster, name, user) => {
            const sql = `SELECT * FROM new_schema.${type}s WHERE cluster = ? AND name = ? AND user = ?`;
            return server.app.mysql.query(sql, [cluster, name, user])
        }

        const getallinfobyuser = (type, user, cluster) => {
            let sql = `SELECT * FROM new_schema.${type}s WHERE`;
            if (cluster == null) sql += ` user = ?`;
            else sql += ` user = ? AND cluster = ?`;
            return server.app.mysql.query(sql, [user, cluster])
        }

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
                    return listclusters().catch((error) => {
                        console.log(error)
                        return "Error"
                    })
                }
            },
            {
                path: "/v2/deployments",
                method: "DELETE",
                options: {
                    validate: {
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            userid: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters)).required(),
                            name: Joi.string().required()
                        })
                    }
                },
                handler: async (request, h) => {
                    try {
                        return getinfo("deployment", request.query.cluster, request.query.name, request.query.userid)
                            .then(async (result) => {
                                await Promise.all(result.map(async (deployment) => {
                                    const res = await server.inject({
                                        method: "DELETE",
                                        url: `/clusters/${deployment.cluster}/deployments/${deployment.name}`
                                    });
                                    await deleteinfo("deployment", deployment.cluster, deployment.name, deployment.user);
                                    deployment.status = res.result;
                                }));
                                return result
                            })
                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v2/deployments",
                method: "GET",
                options: {
                    validate: {
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            userid: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        })
                    }
                },
                handler: async (request, h) => {
                    try {
                        return getallinfobyuser("deployment", request.query.userid, request.query.cluster)
                            .then(async (result) => {
                                await Promise.all(result.map(async (deployment) => {
                                    delete deployment.yaml;
                                    const res = await server.inject({
                                        method: "GET",
                                        url: `/clusters/${deployment.cluster}/deployments/${deployment.name}`
                                    });
                                    deployment.status = res.result;
                                }));
                                return result
                            })
                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v2/deployments",
                method: "POST",
                options: {
                    payload: {
                        maxBytes: 1024 * 1024 * 1,
                        multipart: {output: "file"},
                        parse: true
                    },
                    validate: {
                        payload: Joi.object({
                            yaml: Joi.any().meta({ swaggerType: "file" }).required()
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            userid: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        })
                    }
                },
                handler: async (request, h) => {
                    try {
                        let res = await server.inject({
                            method: "POST",
                            url: `/clusters/${request.query.cluster}/deployments`,
                            payload: request.payload
                        });

                        if (res.statusCode == "200") {
                            const yaml = Yaml.safeLoad(FS.readFileSync(request.payload.yaml.path, 'utf8'));
                            const deployment = {
                                cluster: request.query.cluster,
                                user: request.query.userid,
                                yaml: yaml,
                                name: yaml.metadata.name,
                                created: new Date()
                            }
                            await upsertinfo("deployment", deployment.cluster, deployment.name, deployment.user, deployment.yaml);
                        }

                        return res.result
                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v2/pods",
                method: "DELETE",
                options: {
                    validate: {
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            userid: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters)).required(),
                            name: Joi.string().required()
                        })
                    }
                },
                handler: async (request, h) => {
                    try {
                        return getinfo("pod", request.query.cluster, request.query.name, request.query.userid)
                            .then(async (result) => {
                                await Promise.all(result.map(async (pod) => {
                                    const res = await server.inject({
                                        method: "DELETE",
                                        url: `/clusters/${pod.cluster}/pods/${pod.name}`
                                    });
                                    await deleteinfo("pod", pod.cluster, pod.name, pod.user);
                                    pod.status = res.result;
                                }));
                                return result
                            })
                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v2/pods",
                method: "GET",
                options: {
                    validate: {
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            userid: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        })
                    }
                },
                handler: async (request, h) => {
                    try {
                        return getallinfobyuser("pod", request.query.userid, request.query.cluster)
                            .then(async (result) => {
                                await Promise.all(result.map(async (pod) => {
                                    delete pod.yaml;
                                    const res = await server.inject({
                                        method: "GET",
                                        url: `/clusters/${pod.cluster}/pods/${pod.name}`
                                    });
                                    pod.status = res.result;
                                }));
                                return result
                            })
                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v2/pods",
                method: "POST",
                options: {
                    payload: {
                        maxBytes: 1024 * 1024 * 1,
                        multipart: {output: "file"},
                        parse: true
                    },
                    validate: {
                        payload: Joi.object({
                            yaml: Joi.any().meta({ swaggerType: "file" }).required()
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            userid: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        })
                    }
                },
                handler: async (request, h) => {
                    try {
                        let res = await server.inject({
                            method: "POST",
                            url: `/clusters/${request.query.cluster}/pods`,
                            payload: request.payload
                        });

                        if (res.statusCode == "200") {
                            const yaml = Yaml.safeLoad(FS.readFileSync(request.payload.yaml.path, 'utf8'));
                            const pod = {
                                cluster: request.query.cluster,
                                user: request.query.userid,
                                yaml: yaml,
                                name: yaml.metadata.name,
                                created: new Date()
                            }
                            await upsertinfo("pod", pod.cluster, pod.name, pod.user, pod.yaml);
                        }

                        return res.result
                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

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
            // {
            //     path: "/clusters/{cluster}/pods/{name}",
            //     method: "PATCH",
            //     options: {
            //         payload: {
            //             maxBytes: 1024 * 1024 * 1,
            //             multipart: {output: "file"},
            //             parse: true
            //         },
            //         validate: {
            //             payload: Joi.object({
            //                 yaml: Joi.any().meta({ swaggerType: "file" })
            //             }),
            //             params: Joi.object({
            //                 cluster: Joi.string().valid(...Object.keys(clusters)),
            //                 name: Joi.string().required()
            //             }),
            //             query: Joi.object({
            //                 dev: Joi.boolean().default(false)
            //             })
            //         }
            //     },
            //     handler: async (request, h) => {
            //
            //         const yamlfile = Yaml.safeLoad(FS.readFileSync(request.payload.yaml.path, 'utf8'));
            //         return updatepod(request.params.cluster, request.params.name, yamlfile, request.query.dev)
            //             .catch((error) => handlek8serror(error));
            //     }
            // },
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
                    // console.log(request.params)
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
                    // console.log(yamlfile)
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


        server.route([

        ])

    }


}
