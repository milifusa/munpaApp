import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  Linking,
  Image,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareChildService, ShareChildRequest } from '../services/shareChildService';
import { useAuth } from '../contexts/AuthContext';

interface RouteParams {
  childId: string;
  childName: string;
}

const ShareChildScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { childId, childName } = route.params as RouteParams;
  const { user } = useAuth();

  const [role, setRole] = useState<'padre' | 'madre' | 'cuidadora' | 'familiar' | 'otro'>('padre');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [webLink, setWebLink] = useState<string | null>(null); // Link web para compartir
  const [loading, setLoading] = useState(false);
  const [sharedWith, setSharedWith] = useState<any[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);

  useEffect(() => {
    loadSharedWith();
  }, []);

  const loadSharedWith = async () => {
    setLoadingShared(true);
    try {
      const users = await shareChildService.getSharedWith(childId);
      setSharedWith(users);
    } catch (error: any) {
      console.error('Error cargando usuarios compartidos:', error);
    } finally {
      setLoadingShared(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!role) {
      Alert.alert('Error', 'Por favor selecciona un rol');
      return;
    }

    const days = parseInt(expiresInDays) || 7;
    if (days < 1 || days > 365) {
      Alert.alert('Error', 'Los días de expiración deben estar entre 1 y 365');
      return;
    }

    setLoading(true);
    try {
      const data: ShareChildRequest = {
        role,
        expiresInDays: days,
      };

      const response = await shareChildService.shareChild(childId, data);
      const deepLink = response.data?.invitationLink || response.data?.data?.invitationLink;
      const webLinkValue = response.data?.webLink || response.data?.data?.webLink;
      
      console.log('✅ [SHARE CHILD] Respuesta completa:', JSON.stringify(response, null, 2));
      console.log('✅ [SHARE CHILD] Deep link extraído:', deepLink);
      console.log('✅ [SHARE CHILD] Web link extraído:', webLinkValue);
      
      if (deepLink && typeof deepLink === 'string' && deepLink.startsWith('munpa://')) {
        setInvitationLink(deepLink);
        // Usar webLink si está disponible, sino generar uno
        if (webLinkValue) {
          setWebLink(webLinkValue);
        } else {
          // Extraer token y generar web link
          const tokenMatch = deepLink.match(/munpa:\/\/share-child\/(.+)/);
          if (tokenMatch && tokenMatch[1]) {
            setWebLink(`https://munpa.online/share-child/${tokenMatch[1]}`);
          }
        }
        Alert.alert('¡Éxito!', 'Link de invitación generado correctamente');
      } else {
        console.error('❌ [SHARE CHILD] Link inválido recibido:', deepLink);
        Alert.alert('Error', 'El link generado no es válido. Por favor, intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('Error generando link:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo generar el link de invitación'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    // Usar webLink para compartir (funciona mejor en WhatsApp/SMS)
    const linkToShare = webLink || invitationLink;
    if (!linkToShare) return;

    try {
      // Formatear el mensaje con el link web (más compatible con apps de mensajería)
      const message = `¡Hola! ${user?.name || 'Alguien'} quiere compartir la información de ${childName} contigo.\n\nAbre este link para aceptar:\n\n${linkToShare}\n\nEl link abrirá la app Munpa automáticamente.`;
      
      console.log('📤 [SHARE] Compartiendo link:', linkToShare);
      console.log('📤 [SHARE] Tipo de link:', webLink ? 'Web link' : 'Deep link');
      console.log('📤 [SHARE] Mensaje completo:', message);
      
      if (Platform.OS === 'ios') {
        // En iOS, usar title y message para mejor compatibilidad
        const result = await Share.share({
          message,
          title: `Compartir ${childName}`,
        });
        console.log('✅ [SHARE] Resultado iOS:', result);
      } else {
        // En Android, solo message
        const result = await Share.share({
          message,
        });
        console.log('✅ [SHARE] Resultado Android:', result);
      }
    } catch (error: any) {
      console.error('❌ [SHARE] Error compartiendo:', error);
      Alert.alert('Error', 'No se pudo compartir el link. Intenta copiarlo manualmente.');
    }
  };

  const handleCopyLink = () => {
    // Usar webLink para copiar (más fácil de compartir)
    const linkToCopy = webLink || invitationLink;
    if (!linkToCopy) return;
    
    try {
      console.log('📋 [COPY] Copiando link:', linkToCopy);
      console.log('📋 [COPY] Tipo de link:', webLink ? 'Web link' : 'Deep link');
      Clipboard.setString(linkToCopy);
      console.log('✅ [COPY] Link copiado al portapapeles');
      Alert.alert('✅ Link copiado', 'El link ha sido copiado al portapapeles');
    } catch (error) {
      console.error('❌ [COPY] Error copiando link:', error);
      Alert.alert('Error', 'No se pudo copiar el link');
    }
  };

  const handleRevokeAccess = (userId: string, userName: string) => {
    Alert.alert(
      'Revocar acceso',
      `¿Estás seguro de que quieres revocar el acceso de ${userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            try {
              await shareChildService.revokeAccess(childId, userId);
              Alert.alert('Éxito', 'Acceso revocado correctamente');
              loadSharedWith();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'No se pudo revocar el acceso');
            }
          },
        },
      ]
    );
  };

  const roles = [
    { value: 'padre', label: 'Padre', icon: 'man' },
    { value: 'madre', label: 'Madre', icon: 'woman' },
    { value: 'cuidadora', label: 'Cuidadora', icon: 'heart' },
    { value: 'familiar', label: 'Familiar', icon: 'people' },
    { value: 'otro', label: 'Otro', icon: 'person' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#59C6C0', '#4DB8B3']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compartir {childName}</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Generar link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generar link de invitación</Text>
          <Text style={styles.sectionSubtitle}>
            Comparte la información de {childName} con otra persona
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Rol de la persona</Text>
            <View style={styles.rolesContainer}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleButton,
                    role === r.value && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole(r.value as any)}
                >
                  <Ionicons
                    name={r.icon as any}
                    size={20}
                    color={role === r.value ? '#FFFFFF' : '#59C6C0'}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === r.value && styles.roleButtonTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Días de expiración</Text>
            <TextInput
              style={styles.input}
              value={expiresInDays}
              onChangeText={setExpiresInDays}
              placeholder="7"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              style={[styles.generateButton, loading && styles.buttonDisabled]}
              onPress={handleGenerateLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="link" size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generar link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Link generado */}
          {invitationLink && (
            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>Link de invitación:</Text>
              <TouchableOpacity
                style={styles.linkBox}
                onPress={handleCopyLink}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText} numberOfLines={2}>
                  {webLink || invitationLink}
                </Text>
                <Ionicons name="copy-outline" size={18} color="#59C6C0" style={styles.copyIcon} />
              </TouchableOpacity>
              <Text style={styles.linkHint}>
                💡 Este link funciona en WhatsApp, SMS y otras apps. Toca para copiarlo o usa el botón compartir.
              </Text>
              {webLink && (
                <Text style={[styles.linkHint, { fontSize: 11, color: '#9CA3AF', marginTop: 4 }]}>
                  El link abrirá la app Munpa automáticamente
                </Text>
              )}
              <View style={styles.linkActions}>
                <TouchableOpacity
                  style={[styles.linkButton, styles.shareButton]}
                  onPress={handleShare}
                >
                  <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.linkButtonText}>Compartir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.linkButton, styles.copyButton]}
                  onPress={handleCopyLink}
                >
                  <Ionicons name="copy-outline" size={18} color="#59C6C0" />
                  <Text style={[styles.linkButtonText, styles.copyButtonText]}>
                    Copiar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Usuarios con acceso */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personas con acceso</Text>
          {loadingShared ? (
            <ActivityIndicator size="small" color="#59C6C0" style={styles.loader} />
          ) : sharedWith.length === 0 ? (
            <Text style={styles.emptyText}>No hay personas con acceso compartido</Text>
          ) : (
            <View style={styles.sharedList}>
              {sharedWith.map((user) => (
                <View key={user.userId} style={styles.sharedItem}>
                  <View style={styles.sharedUserInfo}>
                    {user.photoUrl ? (
                      <Image
                        source={{ uri: user.photoUrl }}
                        style={styles.sharedUserPhoto}
                      />
                    ) : (
                      <View style={styles.sharedUserPhotoPlaceholder}>
                        <Ionicons name="person" size={20} color="#59C6C0" />
                      </View>
                    )}
                    <View style={styles.sharedUserDetails}>
                      <Text style={styles.sharedUserName}>{user.name}</Text>
                      <Text style={styles.sharedUserRole}>
                        {user.role} {user.isPrincipal && '(Principal)'}
                      </Text>
                    </View>
                  </View>
                  {!user.isPrincipal && (
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevokeAccess(user.userId, user.name)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  form: {
    marginTop: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    marginTop: 16,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#59C6C0',
    backgroundColor: '#F7FAFC',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#59C6C0',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E8F8F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#2c3e50',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F8F7',
  },
  linkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  linkBox: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8F8F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    marginRight: 8,
  },
  copyIcon: {
    marginLeft: 8,
  },
  linkHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  linkActions: {
    flexDirection: 'row',
    gap: 12,
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#96d2d3',
  },
  copyButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#59C6C0',
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  copyButtonText: {
    color: '#59C6C0',
  },
  sharedList: {
    marginTop: 16,
  },
  sharedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    marginBottom: 12,
  },
  sharedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sharedUserPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  sharedUserPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F8F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sharedUserDetails: {
    flex: 1,
  },
  sharedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sharedUserRole: {
    fontSize: 14,
    color: '#666',
  },
  revokeButton: {
    padding: 8,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginVertical: 20,
  },
});

export default ShareChildScreen;

