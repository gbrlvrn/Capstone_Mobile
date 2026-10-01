const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const escapeRegex = (str) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

// Exclude project root backend/ and dist/ folders from Metro bundler
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList].filter(Boolean)),
  new RegExp(`^${escapeRegex(path.resolve(__dirname, 'backend'))}[/\\\\].*`),
  new RegExp(`^${escapeRegex(path.resolve(__dirname, 'dist'))}[/\\\\].*`),
  new RegExp(`^${escapeRegex(path.resolve(__dirname, 'dev-scripts'))}[/\\\\].*`),
  new RegExp(`^${escapeRegex(path.resolve(__dirname, 'android'))}[/\\\\].*`),
];

module.exports = config;
