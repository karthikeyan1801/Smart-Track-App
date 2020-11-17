sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"SmartTrack/util/formatter"
], function (Controller, formatter) {
	"use strict";

	return Controller.extend("SmartTrack.view.EVMExpectedDetail", {
		formatter: formatter,
		onInit: function () {
			sap.ui.core.UIComponent.getRouterFor(this).attachRouteMatched(this.fnHandleRouteMatched, this);
		},

		openActionSheet: function () {
			if (!this._oActionSheet) {
				this._oActionSheet = new sap.m.ActionSheet({
					buttons: new sap.ushell.ui.footerbar.AddBookmarkButton()
				});
				this._oActionSheet.setShowCancelButton(true);
				this._oActionSheet.setPlacement(sap.m.PlacementType.Top);
			}

			this._oActionSheet.openBy(this.getView().byId("actionButton"));
		},

		onExit: function () {
			if (this._oActionSheet) {
				this._oActionSheet.destroy();
				this._oActionSheet = null;
			}
		},

		handleNavButtonPress: function () {
			/* eslint-disable */
			window.history.go(-1);
			/* eslint-enable */
		},

		fnHandleRouteMatched: function (oEvent) {
			if (oEvent.getParameter("name") === "evmExpectedDetail") {
				var context = new sap.ui.model.Context(this.getView().getModel(), "/" + oEvent.getParameter("arguments").contextPath);

				var oHeader = this.getView().byId("evmExpectedDetailHeader");
				oHeader.setBindingContext(context);
				var sGuid = context.getProperty("EventHandlerUUID");
				var sEVMGuid = context.getProperty("EventMessageUUID");
				var sExpectedEventSequenceNumber = context.getProperty("ExpectedEventSequenceNumber");
				this.fnBindContainers(sGuid, sEVMGuid, sExpectedEventSequenceNumber);
			}
		},

		fnBindContainers: function (sGuid, sEVMGuid, sEE) {
			var aFilters = [new sap.ui.model.Filter("EventHandlerUUID", sap.ui.model.FilterOperator.EQ, sGuid, null),
				new sap.ui.model.Filter("ExpectedEventSequenceNumber", sap.ui.model.FilterOperator.EQ, sEE, null)
			];

			var filter = sEVMGuid ? new sap.ui.model.Filter("EventMessageUUID", sap.ui.model.FilterOperator.EQ, sEVMGuid, null) :
				new sap.ui.model.Filter("ExpectedEventSequenceNumber", sap.ui.model.FilterOperator.EQ, sEE, null);
			aFilters.push(filter);

			var oForm = this.getView().byId("evmExpectedForm").clone();
			this.getView().byId("evmExpectedDetailContainer").bindAggregation("items", {
				path: "/FreightOrderEventMessageDetailsS",
				filters: aFilters,
				factory: function (key, oContext) {
					oForm.setBindingContext(oContext);
					return oForm;
				}
			});
		}
	});
});