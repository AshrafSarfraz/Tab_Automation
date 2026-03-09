import React from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import CustomHeader from '../../../component/customHeader';
import { Colors } from '../../../themes/color';
import Container from '../../../ui/useLayout';
const { width } = Dimensions.get('window');


export default function WebViewScreen({ route }) {
  const { url } = route.params;

  return (
    <Container statusBarColor={Colors.PrimaryColor} statusBarStyle="light-content">
     <View style={styles.header}>
        <CustomHeader title="Back" />
      </View>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        startInLoadingState={true}
      />
    </Container>
  );
}

const styles = StyleSheet.create({

  header: {
    borderBottomWidth: 0.4,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.PrimaryColor,
  },
});
