import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, RefreshControl } from 'react-native';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Cash() {
  const { theme } = useTheme();
  const { currentCashRegister, setCurrentCashRegister } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [openModalVisible, setOpenModalVisible] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadCurrentCash(); }, []);

  const loadCurrentCash = async () => {
    try { const r = await api.get('/cash-register/current'); setCurrentCashRegister(r.data); }
    catch (e: any) { if (e.response?.status !== 404) Alert.alert('Erro', 'Falha ao carregar caixa'); setCurrentCashRegister(null); }
  };
  const onRefresh = async () => { setRefreshing(true); await loadCurrentCash(); setRefreshing(false); };

  const handleOpenCash = async () => {
    if (!openingBalance) { Alert.alert('Erro', 'Informe o saldo inicial'); return; }
    setLoading(true);
    try {
      const r = await api.post('/cash-register/open', { opening_balance: parseFloat(openingBalance) });
      setCurrentCashRegister(r.data); setOpenModalVisible(false); setOpeningBalance(''); Alert.alert('Sucesso', 'Caixa aberto!');
    } catch { Alert.alert('Erro', 'Falha ao abrir caixa'); } finally { setLoading(false); }
  };

  const handleCloseCash = async () => {
    if (!closingBalance) { Alert.alert('Erro', 'Informe o saldo final'); return; }
    setLoading(true);
    try {
      await api.post('/cash-register/close', { closing_balance: parseFloat(closingBalance) });
      setCurrentCashRegister(null); setCloseModalVisible(false); setClosingBalance(''); Alert.alert('Sucesso', 'Caixa fechado!');
    } catch { Alert.alert('Erro', 'Falha ao fechar caixa'); } finally { setLoading(false); }
  };

  const totalRevenue = (currentCashRegister?.total_services || 0) + (currentCashRegister?.total_products || 0);
  const expectedBalance = (currentCashRegister?.opening_balance || 0) + totalRevenue;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
      {!currentCashRegister ? (
        <View style={styles.closedCash}>
          <Card style={styles.closedCard}>
            <Ionicons name="lock-closed" size={64} color={theme.textMuted} />
            <Text style={[styles.closedTitle, { color: theme.text }]}>Caixa Fechado</Text>
            <Text style={[styles.closedText, { color: theme.textSecondary }]}>Abra o caixa para comecar a trabalhar</Text>
            <Button title="Abrir Caixa" onPress={() => setOpenModalVisible(true)} style={styles.openButton} />
          </Card>
        </View>
      ) : (
        <>
          <Card>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Caixa Aberto</Text>
            </View>
            <Text style={[styles.openedTime, { color: theme.textSecondary }]}>
              Aberto em {format(new Date(currentCashRegister.opened_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
            </Text>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Movimentacoes</Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Saldo Inicial</Text>
              <Text style={[styles.balanceValue, { color: theme.text }]}>R$ {currentCashRegister.opening_balance.toFixed(2)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Servicos</Text>
              <Text style={[styles.balanceValue, styles.positive]}>+ R$ {currentCashRegister.total_services.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Produtos</Text>
              <Text style={[styles.balanceValue, styles.positive]}>+ R$ {currentCashRegister.total_products.toFixed(2)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.balanceRow}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Saldo Esperado</Text>
              <Text style={[styles.totalValue, { color: theme.primary }]}>R$ {expectedBalance.toFixed(2)}</Text>
            </View>
          </Card>
          <Button title="Fechar Caixa" variant="danger" onPress={() => setCloseModalVisible(true)} />
        </>
      )}

      {/* Open Cash Modal */}
      <Modal visible={openModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Abrir Caixa</Text>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalText, { color: theme.text }]}>Informe o saldo inicial em dinheiro no caixa:</Text>
            <Input label="Saldo Inicial (R$)" value={openingBalance} onChangeText={setOpeningBalance} placeholder="0.00" keyboardType="decimal-pad" />
            <Button title="Abrir Caixa" onPress={handleOpenCash} loading={loading} />
            <Button title="Cancelar" variant="secondary" onPress={() => setOpenModalVisible(false)} style={styles.cancelButton} />
          </View>
        </View>
      </Modal>

      {/* Close Cash Modal */}
      <Modal visible={closeModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Fechar Caixa</Text>
          </View>
          <View style={styles.modalContent}>
            <Text style={[styles.modalText, { color: theme.text }]}>Saldo esperado: R$ {expectedBalance.toFixed(2)}</Text>
            <Text style={[styles.modalSubtext, { color: theme.textSecondary }]}>Informe o saldo real em dinheiro:</Text>
            <Input label="Saldo Final (R$)" value={closingBalance} onChangeText={setClosingBalance} placeholder="0.00" keyboardType="decimal-pad" />
            <Button title="Fechar Caixa" variant="danger" onPress={handleCloseCash} loading={loading} />
            <Button title="Cancelar" variant="secondary" onPress={() => setCloseModalVisible(false)} style={styles.cancelButton} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  closedCash: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  closedCard: { alignItems: 'center', padding: 32 },
  closedTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  closedText: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  openButton: { minWidth: 200 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#34C759', marginRight: 8 },
  statusText: { fontSize: 18, fontWeight: 'bold', color: '#34C759' },
  openedTime: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  balanceLabel: { fontSize: 16 },
  balanceValue: { fontSize: 16, fontWeight: '600' },
  positive: { color: '#34C759' },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  divider: { height: 1, marginVertical: 8 },
  modal: { flex: 1 },
  modalHeader: { padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  modalContent: { padding: 16 },
  modalText: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
  modalSubtext: { fontSize: 14, marginBottom: 16 },
  cancelButton: { marginTop: 12 },
});
