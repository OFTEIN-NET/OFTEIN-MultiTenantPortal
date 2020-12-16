'use strict';

const express = require('express');
const passport = require('passport');
const fetch = require('node-fetch');
const router = express.Router();

router.get('/', (req, res, next) => {
    const { user } = req;
    var Pod_List='';
    var Cluster_List /*= [
        { cluster: 'KR-GIST', running: 'true' },
        { cluster: 'MY-UM', running: 'false' },
        { cluster: 'TH-CHULA', running: 'true' }
    ]*/;
    var backend_api_base_url = 'https://oftein-backend-deployment-pod-f5oec474zq-an.a.run.app/clusters';
    var gist_cluster_pods_url = backend_api_base_url + '/k3d_c1/pods'
    var um_cluster_pods_url = backend_api_base_url + '/k3d_c2/pods'
    var chula_cluster_pods_url = backend_api_base_url + '/um/pods'

    fetch(backend_api_base_url)
        .then(response => response.json())
        .then(cluster_json => {
            console.log(cluster_json);
            //res.render('home', { user: user , Cluster_List: Cluster_List, Pod_List: json });
            fetch(gist_cluster_pods_url)
                .then(response => response.json())
                .then(pod_json => {
                    console.log(pod_json);
                    res.render('home', {user: user, Cluster_List: cluster_json, Pod_List: pod_json});
                })
        })

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

router.get('/login/google', passport.authenticate('google', { scope: ['profile'] }));

router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req, res, next) => {
    res.redirect('/');
});

router.get('/auth/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/', successRedirect: '/' }),
  (req, res, next) => {
    res.redirect('/');
});

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res, next) => {
    res.redirect('/');
});

module.exports = router;
