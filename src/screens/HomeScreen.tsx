import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../contexts/AuthContext";
import {
  childrenService,
  profileService,
  communitiesService,
  listsService,
} from "../services/api";
import { imageUploadService } from "../services/imageUploadService";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles/globalStyles";
import { useFonts } from "../hooks/useFonts";
import BannerCarousel from "../components/BannerCarousel";

interface Child {
  id: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks?: number | null;
  photoUrl?: string | null;
  createdAt: any;
  // Campos calculados por el backend
  currentAgeInMonths?: number | null;
  currentGestationWeeks?: number | null;
  registeredAgeInMonths?: number | null;
  registeredGestationWeeks?: number | null;
  daysSinceCreation?: number;
  isOverdue?: boolean;
}

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  imageUrl?: string;
  isPublic?: boolean;
  isPrivate?: boolean;
}

interface List {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  isPublic: boolean;
  itemCount?: number;
}

// Constantes para las caritas por defecto (fuera del componente para mejor rendimiento)
const CARITA_1 = require("../../assets/caritas 1.png");
const CARITA_2 = require("../../assets/caritas 2.png");
const CARITA_3 = require("../../assets/caritas 3.png");
const CARITAS = [CARITA_1, CARITA_2, CARITA_3];

const HomeScreen: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Cargar fuentes personalizadas
  const fontsLoaded = useFonts();

  // Datos de comunidades del usuario
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [recentPublicCommunities, setRecentPublicCommunities] = useState<Community[]>([]);

  // Datos de listas del usuario
  const [userLists, setUserLists] = useState<List[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [recentPublicLists, setRecentPublicLists] = useState<List[]>([]);

  // Estados para el modal de creación de comunidad
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    keywords: "",
    description: "",
    isPrivate: false,
    image: null as string | null,
  });

  useEffect(() => {
    loadData();
    loadUserProfile();
    loadUserCommunities();
    loadUserLists();
  }, []);

  // Refrescar datos cuando se regrese a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
      loadUserCommunities();
      loadUserLists();
    });

    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar hijos
      const childrenResponse = await childrenService.getChildren();
      console.log("📊 Respuesta de hijos:", childrenResponse);

      if (childrenResponse.success && childrenResponse.data) {
        setChildren(childrenResponse.data);
        // Seleccionar el primer hijo por defecto
        if (childrenResponse.data.length > 0) {
          setSelectedChild(childrenResponse.data[0]);
        }
      } else {
        console.log("ℹ️ No hay hijos registrados o respuesta vacía");
        setChildren([]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      // No mostrar alerta para errores 500, solo log
      if ((error as any)?.response?.status !== 500) {
        Alert.alert("Error", "No se pudieron cargar los datos de los hijos");
      }
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      if (user?.id) {
        const profileResponse = await profileService.getProfile();
        if (profileResponse.success && profileResponse.data) {
          // @ts-ignore
          setUser((prevUser: any) => ({
            ...prevUser!,
            ...profileResponse.data,
          }));
        }
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  };

  const loadUserCommunities = async () => {
    try {
      setLoadingCommunities(true);
      console.log("🏠 [HOME] Cargando comunidades del usuario...");

      const response = await communitiesService.getUserCommunities();

      if (response.success && response.data) {
        const communities = Array.isArray(response.data) ? response.data : [];
        console.log("✅ [HOME] Comunidades cargadas:", communities.length);
        setUserCommunities(communities);
        
        // Si no tiene comunidades, cargar las 3 últimas públicas
        if (communities.length === 0) {
          try {
            console.log("📋 [HOME] Usuario sin comunidades, cargando públicas...");
            const publicResponse = await communitiesService.getPublicCommunities();
            console.log("📋 [HOME] Respuesta de públicas:", publicResponse);
            if (publicResponse.success && publicResponse.data) {
              const publicCommunities = Array.isArray(publicResponse.data) ? publicResponse.data : [];
              console.log("📋 [HOME] Comunidades públicas encontradas:", publicCommunities.length);
              // Filtrar solo comunidades públicas y que se puedan unir
              const joinableCommunities = publicCommunities.filter(c => c.isPublic === true && c.canJoin !== false);
              console.log("📋 [HOME] Comunidades que se pueden unir:", joinableCommunities.length);
              // Tomar solo las 3 más recientes
              const recent = joinableCommunities.slice(0, 3);
              console.log("📋 [HOME] Estableciendo 3 comunidades recientes:", recent);
              setRecentPublicCommunities(recent);
            }
          } catch (error) {
            console.error("❌ [HOME] Error cargando comunidades públicas:", error);
          }
        } else {
          setRecentPublicCommunities([]);
        }
      } else {
        console.log("ℹ️ [HOME] No hay comunidades o respuesta vacía");
        setUserCommunities([]);
        
        // Cargar comunidades públicas recientes
        try {
          console.log("📋 [HOME] No hay comunidades del usuario, cargando públicas...");
          const publicResponse = await communitiesService.getPublicCommunities();
          console.log("📋 [HOME] Respuesta de públicas (sin comunidades):", publicResponse);
          if (publicResponse.success && publicResponse.data) {
            const publicCommunities = Array.isArray(publicResponse.data) ? publicResponse.data : [];
            console.log("📋 [HOME] Comunidades públicas encontradas:", publicCommunities.length);
            // Filtrar solo comunidades públicas y que se puedan unir
            const joinableCommunities = publicCommunities.filter(c => c.isPublic === true && c.canJoin !== false);
            console.log("📋 [HOME] Comunidades que se pueden unir:", joinableCommunities.length);
            const recent = joinableCommunities.slice(0, 3);
            console.log("📋 [HOME] Estableciendo 3 comunidades recientes:", recent);
            setRecentPublicCommunities(recent);
          }
        } catch (error) {
          console.error("❌ [HOME] Error cargando comunidades públicas:", error);
        }
      }
    } catch (error) {
      console.error("❌ [HOME] Error cargando comunidades:", error);
      setUserCommunities([]);
    } finally {
      setLoadingCommunities(false);
    }
  };

  const loadUserLists = async () => {
    try {
      setLoadingLists(true);
      console.log("📋 [HOME] Cargando listas del usuario...");

      const response = await listsService.getUserLists();

      if (response.success && response.data) {
        const lists = Array.isArray(response.data) ? response.data : [];
        console.log("✅ [HOME] Listas cargadas:", lists.length);
        setUserLists(lists);
        
        // Si no tiene listas, cargar las 3 últimas públicas
        if (lists.length === 0) {
          try {
            console.log("📋 [HOME] Usuario sin listas, cargando públicas...");
            const publicResponse = await listsService.getPublicLists();
            console.log("📋 [HOME] Respuesta de listas públicas:", publicResponse);
            if (publicResponse.success && publicResponse.data) {
              const publicLists = Array.isArray(publicResponse.data) ? publicResponse.data : [];
              console.log("📋 [HOME] Listas públicas encontradas:", publicLists.length);
              // Tomar solo las 3 más recientes
              const recent = publicLists.slice(0, 3);
              console.log("📋 [HOME] Estableciendo 3 listas recientes:", recent);
              setRecentPublicLists(recent);
            }
          } catch (error) {
            console.error("❌ [HOME] Error cargando listas públicas:", error);
          }
        } else {
          setRecentPublicLists([]);
        }
      } else {
        console.log("ℹ️ [HOME] No hay listas o respuesta vacía");
        setUserLists([]);
        
        // Cargar listas públicas recientes
        try {
          console.log("📋 [HOME] No hay listas del usuario, cargando públicas...");
          const publicResponse = await listsService.getPublicLists();
          console.log("📋 [HOME] Respuesta de listas públicas (sin listas):", publicResponse);
          if (publicResponse.success && publicResponse.data) {
            const publicLists = Array.isArray(publicResponse.data) ? publicResponse.data : [];
            console.log("📋 [HOME] Listas públicas encontradas:", publicLists.length);
            const recent = publicLists.slice(0, 3);
            console.log("📋 [HOME] Estableciendo 3 listas recientes:", recent);
            setRecentPublicLists(recent);
          }
        } catch (error) {
          console.error("❌ [HOME] Error cargando listas públicas:", error);
        }
      }
    } catch (error) {
      console.error("❌ [HOME] Error cargando listas:", error);
      setUserLists([]);
    } finally {
      setLoadingLists(false);
    }
  };

  const getMotivationalText = () => {
    if (user?.gender === "M") {
      return "Ser papá no es fácil, pero no estás solo...";
    } else if (user?.gender === "F") {
      return "Ser mamá no es fácil, pero no estás sola...";
    } else {
      return "Ser padre no es fácil, pero no estás solo...";
    }
  };

  const handleAddChild = () => {
    // @ts-ignore
    navigation.navigate("ChildrenData", {
      childrenCount: 1,
      gender: "F", // Por defecto, se puede cambiar después
      pregnancyStatus: "not_pregnant",
      isMultiplePregnancy: false,
    });
  };

  const handleChildPress = (child: Child) => {
    // Navegar directamente al perfil completo
    // @ts-ignore
    navigation.navigate("ChildProfile", {
      childId: child.id,
      child: child,
    });
  };

  const getProfileImage = () => {
    // Icono de perfil amarillo con cara sonriente
    return require("../../assets/caritas 1.png");
  };

  const getChildAvatar = (child: Child, index: number) => {
    // Si el hijo tiene foto válida del backend y no ha fallado, usarla
    if (child.photoUrl && typeof child.photoUrl === 'string' && child.photoUrl.trim() !== '' && !imageErrors.has(child.id)) {
      console.log('✅ [AVATAR] Usando foto del backend para:', child.name, child.photoUrl);
      return { uri: child.photoUrl };
    }

    // Si no tiene foto o la imagen falló, usar las caritas por defecto
    const caritaIndex = index % 3;
    console.log('🎨 [AVATAR] Usando carita por defecto para:', child.name, 'índice:', caritaIndex);
    
    // Retornar directamente el require según el índice
    switch (caritaIndex) {
      case 0:
        return CARITA_1;
      case 1:
        return CARITA_2;
      case 2:
        return CARITA_3;
      default:
        return CARITA_1;
    }
  };

  const handleImageError = (childId: string) => {
    console.log("❌ [IMAGE] Error cargando imagen para hijo:", childId);
    setImageErrors((prev) => new Set(prev).add(childId));
  };

  const handleAddCommunity = () => {
    setIsCreateModalVisible(true);
  };

  const handleViewAllCommunities = () => {
    // @ts-ignore
    navigation.navigate("Communities");
  };

  // Función para obtener el icono de la categoría
  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      maternidad: "🤰",
      lactancia: "🍼",
      parto: "🤱",
      postparto: "👶",
      embarazo: "🤰",
      salud: "🏥",
      alimentacion: "🍎",
      desarrollo: "📚",
      juegos: "🧸",
      educacion: "📖",
      familia: "👨‍👩‍👧‍👦",
      general: "👥",
      apoyo: "🤝",
      consejos: "💡",
      bienestar: "🌟",
    };

    return icons[category?.toLowerCase()] || "👥";
  };

  const handleCommunityPress = (community: Community) => {
    // Navegar a los posts de la comunidad
    (navigation as any).navigate("CommunityPosts", {
      communityId: community.id,
      communityName: community.name,
    });
  };

  const handleDouliPress = () => {
    // @ts-ignore
    navigation.navigate("DoulaChat");
  };

  const handleListPress = (list: List) => {
    // Navegar al tab Lists y luego al detalle de la lista
    (navigation as any).navigate("Lists", {
      screen: "ListDetail",
      params: {
        listId: list.id,
        listTitle: list.title,
      },
    });
  };

  const handleAddList = () => {
    // Navegar a la pantalla principal de listas
    (navigation as any).navigate("Lists", {
      screen: "ListsMain",
    });
  };

  // Funciones para el modal de crear comunidad
  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim() || !newCommunity.description.trim()) {
      Alert.alert("Error", "El nombre y la descripción son obligatorios");
      return;
    }

    setIsCreating(true);
    try {
      console.log(
        "🏗️ [COMMUNITIES] Creando comunidad con datos:",
        newCommunity
      );

      let imageUrl = null;

      // 1. Si hay imagen, subirla primero para obtener la URL
      if (newCommunity.image) {
        console.log(
          "🖼️ [COMMUNITIES] Subiendo imagen a /api/communities/upload-photo..."
        );
        try {
          imageUrl = await imageUploadService.uploadCommunityImage(
            newCommunity.image
          );
          console.log(
            "✅ [COMMUNITIES] Imagen subida exitosamente, URL obtenida:",
            imageUrl
          );
        } catch (uploadError) {
          console.error("❌ [COMMUNITIES] Error subiendo imagen:", uploadError);
          Alert.alert(
            "Error de Imagen",
            "No se pudo subir la imagen. ¿Quieres crear la comunidad sin imagen?",
            [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Continuar Sin Imagen",
                onPress: () => createCommunityWithData(null),
              },
            ]
          );
          return;
        }
      }

      await createCommunityWithData(imageUrl);
    } catch (error: any) {
      console.error("❌ [COMMUNITIES] Error creando comunidad:", error);
      Alert.alert(
        "Error",
        error.response?.data?.message || "No se pudo crear la comunidad",
        [{ text: "OK" }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const createCommunityWithData = async (imageUrl: string | null) => {
    const communityData = {
      name: newCommunity.name.trim(),
      keywords: newCommunity.keywords.trim(),
      description: newCommunity.description.trim(),
      image: imageUrl,
      isPrivate: newCommunity.isPrivate,
    };

    console.log("📋 [COMMUNITIES] Datos preparados para envío:", communityData);

    const result = await communitiesService.createCommunity(communityData);
    console.log("✅ [COMMUNITIES] Comunidad creada exitosamente:", result);

    Alert.alert("Éxito", "Comunidad creada exitosamente", [
      {
        text: "Ver Comunidad",
        onPress: () => {
          resetForm();
          // Recargar las comunidades del usuario
          loadUserCommunities();
        },
      },
    ]);
  };

  const resetForm = () => {
    setNewCommunity({
      name: "",
      keywords: "",
      description: "",
      isPrivate: false,
      image: null,
    });
    setIsCreateModalVisible(false);
  };

  const handlePickImage = async () => {
    try {
      console.log("🖼️ [IMAGE PICKER] Iniciando selección de imagen...");

      // Solicitar permisos primero
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permisos requeridos",
          "Necesitamos acceso a tu galería para seleccionar una imagen."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log("🖼️ [IMAGE PICKER] Imagen seleccionada:", {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
        });

        setNewCommunity((prev) => ({ ...prev, image: selectedImage.uri }));
      }
    } catch (error) {
      console.error("❌ [IMAGE PICKER] Error seleccionando imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen");
    }
  };

  const handleTakePhoto = async () => {
    try {
      console.log("📸 [CAMERA] Iniciando captura de foto...");

      // Solicitar permisos de cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permisos requeridos",
          "Necesitamos acceso a la cámara para tomar una foto."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log("📸 [CAMERA] Foto tomada:", {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
        });

        setNewCommunity((prev) => ({ ...prev, image: selectedImage.uri }));
      }
    } catch (error) {
      console.error("❌ [CAMERA] Error tomando foto:", error);
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Saludo Personalizado */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingHello}>¡Hola </Text>
            <Text style={styles.greetingName}>{user?.displayName}!</Text>
          </View>
          {/* Leyenda Motivacional */}
          <View style={styles.motivationalSection}>
            <Text
              style={{
                fontSize: 14,
                color: "#59C6C0",
                textAlign: "left",
                fontWeight: "700", // Usando la fuente personalizada que compartiste
              }}
            >
              {getMotivationalText()}
            </Text>
          </View>
        </View>

        {/* Carrusel de Banners */}
        <BannerCarousel />

        {/* Sección de Hijos */}
        <View style={styles.childrenSection}>
          <View style={styles.communitiesHeader}>
            <Text style={styles.sectionTitle}>Mis hijos</Text>
            <View style={styles.headerActions}>
              <Text style={styles.scrollHint}>Desliza →</Text>
            </View>
          </View>
          <View style={styles.childrenWrapper}>
            {/* Botón Añadir */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.communitiesScrollView}
              contentContainerStyle={styles.communitiesContainer}
            >
              <TouchableOpacity
                style={styles.addChildButton}
                onPress={handleAddChild}
              >
                <View style={styles.addChildIcon}>
                  <Text style={styles.addIconText2}>+</Text>
                </View>
                <Text style={styles.addChildText}>Añadir</Text>
              </TouchableOpacity>

              {/* Lista de hijos */}
              {children.map((child, index) => (
                <TouchableOpacity
                  key={child.id}
                  style={styles.childButton}
                  onPress={() => handleChildPress(child)}
                >
                  <Image
                    source={getChildAvatar(child, index)}
                    style={styles.childImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('❌ [IMAGE ERROR] Para:', child.name, error.nativeEvent);
                      // Solo manejar error si la imagen es de URL (no recurso local)
                      if (child.photoUrl && typeof child.photoUrl === 'string') {
                        handleImageError(child.id);
                      }
                    }}
                    defaultSource={CARITA_1}
                    onLoad={() => console.log('✅ [IMAGE LOADED] Para:', child.name)}
                  />
                  <Text
                    style={styles.childName}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {child.name.charAt(0).toUpperCase() +
                      child.name.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Sección de Comunidades */}
        <View style={styles.communitiesSection}>
          <View style={styles.communitiesHeader}>
            <Text style={styles.sectionTitle2}>Mis Comunidades</Text>
            <View style={styles.headerActions}>
              {userCommunities.length > 4 && (
                <Text style={styles.scrollHint}>Desliza →</Text>
              )}
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={handleViewAllCommunities}
              >
                <Text style={styles.seeAllText}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={16} color="#59C6C0" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Mensaje cuando no hay comunidades del usuario */}
          {!loadingCommunities && userCommunities.length === 0 && (
            <TouchableOpacity 
              style={styles.emptyMessageInline}
              onPress={() => navigation.navigate('Communities' as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyMessageText}>
                ¡Únete a tu primera comunidad!
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.communitiesWrapper}>
            {loadingCommunities ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando...</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.communitiesScrollView}
                contentContainerStyle={styles.communitiesContainer}
              >
                {/* Botón Añadir Comunidad siempre visible */}
                <TouchableOpacity
                  style={styles.addCommunityButton}
                  onPress={handleAddCommunity}
                >
                  <View style={styles.addCommunityIcon}>
                    <Text style={styles.addIconText}>+</Text>
                  </View>
                  <Text style={styles.addCommunityText}>Añadir</Text>
                </TouchableOpacity>

                {/* Comunidades del usuario o comunidades públicas */}
                {userCommunities.length === 0 ? (
                  <>
                    
                    {recentPublicCommunities.map((community) => (
                      <TouchableOpacity
                        key={community.id}
                        style={styles.communityButton}
                        onPress={() => handleCommunityPress(community)}
                      >
                        <View style={styles.communityIcon}>
                          {community.imageUrl ? (
                            <Image
                              source={{ uri: community.imageUrl }}
                              style={styles.communityImage}
                              onError={() =>
                                console.log(
                                  "Error cargando imagen de comunidad:",
                                  community.name
                                )
                              }
                            />
                          ) : (
                            <Text style={styles.communityIconText}>
                              {getCategoryIcon(community.category)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.communityName} numberOfLines={1} ellipsizeMode="tail">
                          {community.name.charAt(0).toUpperCase() + community.name.slice(1).toLowerCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  userCommunities.map((community) => (
                    <TouchableOpacity
                      key={community.id}
                      style={styles.communityButton}
                      onPress={() => handleCommunityPress(community)}
                    >
                      <View style={styles.communityIcon}>
                        {community.imageUrl ? (
                          <Image
                            source={{ uri: community.imageUrl }}
                            style={styles.communityImage}
                            onError={() =>
                              console.log(
                                "Error cargando imagen de comunidad:",
                                community.name
                              )
                            }
                          />
                        ) : (
                          <Text style={styles.communityIconText}>
                            {getCategoryIcon(community.category)}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.communityName} numberOfLines={1} ellipsizeMode="tail">
                        {community.name.charAt(0).toUpperCase() + community.name.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Sección de Mis Listas */}
        <View style={styles.childrenSection}>
          <View style={styles.communitiesHeader}>
            <Text style={styles.sectionTitle}>Mis Listas</Text>
            <View style={styles.headerActions}>
              {userLists.length > 4 && (
                <Text style={styles.scrollHint}>Desliza →</Text>
              )}
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={handleAddList}
              >
                <Text style={styles.seeAllText}>Ver todas</Text>
                <Ionicons name="chevron-forward" size={16} color="#59C6C0" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Mensaje cuando no hay listas */}
          {!loadingLists && userLists.length === 0 && (
            <TouchableOpacity 
              style={styles.emptyMessageInline}
              onPress={handleAddList}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyMessageText}>
                ¡Crea tu primera lista!
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.listWrapper}>
            {loadingLists ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Cargando...</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.communitiesScrollView}
                contentContainerStyle={styles.communitiesContainer}
              >
                {/* Botón Añadir Lista */}
                <TouchableOpacity
                  style={styles.addChildButton}
                  onPress={handleAddList}
                >
                  <View style={styles.addChildIcon}>
                    <Text style={styles.addListIconText}>+</Text>
                  </View>
                  <Text style={styles.addChildText}>Añadir</Text>
                </TouchableOpacity>

                {/* Listas del usuario o listas públicas */}
                {userLists.length === 0 ? (
                  recentPublicLists.map((list) => (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.childButton}
                      onPress={() => handleListPress(list)}
                    >
                      <View style={styles.listIcon}>
                        {list.imageUrl ? (
                          <Image
                            source={{ uri: list.imageUrl }}
                            style={styles.listImage}
                            onError={() =>
                              console.log(
                                "Error cargando imagen de lista:",
                                list.title
                              )
                            }
                          />
                        ) : (
                          <Ionicons name="list" size={30} color="#8fd8d3" />
                        )}
                      </View>
                      <Text
                        style={styles.childName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {list.title.charAt(0).toUpperCase() + list.title.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  userLists.map((list) => (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.childButton}
                      onPress={() => handleListPress(list)}
                    >
                      <View style={styles.listIcon}>
                        {list.imageUrl ? (
                          <Image
                            source={{ uri: list.imageUrl }}
                            style={styles.listImage}
                            onError={() =>
                              console.log(
                                "Error cargando imagen de lista:",
                                list.title
                              )
                            }
                          />
                        ) : (
                          <Ionicons name="list" size={30} color="#8fd8d3" />
                        )}
                      </View>
                      <Text
                        style={styles.childName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {list.title.charAt(0).toUpperCase() + list.title.slice(1).toLowerCase()}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Espacio final */}
        <View style={styles.finalSpacing} />
      </ScrollView>

      {/* Modal de Creación de Comunidad */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetForm} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear Nueva Comunidad</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Selección de Imagen */}
            <View style={styles.imageSection}>
              <TouchableOpacity
                style={styles.imagePicker}
                onPress={handlePickImage}
              >
                {newCommunity.image ? (
                  <View style={styles.imageSelectedContainer}>
                    <Image
                      source={{ uri: newCommunity.image }}
                      style={styles.selectedImage}
                    />
                    <View style={styles.imageSelectedOverlay}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#32CD32"
                      />
                      <Text style={styles.imageSelectedText}>
                        Imagen Seleccionada
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#999" />
                    <Text style={styles.imagePlaceholderText}>
                      Agregar Imagen (Opcional)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Botones de selección de imagen */}
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handlePickImage}
                >
                  <Ionicons name="images" size={20} color="#59C6C0" />
                  <Text style={styles.imageButtonText}>Galería</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color="#59C6C0" />
                  <Text style={styles.imageButtonText}>Cámara</Text>
                </TouchableOpacity>
              </View>

              {/* Información de la imagen seleccionada */}
              {newCommunity.image && (
                <View style={styles.imageInfo}>
                  <Text style={styles.imageInfoText}>
                    ✓ URL de imagen lista para enviar
                  </Text>
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() =>
                      setNewCommunity((prev) => ({ ...prev, image: null }))
                    }
                  >
                    <Ionicons name="close-circle" size={16} color="#FF6B6B" />
                    <Text style={styles.removeImageText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Formulario */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Nombre de la Comunidad *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Mamás Primerizas"
                value={newCommunity.name}
                onChangeText={(text) =>
                  setNewCommunity((prev) => ({ ...prev, name: text }))
                }
                maxLength={50}
              />

              <Text style={styles.inputLabel}>Palabras Clave</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: maternidad, primerizas, apoyo"
                value={newCommunity.keywords}
                onChangeText={(text) =>
                  setNewCommunity((prev) => ({ ...prev, keywords: text }))
                }
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Descripción *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe tu comunidad..."
                value={newCommunity.description}
                onChangeText={(text) =>
                  setNewCommunity((prev) => ({ ...prev, description: text }))
                }
                multiline
                numberOfLines={4}
                maxLength={300}
              />

              {/* Configuración de Privacidad */}
              <View style={styles.privacySection}>
                <Text style={styles.inputLabel}>
                  Configuración de Privacidad
                </Text>
                <TouchableOpacity
                  style={styles.privacyOption}
                  onPress={() =>
                    setNewCommunity((prev) => ({
                      ...prev,
                      isPrivate: !prev.isPrivate,
                    }))
                  }
                >
                  <View style={styles.radioButton}>
                    {newCommunity.isPrivate && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <View style={styles.privacyInfo}>
                    <Text style={styles.privacyTitle}>
                      {newCommunity.isPrivate
                        ? "Comunidad Privada"
                        : "Comunidad Pública"}
                    </Text>
                    <Text style={styles.privacyDescription}>
                      {newCommunity.isPrivate
                        ? "Solo miembros invitados pueden unirse"
                        : "Cualquier persona puede unirse"}
                    </Text>
                  </View>
                  <Ionicons
                    name={newCommunity.isPrivate ? "lock-closed" : "globe"}
                    size={20}
                    color={newCommunity.isPrivate ? "#FF6B6B" : "#32CD32"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetForm}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.createButton,
                isCreating && styles.createButtonDisabled,
              ]}
              onPress={handleCreateCommunity}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.createButtonText}>Crear Comunidad</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },


  // Scroll principal
  scrollView: {
    flex: 1,
  },

  // Sección de saludo
  greetingSection: {
    padding: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTextContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    zIndex: 2,
    justifyContent: "center",
  },
  greetingHello: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#555555",
    lineHeight: 36,
  },
  greetingName: {
    fontSize: 36,
    fontWeight: "normal",
    color: "#6c6c6c",
    lineHeight: 36,
  },
  greenShape: {
    position: "absolute",
    top: 20,
    right: -5,
    width: 170,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  greenShapeFace: {
    width: 170,
    height: 170,
    resizeMode: "contain",
  },

  // Sección motivacional
  motivationalSection: {
    marginBottom: 5,
    alignItems: "center",
  },
  motivationalText: {
    fontSize: 16,
    color: "#59C6C0",
    textAlign: "center",
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif", // Fuente del sistema que sabemos que funciona
  },

  // Sección de hijos
  childrenSection: {
    paddingLeft: 0,
    paddingRight: 20,
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 14,
    marginLeft: 20,
  },
  sectionTitle2: {
    fontSize: 22,
    marginBottom: 14,
    marginRight: 20,
  },

  childrenWrapper: {
    backgroundColor: "#8fd8d3",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 0,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    minHeight: 100,
    alignSelf: "flex-start",
    width: "85%",
  },
  listWrapper: {
    backgroundColor: "#fcde9d",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 0,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    minHeight: 100,
    alignSelf: "flex-start",
    width: "85%",
  },

  childrenContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
  },

  addChildButton: {
    alignItems: "center",
    width: 80,
    marginRight: 15,
  },
  addChildIcon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addChildText: {},
  childButton: {
    alignItems: "center",
    width: 95,
    marginRight: 15,
  },
  childImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  childName: {
    textAlign: "center",
  },
  listIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Sección de comunidades
  communitiesSection: {
    paddingHorizontal: 20,
    paddingLeft: 20,
    paddingRight: 0,
    marginBottom: 35,
  },
  communitiesWrapper: {
    backgroundColor: "#F4b8d3",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 25,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    minHeight: 100,
    alignSelf: "flex-end",
    width: "90%",
  },
  communitiesScrollView: {
    flex: 1,
  },
  communitiesContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
  },
  addCommunityButton: {
    alignItems: "center",
    width: 80,
    marginRight: 15,
  },
  addCommunityIcon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addIconText: {
    fontSize: 40,
    color: "#F4b8d3",
    fontWeight: "bold",
  },
  addIconText2: {
    fontSize: 40,
    color: "#8fd8d3",
    fontWeight: "bold",
  },
  addListIconText: {
    fontSize: 40,
    color: "#fcde9d",
    fontWeight: "bold",
  },
  addCommunityText: {
    textAlign: "center",
  },
  communityButton: {
    alignItems: "center",
    width: 95,
    marginRight: 15,
  },
  communityIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  communityIconText: {
    fontSize: 32,
  },
  communityName: {
    textAlign: "center",
  },

  // Estilos nuevos para comunidades dinámicas
  communitiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollHint: {
    fontSize: 12,
    color: "#999",
    marginRight: 10,
    fontStyle: "italic",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    color: "#59C6C0",
    fontWeight: "600",
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyCommunitiesContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyMessageOutside: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyMessageOutsideText: {
    fontSize: 14,
    color: "#666",
    textAlign: "left",
    fontWeight: "500",
  },
  emptyMessageInline: {
    backgroundColor: "#F0F9F8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#59C6C0",
  },
  emptyMessageText: {
    fontSize: 15,
    color: "#59C6C0",
    textAlign: "left",
    fontWeight: "600",
  },
  emptyCommunitiesMessageWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyCommunitiesMessage: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    minWidth: 200,
  },
  emptyCommunitiesText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  joinCommunitiesButton: {
    backgroundColor: "#59C6C0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinCommunitiesText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  communityImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Banner de DOULI
  douliBanner: {
    backgroundColor: "#887CBC",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingRight: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  douliTextContainer: {
    flex: 1,
    marginRight: 25,
  },
  douliTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  douliSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  douliAvatar: {
    position: "absolute",
    right: -10,
    top: -35,
    padding: 8,
    zIndex: 1001,
  },
  douliAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 30,
    resizeMode: "contain",
  },

  // Espaciado final
  finalSpacing: {
    height: 100,
  },

  // Estilos del modal de crear comunidad
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Sección de imagen
  imageSection: {
    marginBottom: 25,
  },
  imagePicker: {
    marginBottom: 15,
  },
  imagePlaceholder: {
    height: 140,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  imageSelectedContainer: {
    position: "relative",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageSelectedOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  imageSelectedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  imageButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#59C6C0",
    fontWeight: "600",
  },
  imageInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#2E7D2E",
    fontWeight: "500",
  },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  removeImageText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },

  // Sección de formulario
  formSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  // Sección de privacidad
  privacySection: {
    marginTop: 20,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#59C6C0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#59C6C0",
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  // Acciones del modal
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  createButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    backgroundColor: "#59C6C0",
    borderRadius: 12,
    marginLeft: 10,
  },
  createButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },
});

export default HomeScreen;
