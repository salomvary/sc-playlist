// create namespace if needed
if(typeof App === 'undefined') App = {};

/**
 * Extends collection with the capability of having one single
 * model guaranteed to be selected all times. The selected model
 * will be exposed as "selected" property.
 */
App.SelectableCollection = Backbone.Collection.extend({

	initialize: function() {
		// bind collection events
		this.on('change:selected', this.onSelect);
		this.on('add', this.onAdd);
		this.on('remove', this.onRemove);
		this.on('reset', this.onReset);
	},

	/** Collection was reset/initialized */
	onReset: function() {
		// initialize this.selected
		var selected = this.where({selected: true});
		// TODO handle length > 1
		if(selected.length) {
			this.selected = selected[0];
			this.trigger('select', this.selected);
		} else {
			this.add({selected: true});
		}
	},

	/** Collection item added */
	onAdd: function(model) {
		if(model.get('selected')) {
			if(this.selected) {
				this.selected.unset('selected');
			}
			this.selected = model;
			this.trigger('select', this.selected);
		}
	},

	/** Collection item's selected state changes */
	onSelect: function(model, isSelected) {
		if(isSelected) {
			this.selected.unset('selected');
			this.selected = model;
			this.trigger('select', this.selected);
		}
	},

	/** Collection item removed */
	onRemove: function(model, collection, options) {
		if(! this.length) {
			// if the removed was the last item, add a new 
			// empty item
			this.add({selected: true});
		} else if(model.get('selected')) {
			// if the removed item was selected, select the
			// previous one or the next if it was the first
			this.selected = this.at(options.index > 0 ? options.index - 1 : 0)
				.set('selected', true);
		}
	}
});

/**
 * Playlist is a list of tracks and some metadata
 */
App.Playlist = Backbone.Model.extend({

	collection: App.Playlists,

	/** Converts array of strings into collection.  */
	getTracks: function() {
		if(! this.tracks) {
			this.tracks = 
				new Backbone.Collection(_.map(this.get('tracks'), function(track) {
					return {url: track};
				}));
			this.tracks.on('change add remove', function() {
				this.set('tracks', this.tracks.map(function(track) {
					return track.get('url');
				}));
			}, this);
		}
		return this.tracks;
	}
},
// "static" methods
{
	validateTrack: function(url, success, error) {
		// validate with oembed
		SC.oEmbed(url, function(response) {
			if(response && response.html) {
				success(url, response);
			} else {
				error();
			}
		});
	}
});

/**
 * Collection of playlists.
 */
App.Playlists = App.SelectableCollection.extend({

	localStorage: new Store('playlists'),

	model: App.Playlist,

	initialize: function() {
		App.SelectableCollection.prototype.initialize.apply(this, arguments);

		// fill collection immediately from storage
		this.fetch();

		// save collection on every change
		this.on('change add', function(model) {
			model.save();
		});
		this.on('remove', function(model) {
			model.destroy();
		});
	}
});
