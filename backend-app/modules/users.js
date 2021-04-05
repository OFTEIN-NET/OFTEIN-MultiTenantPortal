exports.plugin = {
    name: "users",
    once: true,
    register: async (server, options) => {

        await server.register(require("../plugins/mysql"));

        const nodemailer = require("nodemailer");

        mailconfig = require('./../configs/mailconfig');

        let iotcloudservetransport = nodemailer.createTransport({
            host: mailconfig.host,
            port: mailconfig.port,
            secure: false,
            auth: {
                user: mailconfig.username,
                pass: mailconfig.password,
            },
        });

        const Joi = require('joi');

        server.route([
            {
                path: "/sendemail",
                options: {
                    validate: {
                        query: Joi.object({
                            token: Joi.string().required()
                        })
                    }
                },
                method: "GET",
                handler: async (request, h) => {

                    const token = request.query.token;

                    const text = 'Please accept this account <a href="https://oftien.iotcloudserve.net">${token}</a>'

                    await iotcloudservetransport.sendMail({
                        from: 'noreply@iotcloudserve.net', // sender address
                        to: "kittipat.sae@gmail.com", // list of receivers
                        subject: "Hello", // Subject line
                        html: text, // html body
                    }).catch((error) => {
                        console.log(error)
                    })

                    return token
                }
            },
            {
                path: "/encrypt/{code}",
                options: {
                    validate: {
                        params: Joi.object({
                            code: Joi.string().required()
                        })
                    }
                },
                method: "GET",
                handler: async (request, h) => {

                    const token = server.app.encrypt(request.params.code)

                    return token
                }
            },
            {
                path: "/decrypt/{code}",
                options: {
                    validate: {
                        params: Joi.object({
                            code: Joi.string().required()
                        })
                    }
                },
                method: "GET",
                handler: async (request, h) => {

                    const token = server.app.decrypt(request.params.code)

                    return token
                }
            }

        ]);


    }


}

