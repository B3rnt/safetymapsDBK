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

var dbkjs = dbkjs || {};
window.dbkjs = dbkjs;
dbkjs.modules = dbkjs.modules || {};
dbkjs.modules.vrhincidenten = {
    id: "dbk.module.vrhincidenten",
    layerUrls: null,
    popup: null,
    incidentPopup: null,
    updating: null,
    lastUpdated: null,
    markerLayer: null,
    marker: null,
    token: null,
    updateIncidentTimeout: null,
    currentIncidentId: null,
    encode: function(s) {
        if(s) {
            return dbkjs.util.htmlEncode(s);
        }
        return "";
    },
    register: function(options) {
        var me = this;

        this.createStyle();
        this.createPopups();

        $('<a></a>')
            .attr({
                'id': 'btn_openvrhincidenten',
                'class': 'btn btn-default navbar-btn',
                'href': '#',
                'title': 'Incidenten'
            })
            .append('<i class="fa fa-fire"></i>')
            .click(function(e) {
                e.preventDefault();

                me.popup.show();
            })
            .appendTo('#btngrp_3');

        this.markerLayer = new OpenLayers.Layer.Markers("Incidenten Marker", {
             rendererOptions: { zIndexing: true }
        });
        dbkjs.map.addLayer(this.markerLayer);

        this.initVrhService();
    },
    createStyle: function() {
        var css = '#eenheden div { margin: 3px; float: left } \n\
#eenheden div { border-left: 1px solid #ddd; padding-left: 8px; } \n\
#eenheden span.einde { color: gray } \n\
#kladblok { clear: both; padding-top: 10px; }\n\
td { padding: 4px !important } ',
            head = document.getElementsByTagName('head')[0],
            style = document.createElement('style');

        style.type = 'text/css';
        if(style.styleSheet) {
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        head.appendChild(style);
    },
    createPopups: function() {
        var me = this;
        this.popup = dbkjs.util.createModalPopup({
            title: 'Incidenten'
        });
        this.popup.getView().append($('<h4 id="incidentenUpdate" style="padding-bottom: 15px">Gegegevens ophalen...</h4><div id="incidenten"></div>'));

        this.incidentPopup = dbkjs.util.createModalPopup({
            title: 'Incident',
            hideCallback: function() { me.onPopupClose(); }
        });
        this.incidentPopup.getView().append($('<h4 id="incidentHead" style="padding-bottom: 15px"></h4><div id="incidentContent"></div>'));
    },
    onPopupClose: function() {
        if(this.updateIncidentTimeout) {
            window.clearTimeout(this.updateIncidentTimeout);
            this.updateIncidentTimeout = null;
        }
    },
    getVrhToken: function(done) {
        var me = this;
        $.ajax({
            url: dbkjs.options.vrhTokenUrl,
            dataType: "json",
            data: {
                f: "pjson",
                username: dbkjs.options.vrhUsername,
                password: dbkjs.options.vrhPassword
            },
            cache: false
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            alert("Kan geen authenticatietoken ophalen bij ArcGIS service: " + jqXHR.statusText);
        })
        .done(function(data) {
            me.token = data.token;
            window.setTimeout(function() {
                me.getVrhToken();
            }, data.expires - new moment().valueOf());

            if(done) {
                done();
            }
        });
    },
    initVrhService: function() {
        var me = this;
        if(!dbkjs.options.vrhIncidentenUrl) {
            console.log("Missing dbkjs.options.vrhIncidentenUrl setting");
            return;
        }
        if(dbkjs.options.vrhUsername && !me.token) {
            me.getVrhToken(function() { me.initVrhService(); });
            return;
        }

        this.layerUrls = {};
        $.ajax({
            url: dbkjs.options.vrhIncidentenUrl,
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token
            },
            cache: false
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            alert("Kan geen info ophalen van ArcGIS service: ", arguments);
        })
        .done(function(data) {
            if(data.error) {
                alert("ArcGIS service foutmelding " + data.error.code + ": "+ data.error.message);
                return;
            }
            $.each(data.tables, function(i,table) {
                if(/GMS_INCIDENT$/.test(table.name)) {
                    me.layerUrls.incident = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMS_INZET_EENHEID$/.test(table.name)) {
                    me.layerUrls.inzetEenheid = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMS_KLADBLOK$/.test(table.name)) {
                    me.layerUrls.klablok = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMS_STATUS$/.test(table.name)) {
                    me.layerUrls.status = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMS_EENHEID$/.test(table.name)) {
                    me.layerUrls.eenheid = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMS_MLD_CLASS_NIVO_VIEW$/.test(table.name)) {
                    me.layerUrls.mldClass = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMSARC_INCIDENT$/.test(table.name)) {
                    me.layerUrls.incidentClass = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                } else if(/GMSARC_KARAKTERISTIEK$/.test(table.name)) {
                    me.layerUrls.karakteristiek = dbkjs.options.vrhIncidentenUrl + "/" + table.id;
                }
            });

            if(!me.layerUrls.incident) {
                console.log("Fout: incidenten tabel niet gevonden in ArcGIS service " + dbkjs.options.vrhIncidentenUrl);
            } else {
                me.loadVrhIncidenten();
            }
        });
    },
    getInzetEenheden: function(incidentIds, alleenBrandweer, done) {
        var me = this;
        if(!incidentIds || incidentIds.length === 0) {
            return [];
        }
        $.ajax({
            url: me.layerUrls.inzetEenheid + "/query",
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "INCIDENT_ID IN (" + incidentIds.join(",") + ") " + (alleenBrandweer ? "AND T_IND_DISC_EENHEID = 'B'" : ""),
                orderByFields: "DTG_OPDRACHT_INZET",
                outFields: "*"
            },
            cache: false
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.error) {
                alert("Fout bij ophalen inzet eenheid: " + data.error.code + ": "+ data.error.message);
                return;
            }
            var f = [];
            $.each(data.features, function(i, feature) {
                f.push(feature.attributes);
            });
            done(f);
        });
    },
    getClassificaties: function(meldingClIds, done) {
        var me = this;
        if(!meldingClIds || meldingClIds.length === 0) {
            return [];
        }
        $.ajax({
            url: me.layerUrls.mldClass + "/query",
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "MELDING_CL_ID IN (" + meldingClIds.join(",") + ")",
                outFields: "*"
            },
            cache: false
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.error) {
                alert("Fout bij ophalen classificaties: " + data.error.code + ": "+ data.error.message);
                return;
            }
            var classificaties = {};
            $.each(data.features, function(i, cl) {
                var c = cl.attributes;
                var vals = [];
                if(c.NIVO1) {
                    vals.push(c.NIVO1);
                }
                if(c.NIVO2) {
                    vals.push(c.NIVO2);
                }
                if(c.NIVO3) {
                    vals.push(c.NIVO3);
                }
                classificaties[c.MELDING_CL_ID] = vals.join(", ");
            });
            done(classificaties);
        });
    },
    getIncidentenMetInzet: function(incidentenData, done) {
        var me = this;
        var incidenten = [], incidentIds = [];
        $.each(incidentenData.features, function(i, incident) {
            incidenten.push(incident.attributes);
            incidentIds.push(incident.attributes.INCIDENT_ID);
        });
        // Filter incidenten zonder inzet BRW eruit
        me.getInzetEenheden(incidentIds, true, function(inzetEenheden) {
            var incidentIdsMetInzet = [];

            $.each(inzetEenheden, function(i, inzetEenheid) {
                // Kan leiden tot dubbele INCIDENT_IDs bij meerdere eenheden
                incidentIdsMetInzet.push(inzetEenheid.INCIDENT_ID);
            });

            var incidentenMetInzet = [];
            $.each(incidenten, function(i, incident) {
                if(incidentIdsMetInzet.indexOf(incident.INCIDENT_ID) !== -1) {
                    incidentenMetInzet.push(incident);
                }
            });
            done(incidentenMetInzet);
        });
    },
    loadVrhIncidenten: function() {
        var me = this;
        me.updating = true;
        $("#incidentenUpdate").empty().append($("<span>Ophalen incidenten...</span>"));
        $.ajax({
            url: me.layerUrls.incident + "/query",
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "IND_DISC_INCIDENT LIKE '_B_' AND PRIORITEIT_INCIDENT_BRANDWEER <= 3",
                orderByFields: "DTG_START_INCIDENT DESC",
                outFields: "*"
            },
            cache: false
        })
        .always(function() {
            me.updating = false;
            $("#incidenten").empty();

            window.setTimeout(function () {
                me.loadVrhIncidenten();
            }, 10000);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            $("#incidentenUpdate").text("Fout bij ophalen incidenten: " + jqXHR.statusText);
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.error) {
                $("#incidentenUpdate").text("ArcGIS service foutmelding " + data.error.code + ": "+ data.error.message);
                return;
            }

            me.getIncidentenMetInzet(data, function(incidenten) {
                // Haal classificaties op
                var meldingClIds = [];
                $.each(incidenten, function(i, incident) {
                    meldingClIds.push(incident.BRW_MELDING_CL_ID);
                });

                me.getClassificaties(meldingClIds, function(classificaties) {
                    var size = new OpenLayers.Size(20,25);
                    var offset = new OpenLayers.Pixel(-(size.w/2), -size.h);

                    var actiefDiv = $("<div/>");
                    actiefDiv.appendTo("#incidenten");
                    var andersDiv = $("<div style='padding-top: 10px'/>");
                    //andersDiv.append($("<span>Overige incidenten:</span>"));
                    andersDiv.appendTo("#incidenten");

                    me.markerLayer.clearMarkers();
                    $.each(incidenten, function(i, incident) {
                        var pos = null;

                        if(incident.T_X_COORD_LOC && incident.T_Y_COORD_LOC) {
                            pos = new OpenLayers.LonLat(incident.T_X_COORD_LOC, incident.T_Y_COORD_LOC);
                        } else {
                            return;
                        }

                        if(pos !== null) {
                            var marker = new OpenLayers.Marker(
                                pos,
                                new OpenLayers.Icon("images/marker-red.png", size, offset)
                            );
                            marker.id = incident.INCIDENT_ID;
                            marker.events.register("click", marker, function() { me.markerClick(marker, incident); });
                            me.markerLayer.addMarker(marker);
                        }

                        var div = $("<div class=\"melding\"></div>");

                        var titel = $(pos !== null ? "<a/>" : "<div/>");
                        titel.attr({class: "titel"});
                        titel.append(me.getIncidentTitle(incident));

                        if(pos) {
                            titel.on("click", function() {
                                //dbkjs.map.setCenter(pos, dbkjs.options.zoom);
                                me.popup.hide();
                                me.incidentClick(incident);
                            });
                        }
                        div.append(titel);
                        var iclass = classificaties[incident.BRW_MELDING_CL_ID];
                        if(iclass) {
                            div.append(", " + me.encode(iclass));
                        }
                        div.append(", " + me.getAGSMoment(incident.DTG_START_INCIDENT).fromNow());

                        div.appendTo(actiefDiv);
                    });
                    me.markerLayer.setZIndex(100000);

                    $("#incidentenUpdate").empty().append($("<span>" + incidenten.length + " actieve incidenten met inzet brandweereenheden</span>"));
                });
            });
        });
    },
    getAGSMoment: function(epoch) {
        // Contrary to docs, AGS returns milliseconds since epoch in local time
        // instead of UTC
        return new moment(epoch).add(new Date().getTimezoneOffset(), 'minutes');
    },
    getIncidentTitle: function(incident) {
        return this.getAGSMoment(incident.DTG_START_INCIDENT).format("D-M-YYYY HH:mm:ss") + " " + this.encode((incident.PRIORITEIT_INCIDENT_BRANDWEER ? " PRIO " + incident.PRIORITEIT_INCIDENT_BRANDWEER : "") + " " + incident.T_GUI_LOCATIE + ", " + this.encode(incident.PLAATS_NAAM));
    },
    markerClick: function(marker, feature) {
        this.incidentClick(feature);
    },
    updateIncident: function() {
        var me = this;

        $("#incidentHead").text($("#incidentHead").text() + " (verversen...)");
        $.ajax({
            url: me.layerUrls.incident + "/query",
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "INCIDENT_ID = " + me.currentIncidentId,
                outFields: "*"
            },
            cache: false
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.features.length !== 0) {
                me.incidentClick(data.features[0].attributes, false);
            }
        });
    },
    incidentClick: function(incident, setCenter) {
        var me = this;
        if(setCenter) {
            dbkjs.map.setCenter(new OpenLayers.LonLat(incident.T_X_COORD_LOC, incident.T_Y_COORD_LOC), dbkjs.options.zoom);
        }

        $("#incidentHead").text(this.getIncidentTitle(incident));

        var html = '<div style:"width: 100%" class="table-responsive">';
        html += '<table class="table table-hover">';

        var columns = [
            { property: 'DTG_START_INCIDENT', date: true, label: 'Start incident' },
            { property: 'T_GUI_LOCATIE', date: false, label: 'Adres' },
            { property: 'POSTCODE', date: false, label: 'Postcode' },
            { property: 'PLAATS_NAAM', date: false, label: 'Woonplaats' },
            { property: 'PRIORITEIT_INCIDENT_BRANDWEER', date: false, label: 'Prioriteit', separate: true }
        ];

        $.each(columns, function(i, column) {
            var p = incident[column.property];
            if (!dbkjs.util.isJsonNull(p)) {
                var v;
                if(column.date) {
                    var d = me.getAGSMoment(p);
                    v = d.format("dddd, D-M-YYYY HH:mm:ss") + " (" + d.fromNow() + ")";
                } else {
                    v = me.encode(p);
                }
                if(column.separate) {
                    html += '<tr><td>&nbsp;</td><td></td></tr>';
                }
                html += '<tr><td><span>' + column.label + "</span>: </td><td>" + v + "</td></tr>";
            }
        });

        html += '<tr><td>Melding classificatie:</td><td id="mldClass"></td></tr>';
        html += '<tr><td>Karakteristieken:</td><td id="karakteristiek"></td></tr>';
        html += '<tr><td>Ingezette eenheden:</td><td id="eenheden"><div id="brw"><b>Brandweer</b><br/></div><div id="pol"><b>Politie</b><br/></div><div id="ambu"><b>Ambu</b><br/></div></td></tr>';
        html += '<tr><td>Kladblok:</td><td id="kladblok"></td></tr>';
        html += '</table>';
        html += '<table id="mldClass" style="padding-bottom: 10px"></div>';

        $('#incidentContent').html(html);

        $.ajax({
            url: me.layerUrls.klablok + "/query",
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "INCIDENT_ID = " + incident.INCIDENT_ID + " AND TYPE_KLADBLOK_REGEL = 'KB' AND T_IND_DISC_KLADBLOK_REGEL LIKE '_B_'",
                orderByFields: "KLADBLOK_REGEL_ID,VOLG_NR_KLADBLOK_REGEL",
                outFields: "*"
            },
            cache: false
        })
        .done(function(data, textStatus, jqXHR) {
            if(data.error) {
                alert("ArcGIS service foutmelding " + data.error.code + ": "+ data.error.message);
                return;
            }
            var pre = "";
            $.each(data.features, function(i, f) {
                var k = f.attributes;
                pre += me.getAGSMoment(k.DTG_KLADBLOK_REGEL).format("DD-MM-YYYY HH:mm:ss ") + me.encode(k.INHOUD_KLADBLOK_REGEL) + "\n";
            });
            $("#kladblok").append("<pre>" + pre + "</pre>");
        });

        me.getInzetEenheden([incident.INCIDENT_ID], false, function(inzetEenheden) {
            $.each(inzetEenheden, function(i, inzet) {
                var eenheid = (inzet.CODE_VOERTUIGSOORT ? inzet.CODE_VOERTUIGSOORT : "") + " " + inzet.ROEPNAAM_EENHEID;
                if(inzet.KAZ_NAAM) {
                    eenheid += " (" + inzet.KAZ_NAAM + ")";
                }
                var container;
                if(inzet.T_IND_DISC_EENHEID === "B") {
                    container = "#brw";
                } else if(inzet.T_IND_DISC_EENHEID === "P") {
                    container = "#pol";
                } else if(inzet.T_IND_DISC_EENHEID === "A") {
                    container = "#ambu";
                }
                var span = inzet.DTG_EIND_ACTIE ? "<span class='einde'>" : "<span>";
                $(container).append(span + me.encode(eenheid) + "</span><br/>");
            });
        });

        me.getClassificaties([incident.BRW_MELDING_CL_ID], function(classificaties) {
            $("#mldClass").text(classificaties[incident.BRW_MELDING_CL_ID]);
        });

        $.ajax({
            url: me.layerUrls.karakteristiek + "/query",
            dataType: "json",
            data: {
                f: "pjson",
                token: me.token,
                where: "INCIDENT_ID = " + incident.INCIDENT_ID,
                outFields: "NAAM_KARAKTERISTIEK,ACTUELE_KAR_WAARDE"
            },
            cache: false
        })
        .done(function(data, textStatus, jqXHR) {
            var html = "";

            if(!data.features || data.features.length === 0) {
                html += " -</h4>";
            } else {
                html += '</h4><div style:"width: 100%" class="table-responsive">';
                html += '<table class="table table-hover">';
                $.each(data.features, function(i, feature) {
                    var a = feature.attributes;
                    if(!a.ACTUELE_KAR_WAARDE) {
                        return;
                    }
                    html += "<tr><td>" +me.encode(a.NAAM_KARAKTERISTIEK) + "</td><td>" + me.encode(a.ACTUELE_KAR_WAARDE) + "</td></tr>";
                });
            }

            var d = $("<div/>");
            d.html(html + "</table>");
            d.appendTo('#karakteristiek');
        });

        this.incidentPopup.show();

        if(me.updateIncidentTimeout) {
            window.clearTimeout(me.updateIncidentTimeout);
        }
        me.currentIncidentId = incident.INCIDENT_ID;
        me.updateIncidentTimeout = window.setTimeout(function() {
            me.updateIncident();
        }, 10000);
    }
};
