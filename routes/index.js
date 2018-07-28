var express = require('express');
var mongodb = require('mongodb');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var nodemailer = require('nodemailer');

var bcrypt = require('bcrypt');
const saltRounds = 10;

var router = express.Router();

var getIp = function(req) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.headers['x-real-ip'] || req.socket.remoteAddress || '';
  if(ip.split(',').length > 0) {
    ip = ip.split(',')[0];
  }
  return ip;
};

// GET homepage: static
router.get('/', function(req, res, next) {
  res.clearCookie('email');
  // res.render('index', { title: 'Express' });
  // console.log(getIp(req));
  res.sendFile(__dirname + '/htmls/homepage.html');
});

router.get('/login', function(req, res) {
  res.sendFile(__dirname + '/htmls/login.html');
});

router.get('/about', function(req, res) {
  res.sendFile(__dirname + '/htmls/about.html');
});

router.get('/rules', function(req, res) {
  res.sendFile(__dirname + '/htmls/rules.html');
});

// GET the page to register: static
router.get('/register', function(req, res) {
	// res.sendFile(__dirname + '/htmls/register.html');
  var MongoClient = mongodb.MongoClient;
  var mongoServer = 'mongodb://localhost:27017/vc'
  MongoClient.connect(mongoServer, function(err, db) {
    var schools = db.collection('schools');
    if(!err) {
      schools.find({}).toArray(function(err, items) {
        if(!err) {
          res.render('register', {
            "schools": items
          });
          db.close();
        }
      });
    }   
  });
});

// POST the request to register
router.post('/register_post', function(req, res) {
	// db: vc
  var MongoClient = mongodb.MongoClient;
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to insert a new user in db
  MongoClient.connect(mongoServer, function(err, db) {
    if(!err) {
      // collection: users
  		var collection = db.collection('users');
      var newuser = {
      	// email address should be standardized to lower case and then saved into db
        email: req.body.email.toLowerCase(),
        // password should be hashed
      	password: bcrypt.hashSync(req.body.password, saltRounds),
        gender: req.body.gender,
        nickname: req.body.nickname,
        // avatar stores a link; left empty, waiting for further implementation(file upload)
        avatar: "",
        // shool should be chosen from a list of schools
        school: req.body.school,
        description: req.body.description
      };
      collection.insert([newuser], function(err, result) {
        if(!err) {
          // redirect to homepage
       		res.redirect('/');
        }
        // close database after insert
        db.close();
      });
    }  
  });   
});

// GET the request to send verification email: no data will be sent to client
router.get('/verification_get', function(req, res){
  // addr == AlexZhao@126.coM etc.
  var addr = req.query.email;
  // hash string into int
  // takes in string: s; outputs int: h
  var hashCode = function(s) {
    var h = 0;
    if (h == 0 && s.length > 0) {
      for(var i = 0; i < s.length && i < 4; i++) {
          h = 31 * h + s[i].charCodeAt();
      }
    }
    return h;
  }
  // generate verification code and converts to string
  var code = hashCode(addr).toString();
  // if the email address has not been registered: send a verification email
  // db: vc
  var MongoClient = mongodb.MongoClient;
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to check if this email address is already in db
  MongoClient.connect(mongoServer, function(err, db) {
    if(!err) {
      // collection: users
      var users = db.collection('users');
      // firstly check if this email is in the users list
      // this time addr should be standardized since email in db are all lower case
      users.findOne({"email": addr.toLowerCase()}, function (err, user) 
      {
        // if email is found: the email address has already been registered
        if(user) { 
          res.locals.error = {
            message: 'Whoops! Something went wrong!',
            status: 'Your email address has already been registered!',
            stack: 'Please choose another email address!'
          };
          res.render('error', {title: 'Error'});
        }  
        db.close();
      });
      // send email
      let transporter = nodemailer.createTransport({
        host: "smtp.qq.com",
        port: 465,
        secureConnection: true,
        auth: {
          user: "1467222535@qq.com",
          pass: "pziglqgwycctifhd"
        }
      });
      let mailOptions = {
        from: "Uni-Challenge  <1467222535@qq.com>",
        to: addr,
        subject: "Please confirm your email address - Uni-Challenge",
        text: code
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if(!err) {
          console.log('Message sent: %s', info.messageId + ' ' + code);
        }
      });  
    }
  }); 
});

// POST the request to log in
router.post('/login_post', function(req, res) {
  // addr should be standardized to check in db
  var addr = req.body.email.toLowerCase();
  var pwd = req.body.password;
  // db: vc
  var MongoClient = mongodb.MongoClient;
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to check login information
  MongoClient.connect(mongoServer, function(err, db)
  {
    if(!err) {
      // collections: users
      var users = db.collection('users');
      users.findOne({"email": addr}, function(err, user) {
        // if this email address is not registered in db
        if(!user) { 
          res.locals.error = {
            message: 'Whoops! Something went wrong!',
            status: 'Your email address has not been registered!',
            stack: 'Please register!'
          };
          res.render('error', {title: 'Error'});
        } else {
          // check password using bcrypt    
          bcrypt.compare(pwd, user.password, function(err, match) {
            // if email matches pwd
            if(match) { 
              // using cookie to validate user
              // cookie expiration and encryption should be implemented later
              res.cookie('email', addr, { 
                // maxAge: 60*10
                // signed: true 
              });
              // redirect to user homepage
              // normal user or admin will be checked in router.get('/home');
              res.redirect('/home');
            // if email does not match pwd
            } else { 
              res.locals.error = {
                message: 'Whoops! Something went wrong!',
                status: 'Your email address does not match your password!',
                stack: 'Please try again!'
              };
              res.render('error', {title: 'Error'});
            }
          });        
        }  
        db.close();
      }); 
    } 
  }); 
});

// GET log out request
router.get('/logout', function(req, res) {
  // res.cookies.email will be cleared in router.get('/');
  res.redirect('/');
});

// GET user homepage: dynamic
router.get('/home', function(req, res) {
  var addr = req.cookies.email;
  // if user did not log in
  if(!addr) {
    res.locals.error = {
      message: 'Whoops! Something went wrong!',
      status: '',
      stack: ''
    };
    res.render('error', {title: 'Error'});
  // if admin logs in
  } else if(addr == "admin") {
    res.redirect('/admin');
  // if it is ordinary user
  } else { 
    var MongoClient = mongodb.MongoClient;
    // db: vc
    var mongoServer = 'mongodb://localhost:27017/vc';
    // connect to get user information and user's video information
    MongoClient.connect(mongoServer, function(err, db)
    {
      if(!err) {
        // stores this user's video
        var video_list = [];
        // collection: videos
        var videos = db.collection('videos');
        // find this user's videos
        videos.find({"email": addr}).toArray(function(err, video) {
          video_list = video;
        });
        // collection: users
        var users = db.collection('users');
        // find this user's personal information
        users.findOne({"email": addr}, function(err, user) {
          // pass user and video information to user homepage
          res.render('userpage', {
            title: 'Uni-Challenge', 
            "user": user,
            "videos": video_list
          });
          db.close();
        });    
      } 
    });     
  } 
});

// POST the request to submit a new video
router.post('/submitvideo_post', function(req, res) {
  var addr = req.cookies.email;
  var MongoClient = mongodb.MongoClient;
  // db: vc
  var mongoServer = 'mongodb://localhost:27017/vc';
  // convert current time into int
  var findTime = function() {
    var t = new Date();
    return t.valueOf();
  }
  // connect to insert a video
  MongoClient.connect(mongoServer, function(err, db) { 
    if(!err) {
      // collection: videos
      var collection = db.collection('videos'); 
      var newvideo = {
        title: req.body.title,
        email: addr,
        link: req.body.link,
        category: req.body.category,
        description: req.body.description,
        like: 0,
        // viewcount == 0: not viewed by admin, viewcount == 1: accepted or declined by admin
        viewcount: 0,
        approved: false,
        time: findTime()
      };
      // insert this video
      collection.insert([newvideo], function(err, result) { 
        if(!err) {
          // redirect to user homepage: refresh user's information
          res.redirect('/home');
          db.close();   
        }
      });
    }  
  });   
});

// GET the ranking for some category
router.get('/ranking', function(req, res) {
  // /ranking?ctgry=All
  // /ranking?ctgry=双面人
  var ctgry = decodeURI(req.url).split('?')[1].split('=')[1];
  // show only approved videos
  var obj = {
    'approved': true,
  };
  // specify a category
  if(ctgry != "All") {
    obj.category = ctgry;
  }
  var MongoClient = mongodb.MongoClient;
  // db: vc
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to find all videos in that category
  MongoClient.connect(mongoServer, function(err, db)
  {
    if(!err) {
      // collection: videos
      var videos = db.collection('videos');
      videos.find(obj).toArray(function(err, video) {
        res.render('ranking', {
          title: 'Ranking',
          // "Like" function need category information to redirect to
          category: ctgry,
          // sorting of videos (to like and to time) will be done in frontend
          "videos": video
        });
        db.close();
      });
    } 
  });
});
// router.get('/ranking', function(req, res) {
//   res.sendFile(__dirname + '/htmls/ranking.html');
// });

// GET the request to like a video
router.get('/like', function(req, res) {
  // /like?category=All&link=https://v.qq.com/
  // /like?category=双面人&link=https://v.qq.com/
  var ctgry = decodeURI(req.url).split('?')[1].split('&')[0].split('=')[1];
  var link = decodeURI(req.url).split('?')[1].split('&')[1].split('=')[1];

  // max like sent in 24h 
  var MAX_LIKE = 10;
  
  // get ip
  var ipAdd = getIp(req);
  console.log(ipAdd);
  
  // get time: int
  var now = new Date();
  now = now.valueOf();

  // check time = function(int_Tnow, int_TinDB)
  var checkeTime = function(t1, t2) {
    return t1-t2 > 24*60*60*1000; // 24 h
  }

  // like++
  var incLikeInDB = function() {
    var MongoClient = mongodb.MongoClient;
    // db: vc
    var mongoServer = 'mongodb://localhost:27017/vc';
    // connect to increase like by 1
    MongoClient.connect(mongoServer, function(err, db) {
      // collection: videos
      var videos = db.collection('videos');
      // find video by link: assumes no repeating video links
      // add like by one at a time
      videos.update({"link": link}, {$inc: {"like": 1}}, function(err, video) {
        if(!err) {
          // refresh ranking page
          res.redirect('/ranking?category=' + ctgry);
          db.close();
        }
      });
    });    
  }  

  var MongoClient = mongodb.MongoClient;
  // db: vc
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to how many likes this ip sent today
  MongoClient.connect(mongoServer, function(err, db) {
    if(!err) {
      // collections: ips
      var ips = db.collection('ips');
      ips.findOne({"ip": ipAdd}, function(err, ip) {
        // if this ip exists in DB
        if(ip) {
          // console.log(ip);        
          // if 24h has passed since last like: left=max-1, time=now, like++
          if(checkeTime(now, ip.time)) {
            ips.update({"ip": ipAdd}, {$set: {"left": MAX_LIKE-1, "time": now}}, function(err, nip) {
              incLikeInDB();
              db.close();
            });
          // if last like is less than 24h ago: 
          } else {
            // if likes sent < MAX_LIKE: max--, like++
            if(ip.left) {
              ips.update({"ip": ipAdd}, {$inc: {"left": -1}}, function(err, nip) {
                incLikeInDB();
                db.close();
              });             
            // if likes sent reaches MAX_LIKE: reject like request
            } else {
              db.close();
              res.locals.error = {
                message: 'Whoops! Something went wrong!',
                status: 'You have sent too many likes today!',
                stack: 'Please come tomorrow! Thanks for your participation!'
              };
              res.render('error', {title: 'Error'});
            }
          }
        // if this ip does not exist in DB: insert this ip, left=max-1, time=now, like++
        } else {
          var ip = {
            "ip": ipAdd,
            "left": MAX_LIKE-1,
            "time": now
          };
          ips.insert([ip], function(err, result) {
            incLikeInDB();
            db.close();
          });
        }
      });
    }
  });
});

// GET the request to jump to some link and update viewcount
router.get('/jumpTo',function(req, res) {
  // /jumpTo?link=https://www.booking.com
  var link = decodeURI(req.url).split('?')[1].split('=')[1];
  var MongoClient = mongodb.MongoClient;
  // db: vc
  var mongoServer = 'mongodb://localhost:27017/vc';
  // connect to update viewcount
  MongoClient.connect(mongoServer, function(err, db) {
    if(!err) {
      // collection: videos
      var videos = db.collection('videos');
      // find video by link: assumes no repeating video links
      // add viewcount by one at a time
      videos.update({"link": link}, {$inc: {"viewcount": 1}}, function(err, video) {
        if(!err) {
          // redirect to that link
          res.redirect(link);
          db.close();
        }
      });
    }
  });
});







module.exports = router;
