import log4js from "log4js";

log4js.configure({
	appenders: {
		renamer: {
			type: "multiFile",
			base:"logs/",
			property:"renamerName",
			extension:".log",
		},
		out:{
			type:"stdout"
		}
	},
	categories: {
		default:{
			appenders: ["out","renamer"],
			level:"info", // To debug, change to "debug"
		},
	}
});