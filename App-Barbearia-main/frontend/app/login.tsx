import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../src/components/Button';

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try { await login(); router.replace('/(tabs)'); }
    catch { Alert.alert('Erro', 'Falha ao fazer login. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.icon}>💈</Text>
          <Text style={[styles.title, { color: theme.text }]}>Barbershop Manager</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Gerencie sua barbearia de forma simples e eficiente</Text>
        </View>

        <View style={styles.features}>
          <FeatureItem icon="calendar" text="Gerenciar agendamentos" theme={theme} />
          <FeatureItem icon="cut" text="Controlar servicos" theme={theme} />
          <FeatureItem icon="cash" text="Controle de caixa" theme={theme} />
          <FeatureItem icon="bar-chart" text="Relatorios financeiros" theme={theme} />
        </View>

        <View style={styles.footer}>
          <Button title="Entrar com Google" onPress={handleLogin} loading={loading} />
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>ou</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>
          <Button title="Agendar Horario" onPress={() => router.push('/booking')} variant="outline" />
          <Text style={[styles.bookingHint, { color: theme.textMuted }]}>Agende sem precisar fazer login</Text>

          {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.serverConfigLink} onPress={() => router.push('/server-config')} data-testid="server-config-btn">
              <Ionicons name="settings-outline" size={16} color={theme.primary} />
              <Text style={[styles.serverConfigText, { color: theme.primary }]}>Configurar Servidor Local</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text, theme }: { icon: string; text: string; theme: any }) {
  return (
    <View style={[styles.featureItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name={icon as any} size={24} color={theme.primary} style={{ marginRight: 16 }} />
      <Text style={[styles.featureText, { color: theme.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center' },
  icon: { fontSize: 80, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  features: { marginTop: 40 },
  featureItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  featureText: { fontSize: 16, fontWeight: '500' },
  footer: { marginTop: 40 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 14 },
  bookingHint: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  serverConfigLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 8 },
  serverConfigText: { fontSize: 14, fontWeight: '500' },
});
