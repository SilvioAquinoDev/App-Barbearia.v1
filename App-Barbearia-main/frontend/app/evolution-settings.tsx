import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../src/contexts/ThemeContext';
import Button from '../src/components/Button';
import Card from '../src/components/Card';
import api from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function EvolutionSettings() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [form, setForm] = useState({ api_url: '', api_key: '', phone_number: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/evolution/status');
      setStatus(res.data);
    } catch { setStatus({ connected: false, reason: 'Erro ao verificar' }); }
    finally { setLoading(false); }
  };

  const handleSetup = async () => {
    if (!form.api_url.trim() || !form.api_key.trim()) {
      Alert.alert('Erro', 'URL e API Key sao obrigatorios');
      return;
    }
    setSaving(true);
    try {
      await api.post('/evolution/setup', {
        api_url: form.api_url.trim(),
        api_key: form.api_key.trim(),
      });
      Alert.alert('Sucesso', 'Evolution API configurada!');
      checkStatus();
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao configurar');
    } finally { setSaving(false); }
  };

  const handleCreateInstance = async () => {
    if (!form.phone_number.trim()) {
      Alert.alert('Erro', 'Informe o numero do WhatsApp');
      return;
    }
    setLoadingCode(true);
    try {
      await api.post('/evolution/create-instance', {
        instance_name: 'barbershop',
        phone_number: form.phone_number.trim(),
      });
      const res = await api.post('/evolution/pairing-code/barbershop');
      if (res.data?.pairingCode) {
        setPairingCode(res.data.pairingCode);
      } else if (res.data?.code) {
        setPairingCode(res.data.code);
      } else {
        Alert.alert('Info', 'Instancia criada. Tente obter o codigo novamente.');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao criar instancia');
    } finally { setLoadingCode(false); }
  };

  const handleGetCode = async () => {
    setLoadingCode(true);
    try {
      const res = await api.post('/evolution/pairing-code/barbershop');
      setPairingCode(res.data?.pairingCode || res.data?.code || null);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao obter codigo');
    } finally { setLoadingCode(false); }
  };

  const handleDisconnect = async () => {
    Alert.alert('Desconectar', 'Deseja desconectar o WhatsApp?', [
      { text: 'Cancelar' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete('/evolution/instance/barbershop');
            setPairingCode(null);
            Alert.alert('Sucesso', 'WhatsApp desconectado');
            checkStatus();
          } catch { Alert.alert('Erro', 'Falha ao desconectar'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isConfigured = status?.connected;
  const hasActiveInstance = status?.active > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={theme.primary} />
        <Text style={[styles.backText, { color: theme.primary }]}>Voltar</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.text }]}>Evolution API - WhatsApp</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Conecte seu WhatsApp para enviar notificacoes automaticas aos clientes
      </Text>

      {/* Status */}
      <Card style={{ marginTop: 16 }}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: hasActiveInstance ? '#34C759' : isConfigured ? '#FF9500' : '#FF3B30' }]} />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {hasActiveInstance ? 'Conectado' : isConfigured ? 'Configurado (sem instancia ativa)' : 'Nao configurado'}
          </Text>
        </View>
        {isConfigured && status?.instances > 0 && (
          <Text style={[styles.statusDetail, { color: theme.textMuted }]}>
            {status.instances} instancia(s), {status.active} ativa(s)
          </Text>
        )}
      </Card>

      {/* Setup Form */}
      {!isConfigured && (
        <Card style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Configurar Evolution API</Text>
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Informe a URL e API Key da sua instancia Evolution API
          </Text>
          <Text style={[styles.label, { color: theme.text }]}>URL da API *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            value={form.api_url}
            onChangeText={(v) => setForm({ ...form, api_url: v })}
            placeholder="https://sua-evolution-api.com"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />
          <Text style={[styles.label, { color: theme.text }]}>API Key *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            value={form.api_key}
            onChangeText={(v) => setForm({ ...form, api_key: v })}
            placeholder="Sua API Key"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
          />
          <Button title={saving ? 'Salvando...' : 'Configurar'} onPress={handleSetup} loading={saving} />
        </Card>
      )}

      {/* Connect WhatsApp */}
      {isConfigured && !hasActiveInstance && (
        <Card style={{ marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Conectar WhatsApp</Text>
          <Text style={[styles.label, { color: theme.text }]}>Numero do WhatsApp</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
            value={form.phone_number}
            onChangeText={(v) => setForm({ ...form, phone_number: v })}
            placeholder="5511999998888"
            placeholderTextColor={theme.textMuted}
            keyboardType="phone-pad"
          />
          <Button
            title={loadingCode ? 'Gerando...' : 'Gerar Codigo de Pareamento'}
            onPress={handleCreateInstance}
            loading={loadingCode}
          />
          {pairingCode && (
            <View style={[styles.codeBox, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>Codigo de Pareamento:</Text>
              <Text style={[styles.codeValue, { color: theme.primary }]}>{pairingCode}</Text>
              <Text style={[styles.codeHint, { color: theme.textMuted }]}>
                Abra o WhatsApp no celular {'>'}  Dispositivos vinculados {'>'} Vincular dispositivo {'>'} Vincular com numero de telefone {'>'} Digite este codigo
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Connected */}
      {hasActiveInstance && (
        <Card style={{ marginTop: 16 }}>
          <View style={styles.connectedRow}>
            <Ionicons name="logo-whatsapp" size={32} color="#25D366" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.connectedTitle, { color: theme.text }]}>WhatsApp Conectado</Text>
              <Text style={[styles.connectedSub, { color: theme.textSecondary }]}>
                Notificacoes serao enviadas automaticamente
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.refreshBtn, { borderColor: theme.primary }]} onPress={checkStatus}>
            <Ionicons name="refresh" size={16} color={theme.primary} />
            <Text style={[styles.refreshText, { color: theme.primary }]}>Atualizar Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.disconnectBtn, { borderColor: '#FF3B30' }]} onPress={handleDisconnect}>
            <Ionicons name="close-circle" size={16} color="#FF3B30" />
            <Text style={[styles.disconnectText, { color: '#FF3B30' }]}>Desconectar</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Instructions */}
      <Card style={{ marginTop: 16, marginBottom: 40 }}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Como configurar</Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>1. Instale a Evolution API no seu servidor (Docker recomendado)</Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>2. Copie a URL e API Key da sua instancia</Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>3. Configure aqui com URL e API Key</Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>4. Gere o codigo de pareamento</Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>5. No WhatsApp {'>'} Dispositivos vinculados {'>'} Use o codigo</Text>
        <Text style={[styles.step, { color: theme.textSecondary }]}>6. Pronto! Notificacoes serao enviadas automaticamente</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 16, fontWeight: '600' },
  statusDetail: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  hint: { fontSize: 13, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 8 },
  codeBox: { marginTop: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  codeLabel: { fontSize: 13, marginBottom: 8 },
  codeValue: { fontSize: 32, fontWeight: '800', letterSpacing: 4, marginBottom: 12 },
  codeHint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  connectedRow: { flexDirection: 'row', alignItems: 'center' },
  connectedTitle: { fontSize: 17, fontWeight: '700' },
  connectedSub: { fontSize: 13, marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10, borderWidth: 1, borderRadius: 10 },
  refreshText: { fontWeight: '600', fontSize: 14 },
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 10, borderWidth: 1, borderRadius: 10 },
  disconnectText: { fontWeight: '600', fontSize: 14 },
  step: { fontSize: 13, marginBottom: 8, lineHeight: 20 },
});
