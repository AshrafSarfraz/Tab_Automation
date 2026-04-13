import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import CustomHeader from '../../../component/customHeader';
import { Colors } from '../../../themes/color';

export default function WebViewScreen({ route }) {
  const { url } = route.params;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.PrimaryColor }}>
      <View style={styles.header}>
        <CustomHeader title="Back" />
      </View>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        originWhitelist={['*']}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 0.4,
    backgroundColor:Colors.White
  },
});

// import React from 'react';
// import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
// import { WebView } from 'react-native-webview';
// import CustomHeader from '../../../component/customHeader';
// import { Colors } from '../../../themes/color';
// import Container from '../../../ui/useLayout';
// const { width } = Dimensions.get('window');


// export default function WebViewScreen({ route }) {
//   const { url } = route.params;

//   return (

//       <WebView
//         source={{ uri: url }}
//         style={{ flex: 1 }}
//         originWhitelist={['*']}
//         startInLoadingState={true}
//       />

//   );
// }

// const styles = StyleSheet.create({

//   header: {
//     borderBottomWidth: 0.4,
//   },
//   heading: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     color: Colors.PrimaryColor,
//   },
// });
