// components/CustomHeader.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Back } from '../../themes/images';

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
         <Image source={Back} style={{width:30,  height:30,tintColor:'black' }} />
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
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    color: 'black',
    fontWeight: 'bold',
  },
});
