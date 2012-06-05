$(function() {
	var url = decodeURI(window.location.search.substring(1)).trim();
	var alert = $('.alert');
	var message = alert.find('p:first');
	$('button').click(function() {
		window.close();
	});

	if(url) {
		App.Playlist.validateTrack(url, success, error);
	} else {
		error();
	}

	function success(url) {
		var playlists = new App.Playlists();
		playlists.selected.getTracks().add({
			url: url
		});

		alert.addClass('alert-success').show();
		message.html('Track successfully added to <b></b> playlist.');
		message.find('b').text(playlists.selected.get('title'));
	}

	function error() { 
		alert.addClass('alert-error').show();
		message.text('This does not seem to be a valid SoundCloud track.');
	}

});
