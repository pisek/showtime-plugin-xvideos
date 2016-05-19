/**
 *  xvideos plugin for Movian
 *
 *  Copyright (C) 2015 Pisek
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 *  
 */


(function(plugin) {
	var PREFIX = plugin.getDescriptor().id;
	var LOGO = plugin.path + "logo.png";
	var BACKGROUND = plugin.path + "views/img/background.jpg";
	
	var DEFAULT_URL = 'http://www.xvideos.com';
	
	var service = plugin.createService(plugin.getDescriptor().title, PREFIX + ":start", "video", true, LOGO);
	
	function setPageHeader(page, title, image) {
		if (page.metadata) {
			page.metadata.title = title;
			page.metadata.logo = LOGO;
			if (image) {
				page.metadata.background = image;
				page.metadata.backgroundAlpha = 0.3;
			} else {
				page.metadata.background = BACKGROUND;
				page.metadata.backgroundAlpha = 0.7;
			}
		}
	}

	function d(c) {
		print(JSON.stringify(c, null, 4));
	}
	
	function browseItems(page, search, catUrl) {
		var moreSearchPages = true;		
		var pageNumber = 1;
		page.entries = 0;

		//img - 1, url - 2, title - 3, duration - 4, quality - 5
		var pattern = /<img src="(.*?)" id="pic_\d*?" onload=[\S\s]*?<a href="(.*?)" title="(.*?)">[\S\s]*?<span class="duration">\((.+?)\)<\/span>\nPorn quality: (\d+?) %/igm;
		var matcher;
				
		var pagePattern = /<a href="([\w\-\/]*)"[\ \w\"\-=]*?>Next<\/a>/igm;
		var pageMatcher;
		
		var url = DEFAULT_URL;
		if (search) {
			url += "/?k=" + search.replace(new RegExp(' ', 'g'), '+');
		} else if (catUrl) {
			url += catUrl;
		}
		
		var c;
		
		function loader() {
			
			page.loading = true;
			
			if (!url) {
				return false;
			}
		
			d('Entry url: ' + url);
			c = showtime.httpReq(url);
			
			//d(c.toString());
			
			while ((match = pattern.exec(c)) !== null) {

				page.appendItem(PREFIX + ":video:" + match[2] + ":" + match[3], 'video', {
							title : new showtime.RichText(match[3]),
							icon : new showtime.RichText(match[1]),
							duration : match[4],
							quality: match[5]
						});
				page.entries++; // for searcher to work
				
			}
			
			page.loading = false;
			if (pageNumber == 1 && page.metadata) {	//only for first page - search results
				page.metadata.title += ' (' + page.entries;
				if (page.entries == 20) {
					page.metadata.title += '+';
				}
				page.metadata.title += ')';
			}
			
			url = null;
			while ((pageMatcher = pagePattern.exec(c)) !== null) {			
			
				d("Found next page: " + pageMatcher[1]);
				url = DEFAULT_URL + pageMatcher[1];
				break;
				
			}


			d('Next url: ' + url);
			
			
			pageNumber++;
			return url != null;
		}
		
		//for search to work
		loader();
		
		page.paginator = loader;
		
	}
	
	plugin.addSearcher(plugin.getDescriptor().title, LOGO, function(page, search) {
		setPageHeader(page, plugin.getDescriptor().title);
		browseItems(page, search);
	});

	plugin.addURI(PREFIX + ":start", function(page) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.type = "directory";
		page.contents = "movies";
		
		page.appendItem(PREFIX + ":categories", 'directory', {
			title : "Categories",
		});
		page.appendItem(PREFIX + ":tags", 'directory', {
			title : "Tags",
		});
		
		page.appendItem("", "separator", {
				title: 'Newest'
		});
		
		browseItems(page);
	});
	
	plugin.addURI(PREFIX + ":categories", function(page) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.type = "directory";
		page.contents = "movies";
		page.entries = 0;
		
		//url - 1, title - 2
		var pattern = /<li><a href="(.*?)" class="btn btn-default">(.*?)<\/a><\/li>/igm;
		var matcher;
		
		page.loading = true;
		
		d(DEFAULT_URL);
		var c = showtime.httpReq(DEFAULT_URL);
			
		while ((match = pattern.exec(c)) !== null) {

			page.appendItem(PREFIX + ":catTagUrl:" + match[1], 'directory', {
						title : new showtime.RichText(match[2]),
					});
			page.entries++; // for searcher to work
				
		}
			
		page.loading = false;
		
	});
	
	plugin.addURI(PREFIX + ":tags", function(page) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.type = "directory";
		page.contents = "movies";
		page.entries = 0;
		
		//url - 1, title - 2, quantity - 3
		var pattern = /<li><a href="([\w\/\-\?\&]*?)"><b>([\w\-\s]*?) <\/b><span class=".*?">([\d\,]*?)<\/span><\/a><\/li>/igm;
		var matcher;
		
		page.loading = true;
		
		var c = showtime.httpReq(DEFAULT_URL + '/tags');
			
		while ((match = pattern.exec(c)) !== null) {

			page.appendItem(PREFIX + ":catTagUrl:" + match[1], 'directory', {
						title : new showtime.RichText(match[2] + ' (' + match[3] + ' movies)'),
					});
			page.entries++; // for searcher to work
				
		}
			
		page.loading = false;
		
	});
	
	plugin.addURI(PREFIX + ":catTagUrl:(.*)", function(page, url) {
		setPageHeader(page, plugin.getDescriptor().synopsis);
		page.type = "directory";
		page.contents = "movies";
		
		browseItems(page, null, url);
	});
	
	plugin.addURI(PREFIX + ":video:(.*):(.*)", function(page, url, title) {
		setPageHeader(page, "Searching...");
		page.loading = true;
		var videoUrl;
		var metadata = {};
		
		var c = showtime.httpReq(DEFAULT_URL + url);
		//d(c.headers);
		
		// 1 - movie url
		var pattern = /flashvars=".*?flv_url=(.*?)&amp;/igm;
		if ((match = pattern.exec(c)) !== null) {
			/*c = showtime.httpReq(match[1]);
			d(c.headers);*/
			d(match[1]);
			videoUrl = decodeURIComponent(match[1]);
		} else {
			//youtube movie (or other)
			page.error("Cannot open links from other sites");
			d("Cannot open links from other sites");
			return;
		}
		
		metadata.title = title;
		metadata.sources = [{ url: videoUrl, bitrate: 1000 }];
		metadata.canonicalUrl = PREFIX + ":video:" + url + ":" + title;
		metadata.no_fs_scan = true;
		d(metadata);
		setPageHeader(page, title);
		page.loading = false;
		page.source = "videoparams:"+showtime.JSONEncode(metadata);
		page.type = "video";
	});
	
})(this);
