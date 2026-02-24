import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import CustomHeader from '../../../component/customHeader';
import { Colors } from '../../../themes/color';
const { width } = Dimensions.get('window');


export default function WebViewScreen({ route }) {
  const { url } = route.params;

  return (
    <View style={styles.container}>
     <View style={styles.header}>
        <CustomHeader title="Back" />
      </View>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        startInLoadingState={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor:Colors.White
  },
  header: {
    borderBottomWidth: 0.4,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.PrimaryColor,
  },
});
