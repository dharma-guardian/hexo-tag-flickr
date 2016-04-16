'use strict';

var Promise = require('bluebird');
var requestPromise = require('request-promise');
var hexoUtil = require('hexo-util');
var tagUtil = require('./flickrTagUtil');
var merge = require('lodash/object/merge');
var APIKey = hexo.config.flickr_api_key || false;
var _hexo = hexo;

if (!APIKey) {
  throw new Error('flickr_api_key configuration is required');
}

var rqOptions = {
    uri: 'https://api.flickr.com/services/rest/',
    qs: {
        api_key: APIKey,
        format: 'json',
        nojsoncallback: 1
    },
    json: true
};

var generatePhoto = function (photo) {
  var tag = tagUtil.convertAttr(photo);
  return requestPromise(photo).then(function (json) {
          var imgAttr = tagUtil.imgFormat(tag, json);
          return imgAttr.src + (imgAttr.alt ? ' "' + imgAttr.alt + '"' : '');
        }, (function (hexo, err) {

          hexo.log.err(err);
        }).bind(this, hexo));
};


/**
 * Filckr tag
 *
 * Syntax:
 * ```
 * {% flickr [class1,class2,classN] photo_id [size] %}
 * ```
 */
hexo.extend.tag.register('flickr', function (args, content) {
  var tag = tagUtil.convertAttr(args);
  var opt = merge({
    method: 'photos.getInfo',
    photo_id: tag.id
  }, rqOptions);

  return requestPromise(opt).then(function (json) {
      return hexoUtil.htmlTag('img', tagUtil.imgFormat(tag,json));
    }).catch( (function (e) {
    hexo.log.err(e);
  }).bind(this));

}, {async: true});


/**
 * For gallery post
 *
 * Syntax:
 * ```
 * photos:
 * - flickr photo_id [size]
 * - flickr photo_id [size]
 * - flickralbum photoset_id user_id [size]
 * ```
 */
hexo.extend.filter.register('pre', function(data) {
  if (!data.photos) return data;

  return Promise.map(data.photos, function(photo) {
    var photoAttr = photo.split(' ');
    var photoType = photoAttr.shift();

    switch (photoType) {
      case 'flickr':
        return generatePhoto(photoAttr);
      case 'flickralbum':
        // return Promise.map()
        break;
      default:
        return photo;
    }
  }).then(function (results) {
    data.photos = results;
    return data;
  });

});



