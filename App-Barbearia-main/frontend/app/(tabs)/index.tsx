import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useStore } from '../../src/store/useStore';
import Card from '../../src/components/Card';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../../src/services/notifications';

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { appointments, services, currentCashRegister, setAppointments, setServices, setCurrentCashRegister } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingAppointments: 0,
    totalServices: 0,
  });

  useEffect(() => {
    loadData();
    setupPushNotifications();
    const cleanup = setupNotificationListeners(
      () => loadData(),
      () => {}
    );
    return cleanup;
  }, []);

  const setupPushNotifications = async () => {
    try { await registerForPushNotificationsAsync(); } catch (e) {}
  };

  const loadData = async () => {
    try {
      const [appointmentsRes, servicesRes, cashRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/services'),
        api.get('/cash-register/current').catch(() => ({ data: null })),
      ]);
      setAppointments(appointmentsRes.data);
      setServices(servicesRes.data);
      setCurrentCashRegister(cashRes.data);
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = appointmentsRes.data.filter((a: any) => a.scheduled_time.startsWith(today)).length;
      const pending = appointmentsRes.data.filter((a: any) => a.status === 'pending').length;
      setStats({ todayAppointments: todayAppts, pendingAppointments: pending, totalServices: servicesRes.data.length });
    } catch (error: any) {
      if (error.response?.status !== 404) Alert.alert('Erro', 'Falha ao carregar dados');
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <View style={styles.welcome}>
        <Text style={[styles.welcomeText, { color: theme.text }]}>Ola, {user?.name}!</Text>
        <Text style={[styles.welcomeSubtext, { color: theme.textSecondary }]}>
          {currentCashRegister ? 'Caixa aberto' : 'Caixa fechado'}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="calendar" title="Hoje" value={stats.todayAppointments} color="#007AFF" theme={theme} />
        <StatCard icon="time" title="Pendentes" value={stats.pendingAppointments} color="#FF9500" theme={theme} />
        <StatCard icon="cut" title="Servicos" value={stats.totalServices} color="#34C759" theme={theme} />
      </View>

      {!currentCashRegister && (
        <Card style={{ backgroundColor: theme.dark ? '#3D2E00' : '#FFF3E0' }}>
          <View style={styles.warning}>
            <Ionicons name="warning" size={24} color="#FF9500" />
            <Text style={[styles.warningText, { color: '#FF9500' }]}>
              Abra o caixa para comecar a trabalhar
            </Text>
          </View>
        </Card>
      )}

      <Card>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Agendamentos Recentes</Text>
        {appointments.slice(0, 5).length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum agendamento</Text>
        ) : (
          appointments.slice(0, 5).map((apt: any) => (
            <View key={apt.id} style={[styles.appointmentItem, { borderBottomColor: theme.divider }]}>
              <View style={{flex: 1}}>
                <Text style={[styles.appointmentTime, { color: theme.text }]}>
                  {new Date(apt.scheduled_time).toLocaleString('pt-BR')}
                </Text>
                {apt.client_name && (
                  <Text style={[styles.appointmentClient, { color: theme.primary }]}>{apt.client_name}</Text>
                )}
                <Text style={[styles.appointmentStatus, { color: apt.status === 'pending' ? '#FF9500' : apt.status === 'confirmed' ? '#34C759' : theme.textSecondary }]}>
                  {apt.status === 'pending' ? 'Pendente' : apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'completed' ? 'Concluido' : apt.status === 'cancelled' ? 'Cancelado' : apt.status}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

function StatCard({ icon, title, value, color, theme }: any) {
  return (
    <Card style={styles.statCard}>
      <Ionicons name={icon} size={32} color={color} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  welcome: { marginBottom: 24 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  welcomeSubtext: { fontSize: 16 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 20 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statTitle: { fontSize: 12, marginTop: 4 },
  warning: { flexDirection: 'row', alignItems: 'center' },
  warningText: { marginLeft: 12, fontSize: 14, fontWeight: '600', flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  emptyText: { textAlign: 'center', paddingVertical: 20 },
  appointmentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  appointmentTime: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  appointmentClient: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  appointmentStatus: { fontSize: 12 },
});
