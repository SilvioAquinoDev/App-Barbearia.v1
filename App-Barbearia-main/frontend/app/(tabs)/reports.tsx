import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

const PERIODS = [{ key: 'day', label: 'Hoje' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mes' }];

export default function Reports() {
  const { theme } = useTheme();
  const [period, setPeriod] = useState('day');
  const [financial, setFinancial] = useState<any>(null);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [finRes, topRes, dailyRes] = await Promise.all([
        api.get(`/reports/financial?period=${period}`), api.get(`/reports/top-services?period=${period}`), api.get('/reports/daily-breakdown?days=7'),
      ]);
      setFinancial(finRes.data); setTopServices(topRes.data); setDailyData(dailyRes.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  const maxRevenue = Math.max(...dailyData.map((d: any) => d.services + d.products), 1);

  if (loading) return <View style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.primary} />}>
        <View style={[styles.periodBar, { backgroundColor: theme.dark ? theme.border : '#E8E8E8' }]}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.key} style={[styles.periodBtn, period === p.key && { backgroundColor: theme.primary }]} onPress={() => setPeriod(p.key)} data-testid={`period-${p.key}`}>
              <Text style={[styles.periodText, { color: period === p.key ? '#FFF' : theme.textSecondary }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {financial && (
          <>
            <View style={[styles.revenueCard, { backgroundColor: theme.primary }]}>
              <Text style={styles.revenueLabel}>Faturamento Total</Text>
              <Text style={styles.revenueValue}>R$ {financial.total_revenue.toFixed(2).replace('.', ',')}</Text>
              <View style={styles.revenueBreakdown}>
                <View style={styles.revItem}><View style={[styles.revDot, { backgroundColor: '#FFF' }]} /><Text style={styles.revText}>Servicos: R$ {financial.total_services.toFixed(2).replace('.', ',')}</Text></View>
                <View style={styles.revItem}><View style={[styles.revDot, { backgroundColor: '#34C759' }]} /><Text style={styles.revText}>Produtos: R$ {financial.total_products.toFixed(2).replace('.', ',')}</Text></View>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatCard icon="checkmark-circle" color="#34C759" value={financial.completed_appointments} label="Concluidos" theme={theme} />
              <StatCard icon="close-circle" color="#FF3B30" value={financial.cancelled_appointments} label="Cancelados" theme={theme} />
              <StatCard icon="time" color="#FF9500" value={financial.pending_appointments} label="Pendentes" theme={theme} />
              <StatCard icon="cube" color={theme.primary} value={financial.product_sales_count} label="Vendas" theme={theme} />
            </View>
          </>
        )}

        <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Ultimos 7 dias</Text>
          <View style={styles.chart}>
            {dailyData.map((d: any, i: number) => {
              const total = d.services + d.products;
              const height = maxRevenue > 0 ? (total / maxRevenue) * 120 : 0;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={[styles.barValue, { color: theme.textMuted }]}>{total > 0 ? `${total.toFixed(0)}` : ''}</Text>
                  <View style={styles.barContainer}>
                    <View style={[styles.bar, { height: Math.max(height, 2), backgroundColor: theme.primary }]}>
                      {d.products > 0 && <View style={[styles.barSegment, { height: (d.products / total) * Math.max(height, 2), backgroundColor: '#34C759' }]} />}
                    </View>
                  </View>
                  <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{d.day_name}</Text>
                  <Text style={[styles.barSub, { color: theme.textMuted }]}>{d.appointments}x</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.topCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.chartTitle, { color: theme.text }]}>Top Servicos</Text>
          {topServices.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Nenhum servico concluido no periodo</Text>
          ) : (
            topServices.map((svc: any, i: number) => (
              <View key={i} style={[styles.topRow, { borderBottomColor: theme.divider }]}>
                <View style={[styles.topRank, { backgroundColor: theme.inputBg }]}><Text style={[styles.topRankText, { color: theme.text }]}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}><Text style={[styles.topName, { color: theme.text }]}>{svc.name}</Text><Text style={[styles.topCount, { color: theme.textMuted }]}>{svc.count}x realizados</Text></View>
                <Text style={styles.topRevenue}>R$ {svc.revenue.toFixed(2).replace('.', ',')}</Text>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, color, value, label, theme }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1},
  periodBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, marginTop: 16, borderRadius: 10, padding: 3 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  periodText: { fontSize: 14, fontWeight: '600' },
  revenueCard: { margin: 16, marginTop: 0, borderRadius: 16, padding: 20 },
  revenueLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  revenueValue: { color: '#FFF', fontSize: 32, fontWeight: '800', marginTop: 4 },
  revenueBreakdown: { flexDirection: 'row', gap: 16, marginTop: 12 },
  revItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revDot: { width: 8, height: 8, borderRadius: 4 },
  revText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  statsRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 16, gap: 6 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2 },
  chartCard: { margin: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  chartTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', flex: 1 },
  barContainer: { height: 120, justifyContent: 'flex-end' },
  bar: { width: 24, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barSegment: { width: '100%' },
  barValue: { fontSize: 10, marginBottom: 2 },
  barLabel: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  barSub: { fontSize: 10 },
  topCard: { margin: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  topRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  topRankText: { fontSize: 13, fontWeight: '700' },
  topName: { fontSize: 14, fontWeight: '600' },
  topCount: { fontSize: 12 },
  topRevenue: { fontSize: 15, fontWeight: '700', color: '#34C759' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
