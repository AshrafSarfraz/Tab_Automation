import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  header?: React.ReactNode;            // ✅ NEW (full width header)
  children: React.ReactNode;

  padding?: number;                    // ✅ padding only for content
  scrollable?: boolean;
  backgroundColor?: string;

  statusBarStyle?: "light-content" | "dark-content";
  statusBarColor?: string;

  keyboardAvoiding?: boolean;
};

export default function Container({
  header,
  children,
  padding = 16,
  scrollable = true,
  backgroundColor = "#f0f2f5",
  statusBarStyle = "dark-content",
  statusBarColor = "#f9f9f9",
  keyboardAvoiding = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const Wrapper = scrollable ? ScrollView : View;

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent={false}
        hidden={false}
      />

      {/* ✅ Status bar area paint */}
      <View style={{ height: insets.top, backgroundColor: statusBarColor }} />

      {/* ✅ Whole screen */}
      <View style={[styles.safe, { backgroundColor }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined}
        >
          <Wrapper
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ✅ FULL WIDTH HEADER */}
            {header ? <View style={{ width: "100%" }}>{header}</View> : null}

            {/* ✅ PADDED CONTENT */}
            <View style={{  width: "100%" }}>
              {children}
            </View>
          </Wrapper>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    width: "100%",
    backgroundColor:'#FFFFFF'
  },
});


// import React from "react";
// import {
//   View,
//   ScrollView,
//   StyleSheet,
//   StatusBar,
//   KeyboardAvoidingView,
//   Platform,
// } from "react-native";
// import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// type Props = {
//   children: React.ReactNode;
//   padding?: number;
//   scrollable?: boolean;
//   backgroundColor?: string;
//   statusBarStyle?: "light-content" | "dark-content";
//   statusBarColor?: string;
//   keyboardAvoiding?: boolean;
// };

// export default function Container({
//   children,
//   padding = 16,
//   scrollable = true,
//   backgroundColor = "#f0f2f5",
//   statusBarStyle = "dark-content",
//   statusBarColor = "#f9f9f9",
//   keyboardAvoiding = true,
// }: Props) {
//   const insets = useSafeAreaInsets();
//   const Wrapper = scrollable ? ScrollView : View;

//   return (
//     <>
//       <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarColor} translucent={false} />

//       {/* ✅ Only paints status bar area (top inset) */}
//       <View style={{ height: insets.top, backgroundColor: statusBarColor }} />

//       {/* ✅ Whole screen area */}
//       <View style={[styles.safe, { backgroundColor }]}>
//         <KeyboardAvoidingView
//           style={{ flex: 1 }}
//           behavior={keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined}
//         >
//           <Wrapper
//             contentContainerStyle={[
//               styles.scroll,
//               {
//                 paddingBottom: insets.bottom,
//               },
//             ]}
//             keyboardShouldPersistTaps="handled"
//             showsVerticalScrollIndicator={false}
//             bounces={false}
//           >
//             {children}
//           </Wrapper>
//         </KeyboardAvoidingView>
//       </View>
//     </>
//   );
// }

// const styles = StyleSheet.create({
//   safe: { flex: 1 },
//   scroll: { flexGrow: 1 },
// });
