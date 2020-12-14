exports.plugin = {
    name: "vision",
    once: true,
    register: async (server, options) => {

        await server.register(require('@hapi/inert'));

        // https://hapi.dev/module/inert/api/?v=6.0.2

        server.route([
            {
                method: 'GET',
                path: '/{param*}',
                handler: {
                    directory: {
                        path: '.'
                    }
                }
            }
        ])

    }
}