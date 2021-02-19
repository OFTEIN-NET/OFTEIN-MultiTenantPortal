'use strict';

const express = require('express');
const passport = require('passport');
const fetch = require('node-fetch');
const router = express.Router();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

router.get('/', (req, res, next) => {
    const {user} = req;

    if (!user) {
        console.log("[INFO] User is not Logged in yet")
        res.render('home', {user: user});
    }

    let is_authorized = true;

    if (!is_authorized) {
        console.log("[INFO] User is not Authorized yet.")
        res.render('home', {user: user, is_authorized: is_authorized});
    }

    if (user && is_authorized) {
        console.log("[INFO] User is Logged in and Authorized")
        let GIST_Pod_List, UM_Pod_List, CHULA_Pod_List, Cluster_List;
        let backend_api_base_url = 'https://ofteinplusapi.main.202.28.193.102.xip.io'; //str.replace(/\/$/, '') to remove trailing / from url

        let cluster_get_url = backend_api_base_url + '/clusters';

        let pods_get_base_url = backend_api_base_url + '/v2/pods?userid=' + user.id + '&limit=100';
        let deployments_get_base_url = backend_api_base_url + '/v2/deployments?userid=' + user.id + '&limit=100';
        let services_get_base_url = backend_api_base_url + '/v2/services?userid=' + user.id + '&limit=100';

        /*let pods_post_url = backend_api_base_url + '/v2/pods';
        let deployments_post_url = backend_api_base_url + '/v2/deployments';
        let services_post_url = backend_api_base_url + '/v2/services';*/

        let post_url = backend_api_base_url + '/v2';

        console.log("[INFO] Cluster URL: " + pods_get_base_url);

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
                                /*fetch(chula_cluster_pods_url)
                                    .then(response => response.json())
                                    .then(CHULA_Pod_List => {
                                        console.log("[INFO] CHULA Cluster Pods");
                                        console.log(CHULA_Pod_List);*/
                                        res.render('home', {
                                            user: user,
                                            is_authorized: is_authorized,
                                            Cluster_List: cluster_json,
                                            USER_Pod_List: USER_Pod_List,
                                            USER_Deployment_List: USER_Deployment_List,
                                            /*UM_Pod_List: UM_Pod_List,
                                            CHULA_Pod_List: CHULA_Pod_List,*/
                                            post_url: post_url
                                        });
                                    })
                            /*})*/
                        //res.render('home', {user: user, Cluster_List: cluster_json, GIST_Pod_List: GIST_Pod_List, UM_Pod_List: UM_Pod_List});
                    })
            })
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

router.get('/login/facebook', passport.authenticate('facebook'));

router.get('/login/linkedin', passport.authenticate('linkedin'));

router.get('/login/google', passport.authenticate('google', {scope: ['profile']}));

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
    passport.authenticate('google', {failureRedirect: '/'}),
    (req, res, next) => {
        res.redirect('/');
    });

module.exports = router;
