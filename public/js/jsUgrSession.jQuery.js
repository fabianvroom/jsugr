(function($) {
	var server = 'localhost',
		port = '80';


	function setCookie(c_name,value){
		exdays=1;
		var exdate=new Date();
		exdate.setDate(exdate.getDate() + exdays);
		var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
		document.cookie=c_name + "=" + c_value;
	}
	
	function getCookie(c_name){
		var c_value = document.cookie;
		var c_start = c_value.indexOf(" " + c_name + "=");
		if(c_start == -1){
		  	c_start = c_value.indexOf(c_name + "=");
		}
		if (c_start == -1){
		  	c_value = null;
		}else{
		  	c_start = c_value.indexOf("=", c_start) + 1;
		  	var c_end = c_value.indexOf(";", c_start);
		  	if (c_end == -1){
				c_end = c_value.length;
			}
			c_value = unescape(c_value.substring(c_start,c_end));
		}
		return c_value;
	}
	
	$.fn.jsUgrLogout = function(f) {
		return this.on('click',function() {
			var user=getCookie("username");
			var token=getCookie("token");
			$.post('http://'+server+':'+port+'/logout', {
				'user' : user,
				'token' : token
			}, function(data) {
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrLogin = function(f) {
		return this.on('click',function() {
			$('#login').html('<img class="loading"src="image/ajax-loader.gif">');
			$.post('http://'+server+':'+port+'/login', {
				'user' : $('.jsUgr.user').find('input').val(),
				'pass' : $('.jsUgr.pass').find('input').val()
			}, function(data) {
				setCookie("username",data.user);
				setCookie("token",data.token);
				$('#login').html('Sign in');
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	$.fn.jsUgrCheck = function(f){
		return this.bind('ready recheck',function() {
				var user=getCookie("username");
				var token=getCookie("token");
				$.post('http://'+server+':'+port+'/check',{
					'user': user,
					'token': token
				}, function(data) {
					if(!data.ok){
						//destroy cookies
						setCookie("username","");
						setCookie("token","");
					}
					if ( typeof f == "function")
						f(data);
					else
						alert('jsUgrSend callback error');
				});	
			});
	}		
						
})(jQuery);
