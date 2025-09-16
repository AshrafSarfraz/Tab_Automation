import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ImageBackground, Dimensions, StyleSheet, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../../themes/color';




const images = [
  { id: '1', text: 'West Walk Real Estate', category: 'West Walk Real Estate'},
  { id: '2', text: 'Assets Services Company', category: 'Assets Services Company' },
  { id: '3', text: 'West Walk Advertisement', category: 'West Walk Advertisement' },
  { id: '5', text: 'West Walk Group', category: 'West Walk Group'},

];


type CategoriesProps={
  navigation: any
  
}

const Companies:React.FC<CategoriesProps> = () => {
  const navigation=useNavigation()
  const [currentIndex, setCurrentIndex] = useState(0);


  return (
    <View style={styles.container}>
      {/* Image Slider */}
      <FlatList
        data={images}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity  style={styles.Flatlist_Cont} onPress={() => navigation.navigate('CategoriesScreen', { item })}>
            <Text style={styles.Txt} >{item.category}</Text>
          </TouchableOpacity>
        )}
      />

    
    </View>
  );
};

export default Companies;



const styles=StyleSheet.create({
    container: {


      marginHorizontal:"3%",
      marginTop:4,
    },
    Flatlist_Cont:{
      alignItems:'center',
      marginBottom:8,
      backgroundColor:'#31368A',
      height:120,
      justifyContent:"center",
      borderRadius:10

    },

    cate_txt:{
      fontSize:12,
      marginTop:10,
      lineHeight:16,
      letterSpacing:0.3
    },
    Txt:{
      color:'#ffffff',
      fontWeight:"bold",
      textAlign:"center",
      lineHeight:14,
 
      alignSelf:"center"
    }
  });
  
