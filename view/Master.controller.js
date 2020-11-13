sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/FilterOperator",
	"SmartTrack/util/formatter"
], function (Controller, FilterOperator, formatter) {
	return Controller.extend("SmartTrack.view.Master", {
		formatter: formatter,
		latitude: undefined,
		longitude: undefined,
		_oListItemTemplate: null,
		_error: false,
		_wrongProperty: null,
		_aStaticFilters: undefined,
		_searchFilter: undefined,
		_aFilterArray: undefined,
		_oKeyValueMapping: undefined,
		_aFilterValues: undefined,
		_oVariants: undefined,
		_oTmpKeyValueMapping: undefined,
		_oValueDialog: undefined,

		_getValueDialog: function (createNew) {
			if (!this._oValueDialog || createNew) {
				this._oValueDialog = sap.ui.xmlfragment("SmartTrack.fragments.FilterValueDialog", this);
			}
			return this._oValueDialog;
		},
		onScanForValue: function (oEvent) {
			that = this;

			cordova.plugins.barcodeScanner.scan(that.scanSuccessCallback, that.scanErrorCallback);
		},
		scanSuccessCallback: function (result) {
			
			that.getView().byId("searchField").setValue(result.text);
			that.handleSearch();
		//	that.fnBindList(result.text);
			alert(result.text);
		},

		scanErrorCallback: function (error) {
			navigator.notification.alert("Scanning failed: " + JSON.stringify(error));
		},
		onInit: function () {
			var j, k;
			var paramFilter;
			var oURLParameter;
			this._oListItemTemplate = sap.ui.xmlfragment("SmartTrack.fragments.MasterListItem", this);
			this._aStaticFilters = [];
			var aFilters = [];
			var bDrilldown = false;
			var that = this;
			this._oKeyValueMapping = {};
			this._aFilterValues = [];
			this._oVariants = {};

			this._aStaticFilters.push(new sap.ui.model.Filter("EventHandlerIsActiveFilter", FilterOperator.EQ, "X", null));
			var aWhiteList = this._fnBuildEHOElementsArray();

			var aIgnoreList = ["chipId", "evaluationId", "sap-system", "tileType", "sap-language", "sap-client", "hc_orionpath",
				"sap-ui-language",
				"sap-ui-xx-fakeOS", "origional-url", "sap-ui-appCacheBuster", "sap-ui-xx-componentPreload"
			];

			if (this.getOwnerComponent().getComponentData()) {
				oURLParameter = this.getOwnerComponent().getComponentData().startupParameters;
			}

			if (oURLParameter && aWhiteList) {
				for (var property in oURLParameter) {
					if (aWhiteList.indexOf(property) > -1) {
						aFilters.push(this.fnBuildParamFilters(oURLParameter, property));
					} else if (aIgnoreList.indexOf(property) === -1) {
						this._wrongProperty = property;
						this._error = true;
						oURLParameter = null;
						aFilters = [];
						break;
					}
				}
			}

			if (oURLParameter && oURLParameter.evaluationId) {
				var oKpiModel = new sap.ui.model.odata.ODataModel("/sap/hba/r/sb/core/odata/runtime/SMART_BUSINESS.xsodata", true);
				oKpiModel.read("/EVALUATIONS('" + oURLParameter.evaluationId[0] + "')", {
					async: false,
					urlParameters: {
						$expand: "FILTERS"
					},
					success: function (oData, oResponse) {
						for (j = 0; j < oResponse.data.FILTERS.results.length; j++) {
							for (k = 0; k < aWhiteList.length; k++) {
								if (oResponse.data.FILTERS.results[j].NAME === aWhiteList[k]) {
									paramFilter = new sap.ui.model.Filter(oResponse.data.FILTERS.results[j].NAME, FilterOperator.EQ, oResponse.data.FILTERS.results[
										j].VALUE_1, null);
									if (!that._oKeyValueMapping[oResponse.data.FILTERS.results[j].NAME + "Filter"]) {
										that._oKeyValueMapping[oResponse.data.FILTERS.results[j].NAME + "Filter"] = [oResponse.data.FILTERS.results[j].VALUE_1];
									} else {
										that._oKeyValueMapping[oResponse.data.FILTERS.results[j].NAME + "Filter"].push(oResponse.data.FILTERS.results[j].VALUE_1);
									}
									aFilters.push(paramFilter);
								}
							}
						}
					}
				});
			}

			aFilters = aFilters.filter(function (oFilter) {
				if (oFilter) {
					return oFilter;
				}
			});

			if (aFilters.length !== 0) {
				this.fnBindList(undefined, aFilters);
				bDrilldown = true;
			}

			var oPersonalizer = sap.ushell.Container.getService("Personalization");

			oPersonalizer.getContainer("variants", {
				validity: Infinity
			}, this.getOwnerComponent()).then(function (oContainer) {
				if (oContainer.getItemValue("variantKey")) {
					that._oVariants = oContainer.getItemValue("variantKey");
					var oVariantManagement = that.getView().byId("filterVariantManagement");
					for (var prop in that._oVariants) {
						if (that._oVariants.hasOwnProperty(prop)) {
							var oVariantItem = new sap.ui.comp.variants.VariantItem({
								key: that._oVariants[prop]["@key"],
								text: prop
							});
							oVariantManagement.addVariantItem(oVariantItem);
							if (oContainer.getItemValue("defaultVariant") && oContainer.getItemValue("defaultVariant") === that._oVariants[prop]["@key"]) {
								oVariantManagement.setDefaultVariantKey(oContainer.getItemValue("defaultVariant"));
								oVariantManagement.setInitialSelectionKey(oContainer.getItemValue("defaultVariant"));
								if (!bDrilldown) {
									that._oKeyValueMapping = that._oVariants[prop];
									that.onFilterCategoryDialogOKButton(undefined, oContainer.getItemValue("defaultVariant"));
								}
							}
						}
					}
				}
			});
			this.getOwnerComponent().getEventBus().subscribe("SmartTrack", "refresh", this.refresh, this);
		},

		refresh: function () {
			var oList = this.getView().byId("list");
			var oSelectedItem = oList.getSelectedItem();
			if (oSelectedItem) {
				var oModel = this.getView().getModel();
				var sContextPath = oSelectedItem.getBindingContext().getPath();

				var that = this;
				this.getView().getModel().read("FreightOrderEventHandlerOverviewS", {
					async: false,
					filters: [new sap.ui.model.Filter("ODataSearchFieldFilter", FilterOperator.EQ, oSelectedItem.getBindingContext().getProperty(
						"MasterTrackingID"), null)],
					success: function (oData) {
						sap.ui.core.UIComponent.getRouterFor(that).navTo("NoData", {}, true);
						oModel.oData[sContextPath.substring(1)] = oData.results[0];
						sap.ui.core.UIComponent.getRouterFor(that).navTo("detail", {
							from: "master",
							contextPath: oSelectedItem.getBindingContext().getPath().substr(1)
						}, true);
					},
					error: function (oData) {
						jQuery.sap.require("sap.ca.ui.message.message");
						sap.ca.ui.message.showMessageBox({
							type: sap.ca.ui.message.Type.ERROR,
							message: jQuery.sap.parseJS(oData.response.body).error.message.value
						});

					}
				});
			} else if (oSelectedItem === null) {
				var oSelectedItemRef = sap.ui.getCore().getModel("oSelectedItemRef");
				var oSelectedItemData = oSelectedItemRef.getData();
				oModel = this.getView().getModel();
				sContextPath = oSelectedItemData.d.results;
				var oSelectedFilterRef = sap.ui.getCore().getModel("oSelectedFilterRef");
				var oSelectedFilData = oSelectedFilterRef.getData();
				var filter = oSelectedFilData.d.results;
				that = this;
				this.getView().getModel().read("FreightOrderEventHandlerOverviewS", {
					async: false,
					filters: [new sap.ui.model.Filter("ODataSearchFieldFilter", FilterOperator.EQ, filter, null)],
					success: function (oData) {
						sap.ui.core.UIComponent.getRouterFor(that).navTo("NoData", {}, true);
						oModel.oData[sContextPath] = oData.results[0];
						sap.ui.core.UIComponent.getRouterFor(that).navTo("detail", {
							from: "master",
							contextPath: sContextPath
						}, true);
					},
					error: function (oData) {
						jQuery.sap.require("sap.ca.ui.message.message");
						sap.ca.ui.message.showMessageBox({
							type: sap.ca.ui.message.Type.ERROR,
							message: jQuery.sap.parseJS(oData.response.body).error.message.value
						});

					}
				});

			}

		},

		fnBuildParamFilters: function (oURLParameter, property) {
			var paramFilter = [];
			var l;
			for (l = 0; l < oURLParameter[property].length; l++) {
				if (oURLParameter[property][l] && oURLParameter[property][l] !== "SAP_SMARTBUSINESS_NULL") {
					paramFilter.push(new sap.ui.model.Filter(property, FilterOperator.EQ, oURLParameter[property][l], null));
					if (this._oKeyValueMapping[property]) {
						this._oKeyValueMapping[property].push(oURLParameter[property][l]);
					} else {
						this._oKeyValueMapping[property] = [oURLParameter[property][l]];
					}
				}
			}
			if (paramFilter.length > 1) {
				return new sap.ui.model.Filter(paramFilter, false);
			}
			return paramFilter[0];
		},

		fnBindList: function (sSearchTerm, aArray) {
			this._aFilterArray = aArray || this._aFilterArray || [];
			var aFilters = [];
			var that = this;
			jQuery.each(this._aStaticFilters, function (index, oFilter) {
				if (that._aFilterArray.indexOf(oFilter) === -1) {
					that._aFilterArray.push(oFilter);
				}
			});

			if (sSearchTerm) {
				if (this._aFilterArray.indexOf(this._searchFilter) > -1) {
					this._aFilterArray.splice(this._aFilterArray.indexOf(this._searchFilter), 1);
				}
				var aSearch = sSearchTerm.split(',');
				var aSearchFilters = [];
				for (var i = 0; i < aSearch.length; i++) {
					if (aSearch[i] !== "") {
						aSearchFilters.push(new sap.ui.model.Filter("ODataSearchFieldFilter", FilterOperator.EQ, aSearch[i]));
					}
				}
				this._searchFilter = new sap.ui.model.Filter(aSearchFilters, false);
				this._aFilterArray.push(this._searchFilter);

				this.getView().byId("list").bindItems("/FreightOrderEventHandlerOverviewS", this._oListItemTemplate, null, this._aFilterArray);
				this.getView().byId("list").attachEventOnce("updateFinished", function () {
					this.fnSelectFirstItem();
				}, this);
				return;
			} else if (sSearchTerm === "") {
				if (this._aFilterArray.indexOf(this._searchFilter) > -1) {
					this._aFilterArray.splice(this._aFilterArray.indexOf(this._searchFilter), 1);
				}
				this._searchFilter = undefined;

				aFilters = this._aFilterArray.filter(function (oFilter) {
					return that._aStaticFilters.indexOf(oFilter) === -1;
				});

				if (aFilters.length === 0) {
					sap.ui.core.UIComponent.getRouterFor(this).navTo("NoData", {}, true);
					this.getView().getContent()[0].setTitle(this.getOwnerComponent().getResourceBundle().getText("MASTER_TITLE_NO_COUNT"));
					this.getView().byId("list").unbindItems();
					return;
				}

				this.getView().byId("list").bindItems("/FreightOrderEventHandlerOverviewS", this._oListItemTemplate, null, aFilters);
				this.getView().byId("list").attachEventOnce("updateFinished", function () {
					this.fnSelectFirstItem();
				}, this);
				return;
			}

			if (this._searchFilter && this._aFilterArray.indexOf(this._searchFilter) === -1) {
				this._aFilterArray.push(this._searchFilter);
			}

			aFilters = this._aFilterArray.filter(function (oFilter) {
				return that._aStaticFilters.indexOf(oFilter) === -1;
			});

			if (aFilters.length === 0) {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("NoData", {}, true);
				this.getView().getContent()[0].setTitle(this.getOwnerComponent().getResourceBundle().getText("MASTER_TITLE_NO_COUNT"));
				this.getView().byId("list").unbindItems();
				return;
			}

			this.getView().byId("list").bindItems("/FreightOrderEventHandlerOverviewS", this._oListItemTemplate, null, this._aFilterArray);
			this.getView().byId("list").attachEventOnce("updateFinished", function () {
				this.fnSelectFirstItem();
			}, this);
		},

		fnSelectFirstItem: function () {
			if (this.getView().byId("list").getItems().length !== 0) {
				this.getView().byId("list").fireSelectionChange({
					listItem: this.getView().byId("list").getItems()[0]
				});
				this.getView().byId("list").setSelectedItem(this.getView().byId("list").getItems()[0]);
				this.getView().getContent()[0].setTitle(this.getOwnerComponent().getResourceBundle().getText("MASTER_TITLE", [this.getView().byId(
					"list").getBinding("items").getLength()]));
			} else {
				sap.ui.core.UIComponent.getRouterFor(this).navTo("NoData", {}, true);
				this.getView().byId("list").unbindItems();
				this.getView().getContent()[0].setTitle(this.getOwnerComponent().getResourceBundle().getText("MASTER_TITLE_NO_COUNT"));
			}
		},

		onAfterRendering: function () {
			if (this._error) {
				jQuery.sap.require("sap.ca.ui.message.message");
				sap.ca.ui.message.showMessageBox({
					type: sap.ca.ui.message.Type.ERROR,
					message: this.getOwnerComponent().getResourceBundle().getText("MSG_FILTER") + " " +
						this._wrongProperty + " " +
						this.getOwnerComponent().getResourceBundle().getText("MSG_ERROR_FILTER")
				});
			}
		},

		handleSearch: function () {
			sap.ui.core.UIComponent.getRouterFor(this).navTo("", {}, true);
			var searchString = this.getView().byId("searchField").getValue();
			this.fnBindList(searchString);
		},

		handleSelect: function (oEvent) {
			var oListItem = oEvent.getParameter("listItem") || oEvent.getSource();
			var oSelectedItemRef = new sap.ui.model.json.JSONModel({
				"d": {
					"results": oListItem.getBindingContext().getPath().substr(1)
				}
			});
			sap.ui.getCore().setModel(oSelectedItemRef, "oSelectedItemRef");

			var oSelectedFilterRef = new sap.ui.model.json.JSONModel({
				"d": {
					"results": oListItem.getBindingContext().getProperty("MasterTrackingID")
				}
			});
			sap.ui.getCore().setModel(oSelectedFilterRef, "oSelectedFilterRef");

			// trigger routing to BindingPath of this ListItem - this will update the data on the detail page
			sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
				from: "master",
				contextPath: oListItem.getBindingContext().getPath().substr(1)
			}, true);
		},

		_fnBuildEHOElementsArray: function () {
			var aWhiteList = [];
			aWhiteList.push("EventHandlerUUID");
			aWhiteList.push("MasterTrackingIDType");
			aWhiteList.push("MasterTrackingID");
			aWhiteList.push("SourceLocationCityName");
			aWhiteList.push("DestinationLocationCityName");
			aWhiteList.push("TransportationOrder");
			aWhiteList.push("CarrierDescription");
			aWhiteList.push("Carrier");
			aWhiteList.push("TransportationModeCategory");
			aWhiteList.push("CurrentDelayInHoursVS");
			aWhiteList.push("CurrentDelayInHours");
			aWhiteList.push("DeliveryStatusVS");
			aWhiteList.push("DeliveryStatus");
			aWhiteList.push("ODataSearchFieldFilter");
			aWhiteList.push("VehicleResourceIDFlt");
			aWhiteList.push("CarrierFilter");
			aWhiteList.push("TransportationStatusFilter");
			aWhiteList.push("TransportationModeFilter");
			aWhiteList.push("TransportationPhaseFilter");
			aWhiteList.push("TransportationOrderCategoryFilter");
			aWhiteList.push("SourceLocationFilter");
			aWhiteList.push("SourceLocationCityNameFilter");
			aWhiteList.push("SourceLocationCountryFilter");
			aWhiteList.push("ShippingTypeFilter");
			aWhiteList.push("TransportationModeCategoryFilter");
			aWhiteList.push("EventHandlerIsActiveFilter");
			aWhiteList.push("DestinationLocationCountryFilter");
			aWhiteList.push("DestinationLocationFilter");
			aWhiteList.push("DestinationLocationCityNameFilter");
			aWhiteList.push("DeliveryStatusFilter");
			aWhiteList.push("EventStatusFilter");
			aWhiteList.push("EventLocationFilter");
			aWhiteList.push("EventCodeFilter");
			aWhiteList.push("EventLocationCountryFilter");
			aWhiteList.push("P_TimeZoneFilter");
			aWhiteList.push("P_CalendarTimeFrameFilter");
			aWhiteList.push("NumberOfAssignedFreightUnits");
			aWhiteList.push("NumberOfRelatedSalesOrders");

			return aWhiteList;
		},

		onFilterButtonPress: function () {
			var that = this;
			this.getView().byId("FilterCategoryList").getItems().forEach(function (element, index, array) {
				for (var sSelectionFieldProperty in that._oKeyValueMapping) {
					if (sSelectionFieldProperty === that.getView().byId("FilterCategoryList").getItems()[index].getAggregation("customData")[0].getProperty(
							"value")) {
						if (that._oKeyValueMapping[sSelectionFieldProperty]) {
							array[index].setCounter(that._oKeyValueMapping[sSelectionFieldProperty].length);
						} else {
							array[index].setCounter(0);
						}
					}
				}
			});
			this.getView().byId("FilterDialog").open();
		},

		onFilterCategoryPress: function (oEvent) {
			var sEntityType = oEvent.getSource().getCustomData()[1].getValue();
			var sSelectionFieldProperty = this.getView().getModel().getProperty("/#" + sEntityType.substring(0, sEntityType.length - 1) +
				"/Identifier/@sap:emSelectionFieldProperty");
			var bSingle = oEvent.getSource().getCustomData()[2].getValue();
			var sCategoryLabel = this.getView().getModel().getProperty("/#" + sEntityType.substring(0, sEntityType.length - 1) +
				"/Identifier/@sap:label");
			var oFilterValueDialog = this._getValueDialog(true);
			oFilterValueDialog.getCustomData()[0].setValue(sSelectionFieldProperty);
			oFilterValueDialog.setModel(this.getView().getModel("i18n"), "i18n");
			oFilterValueDialog.setModel(this.getView().getModel("device"), "device");
			oFilterValueDialog.setModel(this.getView().getModel());

			oFilterValueDialog.getCustomHeader().getContentMiddle()[0].setText(this.getOwnerComponent().getResourceBundle().getText(
				"FILTER_VALUE_TITLE", [sCategoryLabel]));
			oFilterValueDialog.getSubHeader().getContentMiddle()[0].setPlaceholder(this.getOwnerComponent().getResourceBundle().getText(
				"FILTER_VALUE_SEARCH_PLACEHOLDER", [sCategoryLabel]));
			var oItemTemplate = oFilterValueDialog.getContent()[0].getItems()[0].clone();

			var oChoiceControl;
			if (bSingle === "true") {
				oChoiceControl = new sap.m.RadioButton({
					groupName: sEntityType
				});
			} else {
				oChoiceControl = new sap.m.CheckBox();
			}
			oChoiceControl.attachSelect(this.onValueSelect, this);
			oItemTemplate.addContent(oChoiceControl);

			oFilterValueDialog.getContent()[0].bindItems("/" + sEntityType, oItemTemplate, null, null);
			oFilterValueDialog.open();
		},

		onValueSelect: function (oEvent) {
			var sSelectionFieldProperty = this._getValueDialog().getCustomData()[0].getValue();
			if (oEvent.getSource().getMetadata().getName() === "sap.m.RadioButton" || !this._oKeyValueMapping[sSelectionFieldProperty]) {
				this._aFilterValues = [];
			} else {
				this._aFilterValues = this._oKeyValueMapping[sSelectionFieldProperty];
			}

			if (oEvent.getSource().getSelected()) {
				this._aFilterValues.push(oEvent.getSource().getParent().getBindingContext().getProperty("Identifier"));
			} else {
				this._aFilterValues.splice(this._aFilterValues.indexOf(oEvent.getSource().getParent().getBindingContext().getProperty("Identifier")),
					1);
			}

			if (this._aFilterValues.length === 0) {
				oEvent.getSource().getParent().getParent().getParent().getButtons()[0].setEnabled(false);
				if (this._getValueDialog().getButtons()[0].getPressed()) {
					this._getValueDialog().getButtons()[0].setPressed(false);
					var aFilters = [];
					aFilters = oEvent.getSource().getParent().getParent().getBinding("items").aFilters;
					aFilters = aFilters.filter(function (oFilter) {
						return oFilter.sPath === "Description";
					});
					oEvent.getSource().getParent().getParent().getBinding("items").filter(aFilters);
				}
			} else {
				this._getValueDialog().getButtons()[0].setEnabled(true);
			}
			this._oKeyValueMapping[sSelectionFieldProperty] = this._aFilterValues.slice();

			if (this.getView().byId("filterVariantManagement")) {
				for (var oVariant in this._oVariants) {
					if (this._oVariants.hasOwnProperty(oVariant)) {
						if (JSON.stringify(this._oKeyValueMapping) === JSON.stringify(oVariant)) {
							return;
						}
					}
				}
				this.getView().byId("filterVariantManagement").currentVariantSetModified(true);
			}
		},

		onDialogCancelButtonPress: function (oEvent) {
			this._getValueDialog().close();
			this.resetTmpKeyValueMapping();
		},

		resetTmpKeyValueMapping: function () {
			if (this._oTmpKeyValueMapping) {
				this._oKeyValueMapping = jQuery.extend({}, this._oTmpKeyValueMapping);
			}
		},

		onCategoryDialogCancelButtonPress: function () {
			this.getView().byId("FilterDialog").close();
			this.resetTmpKeyValueMapping();
		},

		onShowSelectedCheck: function (oEvent) {
			var oList = this._getValueDialog().getContent()[0];
			var sSelectionFieldProperty = this._getValueDialog().getCustomData()[0].getValue();
			var aSelectedKeys = this._oKeyValueMapping[sSelectionFieldProperty];

			var aFilters = [];

			aFilters = this._getValueDialog().getContent()[0].getBinding("items").aFilters;

			if (oEvent.getSource().getProperty("pressed")) {
				for (var i = 0; i < aSelectedKeys.length; i++) {
					var oIDFilter = new sap.ui.model.Filter("Identifier", FilterOperator.EQ, aSelectedKeys[i], null);
					aFilters.push(oIDFilter);
				}
			} else {
				aFilters = aFilters.filter(function (oFilter) {
					return oFilter.sPath === "Description";
				});
			}

			oList.getBinding("items").filter(aFilters);
		},

		onValueDialogOKButtonPress: function (oEvent) {
			var sSelectionFieldProperty = this._getValueDialog().getCustomData()[0].getValue();
			var that = this;
			this.getView().byId("FilterCategoryList").getItems().forEach(function (element, index, array) {
				if (sSelectionFieldProperty === that.getView().byId("FilterCategoryList").getItems()[index].getAggregation("customData")[0].getProperty(
						"value")) {
					if (that._oKeyValueMapping[sSelectionFieldProperty]) {
						array[index].setCounter(that._oKeyValueMapping[sSelectionFieldProperty].length);
					} else {
						array[index].setCounter(0);
					}
				}
			});
			this._aFilterValues = [];
			this._oTmpKeyValueMapping = jQuery.extend({}, this._oKeyValueMapping);
			this._getValueDialog().close();
		},

		onFilterValueListUpdateFinished: function (oEvent) {
			var aListItems = oEvent.getSource().getItems();

			if (aListItems.length > 0) {
				var aSelected = this._oKeyValueMapping[oEvent.getSource().getParent().getCustomData()[0].getValue()];
				oEvent.getSource().getParent().getButtons()[0].setEnabled(true);
				if (aSelected) {
					for (var i = 0; i < aListItems.length; i++) {
						var sListItemValue = aListItems[i].getBindingContext().getProperty("Identifier");
						if (aSelected.indexOf(sListItemValue) !== -1) {
							aListItems[i].getContent()[0].setSelected(true);
						}
					}
				}
			}
		},

		onValueDialogRefreshPress: function () {
			var sSelectionFieldProperty = this._getValueDialog().getCustomData()[0].getValue();
			this._getValueDialog().getButtons()[0].setEnabled(false);
			this._getValueDialog().getButtons()[0].setPressed(false);
			this._getValueDialog().getSubHeader().getContentMiddle()[0].setValue("");

			delete this._oKeyValueMapping[sSelectionFieldProperty];
			var aFilterListItems = this._getValueDialog().getContent()[0].getItems();
			for (var i = 0; i < aFilterListItems.length; i++) {
				aFilterListItems[i].getContent()[0].setSelected(false);
			}

			this._aFilterValues = [];
			this._getValueDialog().getContent()[0].getBinding("items").filter();
		},

		onValueDialogSearch: function (oEvent) {
			var oList = oEvent.getSource().getParent().getParent().getContent()[0];
			var aFilters = oList.getBinding("items").aFilters;
			if (oEvent.getParameter("query")) {
				if (aFilters.length !== 0) {
					aFilters.splice(aFilters.indexOf(aFilters.filter(function (element) {
						return element.sPath === "Description";
					})), 1);
				}
				var oFilter = new sap.ui.model.Filter("Description", FilterOperator.Contains, oEvent.getParameter("query"), null);
				aFilters.push(oFilter);
			} else {
				aFilters = aFilters.filter(function (element) {
					return element.sPath !== "Description";
				});
			}
			oList.getBinding("items").filter(aFilters);
		},

		onFilterCategoryRefresh: function () {
			this._oTmpKeyValueMapping = jQuery.extend({}, this._oKeyValueMapping);
			this._oKeyValueMapping = {};

			this.getView().byId("FilterCategoryList").getItems().forEach(function (element, index, array) {
				array[index].setCounter(0);
			});
		},

		onFilterCategoryDialogOKButton: function (oEvent, sDefaultKey) {
			var aFilters = [];
			var key;
			var fnFilterFunction = function (element) {
				var oFilter = new sap.ui.model.Filter(key, FilterOperator.EQ, element, null);
				aFilters.push(oFilter);
			};

			var aKeys = [];
			for (key in this._oKeyValueMapping) {
				if (this._oKeyValueMapping.hasOwnProperty(key) && this._oKeyValueMapping[key].length !== 0) {
					if (key === "@key") {
						continue;
					}
					this._oKeyValueMapping[key].forEach(fnFilterFunction);
					aKeys.push(key);
				}
			}

			var oInfoToolbar = this.getView().byId("listInfoToolbar");
			if (aFilters.length !== 0) {
				var oVariantManagement = this.getView().byId("filterVariantManagement");
				oInfoToolbar.setVisible(true);
				if (this.getView().byId("searchField").getValue()) {
					var aSearch = this.getView().byId("searchField").getValue().split(',');
					var aSearchFilters = [];
					for (var i = 0; i < aSearch.length; i++) {
						if (aSearch[i] !== "") {
							aSearchFilters.push(new sap.ui.model.Filter("ODataSearchFieldFilter", FilterOperator.EQ, aSearch[i]));
						}
					}
					this._searchFilter = new sap.ui.model.Filter(aSearchFilters, false);
					aFilters.push(this._searchFilter);
				} else {
					this._searchFilter = undefined;
				}
				this.fnBindList(undefined, aFilters);
				var sKey;
				if (sDefaultKey) {
					sKey = sDefaultKey;
				} else {
					sKey = oVariantManagement.getSelectionKey();
				}
				var sText;
				if (sKey !== null && sKey !== "*standard*") {
					var aVariants = oVariantManagement.getVariantItems().filter(function (oVariantItem) {
						return oVariantItem.getKey() === sKey;
					});
					if (aVariants.length !== 0) {
						sText = this.getOwnerComponent().getResourceBundle().getText("INFO_TEXT", [aVariants[0].getText()]);
					} else {
						aVariants = oVariantManagement.getItems().filter(function (oVariantItem) {
							return oVariantItem.getKey() === sKey;
						});
						if (aVariants.length !== 0) {
							sText = this.getOwnerComponent().getResourceBundle().getText("INFO_TEXT", [aVariants[0].getText()]);
						}
					}
				} else {
					var aListItems = this.getView().byId("FilterDialog").getContent()[0].getItems();
					var aCategories = [];

					aListItems.forEach(function (oListItem) {
						if (aKeys.indexOf(oListItem.getCustomData()[0].getValue()) !== -1) {
							aCategories.push(oListItem.getTitle());
						}
					});

					if (aCategories.length === 1) {
						sText = this.getOwnerComponent().getResourceBundle().getText("INFO_TEXT", aCategories);
					} else {
						sText = this.getOwnerComponent().getResourceBundle().getText("INFO_TEXT_MULTIPLE");
					}
				}
				oInfoToolbar.getContent()[0].setText(sText);
				oInfoToolbar.setVisible(true);
			} else {
				if (this._aFilterArray) {
					this._aFilterArray = this._aFilterArray.filter(function (oFilter) {
						return oFilter.sPath === "ODataSearchFieldFilter";
					});

					this.fnBindList(undefined, this._aFilterArray);
				}
				oInfoToolbar.setVisible(false);
			}
			this._oTmpKeyValueMapping = undefined;
			this.getView().byId("FilterDialog").close();
		},

		onVariantSelect: function (oEvent) {
			var that = this;
			var prop;
			var oUnreferencedObject = {};
			var length;

			this.getView().byId("FilterCategoryList").getItems().forEach(function (element, index) {
				that.getView().byId("FilterCategoryList").getItems()[index].setCounter(0);
			});

			var fnSetCounterFilterListItems = function (element, index) {
				if (prop === that.getView().byId("FilterCategoryList").getItems()[index].getAggregation("customData")[0].getProperty("value")) {
					that.getView().byId("FilterCategoryList").getItems()[index].setCounter(length);
				}
			};

			for (var sVariantName in this._oVariants) {
				if (this._oVariants.hasOwnProperty(sVariantName) && this._oVariants[sVariantName]["@key"] === oEvent.getParameter("key")) {
					for (prop in this._oVariants[sVariantName]) {
						if (this._oVariants[sVariantName].hasOwnProperty(prop)) {
							if (prop === "@key") {
								continue;
							}
							length = this._oVariants[sVariantName][prop].length;
							this.getView().byId("FilterCategoryList").getItems().forEach(fnSetCounterFilterListItems);
						}
					}
					jQuery.extend(oUnreferencedObject, this._oVariants[sVariantName]);
					break;
				}
			}
			this._oKeyValueMapping = oUnreferencedObject;
		},

		onVariantSave: function (oEvent) {
			if (oEvent.getId()) {
				var that = this;
				var sKey = oEvent.getParameter("key");
				var sName = oEvent.getParameter("name");
				var oPersonalizer = sap.ushell.Container.getService("Personalization");
				var oUnreferencedObject = {};
				jQuery.extend(oUnreferencedObject, this._oKeyValueMapping);
				this._oVariants[sName] = oUnreferencedObject;
				this._oVariants[sName]["@key"] = sKey;

				oPersonalizer.createEmptyContainer("variants", {
					validity: Infinity
				}, this.getOwnerComponent()).then(function (oContainer) {
					oContainer.setItemValue("variantKey", that._oVariants);
					if (that.getView().byId("filterVariantManagement").getDefaultVariantKey() !== "*standard*") {
						oContainer.setItemValue("defaultVariant", that.getView().byId("filterVariantManagement").getDefaultVariantKey());
					}
					oContainer.save();
				});
			}
		},

		onVariantManage: function (oEvent) {
			var that = this;
			var oPersonalizer = sap.ushell.Container.getService("Personalization");
			var newVariants = {};
			var oVariant;
			var fnFindRenamed = function (oRenamed) {
				if (oRenamed.key === that._oVariants[oVariant]["@key"]) {
					newVariants[oRenamed.name] = that._oVariants[oVariant];
				}
			};
			var aRenamedKeys = [];
			oEvent.getParameter("renamed").forEach(function (oKeyValue) {
				aRenamedKeys.push(oKeyValue.key);
			});
			for (oVariant in this._oVariants) {
				if (oEvent.getParameter("deleted").indexOf(this._oVariants[oVariant]["@key"]) !== -1) {
					continue;
				}
				if (aRenamedKeys.indexOf(this._oVariants[oVariant]["@key"]) !== -1) {
					oEvent.getParameter("renamed").forEach(fnFindRenamed);
				} else {
					newVariants[oVariant] = this._oVariants[oVariant];
				}
			}
			this._oVariants = jQuery.extend({}, newVariants);
			oPersonalizer.createEmptyContainer("variants", {
				validity: Infinity
			}, this.getOwnerComponent()).then(function (oContainer) {
				oContainer.setItemValue("variantKey", that._oVariants);
				if (oEvent.getParameter("def") && oEvent.getParameter("def") !== "*standard*") {
					oContainer.setItemValue("defaultVariant", oEvent.getParameter("def"));
				}
				oContainer.save();
			});
		}
	});
});