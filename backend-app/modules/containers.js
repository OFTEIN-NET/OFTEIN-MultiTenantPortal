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
        const timeout = 5000;
        Wreck = Wreck.defaults({ timeout: timeout});

        const k8s = require('@kubernetes/client-node');

        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

        const createApiNamespace = (yaml, namespace) => {
            const cluster = new k8s.KubeConfig();
            cluster.loadFromFile(yaml);
            const clusterinfo = Yaml.safeLoad(FS.readFileSync(yaml, 'utf8'));
            const url = clusterinfo.clusters[0].cluster.server;
            const k8sAppsApi = cluster.makeApiClient(k8s.AppsV1Api);
            const k8sCoreApi = cluster.makeApiClient(k8s.CoreV1Api);
            const k8sNetworkingApi = cluster.makeApiClient(k8s.NetworkingV1beta1Api);
            return {
                appsapi: k8sAppsApi,
                coreapi: k8sCoreApi,
                networkingapi: k8sNetworkingApi,
                namespace: namespace,
                url: url
            }
        };

        // Initialize All API connector

        let clusters = {
            "chula": createApiNamespace('./configs/config_chula.yaml', "chula-ofteinplusplus-fedns"),
            "gist": createApiNamespace('./configs/config_gist.yaml', "gist-ofteinplusplus-fedns"),
            "um": createApiNamespace('./configs/config_um.yaml', "um-ofteinplusplus-fedns"),
            // "demo": createApiNamespace('./configs/config_demo.yaml', "default")
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

        const getresource = async (cluster) => {

            let resource = {
                node: 0,
                capacity: {
                    "cpu": 0, "memory": 0
                },
                allocatable: {
                    "cpu": 0, "memory": 0
                }
            }

            await listnode(cluster)
                .then((response) => {

                    response.response.body.items.map((node) => {
                        resource.node++;
                        resource.capacity.cpu+= parseValue(node.status.capacity.cpu);
                        resource.capacity.memory+= parseValue(node.status.capacity.memory);
                        resource.allocatable.cpu+= parseValue(node.status.allocatable.cpu);
                        resource.allocatable.memory+= parseValue(node.status.allocatable.memory);
                    })
                    // resource = response
                }).catch((error) => {
                    console.log(error)
                })

            return resource;
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
                case "ServiceList":
                    kind = "Service";
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
            // console.log(error);
            if (error.response) return new Boom.Boom(error.response.body.message, {
                statusCode: error.response.statusCode
            })
            else return new Boom.badImplementation();
        };

        // cluster #todo
        const currentstatuscluster = (cluster, dev = false) => clusters[cluster].coreapi
            .listComponentStatus()
        const currentresourcecluster = (cluster, dev = false) => clusters[cluster].coreapi
            .listNamespacedResourceQuota(clusters[cluster].namespace)
        const listnode = (cluster, dev = false) => clusters[cluster].coreapi
            .listNode()
        const getnode = (cluster, node, dev = false) => clusters[cluster].coreapi
            .readNode(node)
        const getapp = (cluster, dev = false) => clusters[cluster].coreapi
            .listPodForAllNamespaces()
        const listnamespacedResourceQuota = (cluster, dev = false) => clusters[cluster].coreapi
            .listNamespacedResourceQuota()

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

        //ingress
        const createingress = (cluster, yaml, dev = false) => clusters[cluster].networkingapi
            .createNamespacedIngress(clusters[cluster].namespace, yaml)
            .then((res) => prettier_single(res, "Ingress", dev));
        const listingress = (cluster, dev = false) => clusters[cluster].networkingapi
            .listNamespacedIngress(clusters[cluster].namespace)
            .then((res) => prettier(res, dev));
        const getingress = (cluster, service, dev = false) => clusters[cluster].networkingapi
            .readNamespacedIngress(service, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Ingress", dev));
        const deleteingress = (cluster, service, dev = false) => clusters[cluster].networkingapi
            .deleteNamespacedIngress(service, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Ingress", dev));

        //service
        const createservice = (cluster, yaml, dev = false) => clusters[cluster].coreapi
            .createNamespacedService(clusters[cluster].namespace, yaml)
            .then((res) => prettier_single(res, "Service", dev));
        const listservice = (cluster, dev = false) => clusters[cluster].coreapi
            .listNamespacedService(clusters[cluster].namespace)
            .then((res) => prettier(res, dev));
        const getservice = (cluster, service, dev = false) => clusters[cluster].coreapi
            .readNamespacedService(service, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Service", dev));
        const deleteservice = (cluster, service, dev = false) => clusters[cluster].coreapi
            .deleteNamespacedService(service, clusters[cluster].namespace)
            .then((res) => prettier_single(res, "Service", dev));

        const upsertuserinfo = (user, role, admin, email) => {
            const sql = `INSERT INTO new_schema.users (user, role, admin, email)
                            VALUES
                              (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              user = ?,
                              role = ?,
                              admin = ?,
                              email = ?`
            return server.app.mysql.query(sql, [user, role, admin, email, user, role, admin, email])
        }

        const upsertinfo = (type, cluster, name, email, yaml) => {
            const sql = `INSERT INTO new_schema.${type}s (cluster, name, email, yaml)
                            VALUES
                              (?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              cluster = ?,
                              name = ?,
                              email = ?,
                              yaml = ?`
            return server.app.mysql.query(sql, [cluster, name, email, JSON.stringify(yaml), cluster, name, email, JSON.stringify(yaml)])
        }

        const deleteinfo = (type, cluster, name, email) => {
            const sql = `DELETE FROM new_schema.${type}s WHERE cluster = ? AND name = ? AND email = ?`;
            return server.app.mysql.query(sql, [cluster, name, email])
        }

        const getinfo = (type, cluster, name, email) => {
            const sql = `SELECT * FROM new_schema.${type}s WHERE cluster = ? AND name = ? AND email = ?`;
            return server.app.mysql.query(sql, [cluster, name, email])
        }

        const getallinfobyuser = (type, email, cluster) => {
            let sql = `SELECT * FROM new_schema.${type}s WHERE`;
            if (cluster == null) sql += ` email = ?`;
            else sql += ` email = ? AND cluster = ?`;
            return server.app.mysql.query(sql, [email, cluster])
        }

        const getinfouser = (email) => {
            const sql = `SELECT * FROM new_schema.users WHERE email = ?`;
            return server.app.mysql.query(sql, [email])
        }

        const parseValue = (val) => {
            if (typeof val != "string") return parseFloat(val);
            if (val.indexOf("Gi") != -1) return parseFloat(val)*1024*1024;
            else if (val.indexOf("G") != -1) return parseFloat(val)*1000*1000;
            else if (val.indexOf("Mi") != -1) return parseFloat(val)*1024;
            else if (val.indexOf("M") != -1) return parseFloat(val)*1000;
            else if (val.indexOf("mi") != -1) return parseFloat(val)/1024;
            else if (val.indexOf("m") != -1) return parseFloat(val)/1000;
            else return parseFloat(val);
        }

        const getresourcestatus = async () => {
            const resourceallclusterstatus = await Promise.all(Object.keys(clusters).map(async (cluster) => {
                return new Promise((resolve) => {
                    setTimeout(function() {
                        resolve({
                            limit: null, // unknown
                            cluster: cluster,
                            timeout: true
                        });
                    }, timeout);
                    currentresourcecluster(cluster)
                        .then((res) => {
                            if (res.response.body.items.length > 0) {
                                res.response.body.items[0].status["limit"] = true;
                                res.response.body.items[0].status["cluster"] = cluster;
                                res.response.body.items[0].status["timeout"] = false;
                                if (res.response.body.items[0].status["hard"]) {
                                    const cpulimit = parseValue(res.response.body.items[0].status["hard"]["limits.cpu"])
                                    res.response.body.items[0].status["hard"]["limits.cpu"] = cpulimit;
                                    const memlimit = parseValue(res.response.body.items[0].status["hard"]["limits.memory"])
                                    res.response.body.items[0].status["hard"]["limits.memory"] = memlimit;
                                }
                                if (res.response.body.items[0].status["used"]) {
                                    const cpulimit = parseValue(res.response.body.items[0].status["used"]["limits.cpu"])
                                    res.response.body.items[0].status["used"]["limits.cpu"] = cpulimit;
                                    const memlimit = parseValue(res.response.body.items[0].status["used"]["limits.memory"])
                                    res.response.body.items[0].status["used"]["limits.memory"] = memlimit;
                                }
                                resolve(res.response.body.items[0].status)
                            } else {
                                resolve({
                                    limit: false,
                                    cluster: cluster,
                                    timeout: false
                                }) // Unlimited
                            }
                        })
                        .catch(() => resolve({
                            limit: null, // unknown
                            cluster: cluster,
                            timeout: true
                        }))
                });
            }));

            return resourceallclusterstatus;
        }

        const extractcpumemfromyaml = (yamlfile) => {
            let cpu = 0;
            let mem = 0;

            let containers = [];

            // Pod definition
            if ("spec" in yamlfile && "containers" in yamlfile.spec) yamlfile.spec.containers.map((container) => containers.push(container));

            // Deployment definition
            if ("spec" in yamlfile &&
                "template" in yamlfile.spec &&
                "spec" in yamlfile.spec.template &&
                "containers" in yamlfile.spec.template.spec
            ) yamlfile.spec.template.spec.containers.map((container) => containers.push(container));

            containers.map((container) => {
                if ("resources" in container) {
                    if ("limits" in container.resources) {
                        cpu += parseValue(container.resources.limits.cpu);
                        mem += parseValue(container.resources.limits.memory);
                    } else if ("requests" in container.resources) {
                        cpu += parseValue(container.resources.requests.cpu);
                        mem += parseValue(container.resources.requests.memory);
                    }
                }
            });

            return {cpu, mem}
        };

        const shuffleArray = (array) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        const getfeasiblecluster = async (spec, leftmost = false) => {

            let cpu = spec.cpu;
            let mem = spec.mem;

            const currentstatus = await getresourcestatus();
            shuffleArray(currentstatus);

            let feasiblecluster = [];

            for(const cluster of currentstatus) {
                if(!cluster.timeout) {

                    cluster.score = 0;

                    if (cluster.limit) {
                        const maxcpu = cluster.hard["limits.cpu"];
                        const maxmem = cluster.hard["limits.memory"];
                        const usedcpu = cluster.used["limits.cpu"];
                        const usedmem = cluster.used["limits.memory"];

                        // Able to create
                        if (maxcpu - usedcpu >= cpu) cluster.score += 10;
                        if (maxmem - usedmem >= mem) cluster.score += 10;

                        if (leftmost &&
                            ((maxcpu - usedcpu >= cpu) && (maxmem - usedmem >= mem))
                        ) {
                            cluster.score += (maxcpu - usedcpu);
                            cluster.score += (maxmem - usedmem)/(1024*1024);
                        }

                    } else {

                        // No limit
                        cluster.score += 20;

                        if (leftmost) {
                            cluster.score += (maxcpu - usedcpu);
                            cluster.score += (maxmem - usedmem)/(1024*1024);
                        }
                    }

                    feasiblecluster.push(cluster);
                }
            }

            feasiblecluster.sort((a, b) => b.score - a.score);

            return feasiblecluster;
        }

        server.route([
            {
                path: "/getfeasiblecluster",
                options: {
                    auth: false,
                    validate: {
                        query: Joi.object({
                            cpu: Joi.number().min(0).required(),
                            mem: Joi.number().min(0).required(),
                            leftmost: Joi.boolean().default(false)
                        })
                    }
                },
                method: "GET",
                handler: async (request, h) => {
                    const spec = {
                        cpu: request.query.cpu,
                        mem: request.query.mem
                    }
                    return getfeasiblecluster(spec, request.query.leftmost);
                }
            },
            {
                path: "/getresource",
                options: {
                    auth: false
                },
                method: "GET",
                handler: (request, h) => getresourcestatus()
            },
            {
                path: "/getresource/{cluster}",
                options: {
                    auth: false
                },
                method: "GET",
                handler: (request, h) => getresource(request.params.cluster)
            },
            {
                path: "/info",
                method: "GET",
                options: {
                    auth: 'simplejwt',
                },
                handler: async (request, h) => {
                    const sql = `SELECT * FROM new_schema.users WHERE email = ?`;
                    const email = request.auth.credentials.email;
                    const user = await server.app.mysql.query(sql, [email]);
                    return user[0];
                }
            },
            {
                path: "/admins",
                method: "GET",
                options: {
                    validate: {
                        query: Joi.object({
                            limit: Joi.number().min(0).max(10).default(10),
                            page: Joi.number().min(1).default(1)
                        })
                    },
                    auth: 'simplejwt',
                },
                handler: async (request, h) => {
                    const limit = request.query.limit;
                    const page = request.query.page;
                    let sql = 'SELECT * FROM new_schema.users WHERE role = \'admin\'';
                    sql += ` LIMIT ${limit} OFFSET ${(page - 1) * limit};`;
                    let res = await server.app.mysql.query(sql);
                    return res;
                }
            },
            {
                path: "/users",
                method: "GET",
                options: {
                    validate: {
                        query: Joi.object({
                            limit: Joi.number().min(0).max(10).default(10),
                            page: Joi.number().min(1).default(1)
                        })
                    },
                    auth: 'adminonly'
                },
                handler: async (request, h) => {
                    const limit = request.query.limit;
                    const page = request.query.page;
                    let sql = 'SELECT * FROM new_schema.users';
                    sql += ` LIMIT ${limit} OFFSET ${(page - 1) * limit};`;
                    let res = await server.app.mysql.query(sql);
                    return res;
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
                path: "/v3/{type}",
                method: "GET",
                options: {
                    validate: {
                        params: Joi.object({
                            type: Joi.string().valid("deployment", "pod", "service", "ingress")
                        }),
                        query: Joi.object({
                            dev: Joi.boolean().default(false),
                            token: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters))
                        })
                    }
                },
                handler: async (request, h) => {
                    try {

                        const type = request.params.type;
                        const email = request.auth.credentials.email;
                        const cluster = request.query.cluster;

                        let querydata = await getallinfobyuser(type, email, cluster);

                        await Promise.all(
                            querydata.map(async (data) => {
                                delete data.yaml;
                                const name = data.name;
                                const cluster = data.cluster;
                                switch (type) {
                                    case "pod":
                                        data.status = await new Promise((resolve) => {
                                            setTimeout(function() {
                                                resolve("Error: Timeout");
                                            }, timeout);
                                            getpod(cluster, name)
                                                .catch((error) => {
                                                    handlek8serror(error)
                                                    return "Error: "+error.statusCode
                                                })
                                                .then((res) => resolve(res))
                                        })
                                        break;
                                    case "deployment":
                                        data.status = await new Promise((resolve) => {
                                            setTimeout(function() {
                                                resolve("Error: Timeout");
                                            }, timeout);
                                            getdeployment(cluster, name)
                                                .catch((error) => {
                                                    handlek8serror(error)
                                                    return "Error: "+error.statusCode
                                                })
                                                .then((res) => resolve(res))
                                        })
                                        break;
                                    case "service":
                                        data.status = await new Promise((resolve) => {
                                            setTimeout(function() {
                                                resolve("Error: Timeout");
                                            }, timeout);
                                            getservice(cluster, name)
                                                .catch((error) => {
                                                    handlek8serror(error)
                                                    return "Error: "+error.statusCode
                                                })
                                                .then((res) => resolve(res))
                                        });
                                        break;
                                    case "ingress":
                                        data.status = await new Promise((resolve) => {
                                            setTimeout(function() {
                                                resolve("Error: Timeout");
                                            }, timeout);
                                            getingress(cluster, name)
                                                .catch((error) => {
                                                    handlek8serror(error)
                                                    return "Error: "+error.statusCode
                                                })
                                                .then((res) => resolve(res))
                                        });
                                        break;
                                }
                            })
                        );

                        return querydata;

                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v3/{type}",
                method: "POST",
                options: {
                    validate: {
                        payload: Joi.object({
                            yaml: Joi.any().meta({ swaggerType: "file" }).required()
                        }),
                        params: Joi.object({
                            type: Joi.string().valid("deployment", "pod", "service", "ingress")
                        }),
                        query: Joi.object({
                            token: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters), "optimal"),
                            leftmost: Joi.boolean().default(false)
                        })
                    },
                    payload: {
                        maxBytes: 1024 * 1024 * 1,
                        multipart: {output: "file"},
                        parse: true
                    }
                },
                handler: async (request, h) => {
                    try {

                        const type = request.params.type;
                        const email = request.auth.credentials.email;

                        const yaml = request.payload.yaml;

                        const yamlfile = Yaml.safeLoad(FS.readFileSync(yaml.path, 'utf8'));
                        const name = yamlfile.metadata.name;

                        if (request.query.cluster == "optimal") delete request.query.cluster;

                        let cluster;

                        if (request.query.cluster) {
                            cluster = request.query.cluster;
                        } else {
                            const feasiblecluster = await getfeasiblecluster(extractcpumemfromyaml(yamlfile), request.query.leftmost);
                            if (feasiblecluster.length == 0) return Boom.badRequest("No possible cluster, all clusters might be down.")
                            cluster = feasiblecluster[0].cluster;
                        };

                        let res;

                        switch (type) {
                            case "pod":
                                res = createpod(cluster, yamlfile);
                                break;
                            case "deployment":
                                res = createdeployment(cluster, yamlfile);
                                break;
                            case "service":
                                res = createservice(cluster, yamlfile);
                                break;
                            case "ingress":
                                res = createingress(cluster, yamlfile);
                                break;
                        }

                        return await new Promise((resolve, reject) => {
                            setTimeout(function() {
                                reject(Boom.clientTimeout(cluster));
                            }, timeout);
                            res
                                .then(async (res) => {
                                    await upsertinfo(type, cluster, name, email, yamlfile);
                                    return res
                                })
                                .catch((error) => reject(handlek8serror(error)))
                                .then((res) => resolve(res));
                        }).catch((error) => error);

                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
            {
                path: "/v3/{type}",
                method: "DELETE",
                options: {
                    validate: {
                        params: Joi.object({
                            type: Joi.string().valid("deployment", "pod", "service", "ingress")
                        }),
                        query: Joi.object({
                            token: Joi.string().required(),
                            cluster: Joi.string().valid(...Object.keys(clusters)).required(),
                            name: Joi.string().required()
                        })
                    }
                },
                handler: async (request, h) => {
                    try {

                        const type = request.params.type;
                        const email = request.auth.credentials.email;
                        const cluster = request.query.cluster;
                        const name = request.query.name;

                        let res;

                        switch (type) {
                            case "pod":
                                res = deletepod(cluster, name);
                                break;
                            case "deployment":
                                res = deletedeployment(cluster, name);
                                break;
                            case "service":
                                res = deleteservice(cluster, name);
                                break;
                            case "ingress":
                                res = deleteingress(cluster, name);
                                break;
                        }

                        return await new Promise((resolve, reject) => {
                            setTimeout(function() {
                                reject(Boom.clientTimeout(cluster));
                            }, timeout);
                            res
                                .then(async (res) => {
                                    await deleteinfo(type, cluster, name, email);
                                    return res
                                })
                                .catch((error) => reject(handlek8serror(error)))
                                .then((res) => resolve(res));
                        }).catch((error) => error)

                    } catch (err) {
                        // console.log(err)
                        return err.message;
                    }

                }
            },
        ]);


    }


}
