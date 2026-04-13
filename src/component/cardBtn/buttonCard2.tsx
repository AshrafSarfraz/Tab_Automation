import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  Text,
  ImageSourcePropType,
  ViewStyle,
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
  cardBodyStyle?: ViewStyle;  // ← ADD
  titleStyle?: ViewStyle;     // ← ADD
  captionStyle?: ViewStyle;   // ← ADD
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
  cardBodyStyle,   // ← ADD
  titleStyle,      // ← ADD
  captionStyle,    // ← ADD
  side = 'left',
}: Props) => {

  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, style]}>
      <View style={styles.BtnCard}>
        <View style={[styles.cardBody, { borderColor: Color }, cardBodyStyle]}>
          <Text style={[styles.title, { color: Color }, titleStyle]}>{title}</Text>
          {caption && <Text style={[styles.caption, captionStyle]}>{caption}</Text>}
          {no ? <Text style={[styles.no, { color: Color }]}>{no}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};
export default ButtonCard2;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
  },
  BtnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    // width: 50,
    // height: 50,
    zIndex: 1,
  },
  icon: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
  },
  cardBody: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 0.5,
    borderRadius: 16,
    paddingVertical: 16,
    paddingLeft: 20,
    paddingRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 5,
  },
  caption: {
    fontSize: 13,
    color: '#999',
    lineHeight: 17,
  },
  no: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
});
