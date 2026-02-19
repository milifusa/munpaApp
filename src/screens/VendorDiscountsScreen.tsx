import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import vendorService from '../services/vendorService';
import analyticsService from '../services/analyticsService';

const VendorDiscountsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('');
  const [hasMinPurchase, setHasMinPurchase] = useState(false);
  const [maxUses, setMaxUses] = useState('');
  const [hasMaxUses, setHasMaxUses] = useState(false);
  const [validFrom, setValidFrom] = useState(new Date());
  const [validUntil, setValidUntil] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showUntilDatePicker, setShowUntilDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    analyticsService.logScreenView('vendor_discounts');
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getDiscounts();
      const discountsData = response?.data || response || [];
      setDiscounts(Array.isArray(discountsData) ? discountsData : []);
    } catch (error) {
      console.error('❌ [DISCOUNTS] Error cargando descuentos:', error);
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setName('');
    setCode('');
    setDiscountType('percentage');
    setValue('');
    setMinPurchaseAmount('');
    setHasMinPurchase(false);
    setMaxUses('');
    setHasMaxUses(false);
    setValidFrom(new Date());
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setValidUntil(futureDate);
    setShowCreateModal(true);
  };

  const handleEdit = (discount: any) => {
    setEditingDiscount(discount);
    setName(discount.name || '');
    setCode(discount.code);
    setDiscountType(discount.type);
    setValue(String(discount.value));
    setMinPurchaseAmount(discount.minPurchaseAmount ? String(discount.minPurchaseAmount) : '');
    setHasMinPurchase(!!discount.minPurchaseAmount);
    setMaxUses(discount.maxUses ? String(discount.maxUses) : '');
    setHasMaxUses(!!discount.maxUses);
    setValidFrom(discount.validFrom ? new Date(discount.validFrom) : new Date());
    setValidUntil(discount.validUntil ? new Date(discount.validUntil) : new Date());
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre del descuento es requerido');
      return;
    }

    if (!code.trim()) {
      Alert.alert('Error', 'El código del descuento es requerido');
      return;
    }

    const valueNum = parseFloat(value);
    if (isNaN(valueNum) || valueNum <= 0) {
      Alert.alert('Error', 'El valor del descuento debe ser mayor a 0');
      return;
    }

    if (discountType === 'percentage' && valueNum > 100) {
      Alert.alert('Error', 'El porcentaje no puede ser mayor a 100');
      return;
    }

    try {
      setSaving(true);

      const data: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: discountType,
        value: valueNum,
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
      };

      if (hasMinPurchase && minPurchaseAmount) {
        const minPurchaseNum = parseFloat(minPurchaseAmount);
        if (!isNaN(minPurchaseNum) && minPurchaseNum > 0) {
          data.minPurchaseAmount = minPurchaseNum;
        }
      }

      if (hasMaxUses && maxUses) {
        const maxUsesNum = parseInt(maxUses, 10);
        if (!isNaN(maxUsesNum) && maxUsesNum > 0) {
          data.maxUses = maxUsesNum;
        }
      }

      if (editingDiscount) {
        await vendorService.updateDiscount(editingDiscount.id, data);
        Alert.alert('Éxito', 'Descuento actualizado correctamente');
      } else {
        await vendorService.createDiscount(data);
        Alert.alert('Éxito', 'Descuento creado correctamente');
      }

      setShowCreateModal(false);
      await loadDiscounts();
    } catch (error: any) {
      console.error('❌ [DISCOUNTS] Error guardando descuento:', error);
      const message = error.response?.data?.message || 'No se pudo guardar el descuento';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (discount: any) => {
    Alert.alert(
      'Eliminar Descuento',
      `¿Estás seguro que deseas eliminar el código "${discount.code}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vendorService.deleteDiscount(discount.id);
              Alert.alert('Éxito', 'Descuento eliminado');
              await loadDiscounts();
            } catch (error: any) {
              const message = error.response?.data?.message || 'No se pudo eliminar el descuento';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  const getDiscountStatus = (discount: any) => {
    const now = new Date();
    const validUntilDate = new Date(discount.validUntil);
    const validFromDate = discount.validFrom ? new Date(discount.validFrom) : null;

    if (validUntilDate < now) {
      return { label: 'Expirado', color: '#EF4444' };
    }
    if (validFromDate && validFromDate > now) {
      return { label: 'Próximamente', color: '#6B7280' };
    }
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return { label: 'Agotado', color: '#F59E0B' };
    }
    return { label: 'Activo', color: '#10B981' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#96d2d3" />
        <Text style={styles.loadingText}>Cargando descuentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Crea códigos de descuento para atraer más compradores. Puedes configurar descuentos por porcentaje o monto fijo.
          </Text>
        </View>

        {/* Botón crear */}
        <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
          <Ionicons name="pricetag" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Nuevo Descuento</Text>
        </TouchableOpacity>

        {/* Lista de descuentos */}
        {discounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No tienes descuentos</Text>
            <Text style={styles.emptyStateText}>
              Crea códigos de descuento para promocionar tus productos
            </Text>
          </View>
        ) : (
          discounts.map((discount) => {
            const status = getDiscountStatus(discount);
            return (
              <View key={discount.id} style={styles.discountCard}>
                <View style={styles.discountHeader}>
                  <View style={styles.discountCodeContainer}>
                    <Ionicons name="pricetag" size={20} color="#96d2d3" />
                    <Text style={styles.discountCode}>{discount.code}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.discountBody}>
                  {discount.name && (
                    <View style={styles.discountRow}>
                      <Ionicons name="text" size={18} color="#6B7280" />
                      <Text style={styles.discountLabel}>Nombre:</Text>
                      <Text style={styles.discountValue} numberOfLines={1}>
                        {discount.name}
                      </Text>
                    </View>
                  )}
                  <View style={styles.discountRow}>
                    <Ionicons name="gift" size={18} color="#6B7280" />
                    <Text style={styles.discountLabel}>Descuento:</Text>
                    <Text style={styles.discountValue}>
                      {discount.type === 'percentage'
                        ? `${discount.value}%`
                        : `$${discount.value}`}
                    </Text>
                  </View>

                  {(discount.minPurchaseAmount ?? discount.minPurchase) && (
                    <View style={styles.discountRow}>
                      <Ionicons name="cart" size={18} color="#6B7280" />
                      <Text style={styles.discountLabel}>Compra mínima:</Text>
                      <Text style={styles.discountValue}>
                        ${discount.minPurchaseAmount ?? discount.minPurchase}
                      </Text>
                    </View>
                  )}

                  {discount.validFrom && (
                    <View style={styles.discountRow}>
                      <Ionicons name="calendar" size={18} color="#6B7280" />
                      <Text style={styles.discountLabel}>Válido desde:</Text>
                      <Text style={styles.discountValue}>
                        {new Date(discount.validFrom).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.discountRow}>
                    <Ionicons name="calendar" size={18} color="#6B7280" />
                    <Text style={styles.discountLabel}>Válido hasta:</Text>
                    <Text style={styles.discountValue}>
                      {new Date(discount.validUntil).toLocaleDateString()}
                    </Text>
                  </View>

                  {discount.maxUses && (
                    <View style={styles.discountRow}>
                      <Ionicons name="people" size={18} color="#6B7280" />
                      <Text style={styles.discountLabel}>Usos:</Text>
                      <Text style={styles.discountValue}>
                        {discount.usedCount || 0} / {discount.maxUses}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.discountActions}>
                  <TouchableOpacity
                    style={styles.actionButtonSmall}
                    onPress={() => handleEdit(discount)}
                  >
                    <Ionicons name="create" size={18} color="#3B82F6" />
                    <Text style={styles.actionButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonSmall}
                    onPress={() => handleDelete(discount)}
                  >
                    <Ionicons name="trash" size={18} color="#EF4444" />
                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal Crear/Editar */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => !saving && setShowCreateModal(false)}
      >
        <ScrollView contentContainerStyle={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDiscount ? 'Editar Descuento' : 'Nuevo Descuento'}
              </Text>
              <TouchableOpacity
                onPress={() => !saving && setShowCreateModal(false)}
                disabled={saving}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Nombre */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Nombre <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ej: Descuento de verano"
                  placeholderTextColor="#9CA3AF"
                  editable={!saving}
                />
              </View>

              {/* Código */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Código <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={(text) => setCode(text.toUpperCase())}
                  placeholder="Ej: VERANO2026"
                  placeholderTextColor="#9CA3AF"
                  editable={!saving}
                  autoCapitalize="characters"
                />
              </View>

              {/* Tipo */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Tipo de Descuento <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      discountType === 'percentage' && styles.typeButtonActive,
                    ]}
                    onPress={() => setDiscountType('percentage')}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        discountType === 'percentage' && styles.typeButtonTextActive,
                      ]}
                    >
                      Porcentaje (%)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      discountType === 'fixed' && styles.typeButtonActive,
                    ]}
                    onPress={() => setDiscountType('fixed')}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        discountType === 'fixed' && styles.typeButtonTextActive,
                      ]}
                    >
                      Monto Fijo ($)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Valor */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Valor <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder={discountType === 'percentage' ? 'Ej: 10' : 'Ej: 5'}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  editable={!saving}
                />
              </View>

              {/* Compra mínima */}
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Compra mínima</Text>
                  <Switch
                    value={hasMinPurchase}
                    onValueChange={setHasMinPurchase}
                    trackColor={{ false: '#D1D5DB', true: '#96d2d3' }}
                    thumbColor="#FFFFFF"
                    disabled={saving}
                  />
                </View>
                {hasMinPurchase && (
                  <TextInput
                    style={styles.input}
                    value={minPurchaseAmount}
                    onChangeText={setMinPurchaseAmount}
                    placeholder="Ej: 20"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    editable={!saving}
                  />
                )}
              </View>

              {/* Usos máximos */}
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Límite de usos</Text>
                  <Switch
                    value={hasMaxUses}
                    onValueChange={setHasMaxUses}
                    trackColor={{ false: '#D1D5DB', true: '#96d2d3' }}
                    thumbColor="#FFFFFF"
                    disabled={saving}
                  />
                </View>
                {hasMaxUses && (
                  <TextInput
                    style={styles.input}
                    value={maxUses}
                    onChangeText={setMaxUses}
                    placeholder="Ej: 100"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    editable={!saving}
                  />
                )}
              </View>

              {/* Fechas de vigencia */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Válido desde <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowFromDatePicker(true)}
                  disabled={saving}
                >
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                  <Text style={styles.dateButtonText}>
                    {validFrom.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showFromDatePicker && (
                  <DateTimePicker
                    value={validFrom}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowFromDatePicker(false);
                      if (selectedDate) {
                        setValidFrom(selectedDate);
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Válido hasta <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowUntilDatePicker(true)}
                  disabled={saving}
                >
                  <Ionicons name="calendar" size={20} color="#6B7280" />
                  <Text style={styles.dateButtonText}>
                    {validUntil.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {showUntilDatePicker && (
                  <DateTimePicker
                    value={validUntil}
                    mode="date"
                    display="default"
                    minimumDate={validFrom}
                    onChange={(event, selectedDate) => {
                      setShowUntilDatePicker(false);
                      if (selectedDate) {
                        setValidUntil(selectedDate);
                      }
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#96d2d3',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  discountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  discountCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  discountBody: {
    marginBottom: 16,
    gap: 8,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  discountActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalOverlay: {
    flexGrow: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#96d2d3',
    backgroundColor: '#D1F2F2',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#96d2d3',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#96d2d3',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default VendorDiscountsScreen;
