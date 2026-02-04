// components/CustomHeader.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Back } from '../../themes/images';
import { Colors } from '../../themes/color';
const { width } = Dimensions.get('window');



interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ title, showBackButton = true }) => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.header}>
      {showBackButton && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
         <Image source={Back} style={styles.icon} />
        </TouchableOpacity>
      )}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

export default CustomHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',

  },
  icon:{
    height:width>600?30:24,
    width:width>600?30:24,
    tintColor:Colors.PrimaryColor
  },

  backButton: {
    marginRight: width>600?16:6,
  },
  title: {
    fontSize: width>600?20:16,
    color:Colors.PrimaryColor,
    fontWeight: 'bold',
  },
});
