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

    await server.register(require('hapi-auth-cookie-jwt'))

    const people = { // our "users database"
        1: {
            id: 1,
            name: 'Jen Jones'
        }
    };

    const jwt = require('jsonwebtoken');

    server.app.jwt = function (obj) {
        return jwt.sign(obj, privateKey)
    };

    server.app.verify = function (token) {
        return jwt.verify(token, privateKey)
    }

    const privateKey = "iotcloudserve"

    var validate = function (decodedToken, callback) {

        var error = null;
        // var credentials = accounts[decodedToken.accountId] || {};

        const credentials = {
            "user": 1,
            "email": "benzbank@gmail.com"
        }

        if (!credentials) {
            return callback(error, false, credentials);
        }

        return callback(error, true, credentials)
    };


    server.auth.strategy('token', 'jwt-cookie', {
        key: privateKey,
        validateFunc: validate
    });

    server.auth.default('token');

    server.route([
        {
            method: "GET", path: "/", config: { auth: false },
            handler: function(request, h) {
                return {text: 'Token not required'};
            }
        },
        {
            method: 'GET', path: '/restricted', config: { auth: 'token' },
            handler: function(request, h) {
                const response = h.response({text: 'You used a Token!'});
                return response;
            }
        },
        {
            method: 'GET', path: '/login', config: { auth: false },
            handler: function(request, h) {

                credential = {
                    "user": 1,
                    "email": "benzbank@gmail.com"
                }

                h.state('access_token', jwt.sign(credential, privateKey), {
                    // isSecure: request.info.host != 'localhost:8000',
                    isHttpOnly: true,
                    ttl: 1000*5 // 60 Minutes
                });
                return h.response('Logged in!');
            }
        },
        {
            method: 'GET', path: '/logout', config: { auth: false },
            handler: function(request, h) {
                h.state('access_token', null,{
                    isSecure: false,
                    isHttpOnly: true,
                    ttl: 0
                });
                return h.response('Logged out!');
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