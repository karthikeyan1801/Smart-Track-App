sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"SmartTrack/util/parameter",
	"SmartTrack/util/eventmessage",
	"sap/ui/model/FilterOperator",
	"SmartTrack/util/formatter",
	"sap/m/Dialog",
	"SmartTrack/util/Signature"
], function (Controller, parameter, eventmessage, FilterOperator, formatter, Dialog, Signature) {
	"use strict";
	var view = null;
	return Controller.extend("SmartTrack.view.Detail", {
		formatter: formatter,

		_EventMessage: undefined,
		_oItemTemplate: undefined,
		_oReportEventDialog: undefined,
		_oDelayEventDialog: undefined,

		_getReportEventDialog: function (createNew) {
			if (!this._oReportEventDialog || createNew) {
				this._oReportEventDialog = sap.ui.xmlfragment("SmartTrack.fragments.ReportDialog", this);
			}
			return this._oReportEventDialog;
		},

		_getDelayEventDialog: function (createNew) {
			if (!this._oDelayEventDialog || createNew) {
				this._oDelayEventDialog = sap.ui.xmlfragment("SmartTrack.fragments.ReportUnexpectedDialog", this);
			}
			return this._oDelayEventDialog;
		},

		onInit: function () {
			sap.ui.core.UIComponent.getRouterFor(this).attachRouteMatched(this.fnHandleRouteMatched, this);
			view = this.getView();
			var oViewRef = new sap.ui.model.json.JSONModel({
				"d": {
					"results": this
				}
			});
			sap.ui.getCore().setModel(oViewRef, "oViewRef");
			var oGeoMap = this.getView().byId("GeoMap");
			var oMapConfig = {
				"MapProvider": [{
					"name": "HEREMAPS",
					"type": "",
					"description": "",
					"tileX": "256",
					"tileY": "256",
					"maxLOD": "20",
					"copyright": "Tiles Courtesy of Maps",
					"Source": [{
						"id": "s1",
						"url": "http://mt0.google.com/vt/lyrs=m@1550000&amp;hl=en&x={X}&y={Y}&z={LOD}&s=G"
					}, {
						"id": "s2",
						"url": "http://mt1.google.com/vt/lyrs=m@1550000&amp;hl=en&x={X}&y={Y}&z={LOD}&s=G"
					}]
				}],
				"MapLayerStacks": [{
					"name": "DEFAULT",
					"MapLayer": {
						"name": "layer1",
						"refMapProvider": "HEREMAPS",
						"opacity": "1.0",
						"colBkgnd": "RGB(255,255,255)"
					}
				}]
			};
			oGeoMap.setMapConfiguration(oMapConfig);
			oGeoMap.setRefMapLayerStack("DEFAULT");
		},

		handleNavButton: function () {
			var oSplitApp = this.getView().getParent().getParent();
			var oMaster = oSplitApp.getMasterPages()[0];
			oSplitApp.toMaster(oMaster, "show");
		},

		formatTabVisibility: function (e) {
			if (e === null || e === "") {
				return false;
			} else {
				if (e === "POD") {
					return true;
				} else {
					return false;
				}
			}
		},

		onScanForValue: function (oEvent) {
			cordova.plugins.barcodeScanner.scan(this.scanSuccessCallback, this.scanErrorCallback);
		},

		scanSuccessCallback: function (result) {
			alert(result.text);
		},

		scanErrorCallback: function (error) {
			navigator.notification.alert("Scanning failed: " + JSON.stringify(error));
		},

		scanSuccess: function (oEvent) {
			var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
			var vtext = oEvent.getParameter("text");

			MessageBox.alert(
				"We got a bar code\n" +
				"Result: " + vtext + "\n" +
				"Format: " + oEvent.getParameter("format") + "\n" +
				"Cancelled: " + oEvent.getParameter("cancelled"), {
					styleClass: bCompact ? "sapUiSizeCompact" : ""
				});
		},

		openActionSheet: function () {
			var that = this;
			if (!this._oActionSheet) {
				var oShareButton = new sap.m.Button({
					icon: "sap-icon://share-2",
					text: that.getOwnerComponent().getResourceBundle().getText("SHARE_WITH_JAM")
				});
				oShareButton.attachPress(this.onShare, this);

				this._oActionSheet = new sap.m.ActionSheet({
					buttons: oShareButton
				});
				this._oActionSheet.setShowCancelButton(true);
				this._oActionSheet.setPlacement(sap.m.PlacementType.Top);
			}

			this._oActionSheet.openBy(this.getView().byId("actionButton"));
		},

		getShareValues: function (oHeaderClone) {
			var aShareValues = [];
			var oContext = oHeaderClone.getBindingContext();

			oHeaderClone.getBindingInfo("title").parts.forEach(function (element) {
				if (oContext.getProperty(element.path)) {
					aShareValues.push(
						oContext.getProperty("/#FreightOrderEventHandlerOverview/" + element.path + "/@sap:label") + ": " +
						oContext.getProperty(element.path)
					);
				}
			});
			aShareValues.push(
				oContext.getProperty("/#FreightOrderEventHandlerOverview/" + oHeaderClone.getBindingPath("number") + "/@sap:label") + ": " +
				oContext.getProperty(oHeaderClone.getBindingPath("number"))
			);
			oHeaderClone.getAttributes().forEach(function (element) {
				aShareValues.push(
					oContext.getProperty("/#FreightOrderEventHandlerOverview/" + element.getBindingPath("text") + "/@sap:label") + ": " +
					oContext.getProperty(element.getBindingPath("text"))
				);
			});

			oHeaderClone.getStatuses().forEach(function (element) {
				aShareValues.push(
					oContext.getProperty("/#FreightOrderEventHandlerOverview/" + element.getBindingPath("text") + "/@sap:label") + ": " +
					oContext.getProperty(element.getBindingPath("text"))
				);
			});

			return aShareValues;
		},

		onShare: function () {
			var oHeader = this.getView().byId("detailHeader");
			var oHeaderClone = oHeader.clone();
			oHeaderClone.setModel(this.getView().getModel());
			var aShareValues = this.getShareValues(oHeaderClone);

			var oShareDialog = sap.ui.getCore().createComponent({
				name: "sap.collaboration.components.fiori.sharing.dialog",
				settings: {
					object: {
						display: oHeaderClone,
						/* eslint-disable */
						id: window.location.href,
						/* eslint-enable */
						share: aShareValues.join("\n")
					}
				}
			});
			oShareDialog.open();
		},

		onExit: function () {
			if (this._oActionSheet) {
				this._oActionSheet.destroy();
				this._oActionSheet = null;
			}
		},

		fnHandleRouteMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "detail") {
				// set busy indicator
				this.getView().setBusy(true);
				this._EventMessage = new eventmessage.EventMessage();
				var context = new sap.ui.model.Context(this.getView().getModel(), "/" + oEvent.getParameter("arguments").contextPath);

				var oHeader = this.getView().byId("detailHeader");
				oHeader.setBindingContext(context);

				var sGuid = context.getProperty("EventHandlerUUID");
				this._EventMessage.TrackingID = context.getProperty("MasterTrackingID");
				this._EventMessage.TrackingIDType = context.getProperty("MasterTrackingIDType");

				var aCounts = [];
				aCounts.push(context.getProperty("NumberOfAssignedFreightUnits"));
				aCounts.push(context.getProperty("NumberOfRelatedSalesOrders"));
				this.fnAddTabCounts(aCounts);

				if (sGuid) {
					this.fnBindContainers(sGuid);
				}

				if (this.getView().byId("EventHandlerIconTabBar").getSelectedKey() !== "EventHandlerDetails") {
					this.getView().byId("EventHandlerIconTabBar").setSelectedKey("EventHandlerDetails");
				}

				var that = this;

				this.getView().getModel("s4aModel").read("/FreightOrderIDSet('" + this._EventMessage.TrackingID +
					"')/StopSet", {
						success: function (data) {
							var oStopSet = new sap.ui.model.json.JSONModel();
							oStopSet.setData(data);
							var odata = data.results;
							var oGeoMap = that.getView().byId("GeoMap");
							if (odata.length > 0) {
								oGeoMap.setCenterPosition(odata[0].LocGeoData);
								oGeoMap.setInitialZoom(11);
								oGeoMap.setInitialPosition(odata[0].LocGeoData);
								var url = "https://www.google.com/maps/dir";
								for (var i = 0; i < odata.length; i++) {
									var locarray = odata[i].LocGeoData.split(";");
									url = url + "/" + locarray[1] + "," + locarray[0];
								}
								that.getView().byId("maplink").setHref(url);
								that.getView().setModel(oStopSet, "oStopSet");
							}
						},
						error: function () {
							that.getView().setBusy(false);
						}
					}
				);
				this.getView().getModel("s4aModel").read("/FreightOrderIDSet('" + this._EventMessage.TrackingID +
					"')/Stage1Set", {
						success: function (data) {
							that.getView().setBusy(false);
							var oStageSet = new sap.ui.model.json.JSONModel();
							oStageSet.setData(data);
							that.getView().setModel(oStageSet, "oStageSet");
						},
						error: function () {
							that.getView().setBusy(false);
						}
					}
				);

				// var FO = this.byId("FO");
				// var Carr = this.byId("Carr");
				// var PltNum = this.byId("PN");

				// var oNovigoRateRequest = new sap.ui.model.json.JSONModel("/sap/opu/odata/sap/ZTM_MAP_SRV/FreightOrderIDSet('" + this._EventMessage
				// 	.TrackingID +
				// 	"')/RateSet");
				// this.getView().setModel(oNovigoRateRequest, "oNovigoRateRequest");
				// oNovigoRateRequest.attachRequestCompleted(function () {
				// 	if (that.getView().byId("FO") !== undefined) {
				// 		that.getView().byId("FO").setValue(this.getData().d.results[0].TorId);
				// 		that.getView().byId("Carr").setValue(this.getData().d.results[0].Tspid);
				// 		//PltNum.setValue("PlateNumber");
				// 	}
				// });

			}
		},

		fnAddTabCounts: function (aCounts) {
			for (var i = 1; i < this.getView().byId("EventHandlerIconTabBar").getItems().length; i++) {
				this.getView().byId("EventHandlerIconTabBar").getItems()[i].setCount(formatter.countFormatter(aCounts[i - 1]));
			}
		},

		fnBindContainers: function (sGuid, bRefresh) {
			var oFilter = new sap.ui.model.Filter("EventHandlerUUID", sap.ui.model.FilterOperator.EQ, sGuid, null);
			var oEventDetailFragment = sap.ui.xmlfragment("SmartTrack.fragments.DetailPropertiesForm", this);
			var oEventMessageOverviewFragment = this.getView().byId("EventMessageTable");
			var that = this;
			if (bRefresh) {
				this.getOwnerComponent().getEventBus().publish("SmartTrack", "refresh");
				return;
			}
			this.getView().byId("EventHandlerIconTabBar").bindAggregation("content", {
				path: "/FreightOrderEventHandlerDetailsS",
				parameters: {
					expand: "ToEventMessageOverview"
				},
				filters: [oFilter],
				factory: function (key, oContext) {
					oEventDetailFragment.setBindingContext(oContext);
					oEventMessageOverviewFragment.setBindingContext(oContext);
					oEventMessageOverviewFragment.setBusy(false);
					var oLabel = oEventMessageOverviewFragment.getHeaderToolbar().getContent()[0];

					oLabel.setText(that.getOwnerComponent().getResourceBundle().getText("EVENT_MESSAGE_TITLE", [oEventMessageOverviewFragment.getItems()
						.length
					]));
					return oEventDetailFragment;
				}
			});
		},

		fnOnSelectIconTabFilter: function (oEvent) {
			if (oEvent.getSource().getSelectedKey() === "FreightOrderRelatedSalesOrdersS" || oEvent.getSource().getSelectedKey() ===
				"FreightOrderAssignedFreightUnitsS") {
				var sCollection = oEvent.getSource().getSelectedKey();
				var sGUID = this.getView().byId("detailHeader").getBindingContext().getProperty("EventHandlerUUID");
				var oFilter = new sap.ui.model.Filter("EventHandlerUUID", sap.ui.model.FilterOperator.EQ, sGUID, null);
				var oTable = oEvent.getParameters().item.getContent()[0].getContent()[0];
				if (oTable.getItems()[0]) {
					this._oItemTemplate = oTable.getItems()[0].clone();
				}
				oTable.bindItems("/" + sCollection, this._oItemTemplate, null, [oFilter]);
			}
			if (oEvent.getSource().getSelectedKey() === "iconTabBarFilter1") {

				var oGeoMap = this.getView().byId("GeoMap");
				var oStopSet = this.getView().getModel("oStopSet");
				var oStopData = oStopSet.getData();
				if (oStopData.results[0].LocGeoData) {
					oGeoMap.setCenterPosition(oStopData.results[0].LocGeoData);
					oGeoMap.setInitialZoom(11);
					oGeoMap.setInitialPosition(oStopData.results[0].LocGeoData);
				}
			}
		},

		goToNextPage: function (oEvent) {
			var oListItem = oEvent.getSource().getParent().getParent().getSelectedItem();
			var bUnexpected = oListItem.getBindingContext().getProperty("EventStatusExtended") === "05";
			if (bUnexpected) {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("evmUnexpectedDetail", {
					from: "detail",
					contextPath: oListItem.getBindingContext().getPath().substr(1)
				});
			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("evmExpectedDetail", {
					from: "detail",
					contextPath: oListItem.getBindingContext().getPath().substr(1)
				});
			}
		},

		OnSelectionChange: function (oEvent) {
			if (oEvent.getSource().getSelectedItem()) {
				this.getView().byId("NavToEVMBtn").setEnabled(true);
			} else {
				this.getView().byId("NavToEVMBtn").setEnabled(true);
			}
		},

		clearButton: function (oEvent) {
			var canvas = document.getElementById("signature-pad");
			var context = canvas.getContext("2d");
			context.clearRect(0, 0, canvas.width, canvas.height);

			var signaturePad = new SignaturePad(document.getElementById('signature-pad'), {
				backgroundColor: '#f0f4f9',
				penColor: 'rgb(0, 0, 0)'
			});
			signaturePad.clear();

		},

		base64ImageToBlob: function (str) {
			// extract content type and base64 payload from original string
			var pos = str.indexOf(';base64,');
			var type = str.substring(5, pos);
			var b64 = str.substr(pos + 8);
			// decode base64
			var imageContent = atob(b64);
			// create an ArrayBuffer and a view (as unsigned 8-bit)
			var buffer = new ArrayBuffer(imageContent.length);
			var view = new Uint8Array(buffer);
			// fill the view, using the decoded base64
			for (var n = 0; n < imageContent.length; n++) {
				view[n] = imageContent.charCodeAt(n);
			}
			// convert ArrayBuffer to Blob
			var blob = new Blob([buffer], {
				type: type
			});
			return blob;
		},

		saveButton: function (oEvent) {
			var canvas = document.getElementById("signature-pad");
			var sObjectId = this._EventMessage.TrackingID;
			var stor_id = this._EventMessage.TrackingID;

			var imageData = canvas.toDataURL('image/png');
			var file = this.base64ImageToBlob(imageData);
			var url1 = "/sap/opu/odata/sap/ZTM_MAP_SRV/FreightOrderIDSet";
			var csrfToken = "";
			var aData = jQuery.ajax({
				url: url1,
				headers: {
					"X-CSRF-Token": "Fetch",
					"X-Requested-With": "XMLHttpRequest",
					"Content-Type": "image/png",
					"DataServiceVersion": "2.0"
				},
				type: "GET",
				//jsonpCallback : �getJSON�,
				contentType: "application/json",
				dataType: 'json',

				//data : ��,
				success: function (data, textStatus, jqXHR) {
					csrfToken = jqXHR.getResponseHeader('x-csrf-token');
					var oHeaders = {
						"x-csrf-token": csrfToken,
						"slug": "; tor_id=" + stor_id + "; host_uuid=" + sObjectId + "; overwrite=t",
						"X-Requested-With": "XMLHttpRequest",
						"Content-Type": "image/png",
						"DataServiceVersion": "2.0",
						"Accept": "image/png, */*"
					};

					jQuery.ajax({
						type: "POST",
						url: "/sap/opu/odata/sap/ZTM_MAP_SRV/AttachmentSet",
						headers: oHeaders,
						cache: false,
						contentType: "image/png",
						dataType: "text",
						processData: false,
						data: file,
						success: function (evt) {
							sap.m.MessageToast.show("Signature Uploaded Successfully.");
						},
						error: function (evt) {
							sap.m.MessageToast.show("Signature Uploaded Successfully.");
						}
					});
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					sap.m.MessageToast.show("Failed to upload!!");
				}
			});

		},
		onSign: function (oEvent) {
			sap.ui.getCore().byId("okSignButton").setVisible(true);
			if (oEvent.getSource().getSelectedKey() === "iconTabBarFilter2") {
				var canvas = document.getElementById("signature-pad");
				sap.ui.getCore().byId("okSignButton").setVisible(false);
				if (canvas !== null) {
					var context = canvas.getContext("2d");
					//var ratio = Math.max(window.devicePixelRatio || 1, 1);
					canvas.width = 276; // canvas.offsetWidth * ratio;
					canvas.height = 180; // canvas.offsetHeight * ratio;
					//canvas.getContext("2d").scale(ratio, ratio);
					//var context = canvas.getContext("2d");
					context.fillStyle = "#fff";
					context.strokeStyle = "#444";
					context.lineWidth = 1.5;
					context.lineCap = "round";
					context.fillRect(0, 0, canvas.width, canvas.height);
					var signaturePad = new SignaturePad(document.getElementById('signature-pad'), {
						backgroundColor: '#f0f4f9',
						penColor: 'rgb(0, 0, 0)'
					});
				}
			}
			if (oEvent.getSource().getSelectedKey() === "iconTabBarFilter4") {
				sap.ui.getCore().byId("okSignButton").setVisible(false);
			}
			if (oEvent.getSource().getSelectedKey() === "iconTabBarFilter3") {
				var video = document.querySelector("video"),
					vendorURL = window.URL || window.webkitURL || window.mozURL || window.msURL;
				sap.ui.getCore().byId("okSignButton").setVisible(false);
				navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

				navigator.getMedia({
					video: true,
					audio: false
				}, function (stream) {
					/*					var binaryData = [];
										binaryData.push(stream);
										video.src = vendorURL.createObjectURL(new Blob(binaryData, {
											type: "application/zip"
										}));*/
					video.srcObject = stream;
					video.play();
				}, function (error) {

				});
			}

		},

		fnOnReportButtonPressed: function (oEvent) {
			var oContext = oEvent.getSource().getParent().getBindingContext();
			var oReportDialog = this._getReportEventDialog(true);

			oReportDialog.setModel(this.getView().getModel("i18n"), "i18n");
			oReportDialog.setModel(oContext.getModel());
			oReportDialog.setBindingContext(oContext);
			this._EventMessage.ToEventMessageLocation[0].EventLocation = oContext.getProperty("EventLocation");
			sap.ui.getCore().byId("html").setContent("<canvas id='signature-pad' class='signature-pad' width='400px' height='300px'></canvas>");
			/*			sap.ui.getCore().byId("myImage").setContent(
							"<div style='width:400px;background-color:#ccc;border:10px solid #ddd;margin:0 auto;'><video id='video' width='400' height='300'></video><canvas id='canvas' width='400' height='300' style='display:none;'></canvas><img id='camera-image' src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' width='400' height='300'></div>"
						);*/
			this.getPosition1();
			oReportDialog.open();
		},

		deletePhoto: function () {
			//var myImage = sap.ui.getCore().byId("myImage");
			//myImage.setSrc("");
			var myImage = document.getElementById("camera-image");
			myImage.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
		},

		takePhoto: function () {
			var video = document.getElementById("video");
			var photo = document.getElementById("camera-image");
			var canvas = document.getElementById('canvas');
			var context = canvas.getContext('2d');
			context.drawImage(video, 0, 0, 400, 300);
			photo.setAttribute('src', canvas.toDataURL('image/png'));
		},

		onPhotoURISuccess: function (imageURI) {
			//var myImage = sap.ui.getCore().byId("myImage");
			//myImage.setSrc(imageURI);

			var myImage = document.getElementById("camera-image");
			myImage.src = imageURI;
		},
		onFail: function (message) {
			alert.log("Failed because: " + message);
		},

		uploadPhoto: function (oEvent) {
			var sObjectId = this._EventMessage.TrackingID;
			var stor_id = this._EventMessage.TrackingID;
			var imageUri = document.getElementById("camera-image").src;
			var file = this.base64ImageToBlob(imageUri);
			var url1 = "/sap/opu/odata/sap/ZTM_MAP_SRV/FreightOrderIDSet";
			var csrfToken = "";
			var aData = jQuery.ajax({
				url: url1,
				headers: {
					"X-CSRF-Token": "Fetch",
					"X-Requested-With": "XMLHttpRequest",
					"Content-Type": "image/png",
					"DataServiceVersion": "2.0"
				},
				type: "GET",
				//jsonpCallback : �getJSON�,
				contentType: "application/json",
				dataType: 'json',

				//data : ��,
				success: function (data, textStatus, jqXHR) {
					csrfToken = jqXHR.getResponseHeader('x-csrf-token');
					var oHeaders = {
						"x-csrf-token": csrfToken,
						"slug": "; tor_id=" + stor_id + "; host_uuid=" + sObjectId + "; overwrite=abap_false",
						"X-Requested-With": "XMLHttpRequest",
						"Content-Type": "image/png",
						"DataServiceVersion": "2.0",
						"Accept": "image/png, */*"
					};

					jQuery.ajax({
						type: "POST",
						url: "/sap/opu/odata/sap/ZTM_MAP_SRV/AttachmentSet",
						headers: oHeaders,
						cache: false,
						contentType: "image/png",
						dataType: "text",
						processData: false,
						data: file,
						success: function (evt) {
							sap.m.MessageToast.show("Photo Uploaded Successfully.");
						},
						error: function (evt) {
							sap.m.MessageToast.show("Photo Uploaded Successfully.");
						}
					});
					//	sap.m.MessageToast.show("File Uploaded Successfully.");
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					sap.m.MessageToast.show("Failed to upload!");
				}
			});
		},

		handleUploadPress: function (oEvent) {
			var sObjectId = this._EventMessage.TrackingID;
			var stor_id = this._EventMessage.TrackingID;
			var oFileUploader = sap.ui.getCore().byId("fileUploader");
			var file = jQuery.sap.domById(oFileUploader.getId() + "-fu").files[0];
			sap.m.MessageToast.show("Picture Upload started.");
			var url1 = "/sap/opu/odata/sap/ZTM_MAP_SRV/FreightOrderIDSet";
			var csrfToken = "";
			var aData = jQuery.ajax({
				url: url1,
				headers: {
					"X-CSRF-Token": "Fetch",
					"X-Requested-With": "XMLHttpRequest",
					"Content-Type": file.type,
					"DataServiceVersion": "2.0"
				},
				type: "GET",
				//jsonpCallback : �getJSON�,
				contentType: "application/json",
				dataType: 'json',

				//data : ��,
				success: function (data, textStatus, jqXHR) {
					csrfToken = jqXHR.getResponseHeader('x-csrf-token');
					var oHeaders = {
						"x-csrf-token": csrfToken,
						"slug": "; tor_id=" + stor_id + "; host_uuid=" + sObjectId + "; overwrite=abap_false",
						"X-Requested-With": "XMLHttpRequest",
						"Content-Type": file.type,
						"DataServiceVersion": "2.0",
						"Accept": "image/png, */*"
					};

					jQuery.ajax({
						type: "POST",
						url: "/sap/opu/odata/sap/ZTM_MAP_SRV/AttachmentSet",
						headers: oHeaders,
						cache: false,
						contentType: file.type,
						dataType: "text",
						processData: false,
						data: file,
						success: function (evt) {
							sap.m.MessageToast.show("Photo Uploaded Successfully.");
						},
						error: function (evt) {
							sap.m.MessageToast.show("Photo Uploaded Successfully.");
						}
					});
					//	sap.m.MessageToast.show("File Uploaded Successfully.");
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					sap.m.MessageToast.show("Failed to upload!");
				}
			});
		},

		capturePhoto: function () {
			var oNav = navigator.camera;
			oNav.getPicture(this.onPhotoURISuccess, this.onFail, {
				quality: 50,
				destinationType: oNav.DestinationType.DATA_URI
			});
		},

		fnOnReportPopupClose: function () {
			this._getReportEventDialog().close();
		},

		fnOnDelayPopupClose: function () {
			this._getDelayEventDialog().close();
		},

		fnReportTime: function (oEvent) {
			this._getReportEventDialog().getBeginButton().setEnabled(true);
			this.fnSetEventDateToMessage(oEvent.getSource().getDateValue());
			if (!this._EventMessage.EventTimeZone) {
				this._EventMessage.EventTimeZone = this._getReportEventDialog().getBindingContext().getProperty("EventExpectedTimeZone");
			}
		},

		fnOnTimeZoneChange: function (oEvent) {
			this._EventMessage.EventTimeZone = oEvent.getSource().getProperty("selectedKey");
			this.fnCheckRequiredFields();
		},

		fnOnTimeZoneExpectedChange: function (oEvent) {
			this._EventMessage.EventTimeZone = oEvent.getSource().getProperty("selectedKey");
		},

		fnOnParameterTimeZone: function (oEvent) {
			var aCustomData = oEvent.getSource().getCustomData();

			var oParamEvent = new parameter();
			oParamEvent.ParameterValue = oEvent.getSource().getProperty("selectedKey");
			oParamEvent.ParameterName = aCustomData[0].getValue();
			oParamEvent.ParameterAction = aCustomData[1].getValue();
			oParamEvent.ParameterType = aCustomData[2].getValue();
			this._EventMessage.ToEventMessageParameter.push(oParamEvent);

			this.fnCheckRequiredFields();
		},

		fnOnParameterTimeStamp: function (oEvent) {
			var aCustomData = oEvent.getSource().getCustomData();
			var oParamEvent = new parameter();
			var oNewEstimatedDate = new Date(oEvent.getSource().getValue());
			var month = oNewEstimatedDate.getMonth() + 1 < 10 ? "0" + (oNewEstimatedDate.getMonth() + 1) : oNewEstimatedDate.getMonth() + 1;
			var date = oNewEstimatedDate.getDate() < 10 ? "0" + oNewEstimatedDate.getDate() : oNewEstimatedDate.getDate();
			var hour = oNewEstimatedDate.getHours() < 10 ? "0" + oNewEstimatedDate.getHours() : oNewEstimatedDate.getHours();
			var min = oNewEstimatedDate.getMinutes() < 10 ? "0" + oNewEstimatedDate.getMinutes() : oNewEstimatedDate.getMinutes();
			var secs = oNewEstimatedDate.getSeconds() < 10 ? "0" + oNewEstimatedDate.getSeconds() : oNewEstimatedDate.getSeconds();
			oParamEvent.ParameterValue = "0" + oNewEstimatedDate.getFullYear() + month + date + hour + min + secs;
			oParamEvent.ParameterName = aCustomData[0].getValue();
			oParamEvent.ParameterAction = aCustomData[1].getValue();
			oParamEvent.ParameterType = aCustomData[2].getValue();
			this._EventMessage.ToEventMessageParameter.push(oParamEvent);
			this.fnCheckRequiredFields();
		},

		fnSetEventDateToMessage: function (oDate) {
			var localTime = oDate.getTime();
			var localOffset = oDate.getTimezoneOffset() * 60000;
			var oNewDate = new Date(localTime - localOffset);
			this._EventMessage.EventDateTime = oNewDate;
			var month = oDate.getMonth() + 1 < 10 ? "0" + (oDate.getMonth() + 1) : oDate.getMonth() + 1;
			var day = oDate.getDate() < 10 ? "0" + oDate.getDate() : oDate.getDate();
			var hour = oDate.getHours() < 10 ? "0" + oDate.getHours() : oDate.getHours();
			var min = oDate.getMinutes() < 10 ? "0" + oDate.getMinutes() : oDate.getMinutes();
			this._EventMessage.EventTime = "PT" + hour + "H" + min + "M";
			this._EventMessage.EventDate = oDate.getFullYear() + "-" + month + "-" + day + "T00:00:00";
		},
		fnExpectedLocation: function (oEvent) {
			this._EventMessage.ToEventMessageLocation[0].EventLocation = oEvent.getSource().getValue();
		},
		fnOnPopupOK: function (oEvent) {
			var oReportDialogContext = this._getReportEventDialog().getBindingContext();
			this._EventMessage.EventCode = oReportDialogContext.getProperty("EventCode");
			this._EventMessage.EventReasonText = oReportDialogContext.getProperty("EventReasonText");
			this._getReportEventDialog().close();
			//	this.fnSendEventMessage();
			this.fnSendEventMessage1();
		},

		fnSendEventMessage1: function () {
			var c = this.getView().byId("detailHeader").getBindingContext();
			var g = c.getProperty("EventHandlerUUID");
			var t = this;

			var oData = {};

			oData.Trxid = this._EventMessage.TrackingID;
			oData.Trxcod = this._EventMessage.TrackingIDType;
			oData.Evtid = this._EventMessage.EventCode;
			oData.Latitude = sap.ui.getCore().byId("txtLatitude").getText();
			oData.Longitude = sap.ui.getCore().byId("txtLongitude").getText();
			oData.Locid1 = this._EventMessage.ToEventMessageLocation[0].EventLocation;
			oData.Evtcnt = this._EventMessage.EventCounter;
			oData.Evtdat = this._EventMessage.EventDate;
			oData.Evttim = this._EventMessage.EventTime;
			oData.Evtzon = this._EventMessage.EventTimeZone;
			oData.Srctx = this._EventMessage.EventReasonText;
			//Initating Post
			var that = this;
			var sServiceUrl = "/sap/opu/odata/sap/ZEM_NOVIGO_UPDATES_SRV/";
			var oModel = new sap.ui.model.odata.ODataModel(sServiceUrl);

			OData.request({
					requestUri: "/sap/opu/odata/sap/ZEM_NOVIGO_UPDATES_SRV/?$metadata",
					method: "GET",
					headers: {
						"X-Requested-With": "XMLHttpRequest",
						"Content-Type": "application/json",
						"DataServiceVersion": "2.0",
						"X-CSRF-Token": "Fetch"
					}
				},
				function (data, response) {
					var header_xcsrf_token = response.headers['x-csrf-token'];

					OData.request({
							requestUri: "/sap/opu/odata/sap/ZEM_NOVIGO_UPDATES_SRV/ZEventMessageHeaderSet",
							method: "POST",
							headers: {
								"X-Requested-With": "XMLHttpRequest",
								"Content-Type": "application/json",
								"DataServiceVersion": "2.0",
								"Accept": "application/json",
								"X-CSRF-Token": header_xcsrf_token
							},
							data: oData
						},
						function (data, response) {
							t.fnBindContainers(g, true);
						},
						function (err) {
							/*	sap.m.MessageBox.alert("Oops! Something went wrong.\n\n" +
									"Try reloading the page or contact your System Administrator if the problem persists.", {
										icon: sap.m.MessageBox.Icon.ERROR,
										title: "Error"
									});*/
							t.fnBindContainers(g, true);
						});
				},
				function (error) {
					/*	sap.m.MessageBox.alert("Oops! Something went wrong.\n\n" +
							"Try reloading the page or contact your System Administrator if the problem persists.", {
								icon: sap.m.MessageBox.Icon.ERROR,
								title: "Error"
							});*/
				});
		},

		fnSendEventMessage: function () {
			var oContext = this.getView().byId("detailHeader").getBindingContext();
			var sGuid = oContext.getProperty("EventHandlerUUID");
			var oController = this;
			var oBatch = this.getView().getModel().createBatchOperation("EventMessageHeaderS", "POST", this._EventMessage);
			this.getView().getModel().addBatchChangeOperations([oBatch]);
			this.getView().getModel().submitBatch(function (oData) {
				if (!oData.__batchResponses[0].response) {
					sap.m.MessageToast.show(jQuery.sap.parseJS(oData.__batchResponses[0].__changeResponses[0].headers['sap-message']).message, {
						duration: 5000
					});

					oController.fnBindContainers(sGuid, true);
				} else {
					jQuery.sap.require("sap.ca.ui.message.message");
					sap.ca.ui.message.showMessageBox({
						type: sap.ca.ui.message.Type.ERROR,
						message: jQuery.sap.parseJS(oData.__batchResponses[0].response.body).error.message.value
					});
				}
			}, function (oData) {
				if (oData.__batchResponses[0].response) {
					jQuery.sap.require("sap.ca.ui.message.message");
					sap.ca.ui.message.showMessageBox({
						type: sap.ca.ui.message.Type.ERROR,
						message: jQuery.sap.parseJS(oData.__batchResponses[0].response.body).error.message.value
					});
				}
			}, false);

			this._EventMessage = new eventmessage.EventMessage();
			this._EventMessage.TrackingID = oContext.getProperty("MasterTrackingID");
			this._EventMessage.TrackingIDType = oContext.getProperty("MasterTrackingIDType");
		},

		getPosition1: function () {
			var onGeoSuccess = function (position) {
				sap.ui.getCore().byId("txtLatitude").setText(position.coords.latitude);
				sap.ui.getCore().byId("txtLongitude").setText(position.coords.longitude);
			};

			var onGeoError = function () {
				console.log('code:' + error.code + '\n' + 'message: ' + error.message + '\n');
			};

			navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
				enableHighAccuracy: true
			});

		},

		fnOnAddButtonPressed: function (oEvent) {
			var oReportUnexpectedDialog = this._getDelayEventDialog(true);
			oReportUnexpectedDialog.setModel(this.getView().getModel("i18n"), "i18n");
			oReportUnexpectedDialog.setModel(this.getView().getModel());

			var oComboBox = oReportUnexpectedDialog.getContent()[0].getContent()[1];
			if (oComboBox.getItems().length === 1) {
				oComboBox.setSelectedItem(oComboBox.getItems()[0]);
				oComboBox.fireSelectionChange({
					selectedItem: oComboBox.getItems()[0]
				});
			}
			this.getPosition2();
			oReportUnexpectedDialog.open();
		},
		getPosition2: function () {
			var onGeoSuccess = function (position) {
				sap.ui.getCore().byId("txtLatitude").setText(position.coords.latitude);
				sap.ui.getCore().byId("txtLongitude").setText(position.coords.longitude);
				sap.ui.getCore().byId("txtLatitude2").setText(position.coords.latitude);
				sap.ui.getCore().byId("txtLongitude2").setText(position.coords.longitude);
				sap.ui.getCore().byId("txtLatitude3").setText(position.coords.latitude);
				sap.ui.getCore().byId("txtLongitude3").setText(position.coords.longitude);
				sap.ui.getCore().byId("txtLatitude4").setText(position.coords.latitude);
				sap.ui.getCore().byId("txtLongitude4").setText(position.coords.longitude);
				sap.ui.getCore().byId("txtLatitude5").setText(position.coords.latitude);
				sap.ui.getCore().byId("txtLongitude5").setText(position.coords.longitude);
			};

			var onGeoError = function () {
				console.log('code:' + error.code + '\n' + 'message: ' + error.message + '\n');
			};

			navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
				enableHighAccuracy: true
			});

		},

		fnActualDate: function (oEvent) {
			this.fnSetEventDateToMessage(oEvent.getParameters().dateValue);
		},
		onDialogAfterClose: function (oEvent) {
			oEvent.getSource().destroy();
		},
		fnOnEventCodeChange: function (oEvent) {
			this._getDelayEventDialog().getContent()[1].removeAllContent();
			var aForms = this._getDelayEventDialog().getDependents();
			var sKey = oEvent.getParameters().selectedItem.getKey();
			this._EventMessage.EventCode = sKey;
			var aChosenForm = aForms.filter(function (oForm) {
				return oForm.getTitle().getText() === oEvent.getParameters().selectedItem.getText();
			});
			this._getDelayEventDialog().getContent()[1].addContent(aChosenForm[0].clone());
			this._getDelayEventDialog().invalidate();
		},

		fnOnProperty: function (oEvent) {
			if (oEvent.getSource().getCustomData()[0].getKey() === "Location") {
				this._EventMessage.ToEventMessageLocation[0].EventLocation = oEvent.getSource().getValue();
			} else {
				this._EventMessage[oEvent.getSource().getCustomData()[0].getValue()] = oEvent.getSource().getValue();
			}
			this.fnCheckRequiredFields(oEvent.getSource());
		},

		fnOnParameter: function (oEvent) {
			var aCustomData = oEvent.getSource().getCustomData();

			var oParamEvent = parameter();
			oParamEvent.ParameterValue = oEvent.getSource().getValue();
			oParamEvent.ParameterName = aCustomData[0].getValue();
			oParamEvent.ParameterAction = aCustomData[1].getValue();
			oParamEvent.ParameterType = aCustomData[2].getValue();
			this._EventMessage.ToEventMessageParameter.push(oParamEvent);

			this.fnCheckRequiredFields(oEvent.getSource());
		},

		fnCheckRequiredFields: function () {
			var aControls = this._getDelayEventDialog().getContent()[1].getContent()[0].getContent();
			for (var i = 0; i < aControls.length; i++) {
				if (aControls[i].getMetadata().getName() === "sap.m.Label") {
					if (aControls[i].getRequired()) {
						if (!aControls[i + 1].getValue()) {
							this._getDelayEventDialog().getBeginButton().setEnabled(false);
							return;
						}
					}
				}
			}
			this._getDelayEventDialog().getBeginButton().setEnabled(true);
		},

		fnReportOK: function (oEvent) {
			// this.fnSendEventMessage();
			this.fnSendEventMessage1();
			this._getDelayEventDialog().close();
		},
		handleGenerateQRCode: function () {
			var Arr = [];
			// Google Chart API....
			var baseURL = "http://chart.apis.google.com/chart?cht=qr&chs=250x250&chl=";

			var arr = 'FreightOrder = ' + this.byId("FO").getValue() + '/Carrier = ' + this.byId("Carr").getValue() + '/Plate-Number = ' + this
				.byId("PN").getValue() + '';
			var allString = arr.replace(/[/:]/g, "%0A");
			var url = baseURL + allString;
			//	setting final URL to image, which I have taken in view....
			//this.byId("imgId").setSrc(url);

			var oDailog = new Dialog({
				title: 'Scan',
				type: 'Message',
				content: [
					new sap.m.Image({
						densityAware: false,
						src: url
					})
				],
				buttons: [
					new sap.m.Button({
						text: 'OK',
						press: function () {
							oDailog.close();
						}
					})
				]
			});
			oDailog.open();
		}
	});
});