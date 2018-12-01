(function($) {
		
	function pad(dato){
		if(dato<10){
		dato="0"+dato;
		}
		return dato;
	}	
	
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
	function visualLength(string){

	    $("#ruler").html(string);
	    return ruler.offsetWidth;
	}

	function trimToPx(string,length){
	    var trimmed=string;
	    var aux=string;
	    if (visualLength(string) > length){
	        while (visualLength(trimmed) > length){
	            aux = aux.substring(0, aux.length-1);
	            trimmed=aux+"...";
	        }
	    }
	    return trimmed;
	}

	$.fn.jsUgrSave = function(data,f) {
		return this.on('click',function() {
			$('#btn-save').html('<img class="loading"src="image/ajax-loader.gif">');
			var now=new Date();
			var libraries={};
			$("#libraries a.library.selected").each(function(index){
				libraries['library'+index]=$(this).attr('value');
			});
			$.post('/save', {
				user: getCookie("username"),
				token: getCookie("token"),
				library: libraries,
				title:  document.getElementById("input-title").value,
				html: data.editor_html.getValue(),
				css: data.editor_css.getValue(),
				js: data.editor_js.getValue(),
				time: now
			}, function(data) {
				$('#btn-save').html('Save new');
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrOverwrite = function(data,f) {
		return this.on('click',function() {
			$(this).find("i").hide();
			$(this).find("img").show();
			var now=new Date();
			var libraries={};
			$("#libraries a.library.selected").each(function(index){
				libraries['library'+index]=$(this).attr('value');
			});
			$.post('/save', {
				user: getCookie("username"),
				token: getCookie("token"),
				library: libraries,
				title:  document.getElementById("input-title").value,
				html: data.editor_html.getValue(),
				css: data.editor_css.getValue(),
				js: data.editor_js.getValue(),
				id: $(this).parent().attr('value'),
				time: now
			}, function(data) {
			$(this).find("img").hide();
			$(this).find("i").show();
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrDelete = function(f) {
		return this.on('click',function() {
			$(this).parent().find(".file-update").find("i").hide();
			$(this).parent().find(".file-update").find("img").show();
			var uuid=$(this).parent().attr('value');
			$.post('/delete', {
				user: getCookie("username"),
				token: getCookie("token"),
				id: uuid
			}, function(data) {
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};

	$.fn.jsUgrShare = function(code,f) {
		return this.on('click',function() {
			$.post('/share', {
				id: code
			}, function(data) {		
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrGet = function(f) {
		return this.on('click',function() {
			$(this).parent().find(".file-update").find("i").hide();
			$(this).parent().find(".file-update").find("img").show();
			var uuid=$(this).parent().attr('value');
			$.post('/get_doc', {
				user: getCookie("username"),
				token: getCookie("token"),
				id: uuid
			}, function(data) {	
				$(this).parent().find(".file-update").find("img").hide();
				$(this).parent().find(".file-update").find("i").show();	
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrList = function(f) {
		return this.bind('ready recheck',function() {
			$.post('/all_docs', {
				user: getCookie("username"),
				token: getCookie("token")
			}, function(data) {
				if(data.ok){
					$(".jsUgr-files").each(function(){
						$(this).find('ul').html('<li>\n<a id="load-blank" alt="clear everything" title="clear everything"><i class="icon-remove"> </i> blank</a>\n</li>\n<li class="divider"</li>\n'); 
						for(i in data.body){
							if(data.body[i].id.substring(0, 8)=='template'){
								$(this).find('ul').append('<li>\n<a class="file-load" title="Load template" alt="Load template" value="'+data.body[i].id+'"><span class="this-file-load"><i class="icon-align-left"> </i> '+data.body[i].key+'</span>  <span class="file-update" title="overwrite template" alt="overwrite template"> <i class="icon-refresh"></i> <img style="display: none" class="loading"src="image/ajax-loader.gif"></span></a>\n</li>\n');
							}
						}
						$(this).find('ul').append('<li class="divider"</li>\n');
						for(i in data.body){
							var time=new Date(data.body[i].value);
							var date=time.getFullYear()+'/'+pad(time.getMonth()+1)+'/'+pad(time.getDate())+' - '+pad(time.getHours())+':'+pad(time.getMinutes())+':'+pad(time.getSeconds());
	
							if(data.body[i].id.substring(0, 8)!='template'){
								$(this).find('ul').append('<li>\n<a class="file-load" value="'+data.body[i].id+'"><span class="this-file-load" alt="load file" title="'+date+'"><i class="icon-file"> </i> '+trimToPx(data.body[i].key,164)+'</span> <span class="file-delete" title="delete file" alt="delete file"><i class="icon-trash"> </i> </span><span class="file-share" alt="share file"> <i class="icon-share"></i> </span><span class="file-update" title="overwrite file" alt="overwrite file"> <img style="display: none" class="loading"src="image/ajax-loader.gif"><i class="icon-refresh"></i> </span></a>\n</li>\n');
							}
						}
						$("span").each(function(){
							$(this).hover(
								function(){
									$(this).find('i').addClass("icon-white")
								},function(){
								$(this).find('i').removeClass("icon-white")
							});
						});
						$(this).find('ul').find('a').on('click', function (e) {
						  e.stopPropagation()
						});
					});
				}else{
					$(".jsUgr-files").each(function(){
						$(this).find('ul').html('<li>\n<a href="#">Login or Register to use this feature.</a>\n</li>\n'); 
					});
				}
				
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrPublish = function(data, f) {
		return this.on('click',function() {
			$('#btn-publish').html('<img class="loading"src="image/ajax-loader.gif">');
			var now=new Date();
			var date=now.getFullYear()+'/'+pad(now.getMonth())+'/'+pad(now.getDay())+' - '+pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());
			var libraries={};
			$("#libraries a.library.selected").each(function(index){
				libraries['library'+index]=$(this).attr('value');
			});
			$.post('/publish', {
				user: getCookie("username"),
				token: getCookie("token"),
				library: libraries,
				title:  document.getElementById("input-title").value,
				html: data.editor_html.getValue(),
				css: data.editor_css.getValue(),
				js: data.editor_js.getValue(),
				time: date
			}, function(data) {
				$('#btn-publish').html('Publish');
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
})(jQuery);
