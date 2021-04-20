main = async () => {

    const Boom = require('@hapi/boom');
    const routesValidation = {
        options: {abortEarly: true, stripUnknown: true},
        failAction: (request, h, error) => {
            let errors = {};
            console.log(error);
            error.details.forEach((detail, i) => {
                errorMessage = detail.message

                if (detail.path.length > 1) {

                    let path = [detail.path[0]];
                    let pathIndex = 0;
                    let pathKey;

                    if (!detail.path[2]) pathKey = [detail.path[1]];
                    else {
                        pathIndex = [detail.path[1]];
                        pathKey = [detail.path[2]];
                    }

                    errors[path+"_"+pathIndex+"_"+pathKey] = [errorMessage]
                }
                else
                {
                    if (!!errors[detail.path]) errors[detail.path].push(errorMessage);
                    else errors[detail.path] = [errorMessage];
                }
            });

            let boom = Boom.badRequest();
            boom.output.payload.details = errors;
            throw boom;
        }
    };

    const Hapi = require('@hapi/hapi');
    let server = new Hapi.Server({
        port: 8080,
        routes: {
            validate: routesValidation,
            files: { relativeTo: "./public"},
            cors: true
        },
        router: { stripTrailingSlash: true }
    });

    const Glob = require('glob');

    await server.register(require('hapi-auth-jwt2'))

    const jwt = require('jsonwebtoken');

    const encryptbase64 = require('./configs/encryptbase64');
    //  node -e "console.log(require('crypto').randomBytes(32).toString('base64'));"
    const secret = encryptbase64.tokensecret;
    const accountvalidationsecret = encryptbase64.validationtokensecret;

    server.app.secret = secret;
    server.app.accountvalidationsecret = accountvalidationsecret;

    insertnewuser = (decoded) => {
        if (decoded.name) {
            const sql = `INSERT INTO new_schema.users (email, name)
                            VALUES
                              (?, ?)
                            ON DUPLICATE KEY UPDATE
                              email = ?, name = ?`;
            return server.app.mysql.query(sql, [decoded.email, decoded.name, decoded.email, decoded.name])
        } else {
            const sql = `INSERT INTO new_schema.users (email)
                            VALUES
                              (?)
                            ON DUPLICATE KEY UPDATE
                              email = ?`;
            return server.app.mysql.query(sql, [decoded.email, decoded.email])
        }
    }

    const validate = async function (decoded, request, h) {

        const sql = `SELECT * FROM new_schema.users WHERE email = ?`;
        let res = await server.app.mysql.query(sql, [decoded.email])
        if (res.length == 1) {
            return { isValid: res[0].role == 'admin' || res[0].role == 'user' }
        } else if (res.length == 0 && decoded.email) {
            await insertnewuser(decoded);
        }
        return { isValid: false }

    };

    const simpleValidate = async function (decoded, request, h) {

        const sql = `SELECT * FROM new_schema.users WHERE email = ?`;
        let res = await server.app.mysql.query(sql, [decoded.email])

        if (res.length == 0) {
            await insertnewuser(decoded);
        }

        return { isValid: true }

    };

    const adminValidate = async function (decoded, request, h) {

        const sql = `SELECT * FROM new_schema.users WHERE email = ?`;
        let res = await server.app.mysql.query(sql, [decoded.email])
        if (res.length == 1) {
            return { isValid: res[0].role == 'admin' }
        }
        return { isValid: false }

    };

    server.auth.strategy('jwt', 'jwt',
        { key: secret,
            validate
        });

    server.auth.strategy('simplejwt', 'jwt',
        { key: secret, validate: simpleValidate
        });

    server.auth.strategy('accountvalidatejwt', 'jwt',
        { key: accountvalidationsecret, validate: simpleValidate
        });

    server.auth.strategy('adminonly', 'jwt',
        { key: secret, validate: adminValidate
        });

    server.auth.default('jwt');

    server.route([
        {
            method: "GET", path: "/", config: { auth: false },
            handler: function(request, h) {
                return {text: 'Token not required'};
            }
        }
    ]);

    await server.register(Glob.sync("./plugins/**/*.js").map((js) => require(js)));
    await server.register([require("./modules/users.js")]);
    await server.register([require("./modules/containers.js")]);
    // await server.register(Glob.sync("./modules/**/*.js").map((js) => require(js)));
    await server.start();

    console.log(`Server running on ${server.info.uri}`);

}

main();