sap.ui.define([
	"sap/m/routing/RouteMatchedHandler",
	"SmartTrack/util/formatter",
	"sap/m/MessageToast",
	"sap/ui/core/util/MockServer",
	"sap/ca/ui/message/message",
	"sap/ui/core/UIComponent"
], function (RouteMatchedHandler, formatter, MessageToast, MockServer, message, UIComponent) {
	"use strict";

	return UIComponent.extend("SmartTrack.Component", {
		metadata: {
			manifest: "json"
		},
		formatter: formatter,
		_oResourceBundle: null,

		getResourceBundle: function () {
			return this._oResourceBundle;
		},

		init: function () {
			sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

			var oHashChanger = sap.ui.core.routing.HashChanger.getInstance();
			oHashChanger.replaceHash("");

			this._oRouteMatchedHandler = new RouteMatchedHandler(this.getRouter());
			// this component should automatically initialize the router
			this.getRouter().initialize();

			var oMetadataConfig = this.getMetadata().getConfig();
			var oServiceConfig = oMetadataConfig.serviceConfig;
			var sServiceUrl = oServiceConfig.serviceUrl;
			// always use absolute paths relative to our own component
			// (relative paths will fail if running in the Fiori Launchpad)
			var rootPath = jQuery.sap.getModulePath("SmartTrack");

			// if proxy needs to be used for local testing...
			var sProxyOn = jQuery.sap.getUriParameters().get("proxyOn");
			var bUseProxy = (sProxyOn === "true");
			if (bUseProxy) {
				sServiceUrl = rootPath + "/proxy" + sServiceUrl;
			}

			// start mock server if required
			var responderOn = jQuery.sap.getUriParameters().get("responderOn");
			var bUseMockData = (responderOn === "true");
			// var bUseMockData = true;
			if (bUseMockData) {
				var oMockServer = new MockServer({
					rootUri: sServiceUrl.replace(/\/?$/, "/")
				});
				oMockServer.simulate(rootPath + "/model/metadata.xml", rootPath + "/model/");
				oMockServer.start();

				var msg = "Running in demo mode with mock data."; // not translated because only for development scenario

				MessageToast.show(msg, {
					duration: 4000
				});
			}

			// set i18n model
			var i18nModel = new sap.ui.model.resource.ResourceModel({
				bundleUrl: rootPath + "/i18n/i18n.properties"
			});
			this.setModel(i18nModel, "i18n");

			this._oResourceBundle = jQuery.sap.resources({
				url: rootPath + "/i18n/i18n.properties",
				locale: sap.ui.getCore().getConfiguration().getLanguage()
			});
			formatter.init(this._oResourceBundle);

			function parseXML(text) {
				var doc;
				if (window.DOMParser) {
					var parser = new DOMParser();
					doc = parser.parseFromString(text, "text/xml");
				} else { // Internet Explorer
					doc = new ActiveXObject("Microsoft.XMLDOM");
					doc.async = "false";
					doc.loadXML(text);
				}
				return doc;
			}

			// set data model
			var m = new sap.ui.model.odata.ODataModel(sServiceUrl, {
				json: true,
				loadMetadataAsync: true,
				useBatch: true
			});
			m.attachMetadataFailed(function (oError) {
				var xResponse = parseXML(oError.getParameter("responseText"));

				sap.ca.ui.message.showMessageBox({
					type: sap.ca.ui.message.Type.ERROR,
					message: xResponse.getElementsByTagName("message")[0].childNodes[0].nodeValue
				});
			});
			m.setDefaultCountMode(sap.ui.model.odata.CountMode.Inline);
			m.attachRequestFailed(function (oError) {
				sap.ca.ui.message.showMessageBox({
					type: sap.ca.ui.message.Type.ERROR,
					message: jQuery.sap.parseJS(oError.getParameter("responseText")).error.message.value
				});
			});
			m.attachMetadataFailed(function (oError) {
				sap.ca.ui.message.showMessageBox({
					type: sap.ca.ui.message.Type.ERROR,
					message: jQuery.sap.parseXML(oError.getParameter("responseText")).getElementsByTagName("message")[0].childNodes[0].nodeValue
				});
			});
			this.setModel(m);

			// set device model
			var deviceModel = new sap.ui.model.json.JSONModel({
				isTouch: sap.ui.Device.support.touch,
				isNoTouch: !sap.ui.Device.support.touch,
				isPhone: sap.ui.Device.system.phone,
				isNoPhone: !sap.ui.Device.system.phone,
				listMode: (sap.ui.Device.system.phone) ? "None" : "SingleSelectMaster",
				listItemType: (sap.ui.Device.system.phone) ? "Active" : "Inactive"
			});
			deviceModel.setDefaultBindingMode("OneWay");
			this.setModel(deviceModel, "device");
		},

		/**
		 * Initialize the application
		 * 
		 * @returns {sap.ui.core.Control} the content
		 */
		createContent: function () {

			var oViewData = {
				component: this
			};
			return sap.ui.view({
				viewName: "SmartTrack.view.App",
				type: sap.ui.core.mvc.ViewType.XML,
				viewData: oViewData
			});
		}
	});
});