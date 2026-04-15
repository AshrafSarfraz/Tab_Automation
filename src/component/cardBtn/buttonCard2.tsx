import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ImageSourcePropType,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

type Props = {
  onPress: () => void;
  no: string | number;
  Color: string;
  icon?: ImageSourcePropType;
  title: string;
  subtitle?: string;
  caption?: string;
  style?: ViewStyle;
  cardBodyStyle?: ViewStyle;
  titleStyle?: ViewStyle;
  captionStyle?: ViewStyle;
  side?: 'left' | 'right';
};

const ButtonCard2 = ({
  onPress,
  no,
  Color,
  title,
  subtitle,
  icon,
  caption,
  style,
  cardBodyStyle,
  titleStyle,
  captionStyle,
  side = 'left',
}: Props) => {
  const { width } = useWindowDimensions();

  // ─────────────────────────────────────
  //  BREAKPOINTS
  //  Tablet   → width >= 1000  (original)
  //  Foldable → width 700–999
  //  Mobile   → width < 700
  // ─────────────────────────────────────
  const isTablet   = width >= 1000;
  const isFoldable = width >= 800 && width < 1000;
  const isMobile   = width < 800;

  // ─────────────────────────────────────
  //  SCALED VALUES  (tablet = original)
  // ─────────────────────────────────────
  const marginV      = isTablet ? 12  : isFoldable ? 8   : 5;
  const borderRadius = isTablet ? 16  : isFoldable ? 14  : 12;
  const paddingV     = isTablet ? 16  : isFoldable ? 12  : 10;
  const paddingL     = isTablet ? 20  : isFoldable ? 16  : 12;
  const paddingR     = isTablet ? 10  : isFoldable ? 8   : 6;

  const titleSize    = isTablet ? 17  : isFoldable ? 14  : 12;
  const titleLine    = isTablet ? 24  : isFoldable ? 20  : 16;
  const titleMB      = isTablet ? 5   : isFoldable ? 3   : 2;

  const captionSize  = isTablet ? 13  : isFoldable ? 9  : 7;
  const captionLine  = isTablet ? 17  : isFoldable ? 14  : 10;




  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { marginVertical: marginV }, style]}>
      <View style={styles.BtnCard}>
        <View
          style={[
            styles.cardBody,
            {
              borderColor:    Color,
              borderRadius,
              paddingVertical: paddingV,
              paddingLeft:     paddingL,
              paddingRight:    paddingR,
            },
            cardBodyStyle,
          ]}>

          <Text
            style={[
              styles.title,
              { color: Color, fontSize: titleSize, lineHeight: titleLine, marginBottom: titleMB },
              titleStyle,
            ]}>
            {title}
          </Text>

          {/* Caption — hidden on mobile */}

            <Text
              style={[
                styles.caption,
                { fontSize: captionSize, lineHeight: captionLine },
                captionStyle,
              ]}
              numberOfLines={3}>
              {caption}
            </Text>
         

         

        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ButtonCard2;

// ─────────────────────────────────────
//  STATIC STYLES
// ─────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: '100%',
    // marginVertical → inline (dynamic)
  },
  BtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  cardBody: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 0.5,
    // borderRadius, padding → inline (dynamic)
  },
  title: {
    fontWeight: '700',
    // fontSize, lineHeight, marginBottom → inline (dynamic)
  },
  caption: {
    color: '#999',
    // fontSize, lineHeight → inline (dynamic)
  },
  no: {
    fontWeight: '700',
    // fontSize, marginTop → inline (dynamic)
  },
});





// import React from 'react';
// import {
//   StyleSheet,
//   TouchableOpacity,
//   View,
//   Image,
//   Text,
//   ImageSourcePropType,
//   ViewStyle,
// } from 'react-native';

// type Props = {
//   onPress: () => void;
//   no: string | number;
//   Color: string;
//   icon?: ImageSourcePropType;
//   title: string;
//   subtitle?: string;
//   caption?: string;
//   style?: ViewStyle;
//   cardBodyStyle?: ViewStyle;  // ← ADD
//   titleStyle?: ViewStyle;     // ← ADD
//   captionStyle?: ViewStyle;   // ← ADD
//   side?: 'left' | 'right';
// };

// const ButtonCard2 = ({
//   onPress,
//   no,
//   Color,
//   title,
//   subtitle,
//   icon,
//   caption,
//   style,
//   cardBodyStyle,   // ← ADD
//   titleStyle,      // ← ADD
//   captionStyle,    // ← ADD
//   side = 'left',
// }: Props) => {

//   return (
//     <TouchableOpacity onPress={onPress} style={[styles.container, style]}>
//       <View style={styles.BtnCard}>
//         <View style={[styles.cardBody, { borderColor: Color }, cardBodyStyle]}>
//           <Text style={[styles.title, { color: Color }, titleStyle]}>{title}</Text>
//           {caption && <Text style={[styles.caption, captionStyle]}>{caption}</Text>}
//           {no ? <Text style={[styles.no, { color: Color }]}>{no}</Text> : null}
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// };
// export default ButtonCard2;

// const styles = StyleSheet.create({
//   container: {
//     width: '100%',
//     marginVertical: 12,
//   },
//   BtnCard: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     width: '100%',
//   },
//   iconWrap: {
//     // width: 50,
//     // height: 50,
//     zIndex: 1,
//   },
//   icon: {
//     width: 110,
//     height: 110,
//     resizeMode: 'contain',
//   },
//   cardBody: {
//     flex: 1,
//     backgroundColor: '#F5F5F5',
//     borderWidth: 0.5,
//     borderRadius: 16,
//     paddingVertical: 16,
//     paddingLeft: 20,
//     paddingRight: 10,
//   },
//   title: {
//     fontSize: 17,
//     fontWeight: '700',
//     lineHeight: 24,
//     marginBottom: 5,
//   },
//   caption: {
//     fontSize: 13,
//     color: '#999',
//     lineHeight: 17,
//   },
//   no: {
//     fontSize: 20,
//     fontWeight: '700',
//     marginTop: 4,
//   },
// });
