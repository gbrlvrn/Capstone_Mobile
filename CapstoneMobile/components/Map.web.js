import React from 'react';
import { View, Text } from 'react-native';

export const MapView = ({ children, style }) => (
  <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e1e1e1', borderRadius: 8 }]}>
    <Text style={{ color: '#666', fontWeight: '500' }}>Interactive map not available on Web.</Text>
  </View>
);

export const Marker = () => null;
