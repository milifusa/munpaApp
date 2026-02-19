import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const MUNPA_PRIMARY = '#96d2d3';

const VIDEO_WEB_BASE =
  Constants.expoConfig?.extra?.videoWebBase ??
  process.env.EXPO_PUBLIC_VIDEO_WEB_BASE ??
  'https://api.munpa.online/video/join';

export default function ConsultationVideoScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const url = route.params?.url as string | undefined;
  const videoData = route.params?.videoData as
    | { channelName: string; uid: number; token: string; appId: string }
    | undefined;

  const webViewUrl = React.useMemo(() => {
    if (url) return url;
    if (videoData?.channelName && videoData?.token && videoData?.appId) {
      const params = new URLSearchParams({
        channelName: videoData.channelName,
        uid: String(videoData.uid ?? 0),
        token: videoData.token,
        appId: videoData.appId,
      });
      return `${VIDEO_WEB_BASE}?${params.toString()}`;
    }
    return null;
  }, [url, videoData]);

  if (!webViewUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="videocam-off-outline" size={64} color="#9CA3AF" />
          <Text style={styles.errorText}>No se pudo obtener el enlace de la videollamada</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Videollamada</Text>
        <View style={styles.headerButton} />
      </View>
      <WebView
        source={{ uri: webViewUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 4,
    minWidth: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: MUNPA_PRIMARY,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
