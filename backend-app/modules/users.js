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
        const jwt = require('jsonwebtoken');
        const Boom = require('@hapi/boom');

        const genverifytoken = (credential) => jwt.sign(credential, server.app.accountvalidationsecret, {
                expiresIn: 60*60*24*7}); // Expired in 7 Days

        server.route([
            {
                path: "/promoteaccount",
                method: "GET",
                options: {
                    validate: {
                        query: Joi.object({
                            user: Joi.string().required(),
                            admin: Joi.boolean().default(false)
                        })
                    },
                    auth: 'adminonly'
                },
                handler: async (request, h) => {

                    //fetch account
                    const sqlfetchaccount = `SELECT * FROM new_schema.users WHERE user = ?`;
                    let accountuser = await server.app.mysql.query(sqlfetchaccount, [request.query.user])
                    if (accountuser.length != 1) return Boom.badRequest("Wrong account userid")

                    accountuser = accountuser[0];

                    if (accountuser.role != "authed" && !(accountuser.role == "user" && request.query.admin === true)) return Boom.badRequest("This account role is not authed which is not ready to be promoted.")

                    let role = "user";
                    if (request.query.admin === true) role = "admin"

                    const user = request.query.user;
                    const sql = `INSERT INTO new_schema.users (user, role, admin)
                            VALUES
                              (?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              user = ?,
                              role = ?,
                              admin = ?`
                    await server.app.mysql.query(sql, [user, role, request.auth.credentials.user, user, role, request.auth.credentials.user])
                        .catch((error) => console.log(error))

                    return "promoted user."
                }
            },
            {
                path: "/demoteaccount",
                method: "GET",
                options: {
                    validate: {
                        query: Joi.object({
                            user: Joi.string().required()
                        })
                    },
                    auth: 'adminonly'
                },
                handler: async (request, h) => {

                    //fetch account
                    const sqlfetchaccount = `SELECT * FROM new_schema.users WHERE user = ?`;
                    let accountuser = await server.app.mysql.query(sqlfetchaccount, [request.query.user])
                    if (accountuser.length != 1) return Boom.badRequest("Wrong account userid")

                    accountuser = accountuser[0];

                    if (accountuser.role != "user") return Boom.badRequest("This account role is not user which is not ready to be demoted.")

                    const user = request.query.user;
                    const sql = `INSERT INTO new_schema.users (user, role)
                            VALUES
                              (?, ?)
                            ON DUPLICATE KEY UPDATE
                              user = ?,
                              role = ?`
                    await server.app.mysql.query(sql, [user, "authed", user, "authed"])
                        .catch((error) => console.log(error))

                    return "demoted user."
                }
            },
            {
                path: "/verifyaccount",
                method: "GET",
                options: {
                    auth: 'accountvalidatejwt'
                },
                handler: async (request, h) => {

                    //fetch account
                    const sqlfetchaccount = `SELECT * FROM new_schema.users WHERE user = ?`;
                    let accountuser = await server.app.mysql.query(sqlfetchaccount, [request.auth.credentials.user])
                    if (accountuser.length != 1) return Boom.badRequest("Wrong account userid")

                    accountuser = accountuser[0];

                    if (accountuser.role != "authed") return Boom.badRequest("This account role is not authed which is not ready to be promoted.")

                    const user = request.auth.credentials.user;
                    const admin = request.auth.credentials.admin;

                    const sql = `INSERT INTO new_schema.users (user, role, admin)
                            VALUES
                              (?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              user = ?,
                              role = ?,
                              admin = ?`
                    await server.app.mysql.query(sql, [user, "user", admin, user, "user", admin])
                        .catch((error) => console.log(error))

                    return "promoted user."
                }
            },
            {
                path: "/sendemail",
                method: "GET",
                options: {
                    auth: 'simplejwt',
                    validate: {
                        query: Joi.object({
                            admin: Joi.string().required()
                        })
                    }
                },
                handler: async (request, h) => {

                    //Admin clarification

                    const sqlfetchadmin = `SELECT * FROM new_schema.users WHERE user = ? AND role = 'admin'`;
                    let adminuser = await server.app.mysql.query(sqlfetchadmin, [request.query.admin])

                    if (adminuser.length != 1) return Boom.badRequest("Wrong admin userid")

                    adminuser = adminuser[0];

                    if (adminuser.email == null) return Boom.badImplementation("This admin doesn't have email.")

                    //Email and Text Preparation

                    const name = request.auth.credentials.name;
                    const useremail = request.auth.credentials.email;

                    admintovalidatecredential = {
                        user: request.auth.credentials.user,
                        admin: adminuser.user
                    }
                    const token = genverifytoken(admintovalidatecredential)

                    const text = `${name} from ${useremail} ask you for permission to use iotcloudserve.net <br>` +
                        `<a href="https://api.iotcloudserve.net/verifyaccount?token=${token}">click here to verify</a>.<br>` +
                        `Best regards,`

                    await iotcloudservetransport.sendMail({
                        from: 'noreply@iotcloudserve.net',
                        to: adminuser.email,
                        subject: `${name} from ${useremail} ask you for permission to use iotcloudserve.net`,
                        html: text,
                    }).catch((error) => {
                        console.log(error)
                    })

                    return "email sent to "+adminuser.email
                }
            }

        ]);


    }


}

