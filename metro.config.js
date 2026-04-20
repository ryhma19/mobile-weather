const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes("gpx")) {
  config.resolver.assetExts.push("gpx");
}

module.exports = config;
