/*!
 * Custom DataBase Tables v2.1.31 (http://ka2.org)
 * Copyright 2014-2016 ka2@ka2.org
 * Licensed under GPLv2 (http://www.gnu.org/licenses/gpl.txt)
 */
/*
 * :: cookies.js ::
 *
 * A complete cookies reader/writer framework with full unicode support.
 *
 * source:  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
 * localize: https://developer.mozilla.org/ja/docs/Web/API/Document/cookie
 *
 * Syntaxes:
 *
 * - docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
 * - docCookies.getItem(name)
 * - docCookies.removeItem(name[, path])
 * - docCookies.hasItem(name)
 * - docCookies.keys()
 *
 */
var docCookies = {
  getItem: function (sKey) {
    if (!sKey || !this.hasItem(sKey)) { return null; }
    return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Tue, 19 Jan 2038 03:14:07 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toGMTString();
          break;
      }
    }
    document.cookie = escape(sKey) + "=" + escape(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
  },
  removeItem: function (sKey, sPath) {
    if (!sKey || !this.hasItem(sKey)) { return; }
    document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "");
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = unescape(aKeys[nIdx]); }
    return aKeys;
  }
};
$(document).ready(function() {
//jQuery(document).ready(function($) {
  
  /**
   * Utility functions
   * 1. Return as an object by parsing the query string of the current URL
   */
  $.QueryString = (function(queries) {
    if ('' === queries) { return {}; }
    var results = {};
    for (var i=0; i<queries.length; ++i) {
      var param = queries[i].split('=');
      if (param.length !== 2) { continue; }
      results[param[0]] = decodeURIComponent(param[1].replace(/\+/g, ' '));
    }
    return results;
  })(window.location.search.substr(1).split('&'));
  
  /**
   * 2. 1em to pixels
   *
   * @param int em [optional]
   */
  $.em2pxl = function(em) {
    if ('' === em) { em = 1; }
    var div = $('<div style="width:'+em+'em;"></div>').appendTo('body');
    var pixel = div.width();
    div.remove();
    return pixel;
  };
  
  /**
   * 3. Survey the width of strings
   *
   * @param string str
   * @param bool stripTags [optional]
   */
  $.strWidth = function(str) {
    if ('' === arguments[0]) { return 0; }
    var ruler = $('<span style="visibility:hidden;position:absolute;white-space:nowrap;"></span>').appendTo('body');
    var width;
    if (arguments[1] !== undefined && arguments[1]) {
      str = $('<div/>').html(str).text();
    }
    width = ruler.text(str).get(0).offsetWidth;
    ruler.remove();
    return width;
  };
  
  /**
   * 4. Survey the size of image
   * 
   * @param string src [optional]
   */
  $.imageSize = function(src) {
    var imgSize = { w: 0, h: 0 };
    var img = new Image();
    img.src = src;
    imgSize.w = img.width;
    imgSize.h = img.height;
    return imgSize;
  };
  
  /**
   * 5. Perform mutual conversion between the actual strings and the html entity
   * 
   * @param string str [required]
   * @param string proc [optional] "decode" (is default) or "encode"
   */
  $.htmlEntities = function(str, proc) {
    if ( 'encode' === proc ) {
      var buffer = [];
      for ( var i=str.length-1; i>=0; i-- ) {
        buffer.unshift( ['&#', str[i].charCodeAt(), ';'].join('') );
      }
      return buffer.join('');
    } else {
      return str.replace( /&#(\d+);/g, function( match, dec ) {
        return String.fromCharCode( dec );
      });
    }
  };
  
  
  /**
   * Localize the variables passed from wordpress
   */
  $.isDebug = 'true' === cdbt_admin_vars.is_debug ? true : false;
  $.ajaxUrl = cdbt_admin_vars.ajax_url;
  $.ajaxNonce = cdbt_admin_vars.ajax_nonce;
  $.modalNotices = 'true' === cdbt_admin_vars.notices_via_modal ? true : false;
  $.localErrMsg = decodeURIComponent(cdbt_admin_vars.local_err_msg.replace(/\+/g, ' '));
  $.localCopied = decodeURIComponent(cdbt_admin_vars.local_copied.replace(/\+/g, ' '));
  $.onTimer = false;
  if ($.isDebug) {
    // check debug mode
    console.info( $.extend({ debugMode: 'ON', modalNotices: $.modalNotices }, $.QueryString) );
  }
  
  /**
   * Define a global variable for retrieving the response of Ajax
   */
  $.ajaxResponse = {};
  
  /**
   * Define a class for the callback
   */
  var CallbackClass = function() {
    
    /**
     * Reload combobox of time within datepicker
     */
    this.reload_timer = function(){
      
      if ( $.onTimer ) {
        var now = new Date();
        $('.cdbt-datepicker').datepicker('getDate', now);
        $('.datepicker-combobox-hour[data-on-timer="true"] input[type="text"]').val(('00' + now.getHours()).slice(-2));
        $('.datepicker-combobox-minute[data-on-timer="true"] input[type="text"]').val(('00' + now.getMinutes()).slice(-2));
        $('.datepicker-combobox-second[data-on-timer="true"] input[type="text"]').val(('00' + now.getSeconds()).slice(-2));
      }
      
    };
    
    /**
     * Render a modal dialog
     */
    this.render_modal = function(){
      
      if ($('div.cdbt-modal').size() > 0) {
        $('div.cdbt-modal').remove();
        $('#append-dynamic-modal').remove();
      }
      
      $('body').append( $.ajaxResponse.responseText );
      
      // For rendering JSON data (since 2.1.31)
      if ( /^\[\{.*\}\]$/im.test($('.cdbt-modal .modal-body').text().trim()) ) {
        $('.cdbt-modal .modal-body').html('<textarea class="inner-preview cdbt-clipboard">'+$('.cdbt-modal .modal-body').text().trim()+'</textarea>').queue(function(){
          var __height = $(window).height() - $('.modal-header').height() - $('.modal-footer').height() - ($('#wpadminbar').size() > 0 ? $('#wpadminbar').height() : 0);
          $('.inner-preview').css({ height: Math.ceil(__height * 0.6)+'px' });
          
        });
      }
    };
    
    /**
     * Insert the content into the modal dialog
     */
    this.load_into_modal = function(){
      
      if ($('div.cdbt-modal').size() > 0) {
        $('div.modal-body').html( $.ajaxResponse.responseText ).trigger('create');
        $.ajaxResponse.responseText = '';
        var modalForm = $('form#' + $('div.modal-body').find('form').attr('id') );
        // Initialize the form components of fuel ux
        modalForm.find('.checkbox-custom').checkbox('enable');
        modalForm.find('.combobox').combobox('enable');
        modalForm.find('.infinitescroll').infinitescroll('enable');
        modalForm.find('.loader').loader('reset');
        modalForm.find('.pillbox').pillbox();
        modalForm.find('.placard').placard('enable');
        modalForm.find('.radio').radio('enable');
        modalForm.find('.search').search('enable');
        modalForm.find('.selectlist').selectlist('enable');
        modalForm.find('.spinbox').spinbox();
        modalForm.find('.tree').tree('render');
        modalForm.find('.wizard').wizard();
        modalForm.find('.repeater').repeater('render');
        modalForm.find('.datepicker').each(function(){
          var parse_id = $(this).attr('id').replace('entry-data-', '').split('-');
          var id = parse_id[0];
          var prev_date = $('input[name="custom-database-tables['+id+'][prev_date]"]').val();
          $(this).datepicker({ 
            date: new Date(prev_date), 
            allowPastDates: true, 
            restrictDateSelection: true, 
            momentConfig: { culture: $(this).data('momentLocale'), format: $(this).data('momentFormat') }, 
          });
          $.onTimer = false;
        });
        // Initialize other
        $('div.modal-body').find('input,textarea,select').each(function(){
          if (typeof $(this).attr('required') !== 'undefined') {
            $(this).prop('required', true);
          }
        });
      }
      
    };
    
    /**
     * Set the importing sql
     */
    this.set_importing_sql = function(){
      
      $('textarea[name="confirm_sql"]').val( $.ajaxResponse.responseText );
      
    };
    
    /**
     * Set the retrieving api key
     */
    this.set_api_key = function(){
      
      $('#current_host_apikey').val( $.ajaxResponse.responseText );
      
    };
    
    /**
     * Render the retrieving content
     */
    this.show_columns_info = function(){
      
      $('#columns-information').html('').append( $.ajaxResponse.responseText );
      
    };
    this.hide_columns_info = function(){
      
      $('#columns-information').html('').append( $.ajaxResponse.responseText ).queue(function(){
        $('#columns-detail').addClass('hide');
        $('#collapse-reference').children('i').attr('class', 'fa fa-plus-square');
      });
      
    };
    
  };
  var Callback = new CallbackClass();
  
  /**
   * Modal dialog window of Bootstrap initialize
   */
  var init_modal = function(){
    var post_data = {};
    if (arguments.length > 0) {
      post_data = arguments[0];
    }
    
    if ($('div.cdbt-modal').size() > 0) {
      $('div.cdbt-modal').remove();
      $('#append-dynamic-modal').remove();
    }
    
    cdbtCallAjax( $.ajaxUrl, 'post', _.extend(post_data, { 'event': 'retrieve_modal' }), 'html', 'render_modal' );
    
  };
  
  /**
   * Wizard components of Fuel UX renderer
   */
  if (typeof wizard !== 'undefined') {
    //$('#welcome-wizard').wizard();
    
    $('#cdbt-wizard').on('finished.fu.wizard', function(e){
      if ( 'introduction' === e.target.previousElementSibling.className ) {
        post_data = {
          id: 'cdbtModal', 
          insertContent: true, 
          modalTitle: 'hide_tutorial', 
          modaleBody: '', 
          //modaleHideEvent: "window.location.replace();", 
          modalExtras: { 'hide_tutorial': true }, 
        };
        init_modal( post_data );
        
        var _introduction = $(e.target.previousElementSibling);
        var _tutorial = $(this);
        $(document).on('click', '#hide_tutorial', function(e){
          _introduction.addClass('hide');
          _tutorial.addClass('hide');
          // Save option of hide introduction
          var post_data = {
            event: 'update_options',
            'hide_tutorial': true, 
          };
          cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
        });
        
      }
    });
    
  }
  
  
  /**
   * Dynamic table components renderer
   */
  if (typeof DynamicTables !== 'undefined') {
    _.each($('.cdbt-table-wrapper').find('table').map(function(){return this.id; }).get(), function(v){
      var table = new DynamicTables[v]();
      return table.render();
    });
    
    $(document).on('click', '.cdbt-table-wrapper .modal-preview', function(){
      var bin_data = $(this).children('img').attr('src');
      var raw_data = '';
      var post_data = {
        id: 'cdbtModal', 
        insertContent: true, 
        modalTitle: '', 
        modalBody: '', 
      };
      if (typeof bin_data !== 'undefined') {
        raw_data = bin_data;
        var maxImageHeight = $(window).height() - 200 - ($('#wpadminbar').size() ? $('#wpadminbar').outerHeight() : 0);
        post_data.modalTitle = 'image_preview';
        post_data.modalSize = 'large';
        post_data.modalBody = '<div class="preview-image-body"><img src="'+ raw_data +'" class="center-block" style="max-height:'+maxImageHeight+'px; width: inherit;"></div>';
      } else {
        raw_data = $(this).text();
        post_data.modalTitle = 'binary_downloader';
        post_data.modalExtras = { 
          'table_name': $(this).data().targetTable, 
          'target_column': $(this).data().columnName, 
          'where_clause': $(this).data().whereConditions, 
        };
      }
      init_modal( post_data );
      
    });
    
  }
  
  
  /**
   * Repeater components of Fuel UX renderer
   */
  if (typeof repeater !== 'undefined') {
    _.each(repeater, function(k,v){ return repeater[v](); });
    
    var adjustCellSize = function() {
      $('.repeater table tr').each(function(){
        $(this).children('th').removeAttr('style');
        $(this).children('td').removeAttr('style');
        $(this).find('.repeater-list-heading').removeAttr('style');
        $('.repeater-list-heading').each(function(){
          $(this).css('width', $(this).parent('th').width() + 16 + 'px');
        });
      });
    };
    
    var locationToOperation = function( post_raw_data ) {
      docCookies.setItem( 'cdbtOperatingTable', post_raw_data.targetTable );
      var post_data = {
        'session_key': post_raw_data.sessionKey, 
        'default_action': post_raw_data.operateAction, 
        'target_table': post_raw_data.targetTable, 
        'callback_url': post_raw_data.baseUrl, 
      };
      return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    };
    
    if (_.contains([ 'cdbtAdminTables', 'cdbtWpCoreTables' ], $('.repeater').attr('id'))) {
      $(document).on('click', '.cdbt-repeater-left-main>a', function(){
        locationToOperation( _.extend($(this).data(), { sessionKey: 'operate_table' }) );
      });
      
      $(document).on('click', '.operate-table-btn-group>button', function(){
        locationToOperation( _.extend($(this).data(), { sessionKey: 'operate_table' }) );
      });
      
      $(document).on('click', '.operate-data-btn-group>button', function(){
        locationToOperation( _.extend($(this).data(), { sessionKey: 'operate_data' }) );
      });
      
      $(document).on('rendered.fu.repeater', '.repeater', function(e){
        $(this).find('.sorted').removeClass('sorted');
        var cols = $(this).data('cols').split(',');
        var currentSortCol, currentSortDirection;
        var sortCache = docCookies.getItem('cdbtSortCache');
        var sortCookie = JSON.parse(sortCache);
        if (typeof sortCookie === 'object' && _.size(sortCookie) > 0 && typeof sortCookie[$(this).attr('id')] !== 'undefined') {
          currentSortCol = cols[sortCookie[$(this).attr('id')][0]];
          currentSortDirection = sortCookie[$(this).attr('id')][1];
        } else {
          currentSortCol = $(this).data().currentSortCol;
          currentSortDirection = $(this).data().currentSortDirection;
        }
        if (_.contains(cols, currentSortCol)) {
          $(this).find('thead th.sortable').each(function(){
            var indexNum = _.indexOf(cols, currentSortCol);
            if ($(this).index() === indexNum) {
              $(this).addClass('sorted').find('.sortable').addClass('sorted');
              var up_down = currentSortDirection === 'asc' ? 'up' : 'down';
              $(this).find('.rlc').attr('class', 'glyphicon rlc glyphicon-chevron-' + up_down);
            } else {
              $(this).find('.rlc').attr('class', 'glyphicon rlc');
            }
          });
        }
      });
      
      $(document).on('click', 'th.sortable', function(){
        var parentRepeater = $(this).parents('.repeater');
        var sortCache = docCookies.getItem('cdbtSortCache');
        if (parentRepeater.data('cols') === undefined) {
          return false;
        }
        var cols = parentRepeater.data('cols').split(',');
        var indexNum, currentSortDirection, newSortDirection;
        var clickIndex = $(this).index();
        if (sortCache !== null) {
          var sortCookie = JSON.parse(sortCache);
          if (typeof sortCookie === 'object' && _.size(sortCookie) > 0 && typeof sortCookie[parentRepeater.attr('id')] !== 'undefined') {
            indexNum = sortCookie[parentRepeater.attr('id')][0];
            currentSortDirection = sortCookie[parentRepeater.attr('id')][1];
            if (indexNum !== clickIndex) {
              indexNum = clickIndex;
            } else {
              parentRepeater.data().currentSortDirection = currentSortDirection;
            }
            parentRepeater.data().currentSortCol = cols[indexNum];
          } else {
            indexNum = clickIndex;
            parentRepeater.data().currentSortCol = cols[indexNum];
            currentSortDirection = parentRepeater.data().currentSortDirection;
          }
          newSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
        } else {
          indexNum = clickIndex;
          parentRepeater.data().currentSortCol = cols[indexNum];
          currentSortDirection = parentRepeater.data().currentSortDirection;
          newSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
        }
        sortCache = {};
        sortCache[parentRepeater.attr('id')] = new Array( indexNum, newSortDirection, String(e.timeStamp) );
        docCookies.getItem('cdbtSortCache', JSON.stringify(sortCache));
        parentRepeater.repeater('render');
        adjustCellSize();
      });
      
      adjustCellSize();
    }
    if (_.contains([ 'cdbtShortcodes' ], $('.repeater').attr('id'))) {
      $(document).on('click', '.cdbt-repeater-left-main>a, .scl-operation-buttons button', function(){
        var post_raw_data = $(this).data();
        var post_data = {
          'default_action': post_raw_data.operateAction, 
          'target_shortcode': post_raw_data.targetSc, 
          'target_scid': post_raw_data.targetScid, 
          'callback_url': post_raw_data.baseUrl, 
        };
        if ('register' === post_raw_data.operateAction || 'edit' === post_raw_data.operateAction) {
          post_data = _.extend(post_data, { 'session_key': 'shortcode_' + post_raw_data.operateAction });
          return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
        }
        if ('delete' === post_raw_data.operateAction) {
          //post_data = _.extend(post_data, { 'session_key': 'shortcode_list', 'event': 'delete_shortcode' });
          post_data = {
            id: 'cdbtModal', 
            insertContent: true, 
            modalTitle: 'delete_shortcode', 
            modaleBody: '', 
            modaleHideEvent: "$('input[name=\"custom-database-tables[operate_action]\"]').val('detail'); $('form.navbar-form').trigger('submit');", 
            modalExtras: { 'target_scid': post_raw_data.targetScid }, 
          };
          init_modal( post_data );
        }
      });
      
      var renderRepeater = function(){
        $('.cdbt-repeater-row').each(function(){
          var first_col = $(this).children('.col-scl-name').children('.cdbt-repeater-left-main').children('a');
          var sc_type = $(this).children('.col-scl-type').text();
          var last_col = $(this).children('.col-scl-operation').children('.scl-operation-buttons');
          if ('built-in' === sc_type) {
            first_col.attr('data-operate-action', 'register');
            last_col.children('.operate-shortcode-edit-btn-group').remove();
          } else
          if ('deprecated' === sc_type) {
            first_col.replaceWith( first_col.text() );
            last_col.remove();
          } else {
            //first_col.attr('data-operate-action', 'edit');
            first_col.replaceWith('<code>'+first_col.text()+'</code>');
            last_col.children('.operate-shortcode-register-btn-group').remove();
            
          }
        });
        adjustCellSize();
      };
      
      $(document).on('click submit keydown', '#cdbtShortcodes', function(){
        renderRepeater();
      });
      renderRepeater();
      
      var is_edit_via_shortcode = $('.repeater').attr('id').indexOf('cdbt-repeater-edit-') === 0;
      
      $(document).on('rendered.fu.repeater', '#cdbtShortcodes', function(e){
        $(this).find('.sorted').removeClass('sorted');
        var cols = $(this).data('cols').split(',');
        var currentSortCol, currentSortDirection;
        var sortCache = docCookies.getItem('cdbtSortCache');
        var sortCookie = JSON.parse(sortCache);
        if (typeof sortCookie === 'object' && _.size(sortCookie) > 0 && typeof sortCookie[$(this).attr('id')] !== 'undefined') {
          currentSortCol = cols[sortCookie[$(this).attr('id')][0]];
          currentSortDirection = sortCookie[$(this).attr('id')][1];
        } else {
          currentSortCol = $(this).data().currentSortCol;
          currentSortDirection = $(this).data().currentSortDirection;
        }
        if (_.contains(cols, currentSortCol)) {
          $(this).find('thead th.sortable').each(function(){
            var indexNum = _.indexOf(cols, currentSortCol);
            if ($(this).index() === indexNum) {
              $(this).addClass('sorted').find('.sortable').addClass('sorted');
              var up_down = currentSortDirection === 'asc' ? 'up' : 'down';
              $(this).find('.rlc').attr('class', 'glyphicon rlc glyphicon-chevron-' + up_down);
            } else {
              $(this).find('.rlc').attr('class', 'glyphicon rlc');
            }
          });
        }
      });
      
      $(document).on('click', 'th.sortable', function(e){
        var parentRepeater = $(this).parents('.repeater');
        var sortCache = docCookies.getItem('cdbtSortCache');
        if (parentRepeater.data('cols') === undefined) {
          return false;
        }
        var cols = parentRepeater.data('cols').split(',');
        var indexNum, currentSortDirection, newSortDirection;
        var clickIndex = $(this).index();
        if (sortCache !== null) {
          var sortCookie = JSON.parse(sortCache);
          if (typeof sortCookie === 'object' && _.size(sortCookie) > 0 && typeof sortCookie[parentRepeater.attr('id')] !== 'undefined') {
            indexNum = sortCookie[parentRepeater.attr('id')][0];
            currentSortDirection = sortCookie[parentRepeater.attr('id')][1];
            if (indexNum !== clickIndex) {
              indexNum = clickIndex;
            } else {
              parentRepeater.data().currentSortDirection = currentSortDirection;
            }
            parentRepeater.data().currentSortCol = cols[indexNum];
          } else {
            indexNum = clickIndex;
            parentRepeater.data().currentSortCol = cols[indexNum];
            currentSortDirection = parentRepeater.data().currentSortDirection;
          }
          newSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
        } else {
          indexNum = clickIndex;
          parentRepeater.data().currentSortCol = cols[indexNum];
          currentSortDirection = parentRepeater.data().currentSortDirection;
          newSortDirection = currentSortDirection === 'desc' ? 'asc' : 'desc';
        }
        sortCache = {};
        sortCache[parentRepeater.attr('id')] = new Array( indexNum, newSortDirection, String(e.timeStamp) );
        docCookies.getItem('cdbtSortCache', JSON.stringify(sortCache));
        parentRepeater.repeater('render');
        adjustCellSize();
      });
      
    }
    if (_.contains([ 'cdbtAllowedHosts' ], $('.repeater').attr('id'))) {
      $(document).on('click', '.operate-webapi-deletion-btn-group button', function(){
        var post_raw_data = $(this).data();
        if ('delete' === post_raw_data.operateAction) {
          var post_data = {
            id: 'cdbtModal', 
            insertContent: true, 
            modalTitle: 'delete_host', 
            modaleBody: '', 
            modaleHideEvent: "$('input[name=\"custom-database-tables[operate_action]\"]').val('detail'); $('form.navbar-form').trigger('submit');", 
            modalExtras: { 'host_name': post_raw_data.targetHost, 'host_id': post_raw_data.targetHostid }, 
          };
          init_modal( post_data );
        }
      });
      
      var customColsRender = function(){
        $('td.col-ahl-permission').each(function(){
          var permissions = $(this).text().split(',');
          var content = _.reduce(permissions, function(m, v){ return m + '<span class="label label-primary" style="display: inline-block; margin-right: 4px;">' + v + '</span>'; }, '');
          $(this).html(content);
        });
        adjustCellSize();
      };
      
      $(document).on('click submit keydown', '#cdbtShortcodes', function(){
        customColsRender();
      });
      customColsRender();
      
      $(document).on('click', 'th.sortable', function(){
        customColsRender();
        adjustCellSize();
      });
      
    }
    
    if ($('.repeater').attr('id').indexOf('cdbt-repeater-view-') !== -1 ) {
      
      
      $(document).on('click', 'th.sortable', function(){
        //adjustCellSize();
      });
      
    }
    
    // test
    //adjustCellSize();
  }
  
  /**
   * Datepicker components of Fuel UX renderer
   */
  if ($('.cdbt-datepicker').size() > 0) {
    var targetForm = $( 'form#' + $('.cdbt-datepicker').parents('form').attr('id') );
    targetForm.find('.cdbt-datepicker').each(function(){
      if ($(this).data().momentLocale && $(this).data().momentFormat) {
        $(this).datepicker({ 
          momentConfig: { culture: $(this).data().momentLocale, format: $(this).data().momentFormat } 
        });
      }
      if (typeof $(this).data('date') === 'undefined') {
        $(this).datepicker( 'getDate', new Date() ); 
      } else {
        $(this).datepicker( 'setDate', $(this).data('date') );
      }
      var prevDate = $(this).parent().next('input[type=hidden]').val();
      if ( prevDate === '0000-00-00 00:00:00' ) {
        $.onTimer = true;
        Callback.reload_timer();// once only
      } else {
        $.onTimer = false;
      }
    });
    //setInterval( function(){ 'use strict'; Callback.reload_timer(); }, 1000 );
  }
  
  
  /**
   * Common kinetic component
   */
  if ($.fn.kinetic !== undefined) {
    $('.cdbt-kinetic').kinetic({
      filterTarget: function(target, e){
        if (!/down|start/.test(e.type)){
          return !(/span|area|a|input/i.test(target.tagName));
        }
      }
    });
  }
  
  /**
   * Common clipboard copy handler
   */
  if (typeof Clipboard === 'function') {
    
    var cdbtClipboard = new Clipboard( '.cdbt-clipboard', {
      text: function(trigger){
        var _this = $(trigger), text;
        if ('TEXTAREA' === _this.context.tagName || 'INPUT' === _this.context.tagName) {
          text = _this.val();
        } else {
          text = _this.text() || false;
        }
        if (text && '' !== text) {
          _this.addClass('cdbt-copied');
          return text;
        } else {
          return false;
        }
      }
    });
    cdbtClipboard.on( 'success', function(e) {
      var _this = $(e.trigger);
      _this.tooltip({ trigger: 'manual', title: $.localCopied }).tooltip('show');
      _this.animate({ backgroundColor:'#fff', color:'#333' }, 500, function(){
        _this.removeClass('cdbt-copied').tooltip('hide');
        e.clearSelection();
      });
    });
    cdbtClipboard.on('error', function(e){
      var _this = $(e.trigger);
      _this.removeClass('cdbt-copied').tooltip('hide');
      e.clearSelection();
    });
    
  }
  
  
  /**
   * Common ajax closure
   */
  var cdbtCallAjax = function(){
    if (arguments.length < 2) {
      return false;
    }
    var ajax_url = arguments[0];
    var method = arguments[1];
    var post_data = typeof arguments[2] !== 'undefined' ? arguments[2] : null;
    var data_type = typeof arguments[3] !== 'undefined' ? arguments[3] : 'text';
    var callback_function = typeof arguments[4] !== 'undefined' ? arguments[4] : null;
    
    var jqXHR = $.ajax({
      async: true,
      url: ajax_url,
      type: method,
      data: post_data,
      dataType: data_type,
      cache: false,
      beforeSend: function(xhr, set) {
        // return;
      }
    });
    
    jqXHR.done(function(data, stat, xhr) {
      if ($.isDebug) {
        console.log({
          done: stat,
          data: data,
          xhr: xhr
        });
        //alert( xhr.responseText );
      }
      if ('script' !== data_type) {
        if (/0$/im.test(jqXHR.responseText)) {
          jqXHR.responseText = jqXHR.responseText.substr(0, jqXHR.responseText.length-1);
        }
        $.ajaxResponse = { 'responseText': jqXHR.responseText, 'status': jqXHR.status, 'statusText': jqXHR.statusText };
      } else {
        return data;
      }
      if ('' !== callback_function) {
        return Callback[callback_function]();
      }
    });
    
    jqXHR.fail(function(xhr, stat, err) {
      if ($.isDebug) {
        console.log({
          fail: stat,
          error: err,
          xhr: xhr
        });
        //alert( xhr.responseText );
      }
    });
    
    jqXHR.always(function(res1, stat, res2) {
      if ($.isDebug) {
        console.log({
          always: stat,
          res1: res1,
          res2: res2
        });
        if (stat === 'success') {
          //alert('Ajax Finished!');
        }
      }
    });
    
  };
  
  
  /**
   * Common display notice handler
   */
  if ('' !== $('#message').text().trim()) {
    if ($.modalNotices) {
      var post_data = {
        id: 'cdbtModal', 
        insertContent: true, 
        modalTitle: 'notices_' + $('#message').attr('class'), 
        modalBody: $('#message').html(), 
      };
      init_modal( post_data );
    } else {
      $('#message').show();
    }
  }
  
  
  /**
   * Helper UI scripts for create table section
   */
  if ('cdbt_tables' === $.QueryString.page && 'create_table' === $.QueryString.tab) {
    // Table name live preview
    var livePreview = function(table_name) {
      //if ($('.checkbox input[name="instance_prefix_switcher"]').is(':checked')) {
      if ($('#instance_prefix_switcher .checkbox-custom').checkbox('isChecked')) {
        table_name = $('#create-table-table_name div.input-group-addon').text() + table_name;
      }
      $('#live_preview code').text(table_name);
      $('input[name="custom-database-tables[table_name]"]').val(table_name);
    };
    $('#instance_table_name').on('change keypress keyup paste', function(){
      livePreview($(this).val());
    });
    
    // Table prefix switching
    var prefixSwitcher = function(is_chk) {
      if (is_chk) {
        $('#create-table-table_name div.input-group-addon').removeClass('sr-only');
      } else {
        $('#create-table-table_name div.input-group-addon').addClass('sr-only');
      }
      livePreview($('#instance_table_name').val());
    };
    $('.checkbox input[name="instance_prefix_switcher"]').on('change', function(){
      prefixSwitcher( $(this).is(':checked') );
    });
    //prefixSwitcher( $('.checkbox input[name="instance_prefix_switcher"]').is(':checked') );
    prefixSwitcher( $('#instance_prefix_switcher .checkbox-custom').checkbox('isChecked') );
    
    // Make a template from the set value
    $('#create-sql-support').on('click', function(){
      
      // use underscore.js
      var sql_template = _.template("CREATE TABLE <%= tableName %> ( <%= columnDefinition %> ) <%= tableOptions %>;");
      
      var table_name = '', table_options = [], first_column = '', middle_columns = $('#instance_create_table_sql').val(), bottom_columns = [];
      var keyindex = { 'primary_key': [], 'index': [], 'unique': [], 'fulltext': [], 'foreign_key': [] };
      var restoredCache = JSON.parse(localStorage.getItem('cdbt-tc-cache'));
      var used_col_name = [], has_auto_increment = false;
      if ('' !== middle_columns && restoredCache !== null && _.isArray(restoredCache) && restoredCache.length > 0) {
        _.each(restoredCache, function(col){
          if ('' !== col.key_index) {
            var key_index_slug = col.key_index.toLowerCase().replace(' ', '_');
            keyindex[key_index_slug].push( col.col_name );
          }
          if (col.auto_increment) {
            has_auto_increment = true;
          }
          used_col_name.push( col.col_name );
        });
      }
//console.info(used_col_name);
      
      if ('' !== $('input[name="custom-database-tables[table_name]"]').val()) {
        table_name = '`' + $('input[name="custom-database-tables[table_name]"]').val() + '`';
      }
      
      if ('' !== $('input[name="custom-database-tables[table_db_engine]"]').val()) {
        table_options.push( 'ENGINE=' + $('input[name="custom-database-tables[table_db_engine]"]').val() );
      }
      if ('' !== $('input[name="custom-database-tables[table_charset]"]').val()) {
        table_options.push( 'DEFAULT CHARSET=' + $('input[name="custom-database-tables[table_charset]"]').val() );
      }
      if ('' !== $('input[name="custom-database-tables[table_comment]"]').val()) {
        table_options.push( 'COMMENT=\'' + $('input[name="custom-database-tables[table_comment]"]').val() + '\'' );
      }
      
      //if ($('#automatically-add-columns1').checkbox('isChecked')) {
      //if ($('#automatically-add-columns1 input').prop('checked')) {
      if ($('#automatically-add-columns1 .checkbox-custom').checkbox('isChecked')) {
        if ('' !== middle_columns && (_.contains(used_col_name, 'ID') || keyindex.primary_key.length > 0)) {
          $('#automatically-add-columns1 .checkbox-custom').checkbox('uncheck');
        } else {
          first_column = "`ID` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID', ";
          keyindex.primary_key.push( 'ID' );
          has_auto_increment = true;
        }
      }
      //if ($('#automatically-add-columns2').checkbox('isChecked')) {
      //if ($('#automatically-add-columns2 input').prop('checked')) {
      if ($('#automatically-add-columns2 .checkbox-custom').checkbox('isChecked')) {
        if ('' !== middle_columns && _.contains(used_col_name, 'created')) {
          $('#automatically-add-columns2 .checkbox-custom').checkbox('uncheck');
        } else {
          bottom_columns.push( "`created` datetime NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT 'Created Datetime'" );
        }
      }
      //if ($('#automatically-add-columns3').checkbox('isChecked')) {
      //if ($('#automatically-add-columns3 input').prop('checked')) {
      if ($('#automatically-add-columns3 .checkbox-custom').checkbox('isChecked')) {
        if ('' !== middle_columns && _.contains(used_col_name, 'updated')) {
          $('#automatically-add-columns3 .checkbox-custom').checkbox('uncheck');
        } else {
          bottom_columns.push( "`updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated Datetime'" );
        }
      }
      
      // Parse Key/Index
      var keyindex_definitions = [];
      _.each(keyindex, function(v, k){
        if (v.length > 0) {
          keyindex_definitions.push(k.toUpperCase().replace('_', ' ')+'(`'+v.join('`,`')+'`) ');
        }
      });
      first_column = '' !== first_column ? first_column + "\n" : '';
      middle_columns = '' !== middle_columns ? middle_columns + "\n" : '';
      bottom_columns = bottom_columns.length > 0 ? bottom_columns.concat(keyindex_definitions) : keyindex_definitions;
      var columns = "\n" + first_column + middle_columns;
      if (bottom_columns.length > 0) {
        columns += bottom_columns.join(", \n");
      } else {
        columns = columns.substring(0, columns.lastIndexOf(", \n")) + " \n";
      }
      
      // Table options
      if (has_auto_increment) {
        table_options.push( 'AUTO_INCREMENT=1' );
      }
      
      $('#create-table-create_table_sql').val( sql_template({ tableName: table_name, columnDefinition: columns, tableOptions: "\n" + table_options.join(' ')  }) );
      
    });
    
    // Redirection after notice
    if ($('#after-notice-redirection').size() > 0) {
      $(document).on('hidden.bs.modal', '#cdbtModal', function(e){
        var post_data = {
          'session_key': 'operate_table', 
          'default_action': 'detail', 
          'target_table': $('input[name=target_table]').val(), 
          'callback_url': $('#after-notice-redirection').val(), 
        };
        return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
      });
    }
    
    // Boot table creator via modal
    $('a[data-toggle=tab]').on('shown.bs.tab', function(e) {
      if ('table_creator' === e.target.hash.substr(1)) {
        var post_data = {
        	id: 'cdbtTableCreator', 
          insertContent: true, 
          modalSize: 'large', 
          modalTitle: 'table_creator', 
          modalBody: '', 
          modalHideEvent: "$('#adminmenuwrap').show();$('a[data-toggle=tab]:first').tab('show');", 
          modalShowEvent: "doTableCreator();", 
          modalExtras: { 'column_definitions': $('#instance_create_table_sql').val(), }, 
        };
        init_modal( post_data );
      }
    });
    
  }
  
  
  /**
   * Helper UI scripts for modify table section
   */
  if ('cdbt_tables' === $.QueryString.page && 'modify_table' === $.QueryString.tab) {
    // Change modify table
    $('#modify-table-action-change_table').on('click', function(e) {
      e.preventDefault();
      if ('' === $('#modify-table-change_table').selectlist('selectedItem').value) {
        return false;
      }
      
      post_data = {
        'session_key': 'modify_table', 
        'target_table': $('#modify-table-change_table').selectlist('selectedItem').value, 
        'callback_url': './admin.php?page=cdbt_tables&tab=modify_table', 
      };
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
    // Undo button action
    $('button[id^="btn-undo-modify-table-"]').on('click', function() {
      var undo_target = $(this).attr('id').replace('btn-undo-', '');
      $('#' + undo_target).val($(this).data().prevValue);
      if ( 'modify-table-sanitization_input' === undo_target ) {
        if ( $(this).data().prevValue ) {
          $('#' + undo_target).parent().checkbox( 'check' );
        } else {
          $('#' + undo_target).parent().checkbox( 'uncheck' );
        }
      }
    });
    
    // The effect occurs if changed
    $('input,button,.dropdown-menu>li>a').on('click blur change keypress keyup', function(){
      $('.form-group').each(function(){
        var current_value = $(this).find('input[id^="modify-table-"]').val();
        if ( typeof current_value === 'string' ) {
          if ( $(this).find('button[id^="btn-undo-"]').size() > 0 ) {
            if ( typeof $(this).find('button[id^="btn-undo-"]').attr('data-prev-value') !== 'undefined' ) {
              var prev_value = $(this).find('button[id^="btn-undo-"]').attr('data-prev-value');
              if ( current_value !== prev_value ) {
                $(this).addClass('has-success');
              } else {
                $(this).removeClass('has-success');
              }
            }
          }
        }
      });
    });
    $('textarea[id^="modify-table-"]').on('blur keypress keyup', function(){
      if ($(this).val() !== $('#btn-undo-' + $(this).attr('id')).data().prevValue) {
        $(this).parents('.form-group').addClass('has-success');
      } else {
        $(this).parents('.form-group').removeClass('has-success');
      }
    });
    $('#btn-undo-modify-table-alter_table_sql').on('click', function(){
      $('#modify-table-alter_table_sql').parents('.form-group').removeClass('has-success');
    });
    $('.checkbox input').on('change', function () {
      if ( $(this).is(':checked') ) {
        $(this).val('1');
      } else {
        $(this).val('0');
      }
    });
    
    // Count modification items
    var count_modification_items = function(){
      var selector_str = '';
      var modification_items = 0;
      if (arguments.length !== 1) {
        selector_str = '.form-group';
      } else {
        selector_str = '#' + arguments[0] + ' .form-group';
      }
      
      $(selector_str).each(function(){
        if ($(this).hasClass('has-success')) {
          modification_items++;
        }
      });
      
      return modification_items;
    };
    
    $('#submit-alter-table, #submit-update-options').on('click', function(e){
      e.preventDefault();
      var form_id = $(this).parents('form').attr('id');
      if (count_modification_items(form_id) > 0) {
        $('#' + form_id).trigger('submit');
      } else {
        post_data = {
        	id: 'cdbtModal', 
          insertContent: true, 
          modalTitle: 'changing_item_none', 
          modalBody: '', 
        };
        init_modal( post_data );
      }
    });
    
    // Redirection after notice
    if ($('#after-notice-redirection').size() > 0) {
      $(document).on('hidden.bs.modal', '#cdbtModal', function(e){
        post_data = {
          'session_key': 'operate_table', 
          'default_action': 'detail', 
          'target_table': $('input[name=target_table]').val(), 
          'callback_url': $('#after-notice-redirection').val(), 
        };
        return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
      });
    }
    
  }
  
  
  /**
   * Helper UI scripts for operate table section
   */
  if ('cdbt_tables' === $.QueryString.page && 'operate_table' === $.QueryString.tab) {
    
    $('button[id^="operate-table-action-"]').on('click', function(e) {
      if ('' === $('#operate-table-target_table').selectlist('selectedItem').value) {
        e.preventDefault();
        return false;
      }
      var new_action = _.last($(this).attr('id').split('-'));
      var cookie_value;
      if ('change_table' === new_action) {
        new_action = 'detail';
        cookie_value = $('#operate-table-target_table').selectlist('selectedItem').value;
        docCookies.setItem( 'cdbtOperatingTable', cookie_value );
      }
      $('input[name="custom-database-tables[operate_action]"]').val(new_action);
      $('button[id^="operate-table-action-"]').removeClass('active');
      $(this).addClass('active');
      
      $common_modal_hide = "$('input[name=\"custom-database-tables[operate_action]\"]').val('detail'); $('form.navbar-form').trigger('submit');";
      
      var post_data = {};
      if ('' === $('input[name="custom-database-tables[operate_current_table]"]').val()) {
        post_data = {
        	id: 'cdbtModal', 
          insertContent: true, 
          modalTitle: 'table_unknown', 
          modalBody: '', 
          modalHideEvent: $common_modal_hide, 
        };
        init_modal( post_data );
      } else {
        switch(new_action) {
          case 'detail': 
          case 'import': 
          case 'export': 
          case 'duplicate': 
          case 'backup': 
            $('section').each(function() {
              if (new_action === $(this).attr('id')) {
                $(this).attr('class', 'show');
              } else {
                $(this).attr('class', 'hidden');
              }
            });
        	  break;
          case 'truncate': 
            post_data = {
        	    id: 'cdbtModal', 
              insertContent: true, 
              modalTitle: 'truncate_table', 
              modalBody: '', 
              modalHideEvent: $common_modal_hide, 
              modalExtras: { 'table_name': $('input[name="custom-database-tables[operate_current_table]"]').val() }, 
            };
            init_modal( post_data );
            break;
          case 'modify': 
            post_data = {
              'session_key': 'modify_table', 
              'target_table': $('input[name="custom-database-tables[operate_current_table]"]').val(), 
              'callback_url': './admin.php?page=cdbt_tables&tab=modify_table', 
            };
            cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
            break;
          case 'drop': 
            post_data = {
        	    id: 'cdbtModal', 
              insertContent: true, 
              modalTitle: 'drop_table', 
              modalBody: '', 
              modalHideEvent: $common_modal_hide, 
              modalExtras: { 'table_name': $('input[name="custom-database-tables[operate_current_table]"]').val() }, 
            };
            init_modal( post_data );
            break;
          default:
            
            $('form.navbar-form').trigger('submit');
            
            break;
        }
      }
      
    });
    
    // OnChange import file type
    $('#import-table-upload_filetype').on('changed.fu.selectlist', function(){
      if (_.contains(['csv', 'tsv'], $(this).selectlist('selectedItem').value)) {
        toggle_item('switching-item-add_first_line', 'show');
      } else {
        toggle_item('switching-item-add_first_line', 'hide');
      }
    });
    var toggle_item = function(selector, action){
      if ('show' === action) {
        $('#' + selector).show();
      } else {
        $('#' + selector).hide();
      }
    };
    // When onLoaded toggle
    if (_.contains(['csv', 'tsv'], $('#import-table-upload_filetype').selectlist('selectedItem').value)) {
      toggle_item('switching-item-add_first_line', 'show');
    } else {
      toggle_item('switching-item-add_first_line', 'hide');
    }
    
    // Submit import step 1
    $('#button-submit-import_step1').on('click', function(){
      var values = _.pluck($('#import-table-add_first_line').pillbox('items'), 'value');
      $('#import-table-add_first_line-instance').val(values.join(','));
    });
    
    // On ready import step 2
    if (typeof delay_load_importing_sql !== 'undefined' && delay_load_importing_sql) {
      $('#button-submit-import_step2').removeAttr('disabled');
    }
    
    // Submit import step 2
    $('#button-submit-import_step2').on('click', function(e){
      $('#confirm_sql').val('');
    });
    
    // Buttons action in import step 3
    $('#to-view-data').on('click', function(e){
      var post_data = {
        'session_key': 'operate_data', 
        'default_action': 'view', 
        'target_table': $('input[name=\"custom-database-tables[operate_current_table]\"]').val(), 
        'callback_url': '/wp-admin/admin.php?page=cdbt_tables&tab=operate_data', 
      };
      return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    $('#retry-import').on('click', function(e){
      $('input[name=\"custom-database-tables[operate_action]\"]').val('import');
      $('form.navbar-form').trigger('submit');
    });
    
    
    // Switch of all checking of checkbox
    $('button[id^="switch-checkbox-"]').on('click', function(){
      var target_checkbox_container_id = 'export_columns' === $(this).attr('id').replace('switch-checkbox-', '') ? 'export-table-target_columns' : 'import-table-target_columns';
      //$('#' + target_checkbox_container_id + ' .checkbox input').checkbox('toggle');
      $('#' + target_checkbox_container_id + ' .checkbox-custom').checkbox('toggle');
    });
    
    // Switch the display according to the selected value of the select list
    $('#export-table-download_filetype').on('changed.fu.selectlist', function(){
      if (_.contains(['csv', 'tsv'], $(this).selectlist('selectedItem').value)) {
        $('#switching-item-add_index_line').show();
      } else {
        $('#switching-item-add_index_line').hide();
      }
    });
    if ($('#export-table-download_filetype').size() > 0) {
      if (_.contains(['csv', 'tsv'], $('#export-table-download_filetype').selectlist('selectedItem').value)) {
        $('#switching-item-add_index_line').show();
      } else {
        $('#switching-item-add_index_line').hide();
      }
    }
    
    // Run of exporting table util first confirmation
    $('#button-submit-export_table').on('click', function(e){
      e.preventDefault();
      var export_columns = [];
      $('[id^="export-table-target_columns"]').each(function(){
        //if ($(this).checkbox('isChecked') && typeof $(this).children().children('input').val() !== 'undefined') {
        //if ($(this).find('input').prop('checked') && typeof $(this).children().children('input').val() !== 'undefined') {
        if ($(this).find('.checkbox-custom').checkbox('isChecked') && typeof $(this).children().children('input').val() !== 'undefined') {
          export_columns.push($(this).children().children('input').val());
        }
      });
      var post_data = {
        id: 'cdbtModal', 
        insertContent: true, 
        modalTitle: 'export_table', 
        modalHideEvent: "$('input[name=\"custom-database-tables[operate_action]\"]').val('export');", 
        modalExtras: {
          'export_filetype': $('#export-table-download_filetype').selectlist('selectedItem').value, 
          'add_index_line': $('#export-table-add_index_line').find('.checkbox-custom').checkbox('isChecked') ? $('#export-table-add_index_line input').val() : '', 
          'output_encoding': $('#export-table-output_encoding').selectlist('selectedItem').value, 
          'export_columns': export_columns, 
          'export_table': $('[name="custom-database-tables[export_table]"]').val(), 
        },
      };
      init_modal( post_data );
    
    });
    
    // Run of exporting table after confirmation
    $(document).on('click', '#run_export_table', function(){
      $('#cdbt_file_download_flag').val('true');
      $('#form-export_table').submit();
    });
    
    // Run of truncating table after confirmation
    $(document).on('click', '#run_truncate_table', function(){
      var post_data = {
        'table_name': $('input[name="custom-database-tables[operate_current_table]"]').val(), 
        'operate_action': $('input[name="custom-database-tables[operate_action]"]').val(), 
        'event': 'truncate_table', 
      };
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
    // Run of dropping table after confirmation
    $(document).on('click', '#run_drop_table', function(){
      var post_data = {
        'table_name': $('input[name="custom-database-tables[operate_current_table]"]').val(), 
        'operate_action': $('input[name="custom-database-tables[operate_action]"]').val(), 
        'event': 'drop_table', 
      };
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
  }
  
  
  /**
   * Helper UI scripts for operate data section
   */
  if ('cdbt_tables' === $.QueryString.page && 'operate_data' === $.QueryString.tab) {
  
    $('button[id^="operate-table-action-"]').on('click', function(e) {
      if ('' === $('#operate-table-target_table>ul.dropdown-menu').find('li[data-selected="true"]').attr('data-value')) {
        e.preventDefault();
        return false;
      }
      var new_action = _.last($(this).attr('id').split('-'));
      var cookie_value;
      if ('change_table' === new_action) {
        new_action = 'view';
        cookie_value = $('#operate-table-target_table>ul.dropdown-menu').find('li[data-selected="true"]').attr('data-value');
        docCookies.setItem( 'cdbtOperatingTable', cookie_value );
      }
      $('input[name="custom-database-tables[operate_action]"]').val(new_action);
      $('button[id^="operate-table-action-"]').removeClass('active');
      $(this).addClass('active');
      
      $common_modal_hide = "$('input[name=\"custom-database-tables[operate_action]\"]').val('view'); $('form.navbar-form').trigger('submit');";
      
      var post_data = {};
      if ('' === $('input[name="custom-database-tables[operate_current_table]"]').val()) {
        post_data = {
          id: 'cdbtModal', 
          insertContent: true, 
          modalTitle: 'table_unknown', 
          modalBody: '', 
          modalHideEvent: $common_modal_hide, 
        };
        init_modal( post_data );
      } else {
        switch(new_action) {
          case 'view': 
          case 'entry': 
          case 'edit': 
            
            post_data = {
              'session_key': $.QueryString.tab, 
              'default_action': new_action, 
              'target_table': $('section').attr('data-target_table'), 
              'callback_url': './admin.php?page=' + $.QueryString.page + '&tab=' + $.QueryString.tab, 
            };
            return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
            
          default:
            
            $('form.navbar-form').trigger('submit');
            
            break;
        }
      }
      
    });
    
    
    if (typeof $('.repeater[id^="cdbt-repeater-view-"]') !== 'undefined' && $('.repeater[id^="cdbt-repeater-view-"]').size() > 0) {
      
      $(document).on('click', '.repeater .binary-data', function(){
        var bin_data = $(this).children('img').attr('src');
        var raw_data = '';
        var post_data = {
          id: 'cdbtModal', 
          insertContent: true, 
          modalTitle: '', 
          modalBody: '', 
        };
        if (typeof bin_data !== 'undefined') {
          /*
          if (bin_data.indexOf('data:') === 0) {
            bin_data = bin_data.split(',');
            raw_data = bin_data.length > 1 ? bin_data[1] : '';
          } else {
            raw_data = bin_data;
          }
          */
          raw_data = bin_data;
          post_data.modalTitle = 'image_preview';
          post_data.modalSize = 'large';
          post_data.modalBody = '<div class="preview-image-body"><img src="'+ raw_data +'" class="center-block"></div>';
        } else {
        	raw_data = $(this).text();
          post_data.modalTitle = 'binary_downloader';
          post_data.modalExtras = { 
            'table_name': $('section').attr('data-target_table'), 
            'target_column': $(this).attr('data-column-name'), 
            'where_clause': $(this).attr('data-where-conditions'), 
          };
        }
        init_modal( post_data );
        
      });
      
      
    }
    
    // Check empty fields
    // @since 2.0.7 Added new
    // @since 2.0.8 Updated
    var checkEmptyFields = function( formId ){
      //if ( $('.cdbt-entry-data-form form').size() > 0 ) {
      if ( $('form#' + formId).size() === 1 ) {
        var required_fields = 0;
        var empty_fields = 0;
        $('form#' + formId).find('.form-group').each( function() {
          if ( $(this).find('.required').size() > 0 || $(this).find('.cdbt-form-required').size() > 0 ) {
            required_fields += 1;
            var checked = 0;
            var inputted = 0;
            if ( $(this).find('.checkbox').size() > 0 ) {
              $(this).find('.checkbox-custom').each( function() {
                if ( $(this).checkbox('isChecked') ) {
                  checked++;
                }
              });
              if ( checked === 0 ) {
                empty_fields++;
              }
            } else
            if ( $(this).find('.selectlist').size() > 0 ) {
              if ( ! $(this).find('.selectlist').selectlist('selectedItem').selected ) {
                empty_fields++;
              }
            } else
            if ( $(this).find('input[type="text"]').size() > 0 ) {
              $(this).find('input[type="text"]').each( function() {
                if ( $(this).val() !== '' ) {
                  inputted++;
                }
              });
              if ( inputted !== $(this).find('input[type="text"]').size() ) {
                empty_fields++;
              }
            } else
            if ( $(this).find('input[type="number"]').size() > 0 ) {
              $(this).find('input[type="number"]').each( function() {
                if ( $(this).val() !== '' ) {
                  inputted++;
                }
              });
              if ( inputted !== $(this).find('input[type="number"]').size() ) {
                empty_fields++;
              }
            } else
            if ( $(this).find('textarea').size() > 0 ) {
              $(this).find('textarea').each( function() {
                if ( $(this).val() !== '' ) {
                  inputted++;
                }
              });
              if ( inputted !== $(this).find('textarea').size() ) {
                empty_fields++;
              }
            } else
            if ( $(this).find('input[type="file"]').size() > 0 ) {
              // do nothing
            }
          }
          
        });
        if ( required_fields === 0 || empty_fields === 0 ) {
          return true;
        } else {
          return false;
        }
      } else {
        return true;
      }
    };
    
    
    // Actions when entry data
    if (typeof $('.cdbt-entry-data-form') !== 'undefined' && $('.cdbt-entry-data-form').size() > 0) {
      
      $('.cdbt-entry-data-form form .checkbox-custom').on('checked.fu.checkbox unchecked.fu.checkbox', function () {
        if ($(this).hasClass('multiple')) {
          var counter_elm = $('input[name="' + $(this).children('input').attr('name').replace('[]', '') + '[checked]"]');
        	var checked_count = Number(counter_elm.val());
          if ( $(this).checkbox('isChecked') ) {
            checked_count += 1;
          } else {
            checked_count -= checked_count > 0 ? 1 : 0;
          }
          counter_elm.val(checked_count);
        }
      });
      
      $(document).on('click', 'button[id^="btn-entry/"]', function(e){
        e.preventDefault();
        var tmp = $(this).attr('id').split('/');
        var entry_form = $('#' + tmp[1]);
        var check_result = checkEmptyFields( tmp[1] );
        entry_form.find('.checkbox-custom').each(function(){
          if ($(this).hasClass('multiple')) {
            if ($(this).hasClass('required')) {
              var counter_elm = $('input[name="' + $(this).children('input').attr('name').replace('[]', '') + '[checked]"]');
              var checked_count = Number(counter_elm.val());
              if (checked_count === 0) {
                check_result = false;
              }
            }
          }
        });
        if ( check_result ) {
          docCookies.setItem( 'once_action', entry_form.attr( 'id' ) );
          entry_form.submit();
        } else {
          // Added since 2.0.9
          post_data = {
            id: 'cdbtModal', 
            insertContent: true, 
            modalTitle: 'empty_required_field', 
            modalBody: '', 
          };
          init_modal( post_data );
          //return false;
        }
      });
      
    }
    
    
    // Actions when edit data
    // @since 2.1.0 Updated for static table format
    // Button effect
    var effect_buttons = function( id ){
      var selectedItem, edit_button, delete_button;
      if (id.indexOf('cdbt-repeater-edit-') > -1) {
        // For repeater
        selectedItem = $('#'+id).repeater('list_getSelectedItems');
        edit_button = $('#'+id+' button#repeater-editor-edit');
        delete_button = $('#'+id+' button#repeater-editor-delete');
      } else {
        // For static table format
        selectedItem = $('#'+id).find('tbody>tr.selected');
        edit_button = $('.cdbt-table-editor[for="'+id+'"] button#table-editor-edit');
        delete_button = $('.cdbt-table-editor[for="'+id+'"] button#table-editor-delete');
      }
      if (selectedItem.length === 1) {
        edit_button.removeClass('btn-default').addClass('btn-primary').prop('disabled', false);
        delete_button.removeClass('btn-default').addClass('btn-primary').prop('disabled', false);
      } else
      if (selectedItem.length > 1) {
        edit_button.removeClass('btn-primary').addClass('btn-default').prop('disabled', true);
        delete_button.removeClass('btn-default').addClass('btn-primary').prop('disabled', false);
      } else {
        edit_button.removeClass('btn-primary').addClass('btn-default').prop('disabled', true);
        delete_button.removeClass('btn-primary').addClass('btn-default').prop('disabled', true);
      }
    };
    
    // Event handler (for repeater and static table format)
    $('.repeater[id^="cdbt-repeater-edit-"]').on('selected.fu.repeaterList deselected.fu.repeaterList', function(e){
      effect_buttons( $(e.target).attr('id') );
    });
    $(document).on('click', '#repeater-check-switch', function(e){
      effect_buttons( $(e.target).attr('id') );
    });
    $(document).on('click', '.cdbt-table-wrapper table[id^="cdbt-table-edit-"] tr.selectable', function(e){
      if ($(e.target).parents('tbody').size() === 1) {
        $(e.target).parents('tr.selectable').toggleClass('selected').find('.checkbox label').checkbox('toggle');
        effect_buttons( $(e.target).parents('table').attr('id') );
      } else
      if ($(e.target).parents('th.editable-checkbox').size() === 1 || 'editable-checkbox' === e.target.className) {
        $(e.target).parents('tr').find('.checkbox label').checkbox('toggle');
        if ($(e.target).parents('tr').find('.checkbox label').checkbox('isChecked')){
          $(e.target).parents('table').find('tr.selectable').addClass('selected').find('.checkbox label').checkbox('check');
        } else {
          $(e.target).parents('table').find('tr.selectable').removeClass('selected').find('.checkbox label').checkbox('uncheck');
        }
        effect_buttons( $(e.target).parents('table').attr('id') );
      } else {
        return false;
      }
    });
    $(document).on('change', '.cdbt-table-wrapper table[id^="cdbt-table-edit-"] .checkbox input', function(e){
      if ($(e.target).parents('tbody').size() === 1) {
        $(e.target).parents('tr.selectable').toggleClass('selected');
        effect_buttons( $(e.target).parents('table').attr('id') );
      }
    });
    
    $('button[id^="repeater-editor-"],button[id^="table-editor-"]').on('click', function(){
      var dataAction = _.last($(this).attr('id').split('-'));
      var isRepeater = $(this).attr('id').indexOf('repeater-editor') > -1 ? true : false;
      var selectedItem, post_data = {};
      if (isRepeater) {
        selectedItem = $(this).parents('.repeater').repeater('list_getSelectedItems');
      } else {
        selectedItem = $(this).parents('.cdbt-table-wrapper').find('tbody>tr.selected');
      }
      
      $common_modal_hide = "$('input[name=\"custom-database-tables[operate_action]\"]').val('edit'); $('form.navbar-form').trigger('submit');";
      
      switch(dataAction){
        case 'refresh': 
          post_data = {
            'session_key': $.QueryString.tab, 
            'default_action': 'edit', 
            'target_table': $('section').attr('data-target_table'), 
            'callback_url': location.replace('./admin.php?page=' + $.QueryString.page + '&tab=' + $.QueryString.tab), 
          };
          return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
          
        case 'edit': 
          post_data = {
            id: 'cdbtEditData', // 'cdbtModal', 
            insertContent: true, 
            modalTitle: '', 
            modalBody: '', 
          };
          if (selectedItem.length === 0) {
            post_data.id = 'cdbtEditWarning';
            post_data.modalTitle = 'no_selected_item';
          } else if (selectedItem.length > 1) {
            post_data.id = 'cdbtEditWarning';
            post_data.modalTitle = 'too_many_selected_item';
          } else {
            var _whereClause;
            if (isRepeater) {
              _whereClause = $('tr.selectable.selected label').data('row');
            } else {
              _whereClause = selectedItem.find('td.editable-checkbox label').data('row');
            }
            post_data.modalSize = 'large';
            post_data.modalTitle = 'edit_data_form';
            post_data.modalExtras = { 
              'table_name': $('section').attr('data-target_table'), 
              'action_url': '/wp-admin/admin.php?page=' + $.QueryString.page + '&tab=' + $.QueryString.tab, // location.href
              'page': $.QueryString.page, 
              'active_tab': $.QueryString.tab, 
              'where_clause': _whereClause, 
            };
          }
          init_modal( post_data );
          
          break;
        case 'delete': 
          post_data = {
            id: 'cdbtDeleteData', // 'cdbtModal', 
            insertContent: true, 
            modalTitle: '', 
            modalBody: '', 
            modalExtras: { items: selectedItem.length },
          };
          if (selectedItem.length === 0) {
            post_data.modalTitle = 'no_selected_item';
          } else {
            post_data.modalTitle = 'delete_data';
          }
          init_modal( post_data );
          
          break;
        default: 
          break;
      }
      
    });
    
    
    $(document).on('show.bs.modal', '#cdbtEditData', function(){
      var post_data = {
        'session_key': $.QueryString.tab, 
        'table_name': $('input[name="custom-database-tables[operate_current_table]"]').val(), 
        'operate_action': $('input[name="custom-database-tables[operate_action]"]').val(), 
        'event': 'render_edit_form', 
        'shortcode': '[' + $('#edit-data-form').val() + ']', 
      };
      return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'html', 'load_into_modal' );
    });
    
    $(document).on('change', '#cdbtEditData div.cdbt-entry-data-form form .checkbox-custom input', function () {
      if ($(this).parent().hasClass('multiple')) {
        var counter_elm = $('input[name="' + $(this).attr('name').replace('[]', '') + '[checked]"]');
        var checked_count = Number(counter_elm.val());
        if ( $(this).prop('checked') ) {
          checked_count += 1;
        } else {
          checked_count -= 1;
        }
        counter_elm.val(checked_count);
      }
    });
    
    var countMultipleChecked = function(){
      var $this = $('#cdbtEditData div.cdbt-entry-data-form form .checkbox-custom input');
      $this.each(function(){
        if ($(this).parent().hasClass('multiple')) {
          var counter_elm = $('input[name="' + $(this).attr('name').replace('[]', '') + '[checked]"]');
          var checked_count = 0; //Number(counter_elm.val());
          if ( $(this).prop('checked') ) {
            checked_count += 1;
          }
          counter_elm.val(checked_count);
        }
      });
    };
    
    $(document).on('click', '#run_update_data', function(e){
      e.preventDefault();
      var form = $('#cdbtEditData div.cdbt-entry-data-form form');
      var formId = form.attr( 'id' );
      form.children('input[name="_wp_http_referer"]').val(location.href);
      if ( checkEmptyFields( formId ) ) {
        docCookies.setItem( 'once_action', formId );
        form.submit();
      } else {
        // Added since 2.0.9
        $(this).popover({ animation: true, content: $.localErrMsg, placement: 'top', trigger: 'hover' }).popover('show');
        $(this).on('hidden.bs.popover', function(){
          $(this).popover('destroy');
        });
        //return false;
      }
    });
    
    
    // Run of deleting data after confirmation
    $(document).on('click', '#run_delete_data', function(){
      var _current_table = $('input[name="custom-database-tables[operate_current_table]"]').val();
      var where_conditions = [];
      if ( $('.panel-table-wrapper table[id^="cdbt-table-edit-' + _current_table + '"]').size() > 0 ) {
        // For table layout
        $('.panel-table-wrapper table[id^="cdbt-table-edit-' + _current_table + '"]').find('tr.selectable.selected label').each(function(){
          where_conditions.push($(this).data('row'));
        });
      } else {
        // For repeater layout
        $('.repeater[id^="cdbt-repeater-edit-' + _current_table + '"]').find('tr.selectable.selected label.repeater-select-checkbox').each(function(){
          where_conditions.push($(this).data('row'));
        });
      }
      where_conditions = _.uniq(where_conditions);
      
      var post_data = {
        'table_name': _current_table, 
        'operate_action': $('input[name="custom-database-tables[operate_action]"]').val(), 
        'event': 'delete_data', 
        'where_conditions': where_conditions, 
      };
      return cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
    
    
  }
  
  
  /**
   * Helper UI scripts for shortcode list section
   */
  if ('cdbt_shortcodes' === $.QueryString.page) {
    
    $('td.col-scl-name').find('code').each(function(){
      $(this).addClass('cdbt-clipboard');
    });
    
    // Run of delete shortcode after confirmation
    $(document).on('click', '#run_delete_shortcode', function(){
      var post_data = {
        'csid': $(this).data('csid'), 
        'operate_action': 'delete', 
        'event': 'delete_shortcode', 
      };
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
  }
  
  
  /**
   * Helper UI scripts for shortcode register and shortcode edit section
   */
  if ('cdbt_shortcodes' === $.QueryString.page && ('shortcode_register' === $.QueryString.tab || 'shortcode_edit' === $.QueryString.tab)) {
    var is_register = 'shortcode_register' === $.QueryString.tab ? true : false;
    var prefix = is_register ? 'register' : 'edit';
    
    // Checking the enabled repeater (since v2.1.31)
    var toggleRenderer = function() {
      var targetClass = $('input[name="custom-database-tables[look_feel][enable_repeater]"]').parent('.checkbox-custom').checkbox('isChecked') ? 'for-rpt' : 'for-tbl';
      var dispIdxRows = $('input[name="custom-database-tables[display_index_row][]"]').parent('.radio-custom');
      dispIdxRows.each(function(){
        if ( $(this).hasClass( targetClass ) ) {
          $(this).css({ position: 'relative', display: 'inline-block' });
          $(this).find('input').prop('disabled', false);
        } else {
          $(this).css({ position: 'absolute', display: 'none' });
          $(this).find('input').prop('disabled', true);
        }
      });
      $('.switching-item.for-rpt').each(function(){
        if ( 'for-rpt' === targetClass ) {
          $(this).css({ position: 'static', display: 'block' });
          $(this).find('input').prop('disabled', false);
        } else {
          $(this).css({ position: 'absolute', display: 'none' });
          $(this).find('input').prop('disabled', true);
        }
      });
      $('.switching-item.for-tbl').each(function(){
        if ( $(this).hasClass(targetClass) ) {
          $(this).css({ position: 'static', display: 'block' });
          $(this).find('input').prop('disabled', false);
        } else {
          $(this).css({ position: 'absolute', display: 'none' });
          $(this).find('input').prop('disabled', true);
        }
      });
    };
    $('input[name="custom-database-tables[look_feel][enable_repeater]"]').on('change', function(){
      toggleRenderer();
    });
    
    var controllForms = function(){
      var base_shortcode = is_register ? $('#register-shortcode-base_name').combobox('selectedItem').text : $('#edit-shortcode-base_name').val();
      var target_class = '';
      switch(base_shortcode) {
        case 'cdbt-view':
          target_class = 'on-v';
          break;
        case 'cdbt-entry':
          target_class = 'on-i';
          break;
        case 'cdbt-edit':
          target_class = 'on-e';
          break;
        default:
          target_class = '';
          break;
      }
      $('.switching-item').each(function(){
        if ('' !== target_class) {
          $('.toggle-group').css('display', 'block');
        } else {
          $('.toggle-group').css('display', 'none');
        }
        if ($(this).hasClass(target_class)) {
          $(this).css({ position: 'static', display: 'block' });
          $(this).find('input').prop('disabled', false);
          if ('on-v' === target_class || 'on-e' === target_class) {
            toggleRenderer();
          }
        } else {
          $(this).css({ position: 'absolute', display: 'none' });
          $(this).find('input').prop('disabled', true);
        }
      });
      
    };
    
    $('#register-shortcode-base_name').on('changed.fu.combobox', function(){
      controllForms();
    });
    controllForms();
    
    var getColumnsInfo = function( target_table, default_action ){
      var post_data = {
        event: 'get_columns_info', 
        'table_name': target_table, 
      };
      var callback = default_action === undefined || 'show' === default_action ? 'show_columns_info' : 'hide_columns_info';
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'html', callback );
    };
    
    $('#register-shortcode-target_table, #edit-shortcode-target_table').on('changed.fu.combobox', function(e,d){
      if ( d.text !== '' ) {
        getColumnsInfo( d.text );
      }
    });
    
    $(document).on('click', '#collapse-reference', function(){
      $('#columns-detail').toggleClass('hide');
      if ( $('#columns-detail').hasClass('hide') ) {
        $(this).children('i').attr('class', 'fa fa-plus-square');
      } else {
        $(this).children('i').attr('class', 'fa fa-minus-square');
      }
    });
    
    $(window).on('load', function(){
      var d = $('#register-shortcode-target_table, #edit-shortcode-target_table').combobox('selectedItem');
      if ( d.text !== '' ) {
        getColumnsInfo( d.text, 'hide' );
      }
    });
    
    var generateShortcode = function(){
      var items = $('input[name^="custom-database-tables["]');
      var preview = $('#'+prefix+'-shortcode-generate_shortcode');
      var alias = $('#'+prefix+'-shortcode-alias_code');
      var base_shortcode = '[base_name table="target_table"attributes]', attributes = '', shortcode = '';
      if ('' === $('input[name="custom-database-tables[base_name]"]').val() || '' === $('input[name="custom-database-tables[target_table]"]').val()) {
        preview.val('');
        alias.val('');
        return false;
      }
      items.each(function(){
        if (!$(this).prop('disabled')) {
          var reg = /custom-database-tables\[(\w+)\]{1}(|\[(\w+)?\])$/i, item_name;
          if (_.contains([ 'text' ], $(this).attr('type')) && '' !== $(this).val()) {
            item_name = $(this).attr('name').replace(reg, "$1");
            if (_.contains([ 'base_name', 'target_table' ], item_name)) {
              base_shortcode = base_shortcode.replace(item_name, $(this).val());
            } else {
              if ('alias_code' !== item_name) {
                attributes += ' '+item_name+'="'+$(this).val()+'"';
              }
            }
          }
          if (_.contains([ 'checkbox' ], $(this).attr('type'))) {
            var _tmp = $(this).attr('name').replace(reg, "$1,$3");
            _tmp = _tmp.split(',');
            item_name = _tmp[1].length > 0 ? _tmp[1] : _tmp[0];
            if ($(this).is(':checked')) {
              attributes += ' '+item_name+'="true"';
            } else {
              attributes += ' '+item_name+'="false"';
            }
          }
          if (_.contains([ 'radio' ], $(this).attr('type'))) {
            item_name = $(this).attr('name').replace(reg, "$1");
            if ($(this).is(':checked')) {
              attributes += ' '+item_name+'="'+$(this).val()+'"';
            }
          }
        }
      });
      shortcode = base_shortcode.replace('attributes', attributes);
      preview.val(shortcode);
      if ('' !== preview.val() && '' !== $('input[name="custom-database-tables[csid]"]').val()) {
        var alias_code = base_shortcode.replace('attributes', ' csid="'+$('input[name="custom-database-tables[csid]"]').val()+'"');
        alias.val(alias_code);
      }
    };
    
    $('input[name^="custom-database-tables["]').on('click blur keydown keypress paste', function(){
      generateShortcode();
    });
    $('.checkbox-custom input').on('change', function(e){
      e.preventDefault();
      if ($(this).parent('.checkbox-custom').hasClass('disabled')) {
        $(this).parent('.checkbox-custom').checkbox('toggle');
      }
      generateShortcode();
    });
    $('.spinbox').on('changed.fu.spinbox', function(){
      generateShortcode();
    });
    $('.combobox').on('changed.fu.combobox', function(){
      generateShortcode();
    });
    
    $('#'+prefix+'-shortcode-preview').on('click', function(){
      var post_data = {
        id: 'cdbtModal', 
        insertContent: true, 
        modalSize: 'large', 
        modalTitle: 'preview_shortcode', 
        modalBody: '', 
        //modalHideEvent: $common_modal_hide, 
        modalExtras: { shortcode: $('#'+prefix+'-shortcode-generate_shortcode').val() }
      };
      init_modal( post_data );
      
      $(document).on('hide.bs.modal', '#cdbtModal', function(){
        $(this).find('.modal-body').html('');
      });
      
    });
    
    
    
  }
  
  
  /**
   * Helper UI scripts for webapi hosts list section
   */
  if ('cdbt_web_apis' === $.QueryString.page) {
    
    // Run of delete host after confirmation
    $(document).on('click', '#run_delete_host', function(){
      var post_data = {
        'host_id': $(this).data('hostid'), 
        'operate_action': 'delete', 
        'event': 'delete_host', 
      };
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
  }
  
  
  /**
   * Helper UI scripts for webapi request edit section
   */
  if ('cdbt_web_apis' === $.QueryString.page && 'api_requests' === $.QueryString.tab) {
    
    var toggleForms = function(){
      var request_method = $('#edit-webapi-request-method').selectlist('selectedItem').text;
      var show_classes = [];
      switch(request_method) {
        case 'get_data':
          show_classes = [ 'target-columns', 'conditions', 'orders', 'limit', 'offset' ];
          break;
        case 'find_data':
          // Added class of 'narrow-operator'
          show_classes = [ 'search-key', 'narrow-operator', 'target-columns', 'orders', 'limit', 'offset' ];
          break;
        case 'insert_data':
          show_classes = [ 'upsert_data' ];
          break;
        case 'update_data':
          show_classes = [ 'upsert_data', 'pk_value' ];
          break;
        case 'update_where':
          show_classes = [ 'conditions', 'upsert_data' ];
          break;
        case 'delete_data':
          show_classes = [ 'pk_value' ];
          break;
        default:
          break;
      }
      $('.switching-item').each(function(){
        var matches = _.intersection($(this).context.classList, show_classes);
        if (matches.length > 0) {
          $(this).css('display', 'block');
        } else {
          $(this).css('display', 'none');
        }
        if ($(this).hasClass(matches[0])) {
          $(this).css({ position: 'static', display: 'block' });
          //$(this).find('input').removeAttr('disabled');
          $(this).find('input').prop('disabled', false);
        } else {
          $(this).css({ position: 'absolute', display: 'none' });
          //$(this).find('input').attr('disabled', 'disabled');
          $(this).find('input').prop('disabled', true);
        }
      });
      
    };
    
    $('#edit-webapi-request-method').on('changed.fu.selectlist', function(){
      toggleForms();
    });
    toggleForms();
    
    var generateRequestUri = function(){
      var items = $('input[name^="custom-database-tables["]');
      var preview = $('#edit-webapi-request-generate_uri');
      var allowed_host = 'http://' + $('#edit-webapi-request-allowed_host').selectlist('selectedItem').text.replace(/\d+\:\s(.*)$/, '$1');
      var self_host = $('#self_host_root').val();
      var base_uri = self_host + '/?';
      var api_key = '' !== $('#current_host_apikey').val() ? $('#current_host_apikey').val() : '';
      var target_table = '' !== $('#edit-webapi-request-target_table').selectlist('selectedItem').value ? $('#edit-webapi-request-target_table').selectlist('selectedItem').text : '';
      var api_request = '' !== $('#edit-webapi-request-method').selectlist('selectedItem').value ? $('#edit-webapi-request-method').selectlist('selectedItem').text : '';
      if (api_key !== '' && target_table !== '' && api_request !== '') {
        var preview_uri = base_uri + 'cdbt_api_key=' + $('#preview_nonce').val() + '&cdbt_table=' + target_table + '&cdbt_api_request=' + api_request + '&';
        base_uri += 'cdbt_api_key=' + api_key + '&cdbt_table=' + target_table + '&cdbt_api_request=' + api_request + '&';
        
        var queries = [];
        items.each(function(){
          //if ('disabled' !== $(this).attr('disabled')) {
          if (!$(this).prop('disabled')) {
            var reg = /custom-database-tables\[(\w+)\]{1}(|\[(\w+)\])$/i, item_name;
            if (_.contains([ 'text' ], $(this).attr('type')) && '' !== $(this).val()) {
              item_name = $(this).attr('name').replace(reg, "$1");
              if (!_.contains([ 'allowed_host', 'target_table', 'method' ], item_name)) {
                if ('search_key' === item_name) {
                  queries.push(item_name + '=[' + $(this).val() + ']');
                }
                if ('target_columns' === item_name) {
                  queries.push('columns=[' + $(this).val() + ']');
                }
                if ('conditions' === item_name) {
                  queries.push( 'update_where' === api_request ? 'where_conditions={' + $(this).val() + '}' : item_name + '={' + $(this).val() + '}' );
                }
                if ('upsert_data' === item_name) {
                  queries.push('data={' + $(this).val() + '}');
                }
                if ('pk_value' === item_name) {
                  queries.push('primary_key_value=' + $(this).val());
                }
                if ('orders' === item_name) {
                  queries.push('order={' + $(this).val() + '}');
                }
                if ('limit' === item_name || 'offset' === item_name) {
                  if (Number($(this).val()) > 0) {
                    queries.push(item_name + '=' + $(this).val());
                  }
                }
              }
            }
          }
        });
        
        preview.val(base_uri + queries.join('&'));
        $('#preview_uri').val(preview_uri + queries.join('&'));
        $('#webapi-preview').prop('disabled', false);
      } else {
        //$('#webapi-preview').attr('disabled', 'disabled');
        $('#webapi-preview').attr('disabled', true);
      }
    };
    
    $('input[name^="custom-database-tables["]').on('click blur keydown keypress paste', function(){
      generateRequestUri();
    });
    $('.spinbox').on('changed.fu.spinbox', function(){
      generateRequestUri();
    });
    $('.selectlist').on('changed.fu.selectlist', function(){
      if ('edit-webapi-request-allowed_host' === $(this).attr('id')) {
        var post_data = {
          'host_id': $(this).selectlist('selectedItem').value, 
          'operate_action': 'retrieve', 
          'event': 'get_apikey', 
        };
        cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'text', 'set_api_key' );
      }
      generateRequestUri();
    });
    generateRequestUri();
    
    $('#webapi-preview').on('click', function(){
      // cdbtCallAjax($('#preview_uri').val(), 'get', {}, 'json');
      var post_data = {
        id: 'cdbtModal', 
        insertContent: true, 
        modalSize: 'large', 
        modalTitle: 'preview_request_api', 
        modalBody: '', 
        modalExtras: {
          'request_uri': $('#preview_uri').val(),
        },
      };
      init_modal( post_data );
    });
    
  }
  
  /**
   * Helper UI scripts for cdbt_management_console (dashboard) section
   */
  if ('cdbt_management_console' === $.QueryString.page) {
    $('#show-tutorial').on('click', function(e){
      // Update option of show tutorial
      var post_data = {
        event: 'update_options',
        'hide_tutorial': false, 
      };
      cdbtCallAjax( $.ajaxUrl, 'post', post_data, 'script' );
    });
    
    if (docCookies.hasItem('cdbtOperatingTable')) {
      docCookies.removeItem('cdbtOperatingTable');
    }
    if (docCookies.hasItem('cdbtSortCache')) {
      docCookies.removeItem('cdbtSortCache');
    }
  }
  
  /**
   * Helper UI scripts for general options section
   */
  if ('cdbt_options' === $.QueryString.page) {
    $('#initialize').on('click', function(e){
      e.preventDefault();
      $(this).parents('form').children('input[name=action]').val( $(this).attr('id') );
      $('#submit').trigger('click');
    });
    
  }
  
  /**
   * Helper UI scripts for messages section
   */
  if ('cdbt_options' === $.QueryString.page && 'messages' === $.QueryString.tab) {
    $('#override-messages').on('click', function(e){
      e.preventDefault();
      $(this).parents('form').children('input[name=action]').val('override');
      var override_items = 0;
      $('textarea[id^="override-messages-"]').each(function(){
        if ( $(this).val() === $('#' + $(this).attr('id') + '-default').text() ) {
          $(this).prop('disabled', true);
        } else {
          override_items++;
        }
      });
      if ( override_items > 0 ) {
        $(this).parents('form').submit();
      } else {
        $('textarea[id^="override-messages-"]').prop('disabled', false);
        post_data = {
          id: 'cdbtModal', 
          insertContent: true, 
          modalTitle: 'changing_item_none', 
          modalBody: '', 
        };
        init_modal( post_data );
        return false;
      }
    });
    
    $('#format-messages').on('click', function(e){
      e.preventDefault();
      $(this).parents('form').children('input[name=action]').val('format');
      $(this).parents('form').submit();
    });
    
  }
  
  
  /**
   * Helper UI scripts for debug section
   */
  if ('cdbt_options' === $.QueryString.page && 'debug' === $.QueryString.tab) {
    
    //$('#debug-log-viewer').scrollTop = $('#debug-log-viewer').scrollHeight;
    var psta = $('#debug-log-viewer');
    psta.scrollTop(psta[0].scrollHeight - psta.height());
    
  }
  
  /**
   * Helper UI scripts for addons section
   */
  if ('cdbt_options' === $.QueryString.page && 'addons' === $.QueryString.tab) {
    
    $('.addon-btn').find('button').on('click', function(e){
      //e.preventDefault();
      var parent_form = $(this).parents('#cdbt-addons');
      parent_form.find('#cdbt-addon-classname').val( $(this).data('className') );
      parent_form.find('#cdbt-addon-disturi').val( $(this).data('distUri') );
      //parent_form.submit();
    });
    
  }
  
  
  /**
   * Helper UI scripts for custom column renderer
   */
  $(document).on('click', 'a.collapse-col-data', function(){
    post_data = {
      id: 'cdbtModal', 
      insertContent: true, 
      modalTitle: 'view_item_full', 
      modalBody: $(this).data('raw'), 
    };
    init_modal( post_data );
  });
  
  
});
/**
 * jQuery-independent common processing
 * ---------------------------------------------------------------------------
 */
/**
 * Convert datetime format as common utility function for repeater and dynamicTable
 */
var convert_datetime = function() {
  if (arguments.length < 2) {
    return arguments.length === 1 ? arguments[0] : false;
  }
  if (typeof arguments[0] === 'undefined' || !arguments[0]) {
    return '-';
  }
  var datetime_string = arguments[0].replace(/\-/g, '/');
  var datetime = new Date(datetime_string);
  var format = arguments[1].join(' ');
  if ('' === format) {
    return arguments[0];
  }
  var formatStrings = format.split('');
  var converted = '';
  var lastDayOfMonth = function(dateObj) {
    var tmp = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 1);
    tmp.setTime(tmp.getTime() - 1);
    return tmp.getDate();
  };
  var isLeapYear = function() {
    var tmp = new Date(datetime.getFullYear(), 0, 1);
    var sum = 0;
    for (var i = 0; i < 12; i++) {
      tmp.setMonth(i);
      sum += lastDayOfMonth(tmp);
    }
    return (sum === 365) ? 0 : 1;
  };
  var dateCount = function() {
    var tmp = new Date(datetime.getFullYear(), 0, 1);
    var sum = -1;
    for (var i=0; i<datetime.getMonth(); i++) {
      tmp.setMonth(i);
      sum += lastDayOfMonth(tmp);
    }
    return sum + datetime.getDate();
  };
  _.each(formatStrings, function(str){
    var res, tmp, sum;
    var month = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
    var day = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thurseday', Fri: 'Friday', Sat: 'Saturday' };
    var half_hours = function(){ var h = datetime.getHours(); return h > 12 ? h - 12 : h; };
    var ampm = function(){ var h = datetime.getHours(); return h > 12 ? 'pm' : 'am'; };
    switch(str){
      case 'Y': // Full year
      case 'o': // Full year (ISO-8601)
        res = datetime.getFullYear();
        break;
      case 'y': // Two digits year
        res = ('' + datetime.getFullYear()).slice(-2);
        break;
      case 'm': // Zerofill month
        res = ('0' + (datetime.getMonth() + 1)).slice(-2);
        break;
      case 'n': // Month
        res = datetime.getMonth() + 1;
        break;
      case 'F': // Full month name
        res = _.values(month)[datetime.getMonth()];
        break;
      case 'M': // Short month name
        res = _.keys(month)[datetime.getMonth()];
        break;
      case 'd': // Zerofill day
        res = ('0' + datetime.getDate()).slice(-2);
        break;
      case 'j': // Day
        res = datetime.getDate();
        break;
      case 'S': // Day with suffix
        var suffix = [ 'st', 'nd', 'rd', 'th' ];
        var suffix_index = function(){
          var d = datetime.getDate();
          if ( d === 1 || d === 2 || d === 3 || d === 21 || d === 22 || d === 23 || d === 31 ) {
            return Number(('' + d).slice(-1) - 1);
          } else {
            return 3;
          }
        };
        res = suffix[suffix_index()];
        break;
      case 'w': // Day of the week (number)
      case 'W': // Day of the week (ISO-8601 number)
        res = datetime.getDay();
        break;
      case 'l': // Day of the week (full)
        res = _.values(day)[datetime.getDay()];
        break;
      case 'D': // Day of the week (short)
        res = _.keys(day)[datetime.getDay()];
        break;
      case 'N': // Day of the week (ISO-8601 number)
        res = datetime.getDay() === 0 ? 7 : datetime.getDay();
        break;
      case 'a': // am or pm
        res = ampm();
        break;
      case 'A': // AM or PM
        res = ampm().toUpperCase();
        break;
      case 'g': // Half hours
        res = half_hours();
        break;
      case 'h': // Zerofill half hours
        res = ('0' + half_hours()).slice(-2);
        break;
      case 'G': // Full hours
        res = datetime.getHours();
        break;
      case 'H': // Zerofill full hours
        res = ('0' + datetime.getHours()).slice(-2);
        break;
      case 'i': // Zerofill minutes
        res = ('0' + datetime.getMinutes()).slice(-2);
        break;
      case 's': // Zerofill seconds
        res = ('0' + datetime.getSeconds()).slice(-2);
        break;
      case 'z': // Day of the year
        res = dateCount();
      	break;
      case 't': // Days of specific month
        res = lastDayOfMonth(datetime);
      	break;
      case 'L': // Whether a leap year
      	res = isLeapYear();
      	break;
      case 'c': // Date of ISO-8601
        res = arguments[0].replace(' ', 'T') + '+00:00';
        break;
      case 'r': // Date of RFC-2822
        res = datetime;
        break;
      case 'u': // Micro second
      	res = '000000';
        break;
      case 'e': // Timezone extention
      case 'T': // Timezone
      case 'B': // Swatch time
      case 'I': // Whether a summer time
      case 'O': // Diff from GMT
      case 'P': // Diff from GMT
      case 'Z': // Offset second of timezone
      case 'U': // Unix Epoch seconds
        res = '';
        break;
      default:
        res = str;
        break;
    }
    
    converted += res;
  });
  return converted;
};
/**
 * Utility: Multibyte string functions
 */
var isSurrogatePear = function( upper, lower ) {
  return 0xD800 <= upper && upper <= 0xDBFF && 0xDC00 <= lower && lower <= 0xDFFF;
};
var mb_strlen = function( str ) {
  var ret = 0;
  for (var i = 0; i < str.length; i++,ret++) {
    var upper = str.charCodeAt(i);
    var lower = str.length > (i + 1) ? str.charCodeAt(i + 1) : 0;
    if ( isSurrogatePear( upper, lower ) ) {
      i++;
    }
  }
  return ret;
};
var mb_substr = function( str, begin, end ) {
  var ret = '';
  for (var i = 0, len = 0; i < str.length; i++, len++) {
    var upper = str.charCodeAt(i);
    var lower = str.length > (i + 1) ? str.charCodeAt(i + 1) : 0;
    var s = "";
    if( isSurrogatePear( upper, lower ) ) {
      i++;
      s = String.fromCharCode(upper, lower);
    } else {
      s = String.fromCharCode(upper);
    }
    if (begin <= len && len < end) {
      ret += s;
    }
  }
  return ret;
};
var strip_tags = function( str, allowed ) {
  allowed = ( ( ( allowed || '' ) + '' ).toLowerCase().match(/<[a-z][a-z0-9]*>/g) || []).join('');
  var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
  return str.replace( commentsAndPhpTags, '' ).replace( tags, function ($0, $1) {
    return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
  });
};
var strip_slashes = function( str ) {
  //return str.replace(/\\(.)/mg, "$1");
  return (str + '').replace(/\\(.?)/g, function (s, n1) {
    switch (n1) {
      case '\\': return '\\';
      case '0': return '\u0000';
      case '': return '';
      default: return n1;
    }
  });
};
var cdbtCustomColumnFilter = function( value, truncate ){
  truncate = truncate || 100;
  var raw_str = $('<div/>').html( strip_tags( _.unescape( value ), '<a><b><strong><em><i>' ) ).text();
  var esc_str = strip_slashes( value );
  if ( mb_strlen( raw_str ) > truncate ) {
    var truncate_str = mb_substr( raw_str, 0, truncate - 1 );
    value = truncate_str + '<a href="javascript:;" class="btn btn-default btn-sm collapse-col-data" data-raw="'+ esc_str +'"><i class="fa fa-ellipsis-h" aria-hidden="true"></i> <i class="fa fa-level-up" aria-hidden="true"></i></a>';
  } else {
    value = raw_str;
  }
  
  return value;
};
