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
  return (

    <TouchableOpacity style={styles.container}  onPress={onPress} >
      <View style={styles.BtnCard} >
      <View style={styles.left}>
      <Image source={icon} style={styles.icon}/>
      </View>
      
     <View style={styles.Btn_Container} >
      <View style={styles.left}>
        {/* {icon && <Image source={icon} style={styles.icon} />} */}
      </View>
      {/* CENTER */}
      <View style={styles.center}>
        <Text style={[styles.title,{ color: Color}]}>{title}</Text>
        {/* {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>} */}
        {caption && <Text style={styles.caption}>{caption}</Text>}
      </View>

      {/* RIGHT */}
      <View style={styles.right}>
        <Text style={[styles.no,{color:Color}]}>{no}</Text>
      </View>
      </View>
      </View>
    </TouchableOpacity>

  );
};

export default ButtonCard;

const styles = StyleSheet.create({
  container:{
    width:"100%",
  },
  BtnCard:{
  flexDirection:'row',
  width:"100%",
  alignItems:"center",
  },

 Btn_Container:{
  width:'90%',
  flexDirection:"row",
  alignSelf:"center",
  alignItems: 'center',
  backgroundColor:"#F5F5F5",
  paddingVertical:20,
  borderWidth:0.3,
  left:-100,
  borderRadius:50
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
  icon: {
  width:140,
   height:140,
   zIndex:1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textDecorationLine:'underline',
    textDecorationStyle:'double',
    lineHeight:22,
    marginBottom:3,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    lineHeight:18
  },
  caption: {
    fontSize: 12,
    color: '#999',
    lineHeight:16
  },
  no: {
    fontSize: 30,
    fontWeight: '700',
  },

});
