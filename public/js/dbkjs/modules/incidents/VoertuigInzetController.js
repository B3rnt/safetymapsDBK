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
 * Controller for displaying incident info for a specific voertuig when it is
 * ingezet.
 *
 * Events:
 * new_incident: when new incident is received
 * end_incident: inzet for incident was ended (may not trigger for some koppelingen)
 *
 * @param {Object} incidents dbk module
 * @returns {VoertuigInzetController}
 */
function VoertuigInzetController(incidents) {
    var me = this;
    me.service = incidents.service;

    me.button = new AlertableButton("btn_incident", "Incident", "bell-o");
    me.button.getElement().prependTo('.layertoggle-btn-group');

    $(me.button).on('click', function() {
        me.incidentDetailsWindow.show();
        me.zoomToIncident();
    });

    me.incidentDetailsWindow = new IncidentDetailsWindow();
    me.incidentDetailsWindow.createElements("Incident");
    $(me.incidentDetailsWindow).on('show', function() {
        me.button.setAlerted(false);
    });

    me.markerLayer = new IncidentMarkerLayer();
    $(me.markerLayer).on('click', function(incident, marker) {
        me.markerClick(incident, marker);
    });
    me.marker = null;

    me.voertuignummer = window.localStorage.getItem("voertuignummer");

    me.dbkSelectMaxDistance = incidents.options.dbkSelectMaxDistance || 250;

    me.addConfigControls();

    $(this.service).on('initialized', function() {
        if(incidents.options.voertuignummerTypeahead) {
            me.enableVoertuignummerTypeahead();
        }
        me.setVoertuignummer(me.voertuignummer, true);
    });
}

/**
 * Add controls to configuration window.
 */
VoertuigInzetController.prototype.addConfigControls = function() {
    var me = this;
    $(dbkjs).one('dbkjs_init_complete', function() {
        var incidentSettings = $("<div><h4>Meldkamerkoppeling</h4><p/>" +
                "<div class='row'><div class='col-xs-12'>Voertuignummer: <input type='text' id='input_voertuignummer'>" +
                "</div></div><p/><p/><hr>");
        incidentSettings.insertAfter($("#settingspanel_b hr:last"));

        $("#settingspanel").on('hidden.bs.modal', function() {
            me.setVoertuignummer($("#input_voertuignummer").val());
        });

        $("#input_voertuignummer").val(me.voertuignummer);

        if(!me.voertuignummer) {
            // Open config window when voertuignummer not configured
            $("#c_settings").click();

            // Wait for transition to end to set focus
            window.setTimeout(function() { $("#input_voertuignummer").focus(); }, 1000);
        }
    });
};

/**
 * Get and enable typeahead data for voertuignummer config control. Service
 * must be initialized.
 */
VoertuigInzetController.prototype.enableVoertuignummerTypeahead = function() {
    var me = this;
    me.service.getVoertuignummerTypeahead()
    .done(function(datums) {
        $("#input_voertuignummer")
        .typeahead({
            name: 'voertuignummers',
            local: datums,
            limit: 10,
            template: function(d) {
                var s = d.tokens[0] + " " + d.value;
                if(d.tokens[2]) {
                    s += " (" + d.tokens[2] + ")";
                }
                return s;
            }
        });
    });
};

/**
 * Change voertuignummer, persist in browser local storage. Start getting inzet
 * info if not null (service must be initialized). Will cancel previous timeout
 * for getting inzet data, immediately get info for updated voertuignummer.
 *
 * @param {boolean} noDuplicateCheck get info even when argument is the same as
 *   instance variable this.voertuignummer, use when starting up
 */
VoertuigInzetController.prototype.setVoertuignummer = function(voertuignummer, noDuplicateCheck) {
    var me = this;
    if(me.voertuignummer === voertuignummer && !noDuplicateCheck) {
        return;
    }
    me.voertuignummer = voertuignummer;
    window.localStorage.setItem("voertuignummer", voertuignummer);

    me.cancelGetInzetInfo();
    me.getInzetInfo();
};

VoertuigInzetController.prototype.cancelGetInzetInfo = function() {
    var me = this;
    if(me.getInzetTimeout) {
        window.clearTimeout(me.getInzetTimeout);
        me.getInzetTimeout = null;
    }
};

VoertuigInzetController.prototype.getInzetInfo = function() {
    var me = this;

    if(!me.voertuignummer) {
        return;
    }

    var responseVoertuignummer = me.voertuignummer;
    me.service.getVoertuigInzet(responseVoertuignummer)
    .always(function() {
        me.getInzetTimeout = window.setTimeout(function() {
            me.getInzetInfo();
        }, 30000);
    })
    .fail(function(e) {
        var msg = "Kan meldkamerinfo niet ophalen: " + e;
        dbkjs.gui.showError(msg);
        me.button.setIcon("bell-slash");
        me.incidentDetailsWindow.showError(msg);
    })
    .done(function(incidentId) {
        $('#systeem_meldingen').hide();
        me.button.setIcon("bell-o");

        if(responseVoertuignummer !== me.voertuignummer) {
            // Voertuignummer was changed since request was fired off, ignore!
            return;
        }
        if(incidentId) {
            me.inzetIncident(incidentId);
        } else {
            me.incidentDetailsWindow.showError("Laatst informatie opgehaald op " + new moment().format("LLL") + " voor voertuignummer " + responseVoertuignummer + ".");

            if(me.incidentId) {
                $("#zoom_extent").click();

                // Wait for layer loading messages to clear...
                window.setTimeout(function() {
                    dbkjs.util.alert('Melding', 'Inzet beeindigd');
                    window.setTimeout(function() {
                        $('#systeem_meldingen').hide();
                    }, 10000);
                }, 3000);
                me.geenInzet(true);
            }
        }
    });
};

VoertuigInzetController.prototype.geenInzet = function(triggerEvent) {
    this.disableIncidentUpdates();
    this.incidentId = null;
    this.incident = null;
    this.incidentDetailsWindow.data("Er is momenteel geen incident waavoor dit voertuig is ingezet.");
    this.incidentDetailsWindow.hide();
    this.markerLayer.clear();

    this.button.setAlerted(false);
    this.button.setIcon("bell-o");

    if(triggerEvent) {
        $(me).triggerHandler("end_incident");
    }
};

VoertuigInzetController.prototype.inzetIncident = function(incidentId) {
    var me = this;
    if(incidentId !== me.incidentId) {
        me.geenInzet(false);

        me.incidentId = incidentId;
        var responseIncidentId = incidentId;

        me.service.getAllIncidentInfo(responseIncidentId, false, true)
        .fail(function(e) {
            var msg = "Kan incidentinfo niet ophalen: " + e;
            dbkjs.gui.showError(msg);
            me.button.setIcon("bell-slash");
            me.incidentDetailsWindow.showError(msg);
        })
        .done(function(incident) {
            if(responseIncidentId !== me.incidentId) {
                // Incident was cancelled or changed since request was fired off, ignore
                return;
            }
            me.incident = incident;
            me.incidentDetailsWindow.data(incident, false);
            me.markerLayer.addIncident(incident, false, true);
            me.markerLayer.setZIndexFix();

            dbkjs.protocol.jsonDBK.deselect();
            me.selectIncidentDBK(incident);
            me.zoomToIncident();
            me.incidentDetailsWindow.show();
            me.enableIncidentUpdates();

            me.button.setIcon("bell");

            $(me).triggerHandler("new_incident", incident);
        });
    }
};

/**
 * Find and select DBK for the incident.
 * @param {object} incident
 */
VoertuigInzetController.prototype.selectIncidentDBK = function(incident) {
    var me = this;

    if(!dbkjs.modules.feature.features || dbkjs.modules.feature.features.length === 0) {
        console.log("Waiting for features to be loaded before selecting incident DBK");
        window.setTimeout(function() {
            me.selectIncidentDBK(incident);
        }, 1000);
        return;
    }

    var postcode = incident.POSTCODE;
    var woonplaats = incident.PLAATS_NAAM;
    var huisnummer = Number(incident.HUIS_PAAL_NR);
    var huisletter = incident.HUISLETTER;
    var toevoeging = incident.HUIS_NR_TOEV;
    var straat =  incident.NAAM_LOCATIE1;

    if(postcode && huisnummer) {
        console.log("Zoeken naar DBK voor incident POSTCODE=" + postcode + ", WOONPLAATS=" + woonplaats +
                ", HUIS_PAAL_NR=" + huisnummer + ", HUISLETTER=" + huisletter + ", HUIS_NR_TOEV=" + toevoeging +
                ", NAAM_LOCATIE1=" + straat);

        var dbk = null;
        $.each(dbkjs.modules.feature.features, function(index, f) {
            var fas = f.attributes.adres;
            if(!fas) {
                return true;
            }
            $.each(fas, function(index, fa) {
                if(fa) {
                    var matchPostcode = fa.postcode && postcode === fa.postcode;
                    var matchHuisnummer = fa.huisnummer && huisnummer === fa.huisnummer;

                    if(matchHuisnummer) {
                        if(matchPostcode) {
                            dbk = f;
                            return false;
                        }
                    }
                }
            });

            if(dbk) {
                return false;
            }

            if(f.attributes.adressen) {
                $.each(f.attributes.adressen, function(i, a) {
                    var matchPostcode = a.postcode && a.postcode === postcode;
                    var matchWoonplaats = a.woonplaats && a.woonplaats === woonplaats;
                    var matchStraat = a.straatnaam && a.straatnaam === straat;
                    if(matchPostcode || (matchWoonplaats && matchStraat) && a.nummers) {
                        console.log("Checking nummers for match DBK " + f.attributes.formeleNaam + ", "  + a.straatnaam + ", " + a.postcode + " " + a.woonplaats);
                        $.each(a.nummers, function(j, n) {
                            var parts = n.split("|");
                            var matchHuisnummer = Number(parts[0]) === huisnummer;
                            var matchHuisletter = huisletter === null;
                            var matchToevoeging = toevoeging === null;
                            if(parts.length > 1) {
                                matchHuisletter = huisletter === parts[1];
                            }
                            if(parts.length > 2) {
                                matchToevoeging = toevoeging === parts[2];
                            }
                            if(matchHuisnummer && matchHuisletter && matchToevoeging) {
                                console.log("Matched DBK with nummer " + n + ", matchHuisletter=" + matchHuisletter + ",matchToevoeging=" + matchToevoeging);
                                dbk = f;
                                return false;
                            }
                        });
                        if(dbk) {
                            return false;
                        }
                    }
                });
            }
            if(dbk) {
                return false;
            }
        });

        if(dbk) {
            dbkjs.protocol.jsonDBK.process(dbk, null, true);
        }
    }
};

VoertuigInzetController.prototype.zoomToIncident = function() {
    if(this.incident && this.incident.T_X_COORD_LOC && this.incident.T_Y_COORD_LOC) {
        dbkjs.map.setCenter(new OpenLayers.LonLat(this.incident.T_X_COORD_LOC, this.incident.T_Y_COORD_LOC), dbkjs.options.zoom);
    }
};

VoertuigInzetController.prototype.markerClick = function(incident, marker) {
    this.incidentDetailsWindow.show();
    this.zoomToIncident();
};

VoertuigInzetController.prototype.enableIncidentUpdates = function() {
    var me = this;

    this.disableIncidentUpdates();

    if(!this.incident) {
        return;
    }

    this.updateIncidentInterval = window.setInterval(function() {
        me.updateIncident(me.incidentId);
    }, 15000);
};

VoertuigInzetController.prototype.disableIncidentUpdates = function() {
    if(this.updateIncidentInterval) {
        window.clearInterval(this.updateIncidentInterval);
        this.updateIncidentInterval = null;
    }
};

VoertuigInzetController.prototype.updateIncident = function(incidentId) {
    var me = this;
    if(this.incidentId !== incidentId) {
        // Incident cancelled or changed since timeout was set, ignore
        return;
    }

    me.service.getAllIncidentInfo(incidentId, false, true)
    .fail(function(e) {
        var msg = "Kan incidentinfo niet updaten: " + e;
        dbkjs.gui.showError(msg);
        // Leave incidentDetailsWindow contents with old info
    })
    .done(function(incident) {
        if(me.incidentId !== incidentId) {
            // Incident cancelled or changed since request was fired off, ignore
            return;
        }

        // Always update window, updates moment.fromNow() times
        me.incidentDetailsWindow.data(incident, false, true);

        // Check if updated, enable alert state if true
        var oldIncidentHtml = me.incidentDetailsWindow.getIncidentHtml(me.incident, false, true);
        if(oldIncidentHtml !== me.incidentDetailsWindow.getIncidentHtml(incident, false, true)) {
            if(!me.incidentDetailsWindow.isVisible()) {
                me.button.setAlerted(true);
            }

            me.incident = incident;

            // Possibly update marker position
            me.markerLayer.addIncident(incident, true, true);
            me.markerLayer.setZIndexFix();
        }
    });
};
