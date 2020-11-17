sap.ui.define(["sap/ui/core/format/DateFormat"], function () {
	/**
	 * @class formatter
	 * Create Formatter object
	 * @public
	 */
	var _oBundle;
	var LocalDateFormatter;
	var LocalTimeFormatter;
	var EventMessageDateFormatter;
	var EventMessageTimeFormatter;
	return {

		/**
		 * @function init(oResourceBundle)
		 * Initialize bundle and some formatters
		 * @public
		 */
		test: undefined,
		init: function (oResourceBundle) {
			_oBundle = oResourceBundle;
			LocalDateFormatter = sap.ui.core.format.DateFormat.getDateInstance();
			LocalTimeFormatter = sap.ui.core.format.DateFormat.getTimeInstance();
			EventMessageDateFormatter = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyyMMdd"
			});
			EventMessageTimeFormatter = sap.ui.core.format.DateFormat.getTimeInstance({
				pattern: "hhmmss"
			});

		},

		/**
		 * @function AddressFormatter(sAddress, sAddress2)
		 * Formates an address
		 * @public
		 */
		AddressFormatter: function (sAddress, sAddress2) {
			if (sAddress && sAddress2) {
				return sAddress.replace(/\//g, "\n") + "\n" + sAddress2.replace(/\//g, "\n");
			} else if (sAddress) {
				return sAddress.replace(/\//g, "\n");
			} else if (sAddress2) {
				return sAddress2.replace(/\//g, "\n");
			}

			return "";
		},

		/**
		 * @function ObjectFormatter
		 * Formatter for description(id)
		 * @public
		 */
		ObjectFormatter: function (ID, Description) {
			if (Description) {
				if (ID) {
					return ID + " (" + Description + ")";
				}
				return Description;
			}

			if (ID) {
				return ID;
			}

			return "";
		},

		MinusFormatter: function (ID, Description) {
			if (Description) {
				if (ID) {
					return ID + " - " + Description;
				}
				return Description;
			}

			if (ID) {
				return ID;
			}

			return "";
		},

		/**
		 * @function iconFormatter(eventStatus)
		 * Formatter for icons
		 * @public
		 */
		iconFormatter: function (eventStatus) {
			switch (eventStatus) {
			case "01":
				return "accept";
			case "02":
				return "alert";
			case "03":
				return "future";
			case "04":
				return "status-inactive";
			case "05":
				return "warning2";
			case "06":
			case "07":
				return "lateness";
			default:
				return "";
			}
		},

		/**
		 * @function iconTooltipFormatter(eventStatus)
		 * tooltips for iconFormatter(eventStatus)
		 * @public
		 */
		iconTooltipFormatter: function (eventStatus) {
			var sEventStatus = "";
			switch (eventStatus) {
			case "01":
				sEventStatus = _oBundle.getText("EVENT_STATUS_REPORTED");
				break;
			case "02":
				sEventStatus = _oBundle.getText("EVENT_STATUS_OVERDUE");
				break;
			case "03":
				sEventStatus = _oBundle.getText("EVENT_STATUS_UNREP_DATE");
				break;
			case "04":
				sEventStatus = _oBundle.getText("EVENT_STATUS_UNREP");
				break;
			case "05":
				sEventStatus = _oBundle.getText("EVENT_STATUS_UNEXPECTED");
				break;
			case "06":
				sEventStatus = _oBundle.getText("EVENT_STATUS_REPORTED_EARLY");
				break;
			case "07":
				sEventStatus = _oBundle.getText("EVENT_STATUS_REPORTED_LATE");
				break;
			default:
				sEventStatus = "";
			}
			return sEventStatus;
		},

		/**
		 * @function datetimeFormatter
		 * utc fromatter for Evm-table
		 * @public
		 */
		DateTimeFormatter: function (date, timeZone) {
			if (!timeZone) {
				timeZone = "";
			}
			if (date) {
				var utcDate = new Date(date.getUTCFullYear().toString(), date.getUTCMonth().toString(), date.getUTCDate().toString(),
					date.getUTCHours().toString(), date.getUTCMinutes().toString(), date.getUTCSeconds().toString());
				return LocalDateFormatter.format(utcDate) + "\n " + LocalTimeFormatter.format(
					utcDate) + " " + timeZone;
			}
			return " ";
		},

		/**
		 * @function datetimeDialogFormatter
		 * utc fromatter for Details
		 * @public
		 */
		DateTimeDialogFormatter: function (date, timeZone) {
			if (!timeZone) {
				timeZone = "";
			}
			if (date) {
				var utcDate = new Date(date.getUTCFullYear().toString(), date.getUTCMonth().toString(), date.getUTCDate().toString(),
					date.getUTCHours().toString(), date.getUTCMinutes().toString(), date.getUTCSeconds().toString());
				return LocalDateFormatter.format(utcDate) + " " + LocalTimeFormatter.format(
					utcDate) + " " + timeZone;
			}
			return " ";
		},

		/**
		 * @function datetineFormatter
		 * FU-Tab / SO-Tab Countformatter
		 * @public
		 */
		countFormatter: function (count) {
			try {
				var newCount = parseInt(count, 10);
			} catch (e) {
				return 0;
			}
			if (newCount > 999) {
				return ">1k";
			}
			if (isNaN(newCount)) {
				return 0;
			}
			return newCount;
		},

		/**
		 * @function valueStateFormatter
		 * ReFormatter for ValueState
		 * @public
		 */
		valueStateFormatter: function (valueState) {
			if (!valueState || valueState.indexOf("ValueState") !== -1) {
				return sap.ui.core.ValueState.None;
			}

			if (valueState === "None" || valueState === "Error" || valueState === "Success" || valueState === "Warning") {
				return valueState;
			}

			return sap.ui.core.ValueState.None;
		},

		/**
		 * @function reportEventFormatter(eventStatusExtended)
		 * Function decides if event can be reported
		 * @public
		 */
		reportEventFormatter: function (eventStatusExtended) {
			if (eventStatusExtended === "05") {
				return false;
			}
			return true;
		}
	};
});