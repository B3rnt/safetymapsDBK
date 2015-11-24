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
 * Window which shows list of current and historic events. Subclass of
 * SplitScreenWindow. Create only one instance as it always uses modal popup
 * name "incidentList".
 * @returns {IncidentListWindow}
 */
function IncidentListWindow() {
    SplitScreenWindow.call(this, "incidentList");

    // Create style

    //  text-overflow: ellipsis;

    var me = this;
    $(this).on('elements_created', function() {
        me.getView().html("Verbinden met incidentenservice...");

        // Replace "<- Kaart" with button
        me.getView().parent().find(".modal-popup-close").remove()

        $("<button class='btn btn-primary' style='float: left; margin: 5px'><i class='fa fa-arrow-left'></i></button>")
        .prependTo(me.getView().parent())
        .click(function() {
            me.hide();
        });

        me.getView().parent()
    });
}

IncidentListWindow.prototype = Object.create(SplitScreenWindow.prototype);
IncidentListWindow.prototype.constructor = IncidentListWindow;

IncidentListWindow.prototype.showError = function(e) {
    this.getView().html("");
    this.getView().text(e);
};

/**
 * Render incidents in the window view.
 * @param {object} currentIncidents Array of current incidents
 * @param {object} archivedIncidents Array of archived incidents
 * @param {boolean} restoreScrollTop
 * @returns {undefined}
 */
IncidentListWindow.prototype.data = function(currentIncidents, archivedIncidents, restoreScrollTop) {
    var me = this;

    var v = this.getView();
    var scrollTop = v.scrollTop();

    v.html("");

    var actueleInzet = [];
    var beeindigdeInzet = [];
    var actueleIncidentIds = [];
    $.each(currentIncidents, function(i, incident) {
        if(incident.actueleInzet) {
            actueleInzet.push(incident);
            actueleIncidentIds.push(incident.INCIDENT_ID);
        } else {
            beeindigdeInzet.push(incident);
        }
    });

    var d = $("<div class='incidentList'/>");
    console.log(currentIncidents, archivedIncidents);
    var h = $("<div class='header actueleInzet'/>")
            .html(actueleInzet.length === 0 ? "Geen actieve incidenten" :
                (actueleInzet.length === 1 ? "&Eacute;&eacute;n actief incident" : actueleInzet.length + " actieve incidenten") +
                " met actuele inzet brandweereenheden");

    h.appendTo(d);
    me.listIncidents(d, actueleInzet);

    var h = $("<div class='header archief'/>").html("Gearchiveerde/inzet be&euml;indigde incidenten");
    h.appendTo(d);
    me.listIncidents(d, beeindigdeInzet.concat(archivedIncidents), actueleIncidentIds);
    d.appendTo(v);

    if(restoreScrollTop) {
        v.scrollTop(scrollTop);
    }
};

IncidentListWindow.prototype.listIncidents = function(el, incidents, incidentIdsToSkip) {
    var me = this;

    incidents.sort(function(lhs, rhs) {
        return lhs.DTG_START_INCIDENT > rhs.DTG_START_INCIDENT ? -1 :
                lhs.DTG_START_INCIDENT === rhs.DTG_START_INCIDENT ? 0 : 1;
    });

    var d = $("<div class='list'/>");
    if(!incidentIdsToSkip) {
        incidentIdsToSkip = [];
    }
    var odd = true;
    $.each(incidents, function(i, incident) {
        if(incidentIdsToSkip.indexOf(incident.INCIDENT_ID) !== -1) {
            return;
        }
        incidentIdsToSkip.push(incident.INCIDENT_ID);

        var r = $("<div class='incident'/>").addClass(odd ? "odd" : "even");
        odd = !odd;

        if(dbkjs.options.incidents.incidentListFunction) {
            dbkjs.options.incidents.incidentListFunction(r, incident);
        }

        $("<span class='time'/>").text(dbkjs.modules.incidents.controller.service.getAGSMoment(incident.DTG_START_INCIDENT).format("D-M-YYYY HH:mm:ss")).appendTo(r);
        $("<span class='prio'/>").text(incident.PRIORITEIT_INCIDENT_BRANDWEER ? " PRIO " + incident.PRIORITEIT_INCIDENT_BRANDWEER : "").appendTo(r);
        $("<span class='locatie'/>").text(incident.T_GUI_LOCATIE).appendTo(r);
        $("<span class='plaats'/>").text(incident.PLAATS_NAAM).appendTo(r);
        $("<span class='classificatie'/>").text(incident.classificaties).appendTo(r);

        r.appendTo(d);
    });
    d.appendTo(el);
};

IncidentListWindow.prototype.getIncidentTitle = function(incident) {
    var getAGSMoment = dbkjs.modules.incidents.controller.service.getAGSMoment;
    return getAGSMoment(incident.DTG_START_INCIDENT).format("D-M-YYYY HH:mm:ss") + " " + (incident.PRIORITEIT_INCIDENT_BRANDWEER ? " PRIO " + incident.PRIORITEIT_INCIDENT_BRANDWEER : "") + " " + incident.T_GUI_LOCATIE + ", " + incident.PLAATS_NAAM;
};