import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
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
};

const ButtonCard = ({
  onPress,
  no,
  Color,
  title,
  subtitle,
  icon,
  caption,
  style,
}: Props) => {
  const { width } = useWindowDimensions();

  // ─────────────────────────────────────────
  //  BREAKPOINTS
  //  Tablet   → width >= 1000   (original design)
  //  Foldable → width 700–999
  //  Mobile   → width < 700
  // ─────────────────────────────────────────
  const isTablet   = width >= 1200;
  const isFoldable = width >= 800 && width < 1200;
  const isMobile   = width < 800;

  // ─────────────────────────────────────────
  //  SCALED VALUES  (tablet = original value)
  // ─────────────────────────────────────────

  // Icon
  const iconSize      = isTablet ? 150  : isFoldable ? 140  : 100;

  // Card
  const cardLeft      = isTablet ? -100 : isFoldable ? -50  : -40;
  const cardPaddingV  = isTablet ? 20   : isFoldable ? 15   : 6;
  const cardRadius    = isTablet ? 50   : isFoldable ? 40   : 20;

  // Typography
  const titleSize     = isTablet ? 16   : isFoldable ? 13   : 11;
  const titleLine     = isTablet ? 22   : isFoldable ? 18   : 15;
  const captionSize   = isTablet ? 12   : isFoldable ? 10   : 9;   // unused on mobile
  const captionLine   = isTablet ? 16   : isFoldable ? 14   : 12;
  const noSize        = isTablet ? 30   : isFoldable ? 24   : 17;

  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress}>
      <View style={styles.BtnCard}>

        {/* ── Floating Icon ── */}
        <View style={styles.left}>
          <Image
            source={icon}
            style={{ width: iconSize, height: iconSize, zIndex: 1 }}
            resizeMode="contain"
          />
        </View>

        {/* ── Card Body ── */}
        <View
          style={[
            styles.Btn_Container,
            {
              left:          cardLeft,
              paddingVertical: cardPaddingV,
              borderRadius:  cardRadius,
            },
          ]}>

          {/* spacer — keeps text clear of the overlapping icon */}
          <View style={styles.left} />

          {/* CENTER */}
          <View style={styles.center}>
            <Text
              style={[
                styles.title,
                { color: Color, fontSize: titleSize, lineHeight: titleLine },
              ]}
              numberOfLines={2}>
              {title}
            </Text>

            {/* Caption — hidden on mobile (width < 700) */}
            
              <Text
                style={[
                  styles.caption,
                  { fontSize: captionSize, lineHeight: captionLine },
                ]}
                numberOfLines={3}>
                {caption}
              </Text>
          
          </View>

          {/* RIGHT */}
          <View style={styles.right}>
            <Text style={[styles.no, { color: Color, fontSize: noSize }]}>
              {no}
            </Text>
          </View>

        </View>
      </View>
    </TouchableOpacity>
  );
};

export default ButtonCard;

// ─────────────────────────────────────────
//  STATIC STYLES  (values that never change)
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  BtnCard: {
    flexDirection: 'row',
    width: '90%',
    alignItems: 'center',
  },
  Btn_Container: {
    width: '100%',
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 0.3,
    // left, paddingVertical, borderRadius → inline (dynamic)
  },
  left: {
    width: '25%',
    alignItems: 'center',
  },
  center: {
    width: '60%',
  },
  right: {
    width: '10%',
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    textDecorationLine: 'underline',
    textDecorationStyle: 'double',
    marginBottom: 3,
    // fontSize, lineHeight → inline (dynamic)
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    lineHeight: 18,
  },
  caption: {
    color: '#999',
    // fontSize, lineHeight → inline (dynamic)
  },
  no: {
    fontWeight: '700',
    // fontSize → inline (dynamic)
  },
});
