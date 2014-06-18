/*!
 *  Copyright (c) 2014 B3Partners (info@b3partners.nl)
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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.notepad = {
    id: "dbk.module.notepad",
    notepadPopup: null,
    register: function(options) {
        var _obj = dbkjs.modules.notepad;
        _obj.createPopup();
        $('<a></a>')
            .attr({
                'id': 'btn_opennotepad',
                'class': 'btn btn-default navbar-btn',
                'href': '#',
                'title': i18n.t('map.notepad.button')
            })
            .append('<i class="icon-align-justify"></i>')
            .click(function(e) {
                e.preventDefault();
                _obj.notepadPopup.show();
            })
            .appendTo('#btngrp_3');
    },
    createPopup: function() {
        var _obj = dbkjs.modules.notepad;
        _obj.notepadPopup = dbkjs.util.createModalPopup({
            title: 'Kladblokregels'
        });
        _obj.notepadPopup.getView().append($('<div>Hier komen de kladblokregels</div>'));
    }
};