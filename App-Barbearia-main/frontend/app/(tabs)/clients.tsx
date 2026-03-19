import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

interface Client {
  id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  total_appointments: number;
  last_appointment: string | null;
  source: string;
}

export default function Clients() {
  const { theme } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
      setFilteredClients(res.data);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFilteredClients(clients);
      return;
    }
    const lower = text.toLowerCase();
    setFilteredClients(
      clients.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.email && c.email.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.includes(text))
      )
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const renderClient = ({ item }: { item: Client }) => (
    <View
      style={[styles.clientCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      data-testid={`client-card-${item.name}`}
    >
      <View style={styles.clientHeader}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
          <Ionicons name="person" size={24} color={theme.primary} />
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.source === 'registered' && (
            <View style={[styles.badge, { backgroundColor: theme.primary + '22' }]}>
              <Text style={[styles.badgeText, { color: theme.primary }]}>Cadastrado</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.clientDetails, { borderTopColor: theme.divider }]}>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.email || '-'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            {item.phone || '-'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.detailText, { color: theme.textSecondary }]}>
            Nascimento: {formatDate(item.birth_date)}
          </Text>
        </View>
      </View>

      <View style={[styles.clientFooter, { borderTopColor: theme.divider }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.primary }]}>{item.total_appointments}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Atendimentos</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>
            {item.last_appointment || '-'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Ultimo</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Carregando clientes...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} data-testid="clients-screen">
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar por nome, email ou telefone..."
          placeholderTextColor={theme.textMuted}
          value={search}
          onChangeText={handleSearch}
          data-testid="clients-search-input"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} data-testid="clients-search-clear">
            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.countText, { color: theme.textSecondary }]}>
        {filteredClients.length} cliente{filteredClients.length !== 1 ? 's' : ''} encontrado{filteredClients.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={filteredClients}
        keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
        renderItem={renderClient}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadClients(); }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Nenhum cliente encontrado</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {search ? 'Tente outro termo de busca' : 'Os clientes aparecerao aqui apos agendamentos'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  countText: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  clientCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  clientDetails: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  clientFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginVertical: -4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
