/**
 * Point of entry, the main controller of the application.
 */
var App = Backbone.View.extend({

	events: {
		'click .add-track-btn': 'showForm'
	},

	initialize: function() {

		// playlist collection
		this.playlists = new App.Playlists();

		// add track form
		this.addTrackForm = new App.AddTrackForm({
			el: '.add-track-form'
		});

		// playlists menu
		this.menu = new App.MenuView({
			el: '.playlists',
			collection: this.playlists
		});

		// playlist display
		this.showPlaylist(this.playlists.selected);
		this.playlists.on('select', this.showPlaylist, this);

		// set bookmarklet
		this.$('.bookmarklet').attr('href',
			"javascript:window.open('" +
			encodeURI(window.location.protocol + '//' +
			window.location.host + 
			window.location.pathname) +
			"bookmarklet.html%3F'%2BencodeURI(window.location.href)%2C'add-track'%2C%20'width%3D500%2Cheight%3D180')");
	},

	showForm: function() {
		this.addTrackForm.show();
	},

	showPlaylist: function(playlist) {
		// remove previous playlist
		if(this.playlistView) {
			this.playlistView.remove();
			this.addTrackForm.off('submit');
		}
		// show playlist
		this.playlistView = new App.PlaylistView({
			el: '.container',
			model: playlist
		});
		// add track to playlist
		this.addTrackForm.on('submit', this.playlistView.addTrack, 
			this.playlistView);
	}
});

// application views

/**
 * Manage the form that adds SoundCloud track urls
 * to the playlists.
 */
App.AddTrackForm = Backbone.View.extend({
	events: {
		'click .cancel': 'hide',
		'submit': 'submit'
	},

	initialize: function() {
		this.input = this.$('input');
		this.hide();
		_.bindAll(this, 'success', 'error');
	},

	show: function() {
		this.$el.show();
		this.input.focus();
		return this;
	},

	hide: function() {
		this.input.val('');
		this.hideError();
		this.$el.hide();
		return this;
	},

	hideError: function() {
		// hide previous error
		this.$('.control-group')
			.removeClass('error')
			.filter('.message').hide();
	},

	submit: function() {
		var url = this.input.val().trim();

		this.hideError();

		if(url) {
			App.Playlist.validateTrack(url, this.success, this.error);
		}
		return false;
	},

	/** Adding a valid url */
	success: function(url, response) {
		this.trigger('submit', url);
		this.hide();
	},

	/** the url did not vaidate */
	error: function() {
		this.$('.control-group')
			.addClass('error')
			.filter('.message').show();
	}
});

/**
 * Displays a "live" collection, handles inserts and deletions 
 * without re-rendering every item.
 */
App.CollectionView = Backbone.View.extend({

	initialize: function() {
		this.collection.on('add', this.onAdd, this);
		this.collection.on('remove', this.onRemove, this);
		// TODO on 'reset'
		this.views = [];
	},

	append: function(el) {
		this.$el.append(el);
	},

	onAdd: function(model, collection, options) {
		// TODO: options.index
		var view = new this.itemView({model: model, parent: this})
			.render();
		this.append(view.$el);
		this.views.push(view);
	},

	onRemove: function(model, collection, options) {
		this.views[options.index].remove();
		this.views.splice(options.index, 1);
	},

	render: function() {
		this.collection.forEach(function(model) {
			this.onAdd(model);
		}, this);
		return this;
	},

	remove: function() {
		this.collection.off(null, null, this);
	}
});

/**
 * Displays a single menu item that can be selected
 * and unselected. Updates model's selected attribute.
 */
App.MenuItemView = Backbone.View.extend({

	tagName: 'li',

	events: {
		click: 'select'
	},

	initialize: function() {
		this.model.on('change', this.render, this);
	},

	render: function() {
		this.$el.html($('<a>', {
			text: this.model.get('title') || 'Untitled list',
			href: '#'
		}))
		.toggleClass('active', !!this.model.get('selected'));
		return this;
	},

	select: function() {
		this.model.set('selected', true);
		return false;
	}
});

/**
 * Displays collection as a list of selectable items.
 * Guarantees a single element to be selected, exposes it 
 * as this.selected.
 * Adds and removes items.
 */
App.MenuView = App.CollectionView.extend({

	/** Renders a single collection item */
	itemView: App.MenuItemView,

	events: {
		'click .create-btn': 'add',
		'click .destroy-btn': 'remove'
	},

	initialize: function() {
		App.CollectionView.prototype.initialize.apply(this, arguments);
		
		// menu items will be "appended" relative to this
		// (<li>'s can't have a common parent in <ul>)
		this.insertion = this.$el.find('.divider');

		this.render();
	},

	/** @override */
	append: function(element) {
		element.insertBefore(this.insertion);
	},

	/** Adds a new item and selects it */
	add: function() {
		this.collection.add({selected: true});
		return false;
	},

	/** Removes selected item */
	remove: function() {
		this.collection.remove(this.collection.selected);
		return false;
	}
});

/** 
 * Renders a single track
 */
App.TrackView = Backbone.View.extend({

	className: 'track',

	SCevents: ['ready', 'play', 'finish', 'pause'],

	events: {
		'click .close': 'destroy'
	},

	initialize: function() {
		this.on('play', this.onPlay, this);
		this.on('pause', this.onPause, this);
	},

	render: function() {
		// delete button
		this.$el.append('<a class="close" href="#">&times;</a>');

		// SoundCloud player
		SC.oEmbed(this.model.get('url'), {
			show_comments: false,
			liking: false,
			sharing: false,
			show_artwork: false,
			show_playcount: false
		}, _.bind(this.onLoad, this));

		return this;
	},

	onPlay: function() {
		this.$el.addClass('playing');
	},

	onPause: function() {
		this.$el.removeClass('playing');
	},

	/** SoundCloud oEmbed data has been loaded */
	onLoad: function(data) {
		if(data && data.html) {
			// create SC iframe
			this.$el.append(data.html);
			var iframe = this.$('iframe');
			// create widget
			// FIXME this throws erron on the second run
			this.widget = SC.Widget(iframe[0]);
			// proxy SC events through Event.trigger
			_.each(this.SCevents, function(event) {
				this.widget.bind(SC.Widget.Events[event.toUpperCase()], 
					_.bind(this.triggerSC, this, event));
			}, this);
		} else {
			this.$el.append(this.model.get('url') + ' did not load.');
		}
	},

	triggerSC: function(event) {
		this.trigger(event);
		this.options.parent.trigger(event, this);
	},

	remove: function() {
		// unbind widget events
		if(this.widget) {
			_.each(this.SCevents,function(event) {
				//console.log('unbind', SC.Widget.Events[event.toUpperCase()]);
				this.widget.unbind(SC.Widget.Events[event.toUpperCase()]);
			}, this);
		}
		this.$el.remove();
	},

	/** Destroy this track */
	destroy: function() {
		this.model.destroy();
		return false;
	}
});

/** 
 * Renders a playlist with title, description and 
 * playable tracks.
 */
App.PlaylistView = App.CollectionView.extend({

	itemView: App.TrackView,

	initialize: function() {
		this.collection = this.model.getTracks();
		App.CollectionView.prototype.initialize.apply(this, arguments);

		// editable fields
		this.title = new App.EditableView({
			el: '.playlist-title',
			model: this.model,
			attr: 'title',
			placeholder: 'No title yet, click to edit'
		});
		this.description = new App.EditableView({
			el: '.playlist-description',
			model: this.model,
			attr: 'description',
			placeholder: 'Click to add description'
		});

		// empty list alert
		this.empty = this.$('.empty-list')
			.toggle(!this.collection.length);
		this.collection.on('add remove', function() {
			this.empty.toggle(!this.collection.length);
		}, this);

		// tracks container
		this.tracks = this.$('.tracks');

		this.render();

		this.on('finish', this.onFinish, this);

		// set and update title
		this.setTitle(this.model);
		this.model.on('change:title', this.setTitle, this);
	},

	/** sets document.title */
	setTitle: function(playlist) {
		// set window title
		document.title = (playlist.get('title') || 'Untitled') +
			' | SoundCloud Playlist';
	},

	/** Track finished playing */
	onFinish: function(track) {
		// play next track
		var index = _.indexOf(this.views, track);
		if(index > 0 && index < this.views.length - 1) {
			this.views[index + 1].widget.play();
		}
	},

	/** Add track by url to this playlist */
	addTrack: function(url) {
		this.collection.add({
			url: url
		});
	},

	/** @override */
	append: function(element) {
		this.tracks.append(element);
	},

	/** @override */
	remove: function() {
		App.CollectionView.prototype.remove.apply(this, arguments);
		// remove without removing this.el
		this.undelegateEvents();
		this.title.remove();
		this.description.remove();
		this.model.off('change:title', this.setTitle, this);
		_.invoke(this.views, 'remove');
	}
});

/** 
 * "Inline" editable attribute
 */
App.EditableView = Backbone.View.extend({

	events: {
		click: 'edit',
		focusout: 'done',
		keypress: 'keypressed'
	},

	initialize: function() {
		this.val(this.model.get(this.options.attr));
	},

	edit: function() {
		if(!this.input) {
			this.$el.empty();
			this.input = $('<input type="text">')
				.val(this.model.get(this.options.attr))
				.appendTo(this.$el)
				.focus();
		}
	},

	done: function() {
		var val = $.trim(this.input.val());
		this.model.set(this.options.attr, val).save();
		this.val(val);
		delete this.input;
	},

	keypressed: function(event) {
		if(event.keyCode === 13) { 
			// enter
			this.done();
		}
	},

	val: function(val) {
		if(val && val.length) {
			this.$el.removeClass('empty')
				.text(val);
		} else {
			this.$el.addClass('empty')
				.text(this.options.placeholder);
		}
	},

	remove: function() {
		// remove without removing this.el
		this.undelegateEvents();
		if(this.input) {
			this.input.remove();
		}
	}
});

$(function() {
	window.app = new App({el: 'body'});
});
