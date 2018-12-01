#!/usr/bin/node
//***************************************** Libraries ****************************************************
var express=require('express');
var app = express();
app.use(express.bodyParser());

var fs = require('fs');

var cradle = require('cradle');

var conn=new(cradle.Connection)('aap.cloudant.com', {
      auth: { username: 'aap', password: '********' }
  });
var db = conn.database("js_ugr_docs");
var encuesta = conn.database("js_ugr_encuesta");

var uuid = require('node-uuid');

var request = require('request');

var jsUgrRegistration=require('jsUgrRegistration');
var jsUgrSessions=require('jsUgrSessions');

var check = require('validator').check;
var sanitize = require('validator').sanitize;

var path = 'public/users/';

var nodemailer = require("nodemailer");
var smtpTransport = nodemailer.createTransport("SMTP",{
	host: "correo.ugr.es", 
	secureConnection: true,
	port: 465, 
	auth: {
		user: "vroom",
		pass: "*******"
	}
});
var logFile = fs.createWriteStream('jsUgr.log', {flags: 'a'}); //use {flags: 'w'} to open in write mode
app.use(express.logger({stream: logFile}));

var logentries = require('node-logentries');

var log = logentries.logger({
  token: '64a0f6cc-5629-4fd1-b4b7-497b57c63b5c'
})
//************************************* static server *****************************************************
// Use compress middleware to gzip content
app.use(express.compress());
var oneDay = 86400000;

// Serve up content from public directory
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));
//***************************************** Maintenance ****************************************************
var cronJob = require('cron').CronJob;
var job1 = new cronJob('00 00 * * * *', function(){// Runs every hour
    var now=new Date();
		for(var i in jsUgrSessions.fail){
			if((now.getTime()-jsUgrSessions.fail[i].first)>60*1000){	
				log.notice("127.0.0.1 - Cron Job - delete "+i+" from fail vector - success" );	
				delete jsUgrSessions.fail[i];
			}
		}
		for(var i in jsUgrSessions.users){
			if((now.getTime()-jsUgrSessions.users[i].time)>15*60*1000){
				log.notice("127.0.0.1 - Cron Job - delete "+i+" from user vector - success" );			
				delete jsUgrSessions.users[i];								
			}
		}
	}, function () {// This function is executed when the job stops
		for(var i in jsUgrSessions.users){   
			log.notice("127.0.0.1 - Cron Job - cleared login cache - user active: "+i+", ip: "+jsUgrSessions.users[i].ip+", time: "+now.getTime()-jsUgrSessions.users[i].time+" s" );
		}	
		
	}, 
  true /* Start the job right now */
);

var job2 = new cronJob('00 00 05 * * *', function(){// Runs every day at 5AM
	var now=new Date();
	request('http://localhost:5984/js_ugr_users/_design/oldEntries/_list/combine/expiration', function (err, response, body) {
		if (err) {
			log.info("127.0.0.1 - Cron Job - get userList - "+err.error+": "+err.reason );	
		}else{
			var userList=JSON.parse(body);
			for(var i in userList){
				if(!userList[i].validated&&(now.getTime()-userList[i].expiration)>16*60*1000){//sixteen minutes
					jsUgrRegistration.deleteUser(i)(function(response){
						users.compact();
						if(response.ok){
							log.notice("127.0.0.1 - Cron Job - delete "+response.user+" from user dB - success" );
						}else{
							log.notice("127.0.0.1 - Cron Job - delete "+response.user+" from user dB - "+response.error+": "+response.reason);
						}
					});
				}
			}
		}
	});
}); 

//************************************************************************************************************
//***************************************** Express calls ****************************************************
//************************************************************************************************************
//Middleware for Acces-Control-Allow-Origin 
app.all('/*', function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "http://aap.eu01.aws.af.cm/");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  if(!req.headers['x-forwarded-for'])
    req.headers['x-forwarded-for'] = req.connection.remoteAddress;
	next();
});	


//***************************User management***************************************
//Create account
app.post('/register',function(req,res){			
	var now = new Date();		
	try {
		check(req.body.user).notNull().is(/^([a-z]|[0-9]|[A-Z]|_|-)+$/);
		check(req.body.email).notNull().is(/[a-zA-Z0-9-]{1,}@([a-zA-Z\.])?[a-zA-Z]{1,}\.[a-zA-Z]{1,4}/gi);
		check(req.body.pass).notNull().is(/^(?=.*\d)(?=.*[a-zA-Z]).{6,40}$/gm);
		jsUgrRegistration.register(req.body)(function(response){
			if(response.ok){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - create user - success");
			}else{
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - create user - "+response.error+": "+response.reason);
			}
			res.json(response);	
		});
	} catch (e) {
		log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - create user - "+e.name+": "+e.message);
		res.json({ok: false, error: e.name, reason: e.message});
	}
});

//confirm account
app.post('/confirm',function(req,res){
	var now = new Date();	
	try {
		check(req.body.user).notNull().is(/^([a-z]|[0-9]|[A-Z]|_|-)+$/);
		check(req.body.code).notNull().is(/^([a-f]|[0-9])+$/);
		jsUgrRegistration.confirm(req.body,req.headers['x-forwarded-for'].split(',')[0])(function(response){
			if(response.ok){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - confirm user - success");
			}else{
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - confirm user - "+response.error+": "+response.reason);
			}
			res.json(response);	
		});
	} catch (e) {
		log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - confirm user - "+e.name+": "+e.message);
		res.json({ok: false, error: e.name, reason: e.message});
	}

});

//request password change
app.post('/request_pwd',function(req,res){
	var now=new Date();
	try {
		check(req.body.user).notNull().is(/^([a-z]|[0-9]|[A-Z]|_|-)+$/);
		jsUgrRegistration.pwdRequest(req.body)(function(response){
			if(response.ok){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - request pw change - success");
			}else{
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - request pw change - "+response.error+": "+response.reason);
			}
			res.json(response);	
		});

	} catch (e) {
		log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - request pw change - "+e.name+": "+e.message);
		res.json({ok: false, error: e.name, reason: e.message});
	}
});

//reset password confirm
app.post('/reset_pwd',function(req,res){
	var now=new Date();	
	try {
		check(req.body.user).notNull().is(/^([a-z]|[0-9]|[A-Z]|_|-)+$/);
		check(req.body.pass).notNull().is(/^(?=.*\d)(?=.*[a-zA-Z]).{6,20}$/gm);
		check(req.body.code).notNull().is(/^([a-f]|[0-9])+$/);
		jsUgrRegistration.pwdConfirm(req.body,req.headers['x-forwarded-for'].split(',')[0])(function(response){
			if(response.ok){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - change password - success");
			}else{
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - change password - "+response.error+": "+response.reason);
			}
			res.json(response);
		});
	} catch (e) {
		log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - change password - "+e.name+": "+e.message);
		res.json({ok: false, error: e.name, reason: e.message});
	}
});

//login
app.post('/login',function(req,res){
	var now=new Date();	
	try {
		check(req.body.user).notNull().is(/^([a-z]|[0-9]|[A-Z]|_|-)+$/);
		check(req.body.pass).notNull();
		jsUgrSessions.login(req.body.user,req.body.pass,req.headers['x-forwarded-for'].split(',')[0])(function(response){
			if(response.ok){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - login - success");
			}else{
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - login - "+response.error+": "+response.reason);
			}
			res.json(response);
		});	
	} catch (e) {
		log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - login - "+e.name+": "+e.message);
		res.json({ok: false, error: e.name, reason: e.message});
	}
});

//logout
app.post('/logout',function(req,res){
	var now=new Date();	
	try {
		check(req.body.user).notNull().is(/^([a-z]|[0-9]|[A-Z]|_|-)+$/);
		jsUgrSessions.logout(req.body.user,req.headers['x-forwarded-for'].split(',')[0],req.body.token)(function(response){
			if(response.ok){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - logout - success");
			}else{
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - logout - "+response.error+": "+response.reason);;
			}
			res.json(response);
		});
	} catch (e) {
		log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - logout - "+e.name+": "+e.message);
		res.json({ok: false, error: e.name, reason: e.message});
	}
});

// check if user is logged in
app.post('/check',function(req,res){
	var now=new Date();	
		var check=jsUgrSessions.checkLogin(req.body.user,req.headers['x-forwarded-for'].split(',')[0],req.body.token) 
		if(check.ok){
			log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - check login - success");
		}else{
			log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - check login - fail");		
		}
		res.json(check);
	
});

//************************************************Poll**************************************************
//petition to send poll data
app.post('/poll',function(peticion,respuesta){
	var now=new Date();
	// Generate UUID
	var clave = uuid.v1();
	//initialize response
	var response = {};
	//try to save to couchdB
	encuesta.save(clave,peticion.body,function(err){
		if (err) {
			log.err(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - save poll entry - "+err.error+" - "+err.reason);
			response.ok=false;
			response.error=err.error;
			response.reason.err.reason;
		}else{
			response.ok=true
			response.uuid=clave;
			log.info(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - save poll entry - success");
		}
		respuesta.json(response);
	});
	smtpTransport.sendMail({
	   from: "JS UGR <vroom@correo.ugr.es>", 
	   to: "vroom@correo.ugr.es", 
	   subject: "Poll Sent", 
	   text: peticion.body.answer1 + "\n" + peticion.body.answer2 + "\n" + peticion.body.answer3 + "\n" + peticion.body.answer4 + "\n" + peticion.body.answer5 + "\n" + peticion.body.answer6 + "\n" + peticion.body.answer7 + "\n" + peticion.body.answer8 + "\n" + peticion.body.answer9 + "\n" + peticion.body.answer10 + "\n" 
	}, function(error, response){
		if(!err){
			log.info(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - sent poll mail - success");
		}else{
			log.err(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - sent poll mail - "+err.error+" - "+err.reason);
		}
	});
});

// petition to get poll data
app.post('/results',function(req,res){
	var now=new Date();
	var response={};
	request('http://localhost:5984/js_ugr_encuesta/_design/respuestas/_list/media/resultados', function (err, response, body) {
		if (!err && response.statusCode == 200) {
			if (err) {
				log.err(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - request poll data - "+err.error+" - "+err.reason);
				response.ok=false;
				response.error=err.error;
				response.reason.err.reason;
			}else{
				response.ok=true
				response.body=JSON.parse(body);
			log.info(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - request poll data - success");
			}
			res.json(response);
		}
	});
});

// petition to get raffle result
app.post('/raffle',function(req,res){
	var now =new Date();
	var response={};
	request('http://localhost:5984/js_ugr_docs/_all_docs?startkey=%22_design/%22&endkey=%22_design0%22&include_docs=true', 
		function (err, response, body) {
			if (err) {
				log.err(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - request raffle result - "+err.error+" - "+err.reason);
				response.ok=false;
				response.error=err.error;
				response.reason.err.reason;
			}else{
				var cuerpo=JSON.parse(body);
				var ganador="_design/svroom";
				while(ganador=='_design/svroom'||ganador=='_design/sr7lu'||ganador=='_design/salmmart'||ganador=='_design/svalensr'){				
					var a=Math.floor((Math.random()*cuerpo.rows.length));
					ganador=cuerpo.rows[a].id;
				}
				response.ok=true;
				response.body=ganador;
				log.info(peticion.headers['x-forwarded-for'].split(',')[0]+" - "+peticion.body.user+" - request raffle result - success");
			}
			res.send(response);
		}
	);
});


//**********************************************Shared Documents************************************************
app.post('/share',function(req,res){
	var now=new Date();
	var response={};
	  db.get(req.body.id, function (err, doc) {
		if (err) {
			log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get shared document "+req.body.id+" - "+err.error+": "+err.reason);
			response.ok=false;
			response.error=err.error;
			response.reason=err.reason;
		}else{
			response.ok=true
			response.body=doc;
			log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get shared document "+req.body.id+" - success");
		}
		res.json(response);		
  	});
});

//***************************************************Sites***************************************************
app.get('/site',function(req,res){
	
});
//**********************************************Authentication************************************************
app.post('/*', function(req, res, next) {
	var now = new Date();	
		for(var i in req.body.library){
			req.body.library[i]=sanitize(req.body.library[i]).trim('<&"\'>');
		}
		var check=jsUgrSessions.checkLogin(req.body.user,req.headers['x-forwarded-for'].split(',')[0],req.body.token) 
		if(check.ok){
			log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - authenticate - success");
			next();
		}else{
			log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - authenticate - fail");
			res.json(check);		
		}
		

});

//***********************************************************************************************************
//********************************* Requests that need full authentication **********************************
//***********************************************************************************************************

//Request publication of project to file structure
app.post('/publish', function( req,res) {
	var now = new Date();
	fs.mkdir(path+req.body.user,function(e){
    if(!e || (e && e.code === 'EEXIST')){
			//separate body from head if they are defined
			var body=req.body.html.split("<body>");
			if(body.length>1){
				body=body[1].split("</body>");
				if(body.length>1){
					body=body[0];
				}
			}
			var head=req.body.html.split("<head>");
			if(head.length>1){
				head=head[1].split("</head>");
				if(head.length>1){
					head=head[0];
				}
			}else{
				head="";
			}
			libraries="";
			for(i in req.body.library){
				var temp='<script src='+req.body.library[i]+'></script>\n';
				libraries+=temp;
			}
			//write file index.html
			var newPath = path+req.body.user+"/index.html";
			fs.writeFile(newPath,"<html>\n<head>\n"+libraries+"<script type=\"text/javascript\">"+req.body.js+"</script>\n<style type=\"text/css\">"+req.body.css+"</style>\n<title>"+req.body.title+"</title>\n"+head+"\n</head>\n<body>\n"+body+"\n</body>\n</html>\n",function(err){
				if (err) {
					log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - publish - "+err.error+": "+err.reason);
					res.json({ok: false, error: "Could not write file", reason: err});

				}else{
					log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - publish - success");
					res.json({ok: true})
				}
			});
		} else {
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - publish - "+e);
				res.json({ok: false, error: "Could not create user folder", reason: e});
		}
	});	
});

// save document to couchdB
app.post('/save',function(req,res){
	var now = new Date();
	//delete token
	var file=req.body;
	delete file.token;
	if(!req.body.id){
		// generate uuid
		var clave = uuid.v1();
		//save JSON to couchdB
		db.save(clave,file,function(err){
			if (err) {
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - save file "+clave+" - "+err.error+": "+err.reason);			
				res.json({ok: false, error: err.error,reason: err.reason});
			}else{
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - save file "+clave+" - success");	
				res.json({ok: true, uuid: clave});
			}
		});
	}else{
		db.get(req.body.id, function (err, doc) {
				if (err) {
					log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - overwrite file "+req.body.id+" - "+err.error+": "+err.reason);	
					res.json({ok: false, error: err.error,reason: err.reason});
				}else{
					if(doc.user==req.body.user){
						var clave = req.body.id;
						//save JSON to couchdB
						db.save(clave,file,function(err){
							if (err) {
								log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - overwrite file "+req.body.id+" - "+err.error+": "+err.reason);			
								res.json({ok: false, error: err.error,reason: err.reason});
							}else{
								log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - overwrite file "+req.body.id+" - success");	
								res.json({ok: true, uuid: clave});
							}
						});
					}else{
							log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - overwrite file "+req.body.id+" - permission denied: not file owner");
							res.json({ok: false, error: "Permission denied", reason: "Not File Owner"});						
					}
				}
		});
	}
});


// get a list of all titles from couchdB 
app.post('/all_docs',function(req,res){
	var now = new Date();
	var response={};
 	db.view(req.body.user+'/titles', function (err, data) {
		if (err) {
			log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get file list - "+err.error+": "+err.reason);
			res.json({ok: false, error: err.error,reason: err.reason});
		}else{
			log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get file list - success");	
			res.json({ok: true, body: data});
		}		

  });     		
});

// delete a file from couchdB
app.post("/delete",function(req,res){
	var now = new Date();
	if(req.body.id!=""){
		db.get(req.body.id, function (err, doc) {
			if (err) {
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - delete file "+req.body.id+" - "+err.error+": "+err.reason);
				res.json({ok: false, error: err.error,reason: err.reason});
			}else{
				if(req.body.user==doc.user){
					db.remove(doc._id, doc._rev,function(err,resp){
						if (err) {
							log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - delete file "+req.body.id+" - "+err.error+": "+err.reason);
							res.json({ok: false, error: err.error,reason: err.reason});
						}else{
							log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - delete file "+req.body.id+" - success");
							res.json({ok: true, uuid: "cargar"});
						}
					});
				}else{
					log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - delete file "+req.body.id+" - permission denied: not file owner");
					res.json({ok: false, error: "permission denied",reason: "the file is not yours to delete"});
				}
			}
		});
	}
});

// get a file from couchdB
app.post('/get_doc',function(req,res){
	var now = new Date();
	db.get(req.body.id, function (err, doc) {
		if (err) {
				log.err(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get file "+req.body.id+" - "+err.error+": "+err.reason);
				res.json({ok: false, error: err.error,reason: err.reason});
		}else{
			if(req.body.user==doc.user){
				log.info(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get file "+req.body.id+" - success");;
				res.json({ok: true, body: doc});
			}else{
			log.alert(req.headers['x-forwarded-for'].split(',')[0]+" - "+req.body.user+" - get file "+req.body.id+" - permission denied: not file owner");
				res.json({ok: false, error: "permission denied",reason: "the file is not yours"});
			}
		}
  });
});


app.listen(80);
log.info('Server running at http://127.0.0.1:80/\n');


