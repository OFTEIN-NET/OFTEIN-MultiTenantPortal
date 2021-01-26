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

    await server.register(Glob.sync("./plugins/**/*.js").map((js) => require(js)));
    await server.register(Glob.sync("./modules/**/*.js").map((js) => require(js)));
    await server.start();

    console.log(`Server running on ${server.info.uri}`);

}

main();