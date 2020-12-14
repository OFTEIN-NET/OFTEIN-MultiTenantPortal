if (typeof firebase === 'undefined') throw new Error('hosting/init-error: Firebase SDK not detected. You must include it before /__/firebase/init.js');
firebase.initializeApp({
    apiKey: "AIzaSyA541zmaY0LbqIHZFtrl6IpYMO-hS_2dQQ",
    authDomain: "oftein-plusplus.firebaseapp.com",
    databaseURL: "https://oftein-plusplus.firebaseio.com",
    projectId: "oftein-plusplus",
    storageBucket: "oftein-plusplus.appspot.com",
    messagingSenderId: "15428910885"
});