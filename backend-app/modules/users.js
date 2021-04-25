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
                            email: Joi.string().email({ tlds: { allow: false } }).required(),
                            admin: Joi.boolean().default(false)
                        })
                    },
                    auth: 'adminonly'
                },
                handler: async (request, h) => {

                    let role = "user";
                    if (request.query.admin === true) role = "admin"

                    const email = request.query.email;
                    const sql = `INSERT INTO new_schema.users (email, role, admin)
                            VALUES
                              (?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              email = ?,
                              role = ?,
                              admin = ?`
                    await server.app.mysql.query(sql, [email, role, request.auth.credentials.email, email, role, request.auth.credentials.email])
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
                            email: Joi.string().email({ tlds: { allow: false } }).required()
                        })
                    },
                    auth: 'adminonly'
                },
                handler: async (request, h) => {

                    //fetch account
                    const sqlfetchaccount = `SELECT * FROM new_schema.users WHERE email = ?`;
                    let accountuser = await server.app.mysql.query(sqlfetchaccount, [request.query.email])
                    if (accountuser.length != 1) return Boom.badRequest("Wrong account email")

                    accountuser = accountuser[0];

                    if (accountuser.role != "user") return Boom.badRequest("This account role is not user which is not ready to be demoted. Or you cannot demote admin.")

                    const email = request.query.email;
                    const sql = `INSERT INTO new_schema.users (email, role)
                            VALUES
                              (?, ?)
                            ON DUPLICATE KEY UPDATE
                              email = ?,
                              role = ?`
                    await server.app.mysql.query(sql, [email, "authed", email, "authed"])
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
                    const sqlfetchaccount = `SELECT * FROM new_schema.users WHERE email = ?`;

                    let accountuser = await server.app.mysql.query(sqlfetchaccount, [request.auth.credentials.email])
                    if (accountuser.length != 1) return Boom.badRequest("Wrong account email")

                    accountuser = accountuser[0];

                    if (accountuser.role != "authed") return Boom.badRequest("This account role is not authed which is not ready to be promoted.")

                    const email = request.auth.credentials.email;
                    const admin = request.auth.credentials.admin;

                    const sql = `INSERT INTO new_schema.users (email, role, admin)
                            VALUES
                              (?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                              email = ?,
                              role = ?,
                              admin = ?`
                    await server.app.mysql.query(sql, [email, "user", admin, email, "user", admin])
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

                    const sqlfetchadmin = `SELECT * FROM new_schema.users WHERE email = ? AND role = 'admin'`;
                    let adminuser = await server.app.mysql.query(sqlfetchadmin, [request.query.admin])

                    if (adminuser.length != 1) return Boom.badRequest("Wrong admin email")

                    adminuser = adminuser[0];

                    //Email and Text Preparation

                    const name = request.auth.credentials.name;
                    const useremail = request.auth.credentials.email;

                    admintovalidatecredential = {
                        email: request.auth.credentials.email,
                        admin: adminuser.email
                    }
                    const token = genverifytoken(admintovalidatecredential)

                    const text = `${name} from ${useremail} ask you for permission to use iotcloudserve.net <br>` +
                        `<a href="https://api.iotcloudserve.net/verifyaccount?token=${token}">click here to verify</a>.<br>` +
                        `Best regards,`

                    await iotcloudservetransport.sendMail({
                        from: 'noreply@iotcloudserve.net',
                        to: adminuser.email,
                        subject: `${name} from ${useremail} asking you for permission to use iotcloudserve.net`,
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

