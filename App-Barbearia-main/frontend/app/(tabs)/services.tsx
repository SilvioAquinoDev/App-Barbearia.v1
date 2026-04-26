import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, RefreshControl,
} from 'react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function Services() {
  const { services, setServices } = useStore();
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', price: '', duration_minutes: '' });

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try { const r = await api.get('/services?active_only=false'); setServices(r.data); }
    catch { Alert.alert('Erro', 'Falha ao carregar servicos'); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadServices(); setRefreshing(false); };

  const handleAdd = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', price: '', duration_minutes: '30' });
    setModalVisible(true);
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    setFormData({ name: service.name, description: service.description || '', price: service.price.toString(), duration_minutes: service.duration_minutes.toString() });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.duration_minutes) { Alert.alert('Erro', 'Preencha todos os campos obrigatorios'); return; }
    try {
      const data = { name: formData.name, description: formData.description || null, price: parseFloat(formData.price), duration_minutes: parseInt(formData.duration_minutes) };
      if (editingService) { await api.put(`/services/${editingService.id}`, data); Alert.alert('Sucesso', 'Servico atualizado!'); }
      else { await api.post('/services/', data); Alert.alert('Sucesso', 'Servico criado!'); }
      setModalVisible(false);
      await loadServices();
    } catch { Alert.alert('Erro', 'Falha ao salvar servico'); }
  };

  const handleToggleActive = async (service: any) => {
    try { await api.put(`/services/${service.id}/toggle-active`); await loadServices(); }
    catch { Alert.alert('Erro', 'Falha ao atualizar servico'); }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={services}
        keyExtractor={(item: any) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={<Button title="Adicionar Servico" onPress={handleAdd} style={styles.addButton} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cut-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum servico cadastrado</Text>
          </View>
        }
        renderItem={({ item }: any) => (
          <Card>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, { color: theme.text }]}>{item.name}</Text>
                {item.description && <Text style={[styles.serviceDescription, { color: theme.textSecondary }]}>{item.description}</Text>}
              </View>
              <TouchableOpacity onPress={() => handleToggleActive(item)} style={[styles.statusDot, { backgroundColor: item.is_active ? '#34C759' : theme.textMuted }]} />
            </View>
            <View style={styles.serviceDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.text }]}>R$ {item.price.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.detailText, { color: theme.text }]}>{item.duration_minutes} min</Text>
              </View>
            </View>
            <View style={styles.serviceActions}>
              <Button title="Editar" variant="secondary" onPress={() => handleEdit(item)} style={styles.editButton} />
              <TouchableOpacity style={[styles.photosButton, { borderColor: theme.primary }]} onPress={() => router.push({ pathname: '/service-photos', params: { serviceId: item.id, serviceName: item.name } })}>
                <Ionicons name="camera-outline" size={18} color={theme.primary} />
                <Text style={[styles.photosButtonText, { color: theme.primary }]}>Fotos</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingService ? 'Editar Servico' : 'Novo Servico'}</Text>
            <View style={{ width: 28 }} />
          </View>
          <View style={styles.modalContent}>
            <Input label="Nome *" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Ex: Corte de cabelo" />
            <Input label="Descricao" value={formData.description} onChangeText={(text) => setFormData({ ...formData, description: text })} placeholder="Descricao do servico" multiline numberOfLines={3} />
            <Input label="Preco *" value={formData.price} onChangeText={(text) => setFormData({ ...formData, price: text })} placeholder="0.00" keyboardType="decimal-pad" />
            <Input label="Duracao (minutos) *" value={formData.duration_minutes} onChangeText={(text) => setFormData({ ...formData, duration_minutes: text })} placeholder="30" keyboardType="number-pad" />
            <Button title="Salvar" onPress={handleSave} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  addButton: { marginBottom: 16 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 16 },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  serviceDescription: { fontSize: 14 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 12 },
  serviceDetails: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 16, fontWeight: '600' },
  editButton: { marginTop: 8 },
  serviceActions: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  photosButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  photosButtonText: { fontSize: 14, fontWeight: '600' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalContent: { padding: 16 },
});
