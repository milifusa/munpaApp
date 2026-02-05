import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TeethingGuideScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  const upperTeethData = [
    {
      name: 'Incisivo central',
      color: '#5B7FF9',
      erupt: '8-12 meses',
      shed: '6-7 años',
    },
    {
      name: 'Incisivo lateral',
      color: '#8E5CF7',
      erupt: '9-13 meses',
      shed: '7-8 años',
    },
    {
      name: 'Canino (colmillo)',
      color: '#EF4444',
      erupt: '16-22 meses',
      shed: '10-12 años',
    },
    {
      name: 'Primer molar',
      color: '#10B981',
      erupt: '13-19 meses',
      shed: '9-11 años',
    },
    {
      name: 'Segundo molar',
      color: '#F59E0B',
      erupt: '25-33 meses',
      shed: '10-12 años',
    },
  ];

  const lowerTeethData = [
    {
      name: 'Segundo molar',
      color: '#F59E0B',
      erupt: '23-31 meses',
      shed: '10-12 años',
    },
    {
      name: 'Primer molar',
      color: '#10B981',
      erupt: '14-18 meses',
      shed: '9-11 años',
    },
    {
      name: 'Canino (colmillo)',
      color: '#EF4444',
      erupt: '17-23 meses',
      shed: '9-12 años',
    },
    {
      name: 'Incisivo lateral',
      color: '#8E5CF7',
      erupt: '10-16 meses',
      shed: '7-8 años',
    },
    {
      name: 'Incisivo central',
      color: '#5B7FF9',
      erupt: '6-10 meses',
      shed: '6-7 años',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerBarTitle}>Tabla de Erupción Dental</Text>
        </View>
        <View style={styles.headerBarRight} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Upper Teeth Section */}
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableHeaderName]}>
              Dientes Superiores
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderCol]}>
              Erupción
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderCol]}>
              Caída
            </Text>
          </View>

          {upperTeethData.map((tooth, index) => (
            <View key={`upper-${index}`} style={styles.tableRow}>
              <View style={styles.toothNameContainer}>
                <View style={[styles.colorDot, { backgroundColor: tooth.color }]} />
                <Text style={styles.toothName}>{tooth.name}</Text>
              </View>
              <Text style={styles.tableCell}>{tooth.erupt}</Text>
              <Text style={styles.tableCell}>{tooth.shed}</Text>
            </View>
          ))}
        </View>

        {/* Mouth Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/denticioncompeta.png')}
            style={styles.mouthImage}
            resizeMode="contain"
          />
        </View>

        {/* Lower Teeth Section */}
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.tableHeaderName]}>
              Dientes Inferiores
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderCol]}>
              Erupción
            </Text>
            <Text style={[styles.tableHeaderText, styles.tableHeaderCol]}>
              Caída
            </Text>
          </View>

          {lowerTeethData.map((tooth, index) => (
            <View key={`lower-${index}`} style={styles.tableRow}>
              <View style={styles.toothNameContainer}>
                <View style={[styles.colorDot, { backgroundColor: tooth.color }]} />
                <Text style={styles.toothName}>{tooth.name}</Text>
              </View>
              <Text style={styles.tableCell}>{tooth.erupt}</Text>
              <Text style={styles.tableCell}>{tooth.shed}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    backgroundColor: '#59C6C0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    top: 50,
  },
  headerBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  headerBarRight: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Montserrat',
  },
  section: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  tableHeaderName: {
    flex: 2,
  },
  tableHeaderCol: {
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toothNameContainer: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  toothName: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  mouthImage: {
    width: '100%',
    height: 350,
  },
});

export default TeethingGuideScreen;
