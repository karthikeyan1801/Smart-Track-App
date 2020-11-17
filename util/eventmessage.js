sap.ui.define(["SmartTrack/util/parameter"], function () {
	return {
		EventMessage: function () {
			this.EventCounter = "1";
			this.EventCode = "";
			this.TrackingIDType = "";
			this.TrackingID = "";
			this.EventDateTime = "";
			this.EventDate = "";
			this.EventTime = "";
			this.EventTimeZone = "";
			this.EventReasonText = "";
			this.EventMessageSourceType = "I";
			this.ToEventMessageParameter = [];
			this.ToEventMessageLocation = [{
				EventCounter: "1",
				EventLocation: ""
			}];
		}
	};
});