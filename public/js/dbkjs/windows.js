/*
 *  Copyright (c) 2015 B3Partners (info@b3partners.nl)
 *
 *  This file is part of safetymapDBK
 *
 *  safetymapDBK is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  safetymapDBK is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with safetymapDBK. If not, see <http://www.gnu.org/licenses/>.
 *
 */

/**
 * Modal window which takes up the entire screen. Automatically closed when
 * another modal window is shown, or a modal popup is shown (dbkjs event
 * modal_popup_show, see utils.js).
 *
 * Events:
 * show
 * hide
 * elements_created after createElements() completed
 * dbkjs modal_popup_show
 * @param {string} name
 * @returns {ModalDialog}
 */
function ModalWindow(name) {

    this.name = name;
    this.visible = false;
    this.popup = null;
}

/**
 * Create DOM elements, call after constructor.
 * @param {string} title not html encoded, use dbkjs.utils.htmlEncode() for user
 *   supplied data yourself. To change, use getTitleElement().
 * @returns {undefined}
 */
ModalWindow.prototype.createElements = function(title) {
    var me = this;
    this.popup = $('<div></div>')
        .addClass('modal-popup')
        .appendTo('body');
    $('<a></a>')
        .attr({
            'class': 'modal-popup-close',
            'href': '#'
        })
        .html('<i class="fa fa-arrow-left"></i> Terug')
        .on('click', function (e) {
            me.hide();
        })
        .appendTo(this.popup);

    this.titleElement = $('<div></div>')
        .addClass('modal-popup-title')
        .html(title || '')
        .appendTo(this.popup);

    this.view = $('<div></div>')
        .addClass('modal-popup-view')
        .appendTo(this.popup);

    $(dbkjs).on('modal_popup_show', function(e, popupName) {
        // Hide ourselves when another popup is shown
        if(me.name !== popupName) {
            me.hide();
        }
    });

    $(this).triggerHandler('elements_created');
};

ModalWindow.prototype.getName = function() {
    return this.name;
};

ModalWindow.prototype.getView = function() {
    return this.view;
};

ModalWindow.prototype.isVisible = function() {
    return this.visible;
};

ModalWindow.prototype.show = function() {
    // Event should cause other modal popups to hide
    $(dbkjs).trigger('modal_popup_show', this.name);

    // request css property to force layout computation, making animation possible
    // see http://stackoverflow.com/questions/7069167/css-transition-not-firing
    this.popup.css('width');
    this.popup.addClass('modal-popup-active');
    this.visible = true;
    $(this).triggerHandler('show');
};

ModalWindow.prototype.hide = function() {
    if(this.isVisible()) {
        this.popup.removeClass('modal-popup-active');
        this.visible = false;
        $(this).triggerHandler('hide');
    }
};

ModalWindow.prototype.getTitleElement = function() {
    return this.titleElement;
};

/**
 * Split screen version of modal window. Split screen functionality can be
 * switched on/off on the fly.
 *
 * Events:
 * SplitScreenChange when split screen is changed (whether visible or not).
 *   Arguments are results of isSplitScreen() and isVisible().
 * @param {string} name
 * @returns {SplitScreenWindow}
 */
function SplitScreenWindow(name) {
    ModalWindow.call(this, name);
    this.isSplitScreen = true;

    // XXX always, also fixes cannot click map next to buttons
    $(".main-button-group").css({paddingRight: "10px", width: "auto", float: "right", right: "0%"});
};

SplitScreenWindow.prototype = Object.create(ModalWindow.prototype);
SplitScreenWindow.prototype.constructor = SplitScreenWindow;

SplitScreenWindow.prototype.createElements = function(title) {
    ModalWindow.prototype.createElements.call(this, title);
    $(this.popup).find("a").html('<i class="fa fa-arrow-left"/> Kaart');
};

SplitScreenWindow.prototype.isSplitScreen = function() {
    return this.isSplitScreen;
};

SplitScreenWindow.prototype.setSplitScreen = function(splitScreen) {
    var wasVisible = this.isVisible();
    if(wasVisible) {
        this.hide();
    }
    this.isSplitScreen = splitScreen;
    if(wasVisible) {
        this.show();
    }
    $(this.popup).find("a").html('<i class="fa fa-arrow-left"/> ' + (splitScreen ? 'Kaart' : 'Terug'));

    $(this).triggerHandler('splitScreenChange', splitScreen, this.visible);
};

SplitScreenWindow.prototype.hide = function() {
    if(this.isSplitScreen && this.isVisible()) {
        $("#mapc1map1").css({width: "100%"});
        dbkjs.map.updateSize();

        // XXX move to dbkjs event 'split_screen_hide'
        $(".main-button-group").css({right: "0%"});
        $("#vectorclickpanel").css({"width": "100%"});
    }

    ModalWindow.prototype.hide.call(this);
    this.popup.css({width: "0%"});
};

SplitScreenWindow.prototype.show = function() {
    if(this.isVisible()) {
        return;
    }
    if(this.isSplitScreen) {

        this.popup.css({width: "45%"});
        $("#mapc1map1").css({width: "55%"});
        // XXX move to dbkjs event 'split_screen_show';
        $(".main-button-group").css({right: "45%"});
        $("#vectorclickpanel").css({"width": "55%"});

        function afterScreenSplit() {
            dbkjs.map.updateSize();
        };
        var transitionEvent = dbkjs.util.getTransitionEvent();
        if(transitionEvent) {
            this.popup.one(transitionEvent, afterScreenSplit);
        } else {
            afterScreenSplit();
        }
    } else if(!this.isSplitScreen) {
        this.popup.css({width: "100%"});
    }
    ModalWindow.prototype.show.call(this);
};
