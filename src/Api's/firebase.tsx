import React, { useEffect, useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import firestore from '@react-native-firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'BUDGETED_CURR_DATA'

const Screen = () => {
  const [data, setData] = useState<any[]>([])

  // 🔹 get data from local storage first
  const getLocalData = async () => {
    const local = await AsyncStorage.getItem(STORAGE_KEY)
    if (local) {
      setData(JSON.parse(local))
    }
  }

  // 🔹 get data from firebase & store locally
  const getAllData = async () => {
    try {
      const snap = await firestore()
        .collection('Budgeted_Data')
        .where('docType', '==', 'CURR')
        .get()

      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      // ✅ save to local storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list))

      setData(list)
    } catch (e) {
      console.log('Firestore Error:', e)
    }
  }

  useEffect(() => {
    getLocalData()   // 👈 show cached data instantly
    getAllData()     // 👈 update from firebase
  }, [])

  return (
    <FlatList
      data={data}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ flexDirection: 'row', padding: 10 }}>
          <Text style={{ marginRight: 10 }}>{item.accountno}</Text>
          <Text>{item.cc3code}</Text>
        </View>
      )}
    />
  )
}

export default Screen
