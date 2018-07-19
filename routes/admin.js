var express = require('express');
var mongodb = require('mongodb');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var router = express.Router();
// GET admin homepage: static
// /admin/
router.get('/', function(req, res, next) {
  res.sendFile(__dirname + '/htmls/adminhome.html');
});

// GET the page to show all users: dynamic
// /admin/users
router.get('/users', function(req, res) {
  var MongoClient = mongodb.MongoClient;
  // db: vc
	var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to find all users
	MongoClient.connect(mongoServer, function(err, db) {
	  if(!err) {
	    // collection: users
	    var users = db.collection('users');
      // find all users
			users.find({}).toArray(function(err, user) {
	      if(user.length) {
	        res.render('userlist',{
	          title: 'Users',
            // pass users to userlist
	          "userlist" : user 	          
	        });
          db.close();
	      }
    	});    
	  } 	
	});
});

// GET the page to show all the videos: dynamic
// /admin/videos
router.get('/videos', function(req, res) {
  var MongoClient = mongodb.MongoClient;
  // db: vc
  var mongoServer = 'mongodb://localhost:27017/vc';
  // find all videos waiting to be accepted or declined
  MongoClient.connect(mongoServer, function(err, db) {
    if(!err) {
      // collection: videos
      var videos = db.collection('videos');
      // viewcount == 0 : not accepted nor declined by admin
      videos.find({"viewcount": 0}).toArray(function (err, video) {
        res.render('videolist',{
          title: 'Requests',
          // refresh new /admin/videos page
          "videolist" : video
        });
        db.close();
      });    
    }   
  });
});

// POST the request to approve a video
// /admin/approvevideo
router.get('/approvevideo', function(req, res) {
  // /admin/approvevideo?ok=true&link=http://www.runoob.com/git/git-basic-operations.html
  // /admin/approvevideo?ok=false&link=http://www.runoob.com/git/git-basic-operations.html
  var link = req.query.link;
  // ok is a boolean
  var ok = req.query.ok == 'true';
  // check cookie to validate identity
  var MongoClient = mongodb.MongoClient;
  // db: vc
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to change "approved" and "viewcount"
  MongoClient.connect(mongoServer, function (err, db) {
    if(!err) {
      // collection: videos
      var videos = db.collection('videos');
      // if ok == true: accepted
      if(ok) {
        // update by link
      	videos.update({"link": link}, {$set: {"viewcount": 1, "approved": true}}, function (err, video) { 
	        if(!err) {
            // refresh page
	        	res.redirect('/admin/videos');
            db.close();
	        }
	      });
      // if ok == false: declined
      } else {
      	videos.update({"link": link}, {$set: {"viewcount": 1}}, function (err, video) { 
	        if(!err) {
	        	res.redirect('/admin/videos');
            db.close();
	        }
	      });  
      }
    }
  }); 
});

// GET the request to manage DB
// /admin/manage
router.get('/manage', function(req, res) {
  // /manage
  // manage?collection=users
  var haveParam = decodeURI(req.url).indexOf('?') !== -1
  // if request has a parameter indicating a collection of DB
  if(haveParam) {
    var collection = decodeURI(req.url).split('?')[1].split('=')[1];
    // var MongoClient = mongodb.MongoClient;
    // // db: vc
    // var mongoServer = 'mongodb://localhost:27017/vc';
    // MongoClient.connect(mongoServer, function(err, db) {

    // });
    res.send(collection);
  // if the request just asks to direct to '/admin/manage'
  } else {
    res.sendFile(__dirname + '/htmls/adminmanage.html')
  }
});




















module.exports = router;
