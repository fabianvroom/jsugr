function pad(dato){
	if(dato<10){
	dato="0"+dato;
	}
	return dato;
}	

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getVar(name){
	get_string = document.location.search;         
	return_value = '';
 
	do { //This loop is made to catch all instances of any get variable.
		name_index = get_string.indexOf(name + '=');
		
		if(name_index != -1){
	  		get_string = get_string.substr(name_index + name.length + 1, get_string.length - name_index);
	  
	  		end_of_value = get_string.indexOf('&');
	  		if(end_of_value != -1)                
	    		value = get_string.substr(0, end_of_value);                
	  		else                
	    	value = get_string;                
	    
	  		if(return_value == '' || value == '')
	     		return_value += value;
	  		else
	     		return_value += ', ' + value;
      	}
    } while(name_index != -1)
    
	//Restores all the blank spaces.
	space = return_value.indexOf('+');
	while(space != -1){ 
		return_value = return_value.substr(0, space) + ' ' + 
		return_value.substr(space + 1, return_value.length);
		space = return_value.indexOf('+');
	}
	return(return_value);        
}

function writeAlert(id,alert){
	$('#'+id).html('<div class="alert alert-error fade in">\n'+alert+'<a class="close" data-dismiss="alert" href="#">&times;</a></div>');
}
