import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, TextInput, Switch, Platform, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';
import { useRouter } from 'expo-router';

export default function Products() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [sellingProduct, setSellingProduct] = useState<any>(null);
  const [sellQty, setSellQty] = useState('1');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', stock: '' });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadProducts(); }, []));

  const loadProducts = async () => {
    try { const res = await api.get('/products/?active_only=false'); setProducts(res.data); } catch (err) { console.error(err); }
  };
  const onRefresh = async () => { setRefreshing(true); await loadProducts(); setRefreshing(false); };

  const openAdd = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', price: '', stock: '' });
    setImageUri(null);
    setExistingImageUrl(null);
    setShowModal(true);
  };
  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description || '', price: String(p.price), stock: String(p.stock) });
    setImageUri(null);
    setExistingImageUrl(p.image_url || null);
    setShowModal(true);
  };
  const openSell = (p: any) => { setSellingProduct(p); setSellQty('1'); setShowSellModal(true); };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a galeria para adicionar imagens.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Imagem do Produto', 'Escolha uma opcao', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      ...(imageUri || existingImageUrl ? [{ text: 'Remover', style: 'destructive' as const, onPress: () => { setImageUri(null); setExistingImageUrl(null); } }] : []),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageUri) return existingImageUrl;
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const res = await api.post('/products/upload-image', { image_data: base64 });
      return res.data.image_url;
    } catch (err) {
      console.error('Upload error:', err);
      return existingImageUrl;
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Erro', 'Nome e obrigatorio'); return; }
    if (!form.price || isNaN(Number(form.price))) { Alert.alert('Erro', 'Preco invalido'); return; }
    setSaving(true);
    try {
      const uploadedUrl = await uploadImage();
      const data: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        image_url: uploadedUrl,
      };
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
        Alert.alert('Sucesso', 'Produto atualizado!');
      } else {
        await api.post('/products/', data);
        Alert.alert('Sucesso', 'Produto criado!');
      }
      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: any) => {
    try { await api.put(`/products/${p.id}/toggle-active`); await loadProducts(); } catch { Alert.alert('Erro', 'Falha ao alterar status'); }
  };

  const handleSell = async () => {
    const qty = parseInt(sellQty);
    if (!qty || qty < 1) { Alert.alert('Erro', 'Quantidade invalida'); return; }
    try {
      const res = await api.post(`/products/${sellingProduct.id}/sell`, null, { params: { quantity: qty } });
      Alert.alert('Venda Registrada', `${res.data.message}\nTotal: R$ ${res.data.total.toFixed(2).replace('.', ',')}\nEstoque restante: ${res.data.remaining_stock}`);
      setShowSellModal(false); await loadProducts();
    } catch (err: any) { Alert.alert('Erro', err?.response?.data?.detail || 'Falha na venda'); }
  };

  const handleDelete = (p: any) => {
    Alert.alert('Excluir Produto', `Deseja excluir "${p.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { try { await api.delete(`/products/${p.id}`); await loadProducts(); } catch { Alert.alert('Erro', 'Falha ao excluir'); } } },
    ]);
  };

  const getImageSource = (item: any) => {
    if (!item.image_url) return null;
    if (item.image_url.startsWith('http')) return { uri: item.image_url };
    const baseUrl = api.defaults.baseURL || '';
    return { uri: `${baseUrl}${item.image_url}` };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Produtos</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addHeaderBtn} data-testid="add-promotion-btn">
          <Ionicons name="add" size={34} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum produto cadastrado</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.primary }]} onPress={openAdd}>
              <Text style={styles.emptyBtnText}>Adicionar Produto</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const imgSrc = getImageSource(item);
          return (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, !item.is_active && styles.cardInactive]}>
              <View style={styles.cardHeader}>
                {imgSrc ? (
                  <Image source={imgSrc} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImagePlaceholder, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]}>
                    <Ionicons name="cube" size={28} color={theme.primary} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: theme.text }]}>{item.name}</Text>
                  {item.description ? <Text style={[styles.productDesc, { color: theme.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
                </View>
                <View style={[styles.priceBox, { backgroundColor: theme.dark ? '#1A2744' : '#E8F0FE' }]}>
                  <Text style={[styles.priceText, { color: theme.primary }]}>R$ {Number(item.price).toFixed(2).replace('.', ',')}</Text>
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.stockBadge}>
                  <Ionicons name="cube" size={14} color={item.stock > 0 ? '#34C759' : '#FF3B30'} />
                  <Text style={[styles.stockText, { color: item.stock > 0 ? '#34C759' : '#FF3B30' }]}>Estoque: {item.stock}</Text>
                </View>
                <View style={styles.activeToggle}>
                  <Text style={[styles.activeLabel, { color: theme.textSecondary }]}>{item.is_active ? 'Ativo' : 'Inativo'}</Text>
                  <Switch value={item.is_active} onValueChange={() => handleToggleActive(item)} trackColor={{ true: '#34C759', false: theme.border }} />
                </View>
              </View>
              <View style={[styles.actionsRow, { borderTopColor: theme.divider }]}>
                {item.is_active && item.stock > 0 && (
                  <TouchableOpacity style={styles.sellBtn} onPress={() => openSell(item)}>
                    <Ionicons name="cart" size={16} color="#FFF" />
                    <Text style={styles.sellBtnText}>Vender</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.editBtn, { borderColor: theme.primary }]} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={16} color={theme.primary} />
                  <Text style={[styles.editBtnText, { color: theme.primary }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={[styles.modalContainer, { paddingTop: insets.top + 16, backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
              <TouchableOpacity onPress={() => setShowModal(false)}><Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancelar</Text></TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}><Text style={[styles.modalSave, { color: theme.primary }]}>{saving ? 'Salvando...' : 'Salvar'}</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              {/* Image Picker */}
              <Text style={[styles.label, { color: theme.text, marginTop: 0 }]}>Imagem</Text>
              <TouchableOpacity
                style={[styles.imagePicker, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
                onPress={showImageOptions}
                data-testid="product-image-picker"
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : existingImageUrl ? (
                  <Image source={{ uri: `${api.defaults.baseURL || ''}${existingImageUrl}` }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={36} color={theme.textMuted} />
                    <Text style={[styles.imagePlaceholderText, { color: theme.textMuted }]}>Adicionar Foto</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>Nome *</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="Nome do produto" placeholderTextColor={theme.textMuted} />
              <Text style={[styles.label, { color: theme.text }]}>Descricao</Text>
              <TextInput style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholder="Descricao" placeholderTextColor={theme.textMuted} multiline numberOfLines={3} />
              <Text style={[styles.label, { color: theme.text }]}>Preco (R$) *</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={form.price} onChangeText={v => setForm({ ...form, price: v })} placeholder="0.00" placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" />
              <Text style={[styles.label, { color: theme.text }]}>Estoque</Text>
              <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={form.stock} onChangeText={v => setForm({ ...form, stock: v })} placeholder="0" placeholderTextColor={theme.textMuted} keyboardType="number-pad" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sell Modal */}
      <Modal visible={showSellModal} animationType="fade" transparent onRequestClose={() => setShowSellModal(false)}>
        <View style={styles.sellOverlay}>
          <View style={[styles.sellCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.sellTitle, { color: theme.text }]}>Vender Produto</Text>
            <Text style={[styles.sellProductName, { color: theme.primary }]}>{sellingProduct?.name}</Text>
            <Text style={[styles.sellPrice, { color: theme.textSecondary }]}>R$ {Number(sellingProduct?.price || 0).toFixed(2).replace('.', ',')} / un</Text>
            <Text style={[styles.sellStock, { color: theme.textMuted }]}>Estoque: {sellingProduct?.stock}</Text>
            <Text style={[styles.label, { color: theme.text }]}>Quantidade</Text>
            <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={sellQty} onChangeText={setSellQty} keyboardType="number-pad" placeholderTextColor={theme.textMuted} />
            {sellQty && !isNaN(Number(sellQty)) && (
              <Text style={styles.sellTotal}>Total: R$ {(Number(sellingProduct?.price || 0) * Number(sellQty)).toFixed(2).replace('.', ',')}</Text>
            )}
            <View style={styles.sellActions}>
              <TouchableOpacity style={[styles.sellCancelBtn, { borderColor: theme.border }]} onPress={() => setShowSellModal(false)}>
                <Text style={[styles.sellCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sellConfirmBtn} onPress={handleSell}>
                <Ionicons name="cart" size={18} color="#FFF" />
                <Text style={styles.sellConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 22,
    borderBottomWidth: 1
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 12 },
  addHeaderBtn: { padding: 4, marginRight: 20 },
  list: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  emptyBtnText: { color: '#FFF', fontWeight: '600' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardInactive: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  productImage: { width: 56, height: 56, borderRadius: 10 },
  productImagePlaceholder: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '700' },
  productDesc: { fontSize: 13, marginTop: 2 },
  priceBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  priceText: { fontSize: 16, fontWeight: '800' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockText: { fontSize: 13, fontWeight: '600' },
  activeToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeLabel: { fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10 },
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#34C759', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  sellBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  editBtnText: { fontWeight: '600', fontSize: 13 },
  deleteBtn: { padding: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  modalScroll: { flex: 1 },
  modalContent: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  imagePicker: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', height: 160 },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 30 },
  imagePlaceholderText: { fontSize: 14, fontWeight: '500' },
  sellOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sellCard: { borderRadius: 16, padding: 24 },
  sellTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  sellProductName: { fontSize: 16, fontWeight: '600' },
  sellPrice: { fontSize: 14, marginTop: 4 },
  sellStock: { fontSize: 13, marginBottom: 16 },
  sellTotal: { fontSize: 18, fontWeight: '800', color: '#34C759', textAlign: 'center', marginTop: 12 },
  sellActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  sellCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  sellCancelText: { fontWeight: '600' },
  sellConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#34C759', paddingVertical: 12, borderRadius: 10 },
  sellConfirmText: { color: '#FFF', fontWeight: '700' },
});
