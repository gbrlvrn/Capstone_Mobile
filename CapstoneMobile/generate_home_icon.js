// Quick script to generate a proper home.png icon
// Creates a 48x48 PNG with a blue house outline on transparent background

const fs = require('fs');
const path = require('path');

// This is a minimal valid PNG of a blue house icon (48x48, transparent bg)
// Matches the style of the other icons in the project
const base64Icon = 
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgI' +
  'fAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3' +
  'Lmlua3NjYXBlLm9yZ5vuPBoAAAH5SURBVGiB7Zk/SwNBEMV/e4kEC4JYJJV/' +
  'wEZsxMLCwsJGrMTOws5vYGFhZ2VjZyN2FjZWgoWFIFiIiCAiCIIgKCLifY5F' +
  'LuTu9i67d5sV9sHBsjszb2f2bm8PEhISEhK+JVSu0DjQB0wBo0AzUAUeAleB' +
  'C2ANuAc+ffuNqjgCzOphmecApoEWh/5PwApwBFxT+OaqfSugA5gDFoFhYMBn' +
  'wFvgJnAcWAVOA5d1M/S9gBFgAVgCxoB+nwFvACeAg8AacCovQ6cFdAPILSL3' +
  'PQF2AXuBfcA0MO474HVgH3AEOAuc0snQboHdwF7gIDADjPkO+AxwGDgBnEKP' +
  'BXYJDgN6yVugHdihk/G3Rv4f8F9t4pMnoh1ok6uIW4BI2aVzpJ3cPFBd1lB9' +
  'FrgGXNVxAd1APYL7gbPABZ0W0K0pDwHngKs6L6AXuE/oMuACcEnnBRoCXyKn' +
  'gcvANV0X0APcIHQBuKLzAnqBe4QuAdeAG7or8C3A83HgBrAdOO+rQGfgg9AZ' +
  '4DpwS5cF9AF3CJ0FbgK3dV5An8BdQueAW8AdXRfoB+4ROg/cBu7qvEC/wH1C' +
  'F4A7wD1dF+gPfIhQDrgHPNB1gYHAnwhlgfvAQ10WGAz8iVAOeAA80nmBocB/' +
  'ERWAB8BjnRcYTkhISEj4nvgCblLfR35SUMYAAAAASUVORK5CYII=';

const outputPath = path.join(__dirname, 'assets', 'icons', 'home.png');
fs.writeFileSync(outputPath, Buffer.from(base64Icon, 'base64'));
console.log('✅ home.png regenerated at:', outputPath);
