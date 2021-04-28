'use strict';

const express = require('express');
const passport = require('passport');
const fetch = require('node-fetch');
const router = express.Router();

const jwt = require('jsonwebtoken')
const secret = "Removed due to security reason. Need to be added.";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

router.get('/', (req, res, next) => {
    const {user} = req;
    let backend_api_base_url = 'https://api.iotcloudserve.net';

    if (!user) {
        console.log("[INFO] User is not Logged in yet")
        res.render('home', {user: user});
    }

    if (user) {
        console.log('[INFO] User Info from Social Platform' + user)

        const obj = {"name": user.displayName, "email": user.emails[0].value}
        const token = jwt.sign(obj, secret, {expiresIn: 60 * 60})
        let user_info_url = backend_api_base_url + '/info?token=' + token

        fetch(user_info_url)
            .then(response => response.json())
            .then(is_authorized_json => {
                console.log('[INFO] User Info from Authorization database' + is_authorized_json)

                if (is_authorized_json.role == 'user' || is_authorized_json.role == 'admin') {
                    console.log("[INFO] User is Logged in and Authorized")

                    let cluster_get_url = backend_api_base_url + '/clusters?token=' + token;
                    let pods_get_base_url = backend_api_base_url + '/v3/pod?token=' + token + '&limit=100';
                    let deployments_get_base_url = backend_api_base_url + '/v3/deployment?token=' + token + '&limit=100';
                    let services_get_base_url = backend_api_base_url + '/v3/service?token=' + token + '&limit=100';

                    let post_url = backend_api_base_url + '/v3';

                    console.log("[INFO] Cluster URL: " + cluster_get_url);

                    fetch(cluster_get_url)
                        .then(response => response.json())
                        .then(cluster_json => {
                            console.log(cluster_json);
                            //res.render('home', { user: user , api_url: backend_api_base_url, Cluster_List: Cluster_List, Pod_List: json });
                            fetch(pods_get_base_url)
                                .then(response => response.json())
                                .then(USER_Pod_List => {
                                    console.log("[INFO] User Pods");
                                    console.log(USER_Pod_List);
                                    fetch(deployments_get_base_url)
                                        .then(response => response.json())
                                        .then(USER_Deployment_List => {
                                            console.log("[INFO] User Deployments");
                                            console.log(USER_Deployment_List);
                                            fetch(services_get_base_url)
                                                .then(response => response.json())
                                                .then(USER_Service_List => {
                                                    console.log("[INFO] User Services");
                                                    console.log(USER_Service_List);
                                                    res.render('home', {
                                                        user: user,
                                                        token: token,
                                                        is_authorized: true,
                                                        Cluster_List: cluster_json,
                                                        USER_Pod_List: USER_Pod_List,
                                                        USER_Deployment_List: USER_Deployment_List,
                                                        USER_Service_List: USER_Service_List,
                                                        post_url: post_url
                                                    });
                                                })
                                        })
                                })
                        })
                }
                else {
                    console.log("[INFO] User is not Authorized yet.")
                    let post_url_sendmail = backend_api_base_url + '/sendemail';
                    res.render('home', {user: user, is_authorized: false, token: token, post_url_sendmail: post_url_sendmail});
                }
            });

        /*if (!is_authorized) {
            console.log("[INFO] User is not Authorized yet.")
            res.render('home', {user: user, is_authorized: is_authorized});
        }

        if (is_authorized) {
            console.log("[INFO] User is Logged in and Authorized")

            let cluster_get_url = backend_api_base_url + '/clusters?token=' + token;
            let pods_get_base_url = backend_api_base_url + '/v3/pod?token=' + token + '&limit=100';
            let deployments_get_base_url = backend_api_base_url + '/v3/deployment?token=' + token + '&limit=100';
            let services_get_base_url = backend_api_base_url + '/v3/service?token=' + token + '&limit=100';

            let post_url = backend_api_base_url + '/v3';

            console.log("[INFO] Cluster URL: " + cluster_get_url);

            fetch(cluster_get_url)
                .then(response => response.json())
                .then(cluster_json => {
                    console.log(cluster_json);
                    //res.render('home', { user: user , api_url: backend_api_base_url, Cluster_List: Cluster_List, Pod_List: json });
                    fetch(pods_get_base_url)
                        .then(response => response.json())
                        .then(USER_Pod_List => {
                            console.log("[INFO] User Pods");
                            console.log(USER_Pod_List);
                            fetch(deployments_get_base_url)
                                .then(response => response.json())
                                .then(USER_Deployment_List => {
                                    console.log("[INFO] User Deployments");
                                    console.log(USER_Deployment_List);
                                    fetch(services_get_base_url)
                                        .then(response => response.json())
                                        .then(USER_Service_List => {
                                            console.log("[INFO] User Services");
                                            console.log(USER_Service_List);
                                            res.render('home', {
                                                user: user,
                                                token: token,
                                                is_authorized: is_authorized,
                                                Cluster_List: cluster_json,
                                                USER_Pod_List: USER_Pod_List,
                                                USER_Deployment_List: USER_Deployment_List,
                                                USER_Service_List: USER_Service_List,
                                                post_url: post_url
                                            });
                                        })
                                })
                        })
                })
        }*/
    }


    /*fetch(url)
    .then(res => res.json())
    .then(json => {
        console.log("First user in the array:");
        console.log(json[0]);
        Pod_List=json;
    });*/
    /*client.get('/list', function (err, res, body) {
        return console.log(body);
    });*/
});

router.get('/login/facebook', passport.authenticate('facebook', {scope: ['email']}));

router.get('/login/linkedin', passport.authenticate('linkedin'));

router.get('/login/google', passport.authenticate('google', {scope: ['profile', 'email']}));

router.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
});

router.get('/auth/facebook/callback',
    passport.authenticate('facebook', {failureRedirect: '/'}),
    (req, res, next) => {
        res.redirect('/');
    });

router.get('/auth/linkedin/callback',
    passport.authenticate('linkedin', {failureRedirect: '/', successRedirect: '/'}),
    (req, res, next) => {
        res.redirect('/');
    });

router.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/',
        scope: ['profile', 'email']
    }),
    (req, res, next) => {
        res.redirect('/');
    });

module.exports = router;
