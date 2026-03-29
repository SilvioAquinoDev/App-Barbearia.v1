import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';

interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  color: string;
}

const MENU_ITEMS: MenuItem[] = [
  { title: 'Caixa', subtitle: 'Abertura, fechamento e vendas', icon: 'cash', route: '/(tabs)/cash', color: '#34C759' },
  { title: 'Produtos', subtitle: 'Estoque, precos e vendas', icon: 'cube', route: '/(tabs)/products', color: '#007AFF' },
  { title: 'Agenda', subtitle: 'Horarios de funcionamento', icon: 'time', route: '/(tabs)/schedule', color: '#FF9500' },
  { title: 'Fidelidade', subtitle: 'Programa de pontos', icon: 'star', route: '/(tabs)/loyalty', color: '#FFD700' },
  { title: 'Relatorios', subtitle: 'Financeiro e desempenho', icon: 'bar-chart', route: '/(tabs)/reports', color: '#5856D6' },
  { title: 'Promocoes', subtitle: 'Ofertas e descontos', icon: 'pricetag', route: '/promotions-manage', color: '#AF52DE' },
  { title: 'WhatsApp', subtitle: 'Configurar notificacoes', icon: 'logo-whatsapp', route: '/whatsapp-settings', color: '#25D366' },
];

export default function Management() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.pageTitle, { color: theme.textSecondary }]}>
        Ferramentas de Gestão da Barbearia
      </Text>

      <View style={styles.grid}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
            data-testid={`management-card-${item.title.toLowerCase()}`}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon as any} size={28} color={item.color} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>{item.subtitle}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.chevron} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 20, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    minHeight: 140,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, lineHeight: 16 },
  chevron: { position: 'absolute', top: 16, right: 14 },
});