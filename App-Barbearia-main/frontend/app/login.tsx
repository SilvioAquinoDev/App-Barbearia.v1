import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../src/components/Button';
import api from '../src/services/api';

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [shopInfo, setShopInfo] = useState<{ name: string; logo_url: string | null; phone: string | null } | null>(null);

  useEffect(() => {
    loadShopInfo();
  }, []);

  const loadShopInfo = async () => {
    try {
      const res = await api.get('/barbershop/public-info');
      if (res.data) setShopInfo(res.data);
    } catch {}
  };

  const handleLogin = async () => {
    setLoading(true);
    try { await login(); router.replace('/(tabs)'); }
    catch { Alert.alert('Erro', 'Falha ao fazer login. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const getLogoSource = () => {
    if (!shopInfo?.logo_url) return null;
    if (shopInfo.logo_url.startsWith('http')) return { uri: shopInfo.logo_url };
    return { uri: `${api.defaults.baseURL || ''}${shopInfo.logo_url}` };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          {/*{getLogoSource() ? (
            <Image source={getLogoSource()!} style={styles.logo} data-testid="login-logo" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="storefront" size={48} color={theme.primary} />
            </View>
          )}*/}
          <Text style={[styles.title, { color: theme.text }]}>{shopInfo?.name || 'Barbershop Manager'}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Gerencie sua barbearia de forma simples e eficiente</Text>
        </View>

        <View style={styles.imageContainer}>
          {getLogoSource() ? (
            <Image
              source={require('../assets/images/logotype.png')}
              style={styles.logos}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={require('../assets/images/logotype.png')}
              style={styles.logos}
              resizeMode="contain"
            />
          )}
        </View>



        {/*<View style={styles.features}>
          <FeatureItem icon="calendar" text="Gerenciar agendamentos" theme={theme} />
          <FeatureItem icon="cut" text="Controlar servicos" theme={theme} />
          <FeatureItem icon="cash" text="Controle de caixa" theme={theme} />
          <FeatureItem icon="bar-chart" text="Relatorios financeiros" theme={theme} />
        </View>*/}

        <View style={styles.footer}>
          <Button title="Entrar com Google" onPress={handleLogin} loading={loading} />
          {/*<View style={styles.divider}>
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
          )}*/}
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
  /*imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  // Estilo atualizado para a logo
  logos: {
    width: '100%',
    height: undefined,
    aspectRatio: 1, // Mantém a proporção da imagem
    maxWidth: 300, // Tamanho máximo em telas grandes
    maxHeight: 400,
  },*/

  imageContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  marginVertical: 20,
},
logos: {
  width: '100%', // Usa 90% da largura disponível
  height: undefined,
  aspectRatio: 1, // Mantém proporção 1:1
  maxHeight: 500, // Limita a 70% da altura do container
},
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 50 },
  logo: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  logoPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24 },
  features: { marginTop: 40 },
  featureItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  featureText: { fontSize: 16, fontWeight: '500' },
  footer: { marginTop: 40, marginBottom: 100 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 14 },
  bookingHint: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  serverConfigLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, paddingVertical: 8 },
  serverConfigText: { fontSize: 14, fontWeight: '500' },
});








/*import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../src/components/Button';
import api from '../src/services/api';

export default function Login() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [shopInfo, setShopInfo] = useState<{ name: string; logo_url: string | null; phone: string | null } | null>(null);

  useEffect(() => {
    loadShopInfo();
  }, []);

  const loadShopInfo = async () => {
    try {
      const res = await api.get('/barbershop/public-info');
      if (res.data) setShopInfo(res.data);
    } catch {}
  };

  const handleLogin = async () => {
    setLoading(true);
    try { await login(); router.replace('/(tabs)'); }
    catch { Alert.alert('Erro', 'Falha ao fazer login. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const getLogoSource = () => {
    if (!shopInfo?.logo_url) return null;
    if (shopInfo.logo_url.startsWith('http')) return { uri: shopInfo.logo_url };
    return { uri: `${api.defaults.baseURL || ''}${shopInfo.logo_url}` };
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          {getLogoSource() ? (
            <Image source={getLogoSource()!} style={styles.logo} data-testid="login-logo" />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="storefront" size={48} color={theme.primary} />
            </View>
          )}
          <Text style={[styles.title, { color: theme.text }]}>{shopInfo?.name || 'Barbershop Manager'}</Text>
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
  logo: { width: 100, height: 100, borderRadius: 50, marginBottom: 20 },
  logoPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
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
});*/
