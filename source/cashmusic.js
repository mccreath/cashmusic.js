/**
 * The core cashmusic.js file
 *
 * COMPRESSION SETTINGS
 * http://closure-compiler.appspot.com/
 * Closure compiler, SIMPLE MODE
 *
 * @package cashmusic.org.cashmusic
 * @author CASH Music
 * @link http://cashmusic.org/
 *
 * Copyright (c) 2016, CASH Music
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list
 * of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 * OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
 * OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *
 *
 *
 * VERSION: 5
 *
 **/

;window.cashmusic = (function() {
	'use strict';
	var cashmusic;
	if (window.cashmusic != null) {
		// if window.cashmusic exists, we just return the current instance
		cashmusic = window.cashmusic;
	} else {
		// no window.cashmusic, so we build and return an object
		cashmusic = {
			embeds: {
				whitelist: '',
				all: []
			},
			get: {},
			loaded: false,
			soundplayer: false,
			lightbox: false,
			options:'',
			path:'',
			templates: {},
			eventlist: {},
			storage: {},
			scripts: [],
			embedded: false,
			geo: false,

			_init: function() {
				var cm = window.cashmusic;

				// check lightbox options
				if (cm.options.indexOf('lightboxvideo') !== -1) {
					// load lightbox.js
					cm.loadScript(cm.path+'lightbox/lightbox.js');
				}

				// look for .cashmusic.soundplayer divs/links
				var soundTest = document.querySelectorAll('a.cashmusic.soundplayer,div.cashmusic.soundplayer');
				if (soundTest.length > 0) {
					cm.loadScript(cm.path+'soundplayer/soundplayer.js');
				}

				// if we're running in an iframe assume it's an embed (won't do any harm if not)
				if (self !== top) {
					cm._initEmbed();
				}

				// using messages passed between the request and this script to resize the iframe
				cm.events.add(window,'message',function(e) {
					// make sure the message comes from our embeds (via origin whitelist)
					if (cm.embeds.whitelist.indexOf(e.origin) !== -1) {
						cm._handleMessage(e);
					}
				});

				// add current domain to whitelist for postmesage calls (regardless of embed or no)
				cm.embeds.whitelist = cm.embeds.whitelist + window.location.href.split('/').slice(0,3).join('/');

				// look for GET string, parse that shit if we can
				if (window.location.search) {
					cm.get['qs'] =  window.location.search.substring(1);
					cm.get['params'] = {};
					var t;
					var q = cm.get['qs'].split("&");
					for (var i = 0; i < q.length; i++) {
						t = q[i].split('=');
						cm.get['params'][t[0]] = t[1];
					}
				}

				if (cm.embedded) {
					cm.loaded = Date.now(); // ready and loaded
					cm._drawQueuedEmbeds();
					// tell em
					cm.events.fire(cm,'ready',cm.loaded);
				} else {
					// look for GET string, parse that shit if we can
					if (cm.get['qs']) {
						if (cm.get['qs'].indexOf('element_id') !== -1) {
							if (!!(window.history && history.pushState)) {
								// we know this is aimed at us, so we caught it. now remove it.
								history.pushState(null, null, window.location.href.split('?')[0]);
							}
						}
					}

					// create overlay stuff first, only if nowrap isn't set
					if (cm.options.indexOf('nowrap') === -1) {
						cm.overlay.create();
					}
					// if we don't have a geo response we'll loop and wait a couple
					// seconds before declaring the script ready.
					var l = 0;
					var i = setInterval(function() {
						if ((l < 25) && !cm.geo) {
							l++;
						} else {
							cm.loaded = Date.now(); // ready and loaded
							// and since we're ready kill the loops
							clearInterval(i);
							// tell em
							cm.events.fire(cm,'ready',cm.loaded);
							cm._drawQueuedEmbeds();
						}
					}, 100);
				}
			},

			_drawQueuedEmbeds: function() {
				var cm = window.cashmusic;
				if (typeof cm.storage.elementQueue == 'object') {
					// this means we've got elements waiting for us...do a
					// foreach loop and start embedding them
					cm.storage.elementQueue.forEach(function(args) {
						// we stored the args in our queue...spit them back out
						cm.embed(args[0],args[1],args[2],args[3],args[4],args[5]);
					});
				}
			},

			_initEmbed: function() {
				var cm = window.cashmusic;
				cm.embedded = true; // set this as an embed

				// get main div
				var el = document.querySelector('div.cashmusic.element');
				if (el) {
					cm.storage['embedheight'] = cm.measure.scrollheight(); // store current height
					cm.events.fire(cm,'resize',cm.storage.embedheight); // fire resize event immediately

					// use element classes to identify type and id of element
					var cl = el.className.split(' ');
					cm.events.fire(cm,'identify',[cl[2],cl[3].substr(3)]); // [type, id]

					// poll for height and fire resize event if it changes
					window.setInterval(function() {
						var h  = cm.measure.scrollheight();
						if (h != cm.storage.embedheight) {
							cm.storage.embedheight = h;
							cm.events.fire(cm,'resize',h);
						}
					},250);

					// rewrite CSS stuff?
					var cssOverride = cm.getQueryVariable('cssoverride');
					if (cssOverride) {
						cm.styles.injectCSS(cssOverride,true);
					}
				}

				// add an embedded_element input to all forms to tell the platform they're embeds
				var forms = document.getElementsByTagName("form");
				for (var i=0; i<forms.length; i++) {
					var ee=document.createElement("input");
					ee.setAttribute("type","hidden");
					ee.setAttribute("name","embedded_element");
					ee.setAttribute("value","1");
					forms[i].appendChild(ee);
				}
			},

			_handleMessage: function(e) {
				var cm = window.cashmusic;
				var msg = JSON.parse(e.data);
				var source; // source embed (if from an embed)
				// find the source of the message in our embeds object
				for (var i = 0; i < cm.embeds.all.length; i++) {
					if (cm.embeds.all[i].el.contentWindow === e.source) {
						source = cm.embeds.all[i];
						break;
					}
				}

				// now figure out what to do with it
				var md = msg.data;
				switch (msg.type) {
					case 'resize':
						source.el.height = md;
						source.el.style.height = md + 'px'; // resize to correct height
						break;
					case 'identify':
						if (source.id == md[1]) { // double-check that id's match
							source.type = md[0]; // set the type. now we have all the infos
						}
						break;
					case 'checkoutdata':
						cm.events.fire(cm,'checkoutdata',md);
						break;
					case 'overlayreveal':
						cm.overlay.reveal(md.innerContent,md.wrapClass);
						cm.events.fire(cm,'overlayopened','');
						break;
					case 'overlayhide':
						cm.overlay.hide();
						cm.events.fire(cm,'overlayhidden','');
						break;
					case 'addoverlaytrigger':
						cm.overlay.addOverlayTrigger(md.content,md.classname,md.ref);
						break;
					case 'injectcss':
						cm.styles.injectCSS(md.css,md.important);
						break;
					case 'addclass':
						cm.styles.addClass(md.el,md.classname);
						break;
					case 'removeclass':
						cm.styles.removeClass(md.el,md.classname);
						break;
					case 'swapclasses':
						cm.styles.swapClasses(md.el,md.oldclass,md.newclass);
						break;
					case 'sessionstarted':
						cm.session.setid(md);
						break;
					case 'begincheckout':
						if (!cm.checkout) {
							cm.loadScript(cm.path+'checkout/checkout.js', function() {
								cm.checkout.begin(md,e.source);
							});
						} else {
							cm.checkout.begin(md,e.source);
						}
						break;
				}
			},

			/*
			 * contentloaded.js by Diego Perini (diego.perini at gmail.com)
			 * http://javascript.nwbox.com/ContentLoaded/
			 * http://javascript.nwbox.com/ContentLoaded/MIT-LICENSE
			 *
			 * modified a little because you know
			 */
			contentLoaded: function(fn) {
				var done = false, top = true,
				doc = window.document, root = doc.documentElement,

				init = function(e) {
					if (e.type == 'readystatechange' && doc.readyState != 'complete') return;
					cashmusic.events.remove((e.type == 'load' ? window : doc),e.type,init);
					if (!done && (done = true)) fn.call(window, e.type || e);
				},

				poll = function() {
					try { root.doScroll('left'); } catch(e) { setTimeout(poll, 50); return; }
					init('poll');
				};

				if (doc.readyState == 'complete') fn.call(window, 'lazy');
				else {
					if (doc.createEventObject && root.doScroll) {
						try { top = !window.frameElement; } catch(e) { }
						if (top) poll();
					}
					this.events.add(doc,'DOMContentLoaded', init);
					this.events.add(doc,'readystatechange', init);
					this.events.add(doc,'load', init);
				}
			},

			/*
			 * window.cashmusic.embed(string endPoint, string/int elementId, bool lightboxed, bool lightboxTxt)
			 * Generates the embed iFrame code for embedding a given element.
			 * Optional third and fourth parameters allow the element to be
			 * embedded with a lightbox and to customize the text of lightbox
			 * opener link. (default: 'open element')
			 *
			 * The iFrame is embedded at 1px high and sends a postMessage back
			 * to this parent window with its proper height.
			 *
			 * This is called in a script inline as a piece of blocking script — calling it before
			 * contentLoaded because the partial load tells us where to embed each chunk — we find the
			 * last script node and inject the content by it. For dynamic calls you need to specify
			 * a targetNode to serve as the anchor — with the embed chucked immediately after that
			 * element in the DOM.
			 */
			embed: function(endPoint, elementId, lightboxed, lightboxTxt, targetNode, cssOverride) {
				var cm = window.cashmusic;
				if (!targetNode) {
					// if used non-AJAX we just grab the current place in the doc
					// because we're running as the document is loading in a blocking fashion, the
					// last script element will be the current script asset.
					var allScripts = document.querySelectorAll('script');
					var currentNode = allScripts[allScripts.length - 1];
				}
				if (!cm.loaded) {
					// cheap/fast queue waiting on geo. there's a 2.5s timeout on this. the geo
					// request usually beats page load but this still seems smart and an acceptable
					// balance given the benefit of more data.
					if (typeof cm.storage.elementQueue !== 'object') {
						cm.storage.elementQueue = [];
					}
					// store the endpoint correctly
					var id = currentNode.id;
					if (!id) {
						// no id? we
						id = new Date().getTime(); // TODO: randomizethis name to avoid collision
						id = 'cm-' + (Math.floor(Math.random() * 99999)) + '-' + id;
						currentNode.setAttribute('id', id);
					}
					if (typeof endPoint === 'object') {
						if (!endPoint.targetnode) {
							endPoint.targetnode = '#' + id;
							arguments[0] = endPoint;
						}
					} else {
						arguments[4] = '#' + id;
					}
					cm.storage.elementQueue.push(arguments);
				} else {
					// Allow for a single object to be passed instead of all arguments
					// object properties should be lowercase versions of the standard arguments, any order
					if (typeof endPoint === 'object') {
						elementId   = endPoint.elementid ? endPoint.elementid : false;
						lightboxed  = endPoint.lightboxed ? endPoint.lightboxed : false;
						lightboxTxt = endPoint.lightboxtxt ? endPoint.lightboxtxt : false;
						targetNode  = endPoint.targetnode ? endPoint.targetnode : false;
						cssOverride = endPoint.cssoverride ? endPoint.cssoverride : false;;
						endPoint   = endPoint.endpoint;
					}
					if (typeof targetNode === 'string') {
						// for AJAX, specify target node: '#id', '#id .class', etc. NEEDS to be specific
						var currentNode = document.querySelector(targetNode);
					} else {
						var currentNode = targetNode;
					}

					// make the iframe
					var iframe = cm.buildEmbedIframe(endPoint,elementId,cssOverride,(lightboxed) ? '&overlay=1' : false);

					// be nice neighbors. if we can't find currentNode, don't do the rest or pitch errors. silently fail.
					if (currentNode) {
						if (lightboxed) {
							// create a div to contain the overlay link
							var embedNode = document.createElement('span');
							embedNode.className = 'cashmusic embed link';

							// open in a lightbox with a link in the target div
							if (!lightboxTxt) {lightboxTxt = 'open element';}
							cm.overlay.create(function() {
								var a = document.createElement('a');
									a.href = '';
									a.target = '_blank';
									a.innerHTML = lightboxTxt;
								embedNode.appendChild(a);
								currentNode.parentNode.insertBefore(embedNode,currentNode);
								(function() {
									cm.events.add(a,'click',function(e) {
										cm.overlay.reveal(iframe);
										e.preventDefault();
										return false;
									});
								})();
							});

						} else {
							// put the iframe in place
							currentNode.parentNode.insertBefore(iframe,currentNode);
						}
					}
				}
			},

			buildEmbedIframe: function(endpoint,id,cssoverride,querystring) {
				var cm = window.cashmusic;
				var embedURL = endpoint.replace(/\/$/, '') + '/request/embed/' + id + '?location=' + encodeURIComponent(window.location.href);
				if (cm.geo) {
					embedURL += '&geo=' + encodeURIComponent(cm.geo);
				}
				if (cssoverride) {
					embedURL += '&cssoverride=' + encodeURIComponent(cssoverride);
				}
				if (querystring) {
					embedURL += '&' + querystring;
				}
				if (cm.get['params']) {
					if (cm.get['params']['element_id'] == id) {
						embedURL += '&' + cm.get['qs'];
					}
				}
				var sid = cm.session.getid(endpoint.split('/').slice(0,3).join('/'));
				if (sid) {
					embedURL += '&session_id=' + sid;
				}
				var iframe = document.createElement('iframe');
					iframe.src = embedURL;
					iframe.id = 'cm-' + new Date().getTime(); // prevent Safari from using old data.
					iframe.className = 'cashmusic embed';
					iframe.style.width = '100%';
					iframe.style.height = '0'; // if not explicitly set the scrollheight of the document will be wrong
					iframe.style.border = '0';
					iframe.style.overflow = 'hidden'; // important for overlays, which flicker scrollbars on open
					iframe.scrolling = 'no'; // programming

				var origin = embedURL.split('/').slice(0,3).join('/');
				if (cm.embeds.whitelist.indexOf(origin) === -1) {
					cm.embeds.whitelist = cm.embeds.whitelist + origin;
				}
				cm.embeds.all.push({el:iframe,id:id,type:''});

				return iframe;
			},

			getTemplate: function(templateName,successCallback) {
				var cm = window.cashmusic;
				var templates = cm.templates;
				if (templates[templateName] !== undefined) {
					successCallback(templates[templateName]);
				} else {
					// get the template
					this.ajax.jsonp(
						cm.path + 'templates/' + templateName + '.js',
						'callback',
						function(json) {
							templates[templateName] = json.template;
							successCallback(json.template);
						},
						'cashmusic' + templateName + 'Callback'
					);


					// check for existence of the CSS file and if not found, include it
					var test = document.querySelectorAll('link[href="' + cm.path + 'templates/' + templateName + '.css' + '"]');
					if (!test.length ) { // if nothing found
						cm.styles.injectCSS(cm.path + 'templates/' + templateName + '.css');
					}
				}
			},

			/*
			 *	Use standard event footprint
			 */
			addEventListener: function(eventName, callback) {
				var cm = window.cashmusic;
				if(!cm.eventlist.hasOwnProperty(eventName)) {
					cm.eventlist[eventName] = [];
				}
				cm.eventlist[eventName].push(callback);
			},

			/*
			 *	Use standard event footprint
			 */
			removeEventListener: function(eventName, callback) {
				var cm = window.cashmusic;
				if(cm.eventlist.hasOwnProperty(eventName)) {
					var idx = cm.eventlist[eventName].indexOf(callback);
					if(idx != -1) {
						cm.eventlist[eventName].splice(idx, 1);
					}
				}
			},

			/*
			 *	Use standard event footprint
			 */
			dispatchEvent: function(e) {
				var cm = window.cashmusic;
				if(cm.eventlist.hasOwnProperty(e.type)) {
					var i;
					for(i = 0; i < cm.eventlist[e.type].length; i++) {
						if (cm.eventlist[e.type][i]) {
							cm.eventlist[e.type][i](e);
						}
					}
				}
			},

			// stolen from jQuery
			loadScript: function(url,callback) {
				var cm = window.cashmusic;
				if (cm.scripts.indexOf(url) > -1) {
					if (typeof callback === 'function') {
						callback();
					}
				} else {
					cm.scripts.push(url);
					var head = document.getElementsByTagName('head')[0] || document.documentElement;
					var script = document.createElement('script');
					script.src = url;

					// Handle Script loading
					var done = false;

					// Attach handlers for all browsers
					script.onload = script.onreadystatechange = function() {
						if ( !done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete") ) {
							done = true;
							if (typeof callback === 'function') {
								callback();
							}

							// Handle memory leak in IE
							script.onload = script.onreadystatechange = null;
							if (head && script.parentNode) {head.removeChild(script);}
						}
					};
					head.insertBefore( script, head.firstChild );
				}
			},

			// found: http://css-tricks.com/snippets/javascript/get-url-variables/
			getQueryVariable: function(v) {
				var query = window.location.search.substring(1);
				var vars = query.split("&");
				for (var i=0;i<vars.length;i++) {
					var pair = vars[i].split("=");
					if(pair[0] == v){
						return decodeURIComponent(pair[1]);
					}
				}
				return(false);
			},



			/***************************************************************************************
			 *
			 * window.cashmusic.ajax (object)
			 * Object wrapping XHR calls cross-browser and providing form encoding for POST
			 *
			 * PUBLIC-ISH FUNCTIONS
			 * window.cashmusic.ajax.send(string url, string postString, function successCallback)
			 * window.cashmusic.ajax.encodeForm(object form)
			 *
			 ***************************************************************************************/
			ajax: {
				/*
				 * window.cashmusic.ajax.getXHR()
				 * Tests for the proper XHR object type and returns the appropriate
				 * object type for the current browser using a try/catch block. If
				 * no viable objects are found it returns false. But we should make
				 * fun of that browser, because it sucks.
				 */
				getXHR: function() {
					try	{
						return new XMLHttpRequest();
					} catch(e) {
						try {
							return new ActiveXObject('Msxml2.XMLHTTP');
						} catch(er) {
							try {
								return new ActiveXObject('Microsoft.XMLHTTP');
							} catch(err) {
								return false;
							}
						}
					}
				},

				/*
				 * window.cashmusic.ajax.send(string url, string postString, function successCallback)
				 * Do a POST or GET request via XHR/AJAX. Passing a postString will
				 * force a POST request, whereas passing false will send a GET.
				 */
				send: function(url,postString,successCallback,failureCallback) {
					var cm = window.cashmusic;
					var method = 'POST';
					var sid = cm.session.getid(window.location.href.split('/').slice(0,3).join('/'));
					if (!postString) {
						method = 'GET';
						postString = null;
						if (sid) {
							if (url.indexOf('?') === -1) {
								url += '?session_id=' + sid;
							} else {
								url += '&session_id=' + sid;
							}
						}
					} else {
						if (sid) {
							postString += '&session_id=' + sid;
						}
					}
					var xhr = this.getXHR();
					if (xhr) {
						xhr.open(method,url,true);
						xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
						if (method == 'POST') {
							xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
						}
						if (typeof successCallback == 'function') {
							xhr.onreadystatechange = function() {
								if (xhr.readyState === 4) {
									if (xhr.status === 200) {
										successCallback(xhr.responseText);
									} else {
										if (typeof failureCallback === 'function') {
											failureCallback(xhr.responseText);
										}
									}
								}
							};
						}
						xhr.send(postString);
					}
				},

				jsonp: function(url,method,callback,forceCallbackName) {
					// lifted from Oscar Godson here:
					// http://oscargodson.com/posts/unmasking-jsonp.html

					// added the forceCallbackName bits, and callback queing/stacking

					url = url || '';
					method = method || '';
					callback = callback || function(){};
					forceCallbackName = forceCallbackName || false;

					if(typeof method == 'function'){
						callback = method;
						method = 'callback';
					}

					if (forceCallbackName) {
						// this is weird. it looks to see if the callback is already defined
						// if it is it means we hit a race condition loading the template and
						// handling the callback.
						var generatedFunction = forceCallbackName;
						var oldCallback = (function(){});
						if (typeof window[generatedFunction] == 'function') {
							// we grab the old callback, create a new closure for it, and call
							// it in our new callback — nests as deep as it needs to go, calling
							// every callback in reverse order
							oldCallback = window[generatedFunction];
						}
					} else {
						var generatedFunction = 'jsonp'+Math.round(Math.random()*1000001);
					}

					window[generatedFunction] = function(json){
						callback(json);
						if (!forceCallbackName) {
							delete window[generatedFunction];
						} else {
							// here we start the weird loop down through all the defined
							// callbacks. if no callbacks were defined oldCallback is an
							// empty function so it does nothing.
							oldCallback(json);
						}
					};

					if (url.indexOf('?') === -1) {url = url+'?';} else {url = url+'&';}

					var s = document.createElement('script');
					s.setAttribute('src', url+method+'='+generatedFunction);
					document.getElementsByTagName('head')[0].appendChild(s);
				},

				/*
				 * window.cashmusic.ajax.encodeForm(object form)
				 * Takes a form object returned by a document.getElementBy... call
				 * and turns it into a querystring to be used with a GET or POST call.
				 */
				encodeForm: function(form) {
					if (typeof form !== 'object') {
						return false;
					}
					var querystring = '';
					form = form.elements || form; //double check for elements node-list
					for (var i=0;i<form.length;i++) {
						if (form[i].type === 'checkbox' || form[i].type === 'radio') {
							if (form[i].checked) {
								querystring += (querystring.length ? '&' : '') + form[i].name + '=' + form[i].value;
							}
							continue;
						}
						querystring += (querystring.length ? '&' : '') + form[i].name +'='+ form[i].value;
					}
					return encodeURI(querystring);
				},

				getHeaderForURL: function(url,header,callback) {
					var xhr = this.getXHR();
					xhr.open('HEAD', 'https://javascript-cashmusic.netdna-ssl.com/cashmusic.js');
					xhr.onreadystatechange = function() {
						if (this.readyState == this.DONE) {
							callback(this.getResponseHeader(header));
						}
					};
					xhr.send();
				}
			},

			/***************************************************************************************
			 *
			 * window.cashmusic.events (object)
			 * Add, remove, and fire events
			 *
			 * PUBLIC-ISH FUNCTIONS
			 * window.cashmusic.events.add(object obj, string type, function fn)
			 * window.cashmusic.events.remove(object obj, string type, function fn)
			 * window.cashmusic.events.fire(object obj, string type, object/any data)
			 *
			 ***************************************************************************************/
			events: {
				// Thanks, John Resig!
				// http://ejohn.org/blog/flexible-javascript-events/
				add: function(obj,type,fn) {
					if (obj.attachEvent) {
						obj['e'+type+fn] = fn;
						obj[type+fn] = function(){obj['e'+type+fn]( window.event );}
						obj.attachEvent( 'on'+type, obj[type+fn] );
					} else {
						obj.addEventListener( type, fn, false );
					}
				},

				// Thanks, John Resig!
				// http://ejohn.org/blog/flexible-javascript-events/
				remove: function(obj,type,fn) {
					if (obj.detachEvent) {
						obj.detachEvent( 'on'+type, obj[type+fn] );
						obj[type+fn] = null;
					} else {
						obj.removeEventListener( type, fn, false );
					}
				},

				// added the fourth "source" parameter
				fire: function(obj,type,data,source) {
					var cm = window.cashmusic;
					if (typeof source !== 'undefined') {
						// source window found, so push to it via postMessage
						source.postMessage(JSON.stringify({
							'type': type,
							'data': data
						}),'*');
					}
					// fire the event locally no matter what
					if (document.dispatchEvent){
						// standard
						var e = document.createEvent('CustomEvent');
   					e.initCustomEvent(type, false, false, data);
   					obj.dispatchEvent(e);
					} else {
						// dispatch for IE < 9
						var e = document.createEventObject();
						e.detail = data;
						obj.fireEvent('on'+type,e);
					}
					if (cm.embedded) {
						cm.events.relay(type,data);
					}
				},

				relay: function(type,data) {
					window.parent.postMessage(JSON.stringify({
						'type': type,
						'data': data
					}),'*');
				}
			},

			/***************************************************************************************
			 *
			 * window.cashmusic.session (object)
			 * Test session things because Safari is garbage
			 *
			 ***************************************************************************************/
			session: {
				start: function(endpoint) {
					var cm = window.cashmusic;
					if (cm.embedded) {
						if (!cm.session.getid(window.location.href.split('/').slice(0,3).join('/'))) {
							if (!endpoint) {
								endpoint = window.location.href.split('/embed/')[0]+'/payload';
								endpoint += '?cash_request_type=system&cash_action=startjssession&ts=' + new Date().getTime();
							}
							// fire off the ajax call
							cm.ajax.send(
								endpoint,
								false,
								function(r) {
									if (r) {
										cm.events.fire(cm,'sessionstarted',r);
										cm.session.setid(r);
									}
								}
							);
						}
					}
				},

				setid: function(id) {
					var session = JSON.parse(id);
					var sessions = localStorage.getItem('sessions');
					if (!sessions) {
						sessions = {};
					} else {
						sessions = JSON.parse(sessions);
					}
					sessions[session.endpoint] = {
						"id":session.id,
						"expiration":session.expiration
					};
					localStorage.setItem('sessions', JSON.stringify(sessions));
				},

				getid: function(key) {
					var sessions = false;
					try {
						sessions = localStorage.getItem('sessions');
					} catch (e) {
						sessions = false;
					}
					if (sessions) {
						sessions = JSON.parse(sessions);
						if (sessions[key]) {
							if ((sessions[key].expiration) > Math.floor(new Date().getTime() /1000)) {
								return sessions[key].id;
							}
						}
					}
					return false;
				}
			},

			/***************************************************************************************
			 *
			 * window.cashmusic.measure (object)
			 * Basic window/element measurements
			 *
			 * PUBLIC-ISH FUNCTIONS
			 * window.cashmusic.measure.viewport()
			 * window.cashmusic.measure.getClickPosition(event e)
			 *
			 ***************************************************************************************/
			measure: {
				viewport: function() {
					/*
						x: viewport width
						y: viewport height
					*/
					return {
						x: window.innerWidth || document.body.offsetWidth || 0,
						y: window.innerHeight || document.body.offsetHeight || 0
					};
				},

				scrollheight: function() {
					// returns scrollable content height
					var db=document.body;
					var de=document.documentElement;
					return Math.max(db.scrollHeight,de.scrollHeight,db.offsetHeight,de.offsetHeight,db.clientHeight,de.clientHeight);
				}
			},

			/***************************************************************************************
			 *
			 * window.cashmusic.overlay (object)
			 * Building the actual lightbox bits
			 *
			 * PUBLIC-ISH FUNCTIONS
			 * window.cashmusic.overlay.create(function callback)
			 * window.cashmusic.overlay.hide()
			 * window.cashmusic.overlay.reveal(string/object innerContent, string wrapClass)
			 *
			 ***************************************************************************************/
			overlay: {
				bg: false,
				wrapper: false,
				content: false,
				close: false,
				callbacks: [],

				create: function(callback) {
					var cm = window.cashmusic;
					var self = cm.overlay;
					var move = false;
					if (self.wrapper === false) {
						cm.styles.injectCSS(cm.path + 'templates/overlay.css');

						self.wrapper = document.querySelector('div.cm-wrapper');

						if (!self.wrapper) {
							move = true;
							self.wrapper = document.createElement('div');
							self.wrapper.className = 'cm-wrapper';
						}

						self.bg = document.createElement('div');
						self.bg.className = 'cm-bg';

						// apply all body styles to the bg
						var bs = window.getComputedStyle(document.body);
						self.bg.style.backgroundImage 		= bs.getPropertyValue('background-image');
						self.bg.style.backgroundPosition 	= bs.getPropertyValue('background-position');
						self.bg.style.backgroundSize 			= bs.getPropertyValue('background-size');
						self.bg.style.backgroundRepeat 		= bs.getPropertyValue('background-repeat');
						self.bg.style.backgroundOrigin 		= bs.getPropertyValue('background-origin');
						self.bg.style.backgroundClip 			= bs.getPropertyValue('background-clip');
						self.bg.style.backgroundAttachment 	= bs.getPropertyValue('background-attachment');
						self.bg.style.backgroundColor 		= bs.getPropertyValue('background-color');

						if (move) {
							// move all page nodes to the new wrapper
							while (document.body.childNodes.length) {
								self.wrapper.appendChild(document.body.childNodes[0]);
							}
							document.body.appendChild(self.wrapper);
						}

						self.content = document.createElement('div');
						self.content.className = 'cm-overlay';

						self.close = document.createElement('div');
						self.close.className = 'cm-close';

						cm.events.add(window,'keyup', function(e) {
							if (e.keyCode == 27) {
								if (self.content.parentNode == document.body) {
									self.hide();
								}
							}
						});
						cm.events.add(self.close,'click', function(e) {
							if (self.content.parentNode == document.body) {
								self.hide();
							}
						});
						/*
						cm.events.add(self.bg,'click', function(e) {
							if(e.target === this) {
								self.hide();
							}
						});
						*/
					}
					if (typeof callback === 'function') {
						callback();
					}
				},

				hide: function() {
					var cm = window.cashmusic;
					var self = cm.overlay;
					var db = document.body;
					if (cm.embedded) {
						cm.events.fire(cm,'overlayhide');
					} else {
						self.content.style.opacity = 0;
						cm.events.fire(cm,'overlayclosed',''); // tell em
						self.wrapper.className = 'cm-wrapper';
						self.bg.className = 'cm-bg';
						setTimeout(function() {
							db.removeChild(self.bg);
						}, 1000);
						//self.content.innerHTML = '';
						while (self.content.firstChild) {
							self.content.removeChild(self.content.firstChild);
						}
						db.removeChild(self.close);
						db.removeChild(self.content);

						// reveal any (if) overlay triggers
						var t = document.querySelectorAll('.cm-overlaytrigger');
						if (t.length > 0) {
							for (var i = 0, len = t.length; i < len; i++) {
								t[i].style.visibility = 'visible';
							}
						}

						// reenable body scrolling
						db.style.overflow = 'auto';
					}
				},

				reveal: function(innerContent,wrapClass) {
					// add the correct content to the content div
					var cm = window.cashmusic;
					var self = cm.overlay;
					var db = document.body;
					if (cm.embedded) {
						cm.events.fire(cm,'overlayreveal',{"innerContent":innerContent,"wrapClass":wrapClass});
					} else {
						// if the overlay is already visible, kill the contents first
						if (self.content.style.opacity == 1) {
							self.content.innerHTML = '';
						}
						var positioning = document.createElement('div');
						positioning.className = 'cm-position';
						var alert = document.createElement('div');
						if (wrapClass) {
							alert.className = wrapClass;
						} else {
							alert.className = 'cm-element';
						}
						if (typeof innerContent === 'string') {
							alert.innerHTML = innerContent;
						} else {
							if (innerContent.endpoint && innerContent.element) {
								// make the iframe
								var iframe = cm.buildEmbedIframe(innerContent.endpoint,innerContent.element,false,'&overlay=1&state='+innerContent.state);
								alert.appendChild(iframe);
							} else {
								alert.appendChild(innerContent);
							}
						}
						positioning.appendChild(alert);
						self.content.appendChild(positioning);

						// disable body scrolling
						db.style.overflow = 'hidden';

						// if not already showing, go!
						if (self.content.style.opacity != 1) {
							self.wrapper.className = 'cm-wrapper cm-active';
							self.content.style.opacity = 0;
							self.bg.style.height = cm.measure.scrollheight() + 'px';
							db.appendChild(self.bg);
							self.bg.className = 'cm-bg cm-active';
							db.appendChild(self.content);
							db.appendChild(self.close);
							// force style refresh/redraw on element
							window.getComputedStyle(self.content).opacity;
							// initiate fade-in
							self.content.style.opacity = 1;
						}
					}
				},

				addOverlayTrigger: function(content,classname,ref) {
					var cm = window.cashmusic;
					var self = cm.overlay;
					if (cm.embedded) {
						cm.events.fire(cm,'addoverlaytrigger',{
							"content":content,
							"classname":classname,
							"ref":ref
						});
					} else {
						var el = document.createElement('div');
						el.className = classname.toString() + ' cm-overlaytrigger';
						cm.events.add(el,'click',function(e) {
							cm.overlay.reveal(content);
							this.style.visibility = 'hidden';
							e.preventDefault();
							return false;
						});
						self.wrapper.appendChild(el);
						cm.storage[ref] = el;
						cm.events.fire(cm,'triggeradded',ref);
					}
				}
			},

			/***************************************************************************************
			 *
			 * window.cashmusic.styles (object)
			 * Building the actual lightbox bits
			 *
			 * PUBLIC-ISH FUNCTIONS
			 * window.cashmusic.styles.addClass(HTML element el, string classname)
			 * window.cashmusic.styles.hasClass(HTML element el, string classname)
			 * window.cashmusic.styles.injectCSS(string css, boolean important)
			 * window.cashmusic.styles.removeClass(HTML element el, string classname)
			 * window.cashmusic.styles.swapClasses(HTML element el, string oldclass, string newclass)
			 *
			 ***************************************************************************************/
			styles: {
				resolveElement: function(el) {
					if (typeof el === 'string') {
						if (el.substr(0,8) == 'storage:') {
							return window.cashmusic.storage[el.substr(8)];
						} else {
							return document.querySelector(el);
						}
					} else {
						return el;
					}
				},

				addClass: function(el,classname,top) {
					var cm = window.cashmusic;
					if (top && cm.embedded) {
						cm.events.fire(cm,'addclass',{
							"el":el,
							"classname":classname
						});
					} else {
						el = cm.styles.resolveElement(el);
						if (el) {
							el.className = el.className + ' ' + classname;
						}
					}
				},

				hasClass: function(el,classname) {
					// borrowed the idea from http://stackoverflow.com/a/5898748/1964808
					return (' ' + el.className + ' ').indexOf(' ' + classname + ' ') > -1;
				},

				injectCSS: function(css,important,top) {
					var cm = window.cashmusic;
					if (top && cm.embedded) {
						cm.events.fire(cm,'injectcss',{
							"css":css,
							"important":important
						});
					} else {
						var head = document.getElementsByTagName('head')[0] || document.documentElement;
						if (css.substr(0,4) == 'http') {
							// if css starts with "http" treat it as an external stylesheet
							var el = document.createElement('link');
							el.rel = 'stylesheet';
							el.href = css;
						} else {
							// without the "http" wrap css with a style tag
							var el = document.createElement('style');
							el.innerHTML = css;
						}
						el.type = 'text/css';

						if (important) {
							// important means we don't need to write !important all over the place
							// allows for overrides, etc
							head.appendChild(el);
						} else {
							// by injecting the css BEFORE any other style elements it means all
							// styles can be manually overridden with ease — no !important or similar,
							// no external files, etc...
							head.insertBefore(el, head.firstChild);
						}
					}
				},

				removeClass: function(el,classname,top) {
					var cm = window.cashmusic;
					if (top && cm.embedded) {
						cm.events.fire(cm,'removeclass',{
							"el":el,
							"classname":classname
						});
					} else {
						// extra spaces allow for consistent matching.
						// the "replace(/^\s+/, '').replace(/\s+$/, '')" stuff is because .trim() isn't supported on ie8
						el = cm.styles.resolveElement(el);
						if (el) {
							el.className = ((' ' + el.className + ' ').replace(' ' + classname + ' ',' ')).replace(/^\s+/, '').replace(/\s+$/, '');
						}
					}
				},

				swapClasses: function(el,oldclass,newclass,top) {
					var cm = window.cashmusic;
					if (top && cm.embedded) {
						cm.events.fire(cm,'swapclasses',{
							"el":el,
							"oldclass":oldclass,
							"newclass":newclass
						});
					} else {
						// add spaces to ensure we're not doing a partial find/replace,
						// trim off extra spaces before setting
						el = cm.styles.resolveElement(el);
						if (el) {
							el.className = ((' ' + el.className + ' ').replace(' ' + oldclass + ' ',' ' + newclass + ' ')).replace(/^\s+/, '').replace(/\s+$/, '');
						}
					}
				}
			},
		};

		/*
		 *	Post-definition (runtime) calls. For the _init() function to "auto" load...
		 */

		// set path and get all script options
		// file location and path
		var s = document.querySelector('script[src$="cashmusic.js"]');
		if (s) {
			// chop off last 12 characters for 'cashmusic.js' -- not just a replace in case
			// a directory is actually named 'cashmusic.js'
			cashmusic.path = s.src.substr(0,s.src.length-12);
		}
		// get and store options
		cashmusic.options = String(s.getAttribute('data-options'));

		// start on geo-ip data early
		cashmusic.ajax.getHeaderForURL('https://javascript-cashmusic.netdna-ssl.com/cashmusic.js','GeoIp-Data',function(h) {
			cashmusic.geo = h;
		});

		var init = function(){
			// function traps cashmusic in a closure
			if (cashmusic.options.indexOf('lazy') !== -1) {
				// lazy mode...chill for a second
				setTimeout(function() {
					cashmusic._init(cashmusic);
				}, 1000);
			} else {
				cashmusic._init(cashmusic);
			}
		};
		cashmusic.contentLoaded(init); // loads only after the page is complete
	}

	/*
	 *	return the main object in case it's called into a different scope
	 */
	return cashmusic;

}());
