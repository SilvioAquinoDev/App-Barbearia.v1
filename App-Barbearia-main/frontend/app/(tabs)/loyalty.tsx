import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

export default function Loyalty() {
  const { theme } = useTheme();
  const [config, setConfig] = useState({ points_per_real: 1, redemption_threshold: 100, reward_description: '1 Corte Gratis', is_active: true });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({ client_phone: '', client_name: '', points: '' });
  const [configForm, setConfigForm] = useState({ ...config });

  const loadData = useCallback(async () => {
    try {
      const [configRes, clientsRes] = await Promise.all([api.get('/loyalty/config'), api.get('/loyalty/clients')]);
      setConfig(configRes.data); setConfigForm(configRes.data); setClients(clientsRes.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveConfig = async () => {
    try { await api.put('/loyalty/config', configForm); setConfig(configForm); setShowConfig(false); Alert.alert('Sucesso', 'Configuracao salva'); }
    catch { Alert.alert('Erro', 'Falha ao salvar'); }
  };

  const addPoints = async () => {
    if (!addForm.client_phone || !addForm.points) { Alert.alert('Erro', 'Preencha telefone e pontos'); return; }
    try {
      await api.post('/loyalty/add-points', { client_phone: addForm.client_phone, client_name: addForm.client_name || null, points: parseInt(addForm.points), description: 'Pontos manuais' });
      setShowAdd(false); setAddForm({ client_phone: '', client_name: '', points: '' }); loadData(); Alert.alert('Sucesso', `${addForm.points} pontos adicionados`);
    } catch { Alert.alert('Erro', 'Falha ao adicionar pontos'); }
  };

  const redeemPoints = async (phone: string) => {
    Alert.alert('Resgatar', `Resgatar ${config.redemption_threshold} pontos por "${config.reward_description}"?`, [
      { text: 'Cancelar' },
      { text: 'Resgatar', onPress: async () => {
        try { const res = await api.post('/loyalty/redeem', { client_phone: phone }); Alert.alert('Sucesso', res.data.message); loadData(); }
        catch (e: any) { Alert.alert('Erro', e.response?.data?.detail || 'Falha'); }
      }},
    ]);
  };

  const loadHistory = async (phone: string) => {
    try { const res = await api.get(`/loyalty/client/${phone}/history`); setHistory(res.data); setShowHistory(phone); }
    catch { Alert.alert('Erro', 'Falha ao carregar historico'); }
  };

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.primary} />}>
        <View style={[styles.configCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.configRow}><Text style={[styles.configLabel, { color: theme.textSecondary }]}>R$1 =</Text><Text style={[styles.configValue, { color: theme.text }]}>{config.points_per_real} ponto(s)</Text></View>
          <View style={styles.configRow}><Text style={[styles.configLabel, { color: theme.textSecondary }]}>Meta:</Text><Text style={[styles.configValue, { color: theme.text }]}>{config.redemption_threshold} pts</Text></View>
          <View style={styles.configRow}><Text style={[styles.configLabel, { color: theme.textSecondary }]}>Premio:</Text><Text style={[styles.configValue, { color: theme.text }]}>{config.reward_description}</Text></View>
          <View style={[styles.statusBadge, { backgroundColor: config.is_active ? '#34C759' : '#FF3B30' }]}><Text style={styles.statusText}>{config.is_active ? 'Ativo' : 'Inativo'}</Text></View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Clientes ({clients.length})</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={() => setShowAdd(true)} data-testid="add-points-btn">
            <Ionicons name="add" size={20} color="#FFF" /><Text style={styles.addBtnText}>Adicionar Pontos</Text>
          </TouchableOpacity>
        </View>

        {clients.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum cliente com pontos ainda</Text>
            <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Pontos sao concedidos automaticamente ao concluir servicos</Text>
          </View>
        ) : (
          clients.map((c: any) => (
            <View key={c.id} style={[styles.clientCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.clientTop}>
                <View><Text style={[styles.clientName, { color: theme.text }]}>{c.client_name || c.client_phone}</Text><Text style={[styles.clientPhone, { color: theme.textSecondary }]}>{c.client_phone}</Text></View>
                <View style={styles.pointsBadge}><Text style={[styles.pointsNum, { color: theme.primary }]}>{c.points}</Text><Text style={[styles.pointsLabel, { color: theme.textSecondary }]}>pts</Text></View>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.divider }]}>
                <View style={[styles.progressFill, { width: `${Math.min((c.points / config.redemption_threshold) * 100, 100)}%` }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.textMuted }]}>{Math.max(config.redemption_threshold - c.points, 0)} pontos para resgate</Text>
              <View style={styles.clientActions}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: theme.primary }]} onPress={() => loadHistory(c.client_phone)}>
                  <Ionicons name="time-outline" size={16} color={theme.primary} /><Text style={[styles.actionText, { color: theme.primary }]}>Historico</Text>
                </TouchableOpacity>
                {c.points >= config.redemption_threshold && (
                  <TouchableOpacity style={[styles.actionBtn, styles.redeemBtn]} onPress={() => redeemPoints(c.client_phone)}>
                    <Ionicons name="gift-outline" size={16} color="#FFF" /><Text style={[styles.actionText, { color: '#FFF' }]}>Resgatar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Config Modal */}
      <Modal visible={showConfig} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Configurar Fidelidade</Text>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Pontos por R$1</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={String(configForm.points_per_real)} onChangeText={(v) => setConfigForm({...configForm, points_per_real: parseFloat(v) || 0})} keyboardType="numeric" placeholderTextColor={theme.textMuted} />
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Meta de pontos para resgate</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={String(configForm.redemption_threshold)} onChangeText={(v) => setConfigForm({...configForm, redemption_threshold: parseInt(v) || 0})} keyboardType="numeric" placeholderTextColor={theme.textMuted} />
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Descricao do premio</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={configForm.reward_description} onChangeText={(v) => setConfigForm({...configForm, reward_description: v})} placeholderTextColor={theme.textMuted} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowConfig(false)}><Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={saveConfig}><Text style={styles.saveBtnText}>Salvar</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* Add Points Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Adicionar Pontos</Text>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Telefone do cliente</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={addForm.client_phone} onChangeText={(v) => setAddForm({...addForm, client_phone: v})} keyboardType="phone-pad" placeholder="(11) 99999-9999" placeholderTextColor={theme.textMuted} />
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nome (opcional)</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={addForm.client_name} onChangeText={(v) => setAddForm({...addForm, client_name: v})} placeholder="Nome do cliente" placeholderTextColor={theme.textMuted} />
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Pontos</Text>
          <TextInput style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]} value={addForm.points} onChangeText={(v) => setAddForm({...addForm, points: v})} keyboardType="numeric" placeholder="100" placeholderTextColor={theme.textMuted} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: theme.border }]} onPress={() => setShowAdd(false)}><Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancelar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={addPoints}><Text style={styles.saveBtnText}>Adicionar</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* History Modal */}
      <Modal visible={!!showHistory} animationType="slide" transparent>
        <View style={styles.modalOverlay}><View style={[styles.modal, { backgroundColor: theme.card }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Historico de Pontos</Text>
          {history.length === 0 ? <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhuma transacao</Text> : (
            <FlatList data={history} keyExtractor={(item) => String(item.id)} style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <View style={[styles.historyItem, { borderBottomColor: theme.divider }]}>
                  <View><Text style={[styles.historyDesc, { color: theme.text }]}>{item.description}</Text><Text style={[styles.historyDate, { color: theme.textMuted }]}>{new Date(item.created_at).toLocaleDateString('pt-BR')}</Text></View>
                  <Text style={[styles.historyPoints, { color: item.type === 'earn' ? '#34C759' : '#FF3B30' }]}>{item.type === 'earn' ? '+' : '-'}{item.points}</Text>
                </View>
              )}
            />
          )}
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 16 }]} onPress={() => setShowHistory(null)}><Text style={styles.saveBtnText}>Fechar</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  configCard: { margin: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  configRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  configLabel: { fontSize: 14 },
  configValue: { fontSize: 14, fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySubtext: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  clientCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16, borderWidth: 1 },
  clientTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 16, fontWeight: '600' },
  clientPhone: { fontSize: 13, marginTop: 2 },
  pointsBadge: { alignItems: 'center' },
  pointsNum: { fontSize: 24, fontWeight: '800' },
  pointsLabel: { fontSize: 11 },
  progressBar: { height: 6, borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 3 },
  progressText: { fontSize: 12, marginTop: 4 },
  clientActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '500' },
  redeemBtn: { backgroundColor: '#34C759', borderColor: '#34C759' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '600' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  historyDesc: { fontSize: 14 },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyPoints: { fontSize: 16, fontWeight: '700' },
});
