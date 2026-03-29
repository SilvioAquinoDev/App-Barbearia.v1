{/*import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Alert, FlatList, RefreshControl, Modal, ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

export default function PromotionsManage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', discount_percent: '', code: '', valid_until: '',
  });

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/promotions/all');
      setPromotions(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ title: '', description: '', discount_percent: '', code: '', valid_until: '' });
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (promo) => {
    setEditing(promo);
    setForm({
      title: promo.title || '',
      description: promo.description || '',
      discount_percent: promo.discount_percent ? String(promo.discount_percent) : '',
      code: promo.code || '',
      valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Erro', 'Informe o título da promoção');
      return;
    }
    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null,
        code: form.code.trim() || null,
        valid_until: form.valid_until || null,
      };
      if (editing) {
        await api.put(`/promotions/${editing.id}`, data);
        Alert.alert('Sucesso', 'Promoção atualizada!');
      } else {
        await api.post('/promotions/', data);
        Alert.alert('Sucesso', 'Promoção criada!');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar promoção');
    }
  };

  const handleToggle = async (promo) => {
    try {
      await api.put(`/promotions/${promo.id}`, { is_active: !promo.is_active });
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao alterar status');
    }
  };

  const handleDelete = (promo) => {
    const doDelete = async () => {
      try {
        await api.delete(`/promotions/${promo.id}`);
        Alert.alert('Sucesso', 'Promoção removida');
        loadData();
      } catch (e) {
        Alert.alert('Erro', 'Falha ao remover');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remover promoção "${promo.title}"?`)) doDelete();
    } else {
      Alert.alert('Confirmar', `Remover promoção "${promo.title}"?`, [
        { text: 'Cancelar' },
        { text: 'Remover', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={s.title}>Promoções</Text>
        <TouchableOpacity onPress={openAdd} style={s.addHeaderBtn} data-testid="add-promotion-btn">
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {promotions.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="pricetag-outline" size={56} color="#CCC" />
            <Text style={s.emptyText}>Nenhuma promoção criada</Text>
            <Text style={s.emptySubtext}>Crie promoções para atrair mais clientes!</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={s.emptyBtnText}>Criar Promoção</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map((promo) => (
            <View key={promo.id} style={[s.card, !promo.is_active && s.cardInactive]}>
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{promo.title}</Text>
                  {promo.description && <Text style={s.cardDesc}>{promo.description}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleToggle(promo)}>
                  <View style={[s.statusBadge, { backgroundColor: promo.is_active ? '#34C759' : '#FF3B30' }]}>
                    <Text style={s.statusText}>{promo.is_active ? 'Ativa' : 'Inativa'}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={s.cardDetails}>
                {promo.discount_percent && (
                  <View style={s.detailChip}>
                    <Ionicons name="pricetag" size={14} color="#FF6B00" />
                    <Text style={s.chipText}>{promo.discount_percent}% OFF</Text>
                  </View>
                )}
                {promo.code && (
                  <View style={s.detailChip}>
                    <Ionicons name="barcode" size={14} color="#007AFF" />
                    <Text style={s.chipText}>{promo.code}</Text>
                  </View>
                )}
                {promo.valid_until && (
                  <View style={s.detailChip}>
                    <Ionicons name="calendar" size={14} color="#666" />
                    <Text style={s.chipText}>Até {new Date(promo.valid_until).toLocaleDateString('pt-BR')}</Text>
                  </View>
                )}
              </View>

              <View style={s.cardActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(promo)}>
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                  <Text style={[s.actionText, { color: '#007AFF' }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(promo)}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={[s.actionText, { color: '#FF3B30' }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Form Modal /}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Editar Promoção' : 'Nova Promoção'}</Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <Text style={s.label}>Título *</Text>
              <TextInput style={s.input} value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="Ex: Corte + Barba com 20% OFF" data-testid="promo-title-input" />

              <Text style={s.label}>Descrição</Text>
              <TextInput style={[s.input, s.textArea]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Detalhes da promoção..." multiline numberOfLines={3} />

              <Text style={s.label}>Desconto (%)</Text>
              <TextInput style={s.input} value={form.discount_percent} onChangeText={(v) => setForm({ ...form, discount_percent: v })} placeholder="20" keyboardType="numeric" />

              <Text style={s.label}>Código Promocional</Text>
              <TextInput style={s.input} value={form.code} onChangeText={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="EX: CORTE20" autoCapitalize="characters" />

              <Text style={s.label}>Válido até (AAAA-MM-DD)</Text>
              <TextInput style={s.input} value={form.valid_until} onChangeText={(v) => setForm({ ...form, valid_until: v })} placeholder="2026-12-31" keyboardType="numbers-and-punctuation" />
            </ScrollView>

            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowForm(false); resetForm(); }}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} data-testid="save-promotion-btn">
                <Text style={s.saveBtnText}>{editing ? 'Atualizar' : 'Criar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#333', marginLeft: 12 },
  addHeaderBtn: { padding: 4 },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#BBB', marginTop: 4 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#666', lineHeight: 20 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#444' },
  cardActions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  modalBody: { padding: 20, maxHeight: 400 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#FAFAFA' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 16 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#007AFF', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});*/}




import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Alert, FlatList, RefreshControl, Modal, ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

export default function PromotionsManage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', discount_percent: '', code: '', valid_until: '',
  });

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/promotions/all');
      setPromotions(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ title: '', description: '', discount_percent: '', code: '', valid_until: '' });
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (promo) => {
    setEditing(promo);
    setForm({
      title: promo.title || '',
      description: promo.description || '',
      discount_percent: promo.discount_percent ? String(promo.discount_percent) : '',
      code: promo.code || '',
      valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert('Erro', 'Informe o título da promoção');
      return;
    }
    try {
      const data = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : null,
        code: form.code.trim() || null,
        valid_until: form.valid_until || null,
      };
      if (editing) {
        await api.put(`/promotions/${editing.id}`, data);
        Alert.alert('Sucesso', 'Promoção atualizada!');
      } else {
        await api.post('/promotions/', data);
        Alert.alert('Sucesso', 'Promoção criada!');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar promoção');
    }
  };

  const handleToggle = async (promo) => {
    try {
      await api.put(`/promotions/${promo.id}`, { is_active: !promo.is_active });
      loadData();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao alterar status');
    }
  };

  const handleDelete = (promo) => {
    const doDelete = async () => {
      try {
        await api.delete(`/promotions/${promo.id}`);
        Alert.alert('Sucesso', 'Promoção removida');
        loadData();
      } catch (e) {
        Alert.alert('Erro', 'Falha ao remover');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remover promoção "${promo.title}"?`)) doDelete();
    } else {
      Alert.alert('Confirmar', `Remover promoção "${promo.title}"?`, [
        { text: 'Cancelar' },
        { text: 'Remover', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.background }]}>
      <View style={[s.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.text }]}>Promoções</Text>
        <TouchableOpacity onPress={openAdd} style={s.addHeaderBtn} data-testid="add-promotion-btn">
          <Ionicons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadData(); }} 
            tintColor={theme.primary}
          />
        }
      >
        {promotions.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="pricetag-outline" size={56} color={theme.textMuted} />
            <Text style={[s.emptyText, { color: theme.textMuted }]}>Nenhuma promoção criada</Text>
            <Text style={[s.emptySubtext, { color: theme.textMuted }]}>Crie promoções para atrair mais clientes!</Text>
            <TouchableOpacity style={[s.emptyBtn, { backgroundColor: theme.primary }]} onPress={openAdd}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={s.emptyBtnText}>Criar Promoção</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map((promo) => (
            <View 
              key={promo.id} 
              style={[
                s.card, 
                { 
                  backgroundColor: theme.card, 
                  borderColor: theme.border,
                  shadowColor: theme.dark ? '#000' : '#000',
                },
                !promo.is_active && s.cardInactive
              ]}
            >
              <View style={s.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: theme.text }]}>{promo.title}</Text>
                  {promo.description && <Text style={[s.cardDesc, { color: theme.textSecondary }]}>{promo.description}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleToggle(promo)}>
                  <View style={[s.statusBadge, { backgroundColor: promo.is_active ? '#34C759' : '#FF3B30' }]}>
                    <Text style={s.statusText}>{promo.is_active ? 'Ativa' : 'Inativa'}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={s.cardDetails}>
                {promo.discount_percent && (
                  <View style={[s.detailChip, { backgroundColor: theme.dark ? '#1A2744' : '#F0F0F0' }]}>
                    <Ionicons name="pricetag" size={14} color={theme.primary} />
                    <Text style={[s.chipText, { color: theme.textSecondary }]}>{promo.discount_percent}% OFF</Text>
                  </View>
                )}
                {promo.code && (
                  <View style={[s.detailChip, { backgroundColor: theme.dark ? '#1A2744' : '#F0F0F0' }]}>
                    <Ionicons name="barcode" size={14} color={theme.primary} />
                    <Text style={[s.chipText, { color: theme.textSecondary }]}>{promo.code}</Text>
                  </View>
                )}
                {promo.valid_until && (
                  <View style={[s.detailChip, { backgroundColor: theme.dark ? '#1A2744' : '#F0F0F0' }]}>
                    <Ionicons name="calendar" size={14} color={theme.textSecondary} />
                    <Text style={[s.chipText, { color: theme.textSecondary }]}>
                      Até {new Date(promo.valid_until).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[s.cardActions, { borderTopColor: theme.divider }]}>
                <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(promo)}>
                  <Ionicons name="create-outline" size={18} color={theme.primary} />
                  <Text style={[s.actionText, { color: theme.primary }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(promo)}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={[s.actionText, { color: '#FF3B30' }]}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: theme.card }]}>
            <View style={[s.modalHeader, { borderBottomColor: theme.divider }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>
                {editing ? 'Editar Promoção' : 'Nova Promoção'}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <Text style={[s.label, { color: theme.text }]}>Título *</Text>
              <TextInput 
                style={[s.input, { 
                  backgroundColor: theme.inputBg, 
                  borderColor: theme.inputBorder, 
                  color: theme.text 
                }]} 
                value={form.title} 
                onChangeText={(v) => setForm({ ...form, title: v })} 
                placeholder="Ex: Corte + Barba com 20% OFF" 
                placeholderTextColor={theme.textMuted}
                data-testid="promo-title-input" 
              />

              <Text style={[s.label, { color: theme.text }]}>Descrição</Text>
              <TextInput 
                style={[s.input, s.textArea, { 
                  backgroundColor: theme.inputBg, 
                  borderColor: theme.inputBorder, 
                  color: theme.text 
                }]} 
                value={form.description} 
                onChangeText={(v) => setForm({ ...form, description: v })} 
                placeholder="Detalhes da promoção..." 
                placeholderTextColor={theme.textMuted}
                multiline 
                numberOfLines={3} 
              />

              <Text style={[s.label, { color: theme.text }]}>Desconto (%)</Text>
              <TextInput 
                style={[s.input, { 
                  backgroundColor: theme.inputBg, 
                  borderColor: theme.inputBorder, 
                  color: theme.text 
                }]} 
                value={form.discount_percent} 
                onChangeText={(v) => setForm({ ...form, discount_percent: v })} 
                placeholder="20" 
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric" 
              />

              <Text style={[s.label, { color: theme.text }]}>Código Promocional</Text>
              <TextInput 
                style={[s.input, { 
                  backgroundColor: theme.inputBg, 
                  borderColor: theme.inputBorder, 
                  color: theme.text 
                }]} 
                value={form.code} 
                onChangeText={(v) => setForm({ ...form, code: v.toUpperCase() })} 
                placeholder="EX: CORTE20" 
                placeholderTextColor={theme.textMuted}
                autoCapitalize="characters" 
              />

              <Text style={[s.label, { color: theme.text }]}>Válido até (AAAA-MM-DD)</Text>
              <TextInput 
                style={[s.input, { 
                  backgroundColor: theme.inputBg, 
                  borderColor: theme.inputBorder, 
                  color: theme.text 
                }]} 
                value={form.valid_until} 
                onChangeText={(v) => setForm({ ...form, valid_until: v })} 
                placeholder="2026-12-31" 
                placeholderTextColor={theme.textMuted}
                keyboardType="numbers-and-punctuation" 
              />
            </ScrollView>

            <View style={[s.modalFooter, { borderTopColor: theme.divider }]}>
              <TouchableOpacity 
                style={[s.cancelBtn, { borderColor: theme.border }]} 
                onPress={() => { setShowForm(false); resetForm(); }}
              >
                <Text style={[s.cancelBtnText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.saveBtn, { backgroundColor: theme.primary }]} 
                onPress={handleSave} 
                data-testid="save-promotion-btn"
              >
                <Text style={s.saveBtnText}>{editing ? 'Atualizar' : 'Criar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    paddingTop: 42, 
    borderBottomWidth: 1 
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', marginLeft: 12 },
  addHeaderBtn: { padding: 4 },
  content: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 4 },
  emptyBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 10, 
    marginTop: 20 
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  card: { 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 14, 
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3 
  },
  cardInactive: { opacity: 0.6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  cardDesc: { fontSize: 14, lineHeight: 20 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  detailChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8 
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  cardActions: { 
    flexDirection: 'row', 
    gap: 12, 
    borderTopWidth: 1, 
    paddingTop: 12 
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 14, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1 
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20, maxHeight: 400 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalFooter: { 
    flexDirection: 'row', 
    gap: 12, 
    padding: 20, 
    borderTopWidth: 1 
  },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  cancelBtnText: { fontWeight: '600', fontSize: 16 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
