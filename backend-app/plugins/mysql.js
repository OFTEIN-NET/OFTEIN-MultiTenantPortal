exports.plugin = {
    name: "mysql",
    once: true,
    register: (server, options) => {

        Mysql = require('mysql');

        mysqlConfig = require('./../configs/mysqlconfig');

        server.app.pool = Mysql.createPool({
            host: mysqlConfig.host,
            user: mysqlConfig.user,
            password: mysqlConfig.password,
            database: mysqlConfig.database,
            port: mysqlConfig.port
        })

        server.app.mysql = class mysql {
            static query = (q, params) => {
                return new Promise((resolve, reject) => {
                    server.app.pool.query(q, params, (error, results, fields) => {
                        if (error) reject(error);
                        else resolve(results);
                    })
                })
            }
        }

        server.app.escape = (s) => server.app.pool.escape(s)
    }
}