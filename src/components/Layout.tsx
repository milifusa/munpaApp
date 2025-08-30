import React from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, typography, spacing } from '../styles/globalStyles';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {

  return (
    <View style={styles.mainContainer}>
      {/* Contenido principal */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    flex: 1,
  },
});

export default Layout;
