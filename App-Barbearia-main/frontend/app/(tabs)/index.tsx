import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useStore } from '../../src/store/useStore';
import Card from '../../src/components/Card';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '../../src/services/notifications';
import { useRouter } from 'expo-router';

interface BirthdayClient {
  name: string;
  phone: string | null;
  birth_date: string | null;
  birth_day: number | null;
  total_appointments: number;
}

interface BarbershopInfo {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const { appointments, services, currentCashRegister, setAppointments, setServices, setCurrentCashRegister } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [birthdayClients, setBirthdayClients] = useState<BirthdayClient[]>([]);
  const [barbershop, setBarbershop] = useState<BarbershopInfo | null>(null);
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

  const checkBarbershop = async () => {
    try {
      const res = await api.get('/barbershop/mine');
      if (res.data) {
        setBarbershop(res.data);
      }
      // Only redirect if response is explicitly null/empty AND user is authenticated
    } catch (err: any) {
      // Do NOT redirect on auth errors (401/403) - only on explicit 404
      if (err?.response?.status === 404) {
        router.replace('/barbershop-setup');
      }
      // For all other errors (401, network, etc.) just silently fail - user stays on dashboard
    }
  };

  const loadData = async () => {
    try {
      const [appointmentsRes, servicesRes, cashRes, birthdayRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/services'),
        api.get('/cash-register/current').catch(() => ({ data: null })),
        api.get('/clients/birthdays').catch(() => ({ data: [] })),
      ]);
      setAppointments(appointmentsRes.data);
      setServices(servicesRes.data);
      setCurrentCashRegister(cashRes.data);
      setBirthdayClients(birthdayRes.data || []);
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = appointmentsRes.data.filter((a: any) => a.scheduled_time.startsWith(today)).length;
      const pending = appointmentsRes.data.filter((a: any) => a.status === 'pending').length;
      setStats({ todayAppointments: todayAppts, pendingAppointments: pending, totalServices: servicesRes.data.length });
    } catch (error: any) {
      if (error.response?.status !== 404) Alert.alert('Erro', 'Falha ao carregar dados');
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const sendBirthdayMessage = (client: BirthdayClient) => {
    if (!client.phone) {
      Alert.alert('Sem telefone', 'Este cliente nao tem telefone cadastrado.');
      return;
    }
    const phone = client.phone.replace(/\D/g, '');
    const shopName = barbershop?.name || 'nossa barbearia';
    const message = encodeURIComponent(
      `Ola ${client.name}! Feliz Aniversario! 🎂🎉\n\n` +
      `A ${shopName} deseja um dia maravilhoso para voce!\n\n` +
      `Como presente, voce ganhou um *cupom de 15% de desconto* no seu proximo servico!\n` +
      `Use o codigo: *ANIVER15*\n\n` +
      `Agende seu horario conosco! Esperamos voce! ✂️`
    );
    const url = `https://wa.me/${phone}?text=${message}`;
    Linking.openURL(url);
  };

  const formatBirthDay = (day: number | null) => {
    if (!day) return '';
    return `${day < 10 ? '0' : ''}${day}`;
  };

  const getLogoSource = () => {
    if (!barbershop?.logo_url) return null;
    if (barbershop.logo_url.startsWith('http')) return { uri: barbershop.logo_url };
    const baseUrl = api.defaults.baseURL || '';
    return { uri: `${baseUrl}${barbershop.logo_url}` };
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <View style={styles.welcome}>
        <View style={styles.welcomeRow}>
          {getLogoSource() && (
            <Image source={getLogoSource()!} style={styles.shopLogo} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.welcomeText, { color: theme.text }]}>Ola, {user?.name}!</Text>
            {barbershop && (
              <Text style={[styles.shopName, { color: theme.primary }]}>{barbershop.name}</Text>
            )}
            <Text style={[styles.welcomeSubtext, { color: theme.textSecondary }]}>
              {currentCashRegister ? 'Caixa aberto' : 'Caixa fechado'}
            </Text>
          </View>
        </View>
        {/*<Text style={[styles.welcomeText, { color: theme.text }]}>Ola, {user?.name}!</Text>
        <Text style={[styles.welcomeSubtext, { color: theme.textSecondary }]}>
          {currentCashRegister ? 'Caixa aberto' : 'Caixa fechado'}
        </Text>*/}
        {barbershop?.phone && (
          <View style={styles.shopInfoRow}>
            <Ionicons name="call-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.shopInfoText, { color: theme.textMuted }]}>{barbershop.phone}</Text>
          </View>
        )}
        {barbershop?.address && (
          <View style={styles.shopInfoRow}>
            <Ionicons name="location-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.shopInfoText, { color: theme.textMuted }]} numberOfLines={1}>{barbershop.address}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
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

      {/* Recent Appointments */}
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

      {/* Birthday Clients */}
      {birthdayClients.length > 0 && (
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="gift" size={20} color="#FF6B8A" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Aniversariantes do Mes</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: '#FF6B8A22' }]}>
              <Text style={[styles.countBadgeText, { color: '#FF6B8A' }]}>{birthdayClients.length}</Text>
            </View>
          </View>
          {birthdayClients.map((client, idx) => (
            <View key={idx} style={[styles.birthdayItem, { borderBottomColor: theme.divider }]}>
              <View style={[styles.birthdayDateBadge, { backgroundColor: '#FF6B8A18' }]}>
                <Text style={styles.birthdayDateText}>{formatBirthDay(client.birth_day)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.birthdayName, { color: theme.text }]}>{client.name}</Text>
                <Text style={[styles.birthdayMeta, { color: theme.textMuted }]}>
                  {client.total_appointments} atendimento{client.total_appointments !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={() => sendBirthdayMessage(client)}
                data-testid={`birthday-whatsapp-${idx}`}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}
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
  welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shopLogo: { width: 48, height: 48, borderRadius: 24 },
  welcomeText: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  shopName: { fontSize: 14, fontWeight: '600' },
  welcomeSubtext: { fontSize: 16 },
  shopInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 60 },
  shopInfoText: { fontSize: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, marginHorizontal: 4, alignItems: 'center', paddingVertical: 20 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statTitle: { fontSize: 12, marginTop: 4 },
  warning: { flexDirection: 'row', alignItems: 'center' },
  warningText: { marginLeft: 12, fontSize: 14, fontWeight: '600', flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countBadgeText: { fontSize: 13, fontWeight: '700' },
  birthdayItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  birthdayDateBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  birthdayDateText: { fontSize: 16, fontWeight: '800', color: '#FF6B8A' },
  birthdayName: { fontSize: 15, fontWeight: '600' },
  birthdayMeta: { fontSize: 12, marginTop: 2 },
  whatsappBtn: { padding: 8 },
  emptyText: { textAlign: 'center', paddingVertical: 20 },
  appointmentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  appointmentTime: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  appointmentClient: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  appointmentStatus: { fontSize: 12 },
});
