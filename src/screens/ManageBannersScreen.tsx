import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';

const ALL_LINK_TYPES = [
  { value: 'none', label: 'Sin enlace', icon: 'ban-outline', color: '#9CA3AF' },
  { value: 'product', label: 'Producto', icon: 'cube-outline', color: '#10B981' },
  { value: 'products', label: 'Productos', icon: 'grid-outline', color: '#059669' },
  { value: 'product-category', label: 'Categoría', icon: 'folder-open-outline', color: '#F59E0B' },
  { value: 'article', label: 'Artículo', icon: 'newspaper-outline', color: '#3B82F6' },
  { value: 'appointment', label: 'Consulta', icon: 'calendar-outline', color: '#887CBC' },
];

const emptyForm = {
  imageUrl: '',
  title: '',
  description: '',
  linkType: 'none' as string,
  productId: '',
  productIds: [] as string[],
  productCategoryId: '',
  articleId: '',
  order: 0,
};

type ModalView = 'form' | 'single-product' | 'multi-products' | 'categories' | 'articles';

const ManageBannersScreen = () => {
  const { user } = useAuth();
  const accountType = user?.professionalProfile?.accountType || 'specialist';
  const isMedical = accountType !== 'service';

  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [modalView, setModalView] = useState<ModalView>('form');

  // Productos (single & multi)
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // Categorías
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  // Artículos
  const [articles, setArticles] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadBanners();
    }, [])
  );

  const loadBanners = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/professionals/me/banners');
      const data = res.data?.data || res.data || [];
      setBanners(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ [BANNERS] Error cargando:', error);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const res = await axiosInstance.get('/api/professionals/me/products-selector');
      const data = res.data?.data ?? res.data?.products ?? (Array.isArray(res.data) ? res.data : []);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('❌ [BANNER PRODUCTS] error:', err?.response?.status, err?.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await axiosInstance.get('/api/vendor/categories');
      const data = res.data?.data ?? res.data?.categories ?? (Array.isArray(res.data) ? res.data : []);
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('❌ [BANNER CATEGORIES] error:', err?.response?.status, err?.message);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadArticles = async (search = '') => {
    try {
      setLoadingArticles(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      let data: any[] = [];
      try {
        const res = await axiosInstance.get('/api/professionals/me/articles', { params });
        data = res.data?.data || res.data?.articles || res.data || [];
      } catch {
        const res = await axiosInstance.get('/api/articles', { params });
        data = res.data?.data || res.data?.articles || res.data || [];
      }
      setArticles(Array.isArray(data) ? data : []);
    } catch {
      setArticles([]);
    } finally {
      setLoadingArticles(false);
    }
  };

  // --- Pickers ---
  const openSingleProductPicker = () => {
    setModalView('single-product');
    if (products.length === 0) loadProducts();
  };

  const openMultiProductPicker = () => {
    setModalView('multi-products');
    if (products.length === 0) loadProducts();
  };

  const openCategoryPicker = () => {
    setModalView('categories');
    if (categories.length === 0) loadCategories();
  };

  const openArticlePicker = () => {
    setModalView('articles');
    setArticleSearch('');
    if (articles.length === 0) loadArticles();
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setForm(f => ({ ...f, productId: product.id }));
    setModalView('form');
  };

  const toggleProduct = (product: any) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
    setForm(f => {
      const ids = f.productIds.includes(product.id)
        ? f.productIds.filter(id => id !== product.id)
        : [...f.productIds, product.id];
      return { ...f, productIds: ids };
    });
  };

  const confirmMultiProducts = () => setModalView('form');

  const selectCategory = (cat: any) => {
    setSelectedCategory(cat);
    setForm(f => ({ ...f, productCategoryId: cat.id }));
    setModalView('form');
  };

  const selectArticle = (article: any) => {
    setSelectedArticle(article);
    setForm(f => ({ ...f, articleId: article.id }));
    setModalView('form');
  };

  // --- CRUD ---
  const openCreate = () => {
    setEditingId(null);
    setSelectedProduct(null);
    setSelectedProducts([]);
    setSelectedCategory(null);
    setSelectedArticle(null);
    setModalView('form');
    setForm({ ...emptyForm, order: banners.length });
    setShowModal(true);
  };

  const openEdit = (banner: any) => {
    setEditingId(banner.id);
    setSelectedProduct(banner.product || null);
    setSelectedProducts(banner.products || []);
    setSelectedCategory(banner.productCategory || null);
    setSelectedArticle(banner.article || null);
    setModalView('form');
    setForm({
      imageUrl: banner.imageUrl || '',
      title: banner.title || '',
      description: banner.description || '',
      linkType: banner.linkType || 'none',
      productId: banner.productId || '',
      productIds: Array.isArray(banner.productIds) ? banner.productIds : [],
      productCategoryId: banner.productCategoryId || '',
      articleId: banner.articleId || '',
      order: banner.order ?? 0,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setModalView('form');
    setForm({ ...emptyForm });
    setSelectedProduct(null);
    setSelectedProducts([]);
    setSelectedCategory(null);
    setSelectedArticle(null);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      try {
        setUploadingImage(true);
        const url = await imageUploadService.uploadBannerImage(result.assets[0].uri);
        setForm(f => ({ ...f, imageUrl: url }));
      } catch {
        Alert.alert('Error', 'No se pudo subir la imagen');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl) { Alert.alert('Error', 'La imagen es obligatoria'); return; }
    if (!form.title.trim()) { Alert.alert('Error', 'El título es obligatorio'); return; }
    if (form.linkType === 'product' && !form.productId) { Alert.alert('Error', 'Selecciona un producto'); return; }
    if (form.linkType === 'products' && form.productIds.length === 0) { Alert.alert('Error', 'Selecciona al menos un producto'); return; }
    if (form.linkType === 'product-category' && !form.productCategoryId) { Alert.alert('Error', 'Selecciona una categoría'); return; }
    if (form.linkType === 'article' && !form.articleId) { Alert.alert('Error', 'Selecciona un artículo'); return; }

    try {
      setSaving(true);
      const body: any = {
        imageUrl: form.imageUrl,
        title: form.title.trim(),
        description: form.description.trim(),
        linkType: form.linkType,
        order: form.order,
      };
      if (form.linkType === 'product') body.productId = form.productId;
      if (form.linkType === 'products') body.productIds = form.productIds;
      if (form.linkType === 'product-category') body.productCategoryId = form.productCategoryId;
      if (form.linkType === 'article') body.articleId = form.articleId;

      if (editingId) {
        await axiosInstance.put(`/api/professionals/me/banners/${editingId}`, body);
      } else {
        await axiosInstance.post('/api/professionals/me/banners', body);
      }
      closeModal();
      await loadBanners();
    } catch (error) {
      console.error('❌ [BANNERS] Error guardando:', error);
      Alert.alert('Error', 'No se pudo guardar el banner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (banner: any) => {
    Alert.alert(
      'Eliminar Banner',
      `¿Eliminar "${banner.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/api/professionals/me/banners/${banner.id}`);
              await loadBanners();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el banner');
            }
          },
        },
      ]
    );
  };

  const moveOrder = async (banner: any, direction: 'up' | 'down') => {
    const idx = banners.findIndex(b => b.id === banner.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= banners.length) return;
    const reordered = [...banners];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const withOrder = reordered.map((b, i) => ({ ...b, order: i }));
    setBanners(withOrder);
    try {
      await axiosInstance.post('/api/professionals/me/banners/reorder', {
        order: withOrder.map(b => ({ id: b.id, order: b.order })),
      });
    } catch {
      loadBanners();
    }
  };

  const getLinkConfig = (linkType: string) =>
    ALL_LINK_TYPES.find(t => t.value === linkType) || ALL_LINK_TYPES[0];

  const linkTypes = isMedical
    ? ALL_LINK_TYPES
    : ALL_LINK_TYPES.filter(t => t.value !== 'appointment');

  // Header title for each modal view
  const modalViewTitle: Record<ModalView, string> = {
    form: editingId ? 'Editar Banner' : 'Nuevo Banner',
    'single-product': 'Seleccionar Producto',
    'multi-products': 'Seleccionar Productos',
    categories: 'Seleccionar Categoría',
    articles: 'Seleccionar Artículo',
  };

  // ------- RENDER -------
  const renderBanner = ({ item, index }: { item: any; index: number }) => {
    const cfg = getLinkConfig(item.linkType);
    return (
      <View style={styles.bannerCard}>
        <View style={styles.bannerImageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} />
          ) : (
            <View style={styles.bannerImagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            </View>
          )}
          <View style={[styles.linkBadge, { backgroundColor: cfg.color }]}>
            <Text style={styles.linkBadgeText}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.bannerInfo}>
          <Text style={styles.bannerTitle} numberOfLines={1}>{item.title}</Text>
          {item.description ? (
            <Text style={styles.bannerDesc} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>

        <View style={styles.bannerActions}>
          <View style={styles.orderButtons}>
            <TouchableOpacity
              style={[styles.orderBtn, index === 0 && styles.orderBtnDisabled]}
              onPress={() => moveOrder(item, 'up')}
              disabled={index === 0}
            >
              <Ionicons name="chevron-up" size={16} color={index === 0 ? '#D1D5DB' : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.orderBtn, index === banners.length - 1 && styles.orderBtnDisabled]}
              onPress={() => moveOrder(item, 'down')}
              disabled={index === banners.length - 1}
            >
              <Ionicons name="chevron-down" size={16} color={index === banners.length - 1 ? '#D1D5DB' : '#6B7280'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#887CBC" />
        </View>
      ) : (
        <FlatList
          data={banners}
          renderItem={renderBanner}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Sin banners</Text>
              <Text style={styles.emptyText}>Crea banners para mostrar en tu perfil público</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ─── Modal único ─── */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalWrapper}
          >
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.modalHeader}>
                {modalView !== 'form' ? (
                  <TouchableOpacity onPress={() => setModalView('form')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={22} color="#1F2937" />
                  </TouchableOpacity>
                ) : null}
                <Text style={styles.modalTitle}>{modalViewTitle[modalView]}</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              {/* ── Vista: formulario ── */}
              {modalView === 'form' && (
                <>
                  <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                    {/* Imagen */}
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage} disabled={uploadingImage}>
                      {form.imageUrl ? (
                        <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} />
                      ) : (
                        <View style={styles.imagePickerPlaceholder}>
                          <Ionicons name="image-outline" size={36} color="#887CBC" />
                          <Text style={styles.imagePickerText}>Agregar imagen (16:9)</Text>
                        </View>
                      )}
                      {uploadingImage && (
                        <View style={styles.imageOverlay}>
                          <ActivityIndicator color="#FFFFFF" />
                        </View>
                      )}
                      <View style={styles.imageEditBadge}>
                        <Ionicons name="camera" size={14} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>

                    {/* Título */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Título <Text style={styles.required}>*</Text></Text>
                      <TextInput
                        style={styles.input}
                        value={form.title}
                        onChangeText={v => setForm(f => ({ ...f, title: v }))}
                        placeholder="Ej: Oferta especial"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>

                    {/* Descripción */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={form.description}
                        onChangeText={v => setForm(f => ({ ...f, description: v }))}
                        placeholder="Descripción del banner..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Tipo de enlace */}
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>Tipo de enlace</Text>
                      <View style={styles.linkTypeRow}>
                        {linkTypes.map(t => (
                          <TouchableOpacity
                            key={t.value}
                            style={[
                              styles.linkTypeBtn,
                              form.linkType === t.value && { backgroundColor: t.color, borderColor: t.color },
                            ]}
                            onPress={() => {
                              setForm(f => ({ ...f, linkType: t.value, productId: '', productIds: [], productCategoryId: '', articleId: '' }));
                              setSelectedProduct(null);
                              setSelectedProducts([]);
                              setSelectedCategory(null);
                              setSelectedArticle(null);
                            }}
                          >
                            <Ionicons
                              name={t.icon as any}
                              size={15}
                              color={form.linkType === t.value ? '#FFFFFF' : '#6B7280'}
                            />
                            <Text style={[
                              styles.linkTypeBtnText,
                              form.linkType === t.value && styles.linkTypeBtnTextActive,
                            ]}>{t.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* — Producto único — */}
                    {form.linkType === 'product' && (
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Producto <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={openSingleProductPicker}>
                          {selectedProduct ? (
                            <View style={styles.pickerSelected}>
                              {selectedProduct.photos?.[0] || selectedProduct.imageUrl ? (
                                <Image source={{ uri: selectedProduct.photos?.[0] || selectedProduct.imageUrl }} style={styles.pickerThumb} />
                              ) : (
                                <View style={[styles.pickerThumb, styles.pickerThumbPlaceholder]}>
                                  <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
                                </View>
                              )}
                              <View style={styles.pickerSelectedInfo}>
                                <Text style={styles.pickerSelectedName} numberOfLines={1}>{selectedProduct.title}</Text>
                                {selectedProduct.price != null && (
                                  <Text style={styles.pickerSelectedSub}>${selectedProduct.price}</Text>
                                )}
                              </View>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          ) : (
                            <View style={styles.pickerPlaceholder}>
                              <Ionicons name="cube-outline" size={20} color="#887CBC" />
                              <Text style={styles.pickerPlaceholderText}>Seleccionar producto</Text>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* — Múltiples productos — */}
                    {form.linkType === 'products' && (
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Productos <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={openMultiProductPicker}>
                          {selectedProducts.length > 0 ? (
                            <View style={styles.pickerSelected}>
                              <View style={styles.multiProductThumbs}>
                                {selectedProducts.slice(0, 3).map((p, i) => (
                                  p.photos?.[0] || p.imageUrl ? (
                                    <Image key={p.id} source={{ uri: p.photos?.[0] || p.imageUrl }} style={[styles.multiThumb, { marginLeft: i > 0 ? -10 : 0 }]} />
                                  ) : (
                                    <View key={p.id} style={[styles.multiThumb, styles.pickerThumbPlaceholder, { marginLeft: i > 0 ? -10 : 0 }]}>
                                      <Ionicons name="cube-outline" size={14} color="#9CA3AF" />
                                    </View>
                                  )
                                ))}
                              </View>
                              <View style={styles.pickerSelectedInfo}>
                                <Text style={styles.pickerSelectedName}>{selectedProducts.length} producto{selectedProducts.length !== 1 ? 's' : ''} seleccionado{selectedProducts.length !== 1 ? 's' : ''}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          ) : (
                            <View style={styles.pickerPlaceholder}>
                              <Ionicons name="grid-outline" size={20} color="#887CBC" />
                              <Text style={styles.pickerPlaceholderText}>Seleccionar productos</Text>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* — Categoría — */}
                    {form.linkType === 'product-category' && (
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Categoría <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={openCategoryPicker}>
                          {selectedCategory ? (
                            <View style={styles.pickerSelected}>
                              <View style={[styles.pickerThumb, styles.pickerThumbPlaceholder]}>
                                <Ionicons name="folder-open-outline" size={22} color="#F59E0B" />
                              </View>
                              <View style={styles.pickerSelectedInfo}>
                                <Text style={styles.pickerSelectedName} numberOfLines={1}>{selectedCategory.name}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          ) : (
                            <View style={styles.pickerPlaceholder}>
                              <Ionicons name="folder-open-outline" size={20} color="#887CBC" />
                              <Text style={styles.pickerPlaceholderText}>Seleccionar categoría</Text>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* — Artículo — */}
                    {form.linkType === 'article' && (
                      <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Artículo <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.pickerButton} onPress={openArticlePicker}>
                          {selectedArticle ? (
                            <View style={styles.pickerSelected}>
                              {selectedArticle.imageUrl ? (
                                <Image source={{ uri: selectedArticle.imageUrl }} style={styles.pickerThumb} />
                              ) : (
                                <View style={[styles.pickerThumb, styles.pickerThumbPlaceholder]}>
                                  <Ionicons name="newspaper-outline" size={18} color="#9CA3AF" />
                                </View>
                              )}
                              <View style={styles.pickerSelectedInfo}>
                                <Text style={styles.pickerSelectedName} numberOfLines={2}>{selectedArticle.title}</Text>
                              </View>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          ) : (
                            <View style={styles.pickerPlaceholder}>
                              <Ionicons name="newspaper-outline" size={20} color="#887CBC" />
                              <Text style={styles.pickerPlaceholderText}>Seleccionar artículo</Text>
                              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* — Consulta — */}
                    {form.linkType === 'appointment' && (
                      <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#887CBC" />
                        <Text style={styles.infoBoxText}>
                          El banner enlazará directamente a la pantalla de citas / consultas.
                        </Text>
                      </View>
                    )}

                    <View style={{ height: 20 }} />
                  </ScrollView>

                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving || uploadingImage}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>
                          {editingId ? 'Guardar cambios' : 'Crear Banner'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {/* ── Vista: producto único ── */}
              {modalView === 'single-product' && (
                loadingProducts ? (
                  <ActivityIndicator style={{ margin: 40 }} color="#887CBC" />
                ) : products.length === 0 ? (
                  <View style={styles.pickerEmpty}>
                    <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.pickerEmptyText}>No tienes productos publicados</Text>
                  </View>
                ) : (
                  <FlatList
                    data={products}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.pickerItem} onPress={() => selectProduct(item)}>
                        {item.photos?.[0] || item.imageUrl ? (
                          <Image source={{ uri: item.photos?.[0] || item.imageUrl }} style={styles.pickerItemImage} />
                        ) : (
                          <View style={[styles.pickerItemImage, styles.pickerThumbPlaceholder]}>
                            <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                          </View>
                        )}
                        <View style={styles.pickerItemInfo}>
                          <Text style={styles.pickerItemName} numberOfLines={2}>{item.title}</Text>
                          {item.price != null && <Text style={styles.pickerItemSub}>${item.price}</Text>}
                        </View>
                        {form.productId === item.id && (
                          <Ionicons name="checkmark-circle" size={22} color="#887CBC" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )
              )}

              {/* ── Vista: multi-productos ── */}
              {modalView === 'multi-products' && (
                <>
                  {loadingProducts ? (
                    <ActivityIndicator style={{ margin: 40 }} color="#887CBC" />
                  ) : products.length === 0 ? (
                    <View style={styles.pickerEmpty}>
                      <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.pickerEmptyText}>No tienes productos publicados</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={products}
                      keyExtractor={item => item.id}
                      contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 10 }}
                      renderItem={({ item }) => {
                        const isSelected = form.productIds.includes(item.id);
                        return (
                          <TouchableOpacity
                            style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                            onPress={() => toggleProduct(item)}
                          >
                            {item.photos?.[0] || item.imageUrl ? (
                              <Image source={{ uri: item.photos?.[0] || item.imageUrl }} style={styles.pickerItemImage} />
                            ) : (
                              <View style={[styles.pickerItemImage, styles.pickerThumbPlaceholder]}>
                                <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                              </View>
                            )}
                            <View style={styles.pickerItemInfo}>
                              <Text style={styles.pickerItemName} numberOfLines={2}>{item.title}</Text>
                              {item.price != null && <Text style={styles.pickerItemSub}>${item.price}</Text>}
                            </View>
                            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                              {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                            </View>
                          </TouchableOpacity>
                        );
                      }}
                    />
                  )}
                  {/* Botón confirmar multi */}
                  <TouchableOpacity style={styles.saveButton} onPress={confirmMultiProducts}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      Confirmar ({form.productIds.length} seleccionado{form.productIds.length !== 1 ? 's' : ''})
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── Vista: categorías ── */}
              {modalView === 'categories' && (
                loadingCategories ? (
                  <ActivityIndicator style={{ margin: 40 }} color="#887CBC" />
                ) : categories.length === 0 ? (
                  <View style={styles.pickerEmpty}>
                    <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
                    <Text style={styles.pickerEmptyText}>No hay categorías disponibles</Text>
                  </View>
                ) : (
                  <FlatList
                    data={categories}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, gap: 10 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.pickerItem} onPress={() => selectCategory(item)}>
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} style={styles.pickerItemImage} />
                        ) : (
                          <View style={[styles.pickerItemImage, styles.pickerThumbPlaceholder]}>
                            <Ionicons name="folder-open-outline" size={24} color="#F59E0B" />
                          </View>
                        )}
                        <View style={styles.pickerItemInfo}>
                          <Text style={styles.pickerItemName} numberOfLines={1}>{item.name}</Text>
                          {item.productCount != null && (
                            <Text style={styles.pickerItemSub}>{item.productCount} productos</Text>
                          )}
                        </View>
                        {form.productCategoryId === item.id && (
                          <Ionicons name="checkmark-circle" size={22} color="#887CBC" />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )
              )}

              {/* ── Vista: artículos ── */}
              {modalView === 'articles' && (
                <>
                  <View style={styles.pickerSearch}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                      style={styles.pickerSearchInput}
                      placeholder="Buscar artículo..."
                      placeholderTextColor="#9CA3AF"
                      value={articleSearch}
                      onChangeText={v => { setArticleSearch(v); loadArticles(v); }}
                    />
                  </View>
                  {loadingArticles ? (
                    <ActivityIndicator style={{ margin: 40 }} color="#887CBC" />
                  ) : articles.length === 0 ? (
                    <View style={styles.pickerEmpty}>
                      <Ionicons name="newspaper-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.pickerEmptyText}>No se encontraron artículos</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={articles}
                      keyExtractor={item => item.id}
                      contentContainerStyle={{ padding: 16, gap: 10 }}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.pickerItem} onPress={() => selectArticle(item)}>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.pickerItemImage} />
                          ) : (
                            <View style={[styles.pickerItemImage, styles.pickerThumbPlaceholder]}>
                              <Ionicons name="newspaper-outline" size={24} color="#9CA3AF" />
                            </View>
                          )}
                          <View style={styles.pickerItemInfo}>
                            <Text style={styles.pickerItemName} numberOfLines={2}>{item.title}</Text>
                            {item.category?.name && (
                              <Text style={styles.pickerItemSub}>{item.category.name}</Text>
                            )}
                          </View>
                          {form.articleId === item.id && (
                            <Ionicons name="checkmark-circle" size={22} color="#887CBC" />
                          )}
                        </TouchableOpacity>
                      )}
                    />
                  )}
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 90 },

  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  bannerImageContainer: { position: 'relative', width: '100%', height: 160 },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerImagePlaceholder: {
    width: '100%', height: '100%', backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  linkBadge: {
    position: 'absolute', top: 10, right: 10,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  linkBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  bannerInfo: { paddingHorizontal: 14, paddingVertical: 10 },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  bannerDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  bannerActions: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 12, gap: 8,
  },
  orderButtons: { flexDirection: 'row', gap: 4, marginRight: 4 },
  orderBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  orderBtnDisabled: { opacity: 0.4 },
  editBtn: {
    flex: 1, height: 36, borderRadius: 8,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  deleteBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#887CBC',
    justifyContent: 'center', alignItems: 'center',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalWrapper: { flex: 1, justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backButton: { marginRight: 8 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalScroll: { paddingHorizontal: 20, paddingTop: 16 },

  // Form fields
  imagePicker: {
    width: '100%', height: 180, borderRadius: 12, overflow: 'hidden',
    borderWidth: 2, borderColor: '#887CBC', marginBottom: 20, position: 'relative',
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerPlaceholder: {
    width: '100%', height: '100%', backgroundColor: '#EDE9FE',
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  imagePickerText: { fontSize: 13, color: '#887CBC', fontWeight: '500' },
  imageOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  imageEditBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: '#887CBC', width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  field: { marginBottom: 18 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#1F2937',
  },
  textArea: { height: 80, paddingTop: 14 },

  // Link type selector
  linkTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkTypeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#F3F4F6',
    gap: 5, borderWidth: 1, borderColor: 'transparent',
  },
  linkTypeBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  linkTypeBtnTextActive: { color: '#FFFFFF' },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#EDE9FE', borderRadius: 10, padding: 12, gap: 8, marginBottom: 8,
  },
  infoBoxText: { flex: 1, fontSize: 13, color: '#5B21B6', lineHeight: 18 },

  saveButton: {
    flexDirection: 'row', backgroundColor: '#887CBC', borderRadius: 12,
    padding: 16, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 12, gap: 8,
  },
  saveButtonDisabled: { backgroundColor: '#D1D5DB' },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Picker button (in form)
  pickerButton: {
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB',
    borderRadius: 12, overflow: 'hidden',
  },
  pickerPlaceholder: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  pickerPlaceholderText: { flex: 1, fontSize: 15, color: '#9CA3AF' },
  pickerSelected: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  pickerThumb: { width: 48, height: 48, borderRadius: 8, resizeMode: 'cover' },
  pickerThumbPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  pickerSelectedInfo: { flex: 1 },
  pickerSelectedName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  pickerSelectedSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // Multi-product thumbs
  multiProductThumbs: { flexDirection: 'row', alignItems: 'center' },
  multiThumb: { width: 36, height: 36, borderRadius: 6, resizeMode: 'cover', borderWidth: 2, borderColor: '#FFFFFF' },

  // Picker list views
  pickerSearch: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F3F4F6', borderRadius: 12, gap: 8,
  },
  pickerSearchInput: { flex: 1, fontSize: 15, color: '#1F2937' },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', padding: 10, gap: 12,
  },
  pickerItemSelected: { borderColor: '#887CBC', backgroundColor: '#F5F3FF' },
  pickerItemImage: { width: 56, height: 56, borderRadius: 8, resizeMode: 'cover' },
  pickerItemInfo: { flex: 1 },
  pickerItemName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  pickerItemSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  pickerEmpty: { alignItems: 'center', padding: 48, gap: 12 },
  pickerEmptyText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  // Checkbox for multi-select
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#887CBC', borderColor: '#887CBC' },
});

export default ManageBannersScreen;
