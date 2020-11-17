sap.ui.controller("SmartTrack.view.NoData", {
	handleNavButton: function () {
		//  sap.ui.core.UIComponent.getRouterFor(this).navTo("EVMUnexpectedDetail");
		sap.ui.core.UIComponent.getRouterFor(this).navTo("NoData", {}, true);
		var oSplitApp = this.getView().getParent().getParent();
		var oMaster = oSplitApp.getMasterPages()[0];
		oSplitApp.toMaster(oMaster, "show");
	}
});