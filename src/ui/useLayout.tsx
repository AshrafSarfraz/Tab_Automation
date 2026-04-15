import React from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  header?: React.ReactNode;
  children: React.ReactNode;
  padding?: number;
  backgroundColor?: string;
  statusBarStyle?: "light-content" | "dark-content";
  statusBarColor?: string;
  keyboardAvoiding?: boolean;
};

export default function Container({
  header,
  children,
  padding = 16,
  backgroundColor = "#f0f2f5",
  statusBarStyle = "dark-content",
  statusBarColor = "#f9f9f9",
  keyboardAvoiding = true,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarColor}
        translucent={false}
        hidden={false}
      />

      {/* Status bar area */}
      <View style={{ height: insets.top, backgroundColor: statusBarColor }} />

      {/* Whole screen */}
      <View style={[styles.safe, { backgroundColor }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={keyboardAvoiding && Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.inner, { paddingBottom: insets.bottom }]}>

            {/* Full width header */}
            {header ? <View style={{ width: "100%" }}>{header}</View> : null}

            {/* Content */}
            <View style={{ width: "100%", flex: 1 }}>
              {children}
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: {
    flex: 1,
    width: "100%",
    backgroundColor: "#FFFFFF",
  },
});
