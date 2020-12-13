vue = new Vue({
  el: '#app',
  data: {
    loginStatus: "กำลังโหลด",
    isLogin: false
  },
  mounted: function() {
    return setTimeout(function() {
      return vue.getCredential();
    }, 1000);
  },
  methods: {
    getCredential: function() {
      if (firebase.auth().currentUser) {
        this.loginStatus = "กำลังโหลด";
        return firebase.auth().currentUser.getIdToken().then(function(token) {
          console.log(token);
          document.cookie = '__session=' + token + ';max-age=3600';
          return vue.$http.get('/api/credential', {
            headers: {
              'Authorization': 'Bearer ' + token
            }
          }).then(function(data) {
            this.loginStatus = "สวัสดี คุณ " + data.body.name;
            return this.isLogin = true;
          }, function(error) {
            return console.log(error);
          });
        });
      } else {
        this.loginStatus = "กรุณาเข้าสู่ระบบ";
        return this.isLogin = false;
      }
    },
    signin: function() {
      return firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function(token) {
        vue.loginStatus = "กำลังโหลด";
        return vue.getCredential();
      }).catch(function(error) {
        return console.log(error);
      });
    },
    signout: function() {
      firebase.auth().signOut();
      this.loginStatus = "ออกจากระบบแล้ว";
      document.cookie = '__session' + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      return this.isLogin = false;
    }
  }
});
