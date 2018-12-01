(function($) {

	function validateUser(string){
		var testString = /^([a-z]|[0-9]|[A-Z]|_|-)+$/;
		if (string.length > 256) {
			return{ok: false, reason:'input too long'};
		}
		if (!testString.test(string)&&string!="") {
			return {ok: false, reason:'invalid character'};
		}
		if(string==""){
			return {ok: false, reason:'required field'};
		}
		return {ok: true};
	}
	
	function validateMail(string){
		var testString =  /[a-zA-Z0-9-]{1,}@([a-zA-Z\.])?[a-zA-Z]{1,}\.[a-zA-Z]{1,4}/gi;
		if(string==""){
			return {ok: false, reason: 'required field'};
		}
		if (string.length > 256) {
			return{ok: false, reason: 'input too long'};
		}
		if (!testString.test(string)) {
			return {ok: false, reason: 'incorrect format'};
		}
		return {ok: true};
	}
	
	function validateCode(string){
		var testString = /^([a-f]|[0-9])+$/;
		if(string==""){
			return {ok: false, reason:'required field'};
		}
		if (!testString.test(string)) {
			return {ok: false, reason:'only lowercase hexadecimals'};
		}
		if (string.length != 32) {
			return{ok: false, reason:'codes are 32 characters long'};
		}
		
		return {ok: true};
	}
	
	function validatePass(string){
		var testString = /^(?=.*\d)(?=.*[a-zA-Z]).{6,20}$/gm;
		if (string=="") {
			return {ok: false, reason:'required field'};
		}
		if (string.length < 6) {
			return {ok: false, reason:'password too short'};
		}
		if (!testString.test(string)) {
			return {ok: false, reason:'must include letters and numbers'};
		}
		if (string.length > 256) {
			return {ok: false, reason:'must include letters and numbers'};
		}
		return {ok: true};
	}
	
	function comparePass(string1,string2){
		if (string1!=string2) {
			return {ok: false, reason:'passwords do not match'};
		}else{
			return {ok: true};
		}
	}
	$.fn.jsUgrRegister = function(option, f) {
		return this.on('click',function() {
			$('#jsUgrSend').html('<img class="loading"src="../image/ajax-loader.gif">');
			$("#jsUgrSend").attr("disabled", "disabled");
			$.post('/'+option, {
				'user' : $('.jsUgr.user').find('input').val(),
				'email' : $('.jsUgr.email').find('input').val(),
				'pass' : $('.jsUgr.pass').find('input').val(),
				'code' :$('.jsUgr.code').find('input').val(),
			}, function(data) {
				$('#jsUgrSend').html('Send');
				if ( typeof f == "function")
					f(data);
				else
					alert('jsUgrSend callback error');
			});	
		});
	};
	
	$.fn.jsUgrValidator =  function(data,f){
		var inputsOk={};
		//each field in the form should be wrapped in a container class "jsUgr user" "jsUgr mail" "jsUgr code" 
		//"jsUgr pass" or jsUgr pass2" which contains the input, an image class="jsUgrCheck" and a container 
		//class="jsUgrError"
		$(".jsUgr",this).each(function(index){
			inputsOk["input"+index]=false;
			$(this).attr("id","input"+index).find("input").bind('change keyup blur',function(){
				if($(this).parent().hasClass("user")){
					var check=validateUser($(this).val());
					inputsOk[$(this).parent().attr('id')]=check.ok;
				}
				if($(this).parent().hasClass("pass")){
					var check=validatePass($(this).val());
					inputsOk[$(this).parent().attr('id')]=check.ok;
					$(".jsUgr.pass2").find("input").trigger('click');
				}
				if($(this).parent().hasClass("pass2")){
					var check=comparePass($(this).val(),$(".jsUgr.pass").find("input").val());
					inputsOk[$(this).parent().attr('id')]=check.ok;
				}
				if($(this).parent().hasClass("email")){
					var check=validateMail($(this).val());
					inputsOk[$(this).parent().attr('id')]=check.ok;
				}
				if($(this).parent().hasClass("code")){
					var check=validateCode($(this).val());
					inputsOk[$(this).parent().attr('id')]=check.ok;
				}
				if(check.ok){
					$(this).parent().find(".jsUgrCheck").show();
					$(this).parent().find(".jsUgrError").hide();
					$(this).parent().removeClass("control-group error");
					$(this).parent().addClass("control-group success");
					
				}else{
					$(this).parent().find(".jsUgrCheck").hide();
					$(this).parent().find(".jsUgrError").show();
					$(this).parent().find(".jsUgrError").html(check.reason);
					$(this).parent().removeClass("control-group success");
					$(this).parent().addClass("control-group error");
				}
				var allOk=true;
				for(i in inputsOk){
					if(!inputsOk[i]){
						allOk=false;
					}
				}
				if(allOk){
					$("#jsUgrSend").removeAttr("disabled");
				}else{
					$("#jsUgrSend").attr("disabled", "disabled");
				}	
			});
			if ( typeof f == "function"){
				f(data);
			}else{
				alert('jsUgrValidator Callback Error');
			}		
		});
	};

	
})(jQuery);
