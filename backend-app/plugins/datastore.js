exports.plugin = {
    name: "datastore",
    once: true,
    register: async (server, options) => {

        await server.register(require("../plugins/encrypt"));

        const encrypt = server.app.encrypt;
        const decrypt = server.app.decrypt;

        const {Datastore} = require('@google-cloud/datastore');
        const DatastoreAdmin = new Datastore({
            keyFile: __dirname+'/../configs/serviceAccount.json'
        })

        server.app.indexes = {
            "user": ["created", "certificate", "updated"]
        };

        server.app.datastore = class datastore {

            constructor(data, kind, id, parent='', excludeFromIndexes=null, indexes=null) {
                this.data = data;
                this.kind = kind;
                this.id = id;
                this.parent = parent;
                this.excludeFromIndexes = excludeFromIndexes;
                this.indexes = indexes;
                return this;
            }

            static initFromID = (parentAndKind, id) => {
                const element = datastore.parentAndKind(parentAndKind)
                return new datastore({}, element.kind, id, element.parent)
            }

            static initFromPath = (path) => {
                const element = datastore.path(path);
                return new datastore({}, element.kind, id, element.parent)
            }

            static initFromNewData = (data, parentAndKind, id, indexes) => {
                const element = datastore.parentAndKind(parentAndKind);
                return new datastore(data, element.kind, id, element.parent, null, indexes)
            }

            static initFromNewDataAndPath = (data, path) => {
                const element = datastore.path(path);
                return new datastore(data, element.kind, element.id, element.parent);
            }

            static initFromEntity = (entity) => {
                const KEY = entity[DatastoreAdmin.KEY];
                return datastore.initFromNewDataAndPath(entity, KEY.path.join('/'));
            }

            getPath = () => {
                return DatastoreAdmin.key(this.parent.concat([this.kind, this.id]));
            }

            static parentAndKind = (parentAndKind) => {
                let elements = parentAndKind.split('/');
                return {
                    kind: elements.pop(),
                    parent: elements
                }
            }

            /// Use in initFromPath, initFromNewDataAndPath
            static path = (path) => {
                let elements = path.split('/')
                return {
                    id: elements.pop(),
                    kind: elements.pop(),
                    parent: elements
                }
            }

            static runQuery = (query) => {
                return DatastoreAdmin.runQuery(query)
                    .then((result) => {
                        const entities = result[0];
                        const info = result[1];
                        const output = entities.map((entity) => datastore.initFromEntity(entity));
                        return {
                            data: output,
                            info: {
                                pageCursor: encrypt(info.endCursor),
                                moreResults: info.moreResults != "NO_MORE_RESULTS"
                            }
                        }
                    })
            }

            static getCollection = (parentAndKind, limit, queries = null, pageCursor = null, orders = null) => {
                parentAndKind = datastore.parentAndKind(parentAndKind);
                let query = DatastoreAdmin.createQuery(parentAndKind.kind);
                if (pageCursor) query = query.start(decrypt(pageCursor));
                if (parentAndKind.parent.length) query = query.hasAncestor(DatastoreAdmin.key(parentAndKind.parent));
                if (queries) for (const q of queries) {
                    if (q[0] == 'id' && q[2] != undefined) {
                        q[0] = '__key__';
                        q[2] = DatastoreAdmin.key([parentAndKind.kind, q[2]]);
                    }
                    if (q[2] != undefined) {
                        query = query.filter(q[0], q[1], q[2]);
                    }
                }
                if (orders) for (const o of orders) {
                    query = query.order((o[0] == 'id') ? '__key__' : o[0], { descending: (o[1] == "DESC") ? true : false });
                }
                if (limit || limit == 0) query = query.limit(limit);
                return datastore.runQuery(query);
            }

            static getCollectionWithAutocomplete = (parentAndKind, limit = 1, queries = null, pageCursor = null, orders = null) => {
                return datastore.getCollection(parentAndKind, limit, queries, pageCursor, orders)
                    .then((result) => {
                        return {
                            data: result.data.map((data) => Object.assign(data.data, {id: data.id})),
                            pageCursor: result.info.pageCursor,
                            moreResults: result.info.moreResults
                        }
                    })
            }

            save = () => {
                if (this.data == null) this.data = {};
                this.data.updated = new Date()
                return DatastoreAdmin.upsert({
                    key: this.getPath(),
                    data: this.data,
                    excludeFromIndexes: this.excludeIndexes()
                }).then((response) => {
                    this.status = response[0];
                    return this;
                })
            }

            load = () => {
                return DatastoreAdmin
                    .get(this.getPath())
                    .then((response) => {
                        this.data = response[0];
                        return this;
                    });
            }

            delete = () => {
                return DatastoreAdmin
                    .delete(this.getPath())
                    .then((response) => {
                        this.status = response[0];
                        return this;
                    })
            }

            isExist = async () => {
                await this.load();
                return this.data != null;
            }

            keys = (object=this.data) => {
                const recur = (object, parent, set) => {
                    for (const key in object) {
                        let k = key;
                        k = !(object instanceof Array) ? `${parent}.${k}` : parent;
                        if (object[key] instanceof Array) k = `${k}[]`;
                        set.add(k);
                        if (object[key] instanceof Object) recur(object[key], k, set)
                    }
                }

                let set = new Set();

                for (const key in object) {
                    let k = key;
                    if (object[key] instanceof Array) k = `${k}[]`;
                    set.add(k);
                    if (object[key] instanceof Object) recur(object[key], k, set);
                }

                return Array.from(set);
            }

            excludeIndexes = () => {
                if (this.excludeFromIndexes === null) this.excludeFromIndexes = this.keys(this.data);

                let indexes;
                if (this.indexes != null) indexes = this.indexes;
                else if (this.kind in server.app.indexes) indexes = server.app.indexes[this.kind].slice(0);
                else indexes = [];

                let indexSet = new Set();
                for (const index of indexes) {
                    const splits = index.split(".");
                    let tmp = '';
                    if (splits.length > 0) for (const split of splits) {
                        tmp = tmp + split;
                        indexSet.add(tmp);
                        tmp = tmp + '.';
                    }
                }

                this.indexes = Array.from(indexSet);
                this.excludeFromIndexes = this.excludeFromIndexes.filter((index) => this.indexes.indexOf(index) < 0)
                return this.excludeFromIndexes;
            }

        }

    }
}