import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Platform, KeyboardAvoidingView, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import api from '../src/services/api';

type WaStatus = 'not_configured' | 'no_session' | 'connecting' | 'connected' | 'disconnected' | 'loading' | 'error';

export default function WhatsAppSettings() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [status, setStatus] = useState<WaStatus>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/whatsapp/settings');
      if (res.data?.has_pat) {
        if (res.data.connected) {
          setStatus('connected');
        } else if (res.data.wasender_session_id) {
          setStatus('disconnected');
        } else {
          setStatus('no_session');
        }
      } else {
        setStatus('not_configured');
      }
    } catch { setStatus('not_configured'); }
    finally { setLoading(false); }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) { Alert.alert('Erro', 'Insira a API Key do WaSenderAPI'); return; }
    setSaving(true);
    try {
      const res = await api.post('/whatsapp/setup', { api_key: apiKey.trim() });
      Alert.alert('Sucesso', res.data.message);
      setSessions(res.data.sessions || []);
      if (res.data.has_sessions) {
        setStatus('disconnected');
        // Try to get status
        await checkStatus();
      } else {
        setStatus('no_session');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'API Key invalida');
    } finally { setSaving(false); }
  };

  const handleCreateSession = async () => {
    setSaving(true);
    try {
      const res = await api.post('/whatsapp/create-session', { name: 'Barbershop' });
      Alert.alert('Sucesso', 'Sessao criada! Agora conecte para gerar o QR Code.');
      setStatus('disconnected');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao criar sessao');
    } finally { setSaving(false); }
  };

  const handleConnect = async () => {
    setSaving(true);
    try {
      await api.post('/whatsapp/connect');
      // Wait a moment for QR code generation
      setTimeout(async () => {
        await fetchQRCode();
        setSaving(false);
      }, 3000);
      setStatus('connecting');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao conectar');
      setSaving(false);
    }
  };

  const fetchQRCode = async () => {
    try {
      const res = await api.get('/whatsapp/qrcode');
      if (res.data.qr_code) {
        setQrCode(res.data.qr_code);
        setStatus('connecting');
      } else {
        // Maybe already connected, check status
        await checkStatus();
      }
    } catch { /* ignore */ }
  };

  const checkStatus = async () => {
    try {
      const res = await api.get('/whatsapp/status');
      setSessionInfo(res.data.session || null);
      const s = res.data.status?.toLowerCase() || '';
      if (s === 'connected' || s === 'open' || s === 'active') {
        setStatus('connected');
        setQrCode(null);
      } else if (s === 'not_configured') {
        setStatus('not_configured');
      } else {
        setStatus('disconnected');
      }
    } catch { setStatus('error'); }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/whatsapp/disconnect');
      setStatus('disconnected');
      setQrCode(null);
      setSessionInfo(null);
      Alert.alert('Desconectado', 'Sessao WhatsApp desconectada.');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao desconectar');
    }
  };

  const handleTest = async () => {
    if (!businessPhone.trim()) {
      Alert.alert('Erro', 'Informe um numero de telefone para teste');
      return;
    }
    setTesting(true);
    try {
      // Save business phone first
      // Update settings with business phone
      await api.put('/whatsapp/settings', { business_phone: businessPhone.trim(), is_active: true });
      const res = await api.post('/whatsapp/test');
      Alert.alert('Sucesso', res.data.message || 'Mensagem enviada!');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha no teste');
    } finally { setTesting(false); }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.center}><ActivityIndicator size="large" color="#25D366" /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          <Text style={[styles.headerTitle, { color: theme.text }]}>WhatsApp (WaSenderAPI)</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Status Badge */}
          <View style={[styles.statusCard, status === 'connected' ? styles.statusActive : styles.statusInactive, { backgroundColor: status === 'connected' ? (theme.dark ? '#1B3D2F' : '#E8F5E9') : (theme.dark ? '#3D2E1B' : '#FFF3E0') }]}>
            <Ionicons
              name={status === 'connected' ? 'checkmark-circle' : status === 'connecting' ? 'sync-circle' : 'alert-circle'}
              size={24}
              color={status === 'connected' ? '#25D366' : '#FF9500'}
            />
            <Text style={[styles.statusText, { color: theme.text }]}>
              {status === 'connected' && 'WhatsApp conectado e ativo'}
              {status === 'connecting' && 'Aguardando leitura do QR Code...'}
              {status === 'disconnected' && 'Sessao desconectada'}
              {status === 'no_session' && 'Nenhuma sessao criada'}
              {status === 'not_configured' && 'API Key nao configurada'}
              {status === 'error' && 'Erro de conexao'}
              {status === 'loading' && 'Carregando...'}
            </Text>
          </View>

          {/* Step 1: API Key */}
          <View style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, { backgroundColor: status !== 'not_configured' ? '#25D366' : theme.primary }]}>
                <Text style={styles.stepNumber}>{status !== 'not_configured' ? '✓' : '1'}</Text>
              </View>
              <Text style={[styles.stepTitle, { color: theme.text }]}>API Key do WaSenderAPI</Text>
            </View>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
              Acesse wasenderapi.com, crie sua conta e copie o Personal Access Token em Settings.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Cole sua API Key aqui"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: saving ? 0.6 : 1 }]}
              onPress={handleSaveApiKey}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                <><Ionicons name="key" size={16} color="#FFF" /><Text style={styles.primaryBtnText}>Salvar API Key</Text></>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://wasenderapi.com/register')}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Criar conta no WaSenderAPI</Text>
            </TouchableOpacity>
          </View>

          {/* Step 2: Create Session (only if no session) */}
          {status === 'no_session' && (
            <View style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Criar Sessao WhatsApp</Text>
              </View>
              <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                Crie uma sessao para conectar seu WhatsApp.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateSession} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                  <><Ionicons name="add-circle" size={16} color="#FFF" /><Text style={styles.primaryBtnText}>Criar Sessao</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Connect & QR Code */}
          {(status === 'disconnected' || status === 'connecting') && (
            <View style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, { backgroundColor: status === 'connecting' ? '#FF9500' : theme.primary }]}>
                  <Text style={styles.stepNumber}>{status === 'connecting' ? '...' : '3'}</Text>
                </View>
                <Text style={[styles.stepTitle, { color: theme.text }]}>Conectar WhatsApp</Text>
              </View>

              {status === 'disconnected' && (
                <>
                  <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                    Clique em Conectar para gerar o QR Code, depois escaneie com o WhatsApp do seu celular.
                  </Text>
                  <TouchableOpacity style={[styles.primaryBtn, styles.greenBtn]} onPress={handleConnect} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" size="small" /> : (
                      <><Ionicons name="qr-code" size={16} color="#FFF" /><Text style={styles.primaryBtnText}>Gerar QR Code</Text></>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {status === 'connecting' && qrCode && (
                <View style={styles.qrContainer}>
                  <Text style={[styles.qrLabel, { color: theme.text }]}>Escaneie com seu WhatsApp:</Text>
                  <View style={styles.qrBox}>
                    <Image source={{ uri: qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}` }} style={styles.qrImage} resizeMode="contain" />
                  </View>
                  <Text style={[styles.qrHint, { color: theme.textMuted }]}>
                    Abra o WhatsApp {'>'} Aparelhos conectados {'>'} Conectar um aparelho
                  </Text>
                  <View style={styles.qrActions}>
                    <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#25D366' }]} onPress={fetchQRCode}>
                      <Ionicons name="refresh" size={16} color="#25D366" />
                      <Text style={[styles.outlineBtnText, { color: '#25D366' }]}>Atualizar QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.primary }]} onPress={checkStatus}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                      <Text style={[styles.outlineBtnText, { color: theme.primary }]}>Verificar Status</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {status === 'connecting' && !qrCode && (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color="#25D366" />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Gerando QR Code...</Text>
                  <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#25D366', marginTop: 12 }]} onPress={fetchQRCode}>
                    <Ionicons name="refresh" size={16} color="#25D366" />
                    <Text style={[styles.outlineBtnText, { color: '#25D366' }]}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Connected: Status + Test + Disconnect */}
          {status === 'connected' && (
            <>
              <View style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: '#25D366' }]}>
                    <Text style={styles.stepNumber}>✓</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>WhatsApp Conectado</Text>
                </View>
                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                  Seu WhatsApp esta conectado. As notificacoes serao enviadas automaticamente.
                </Text>

                <Text style={[styles.label, { color: theme.text }]}>Numero para teste</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                  value={businessPhone}
                  onChangeText={setBusinessPhone}
                  placeholder="5511999998888"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                />

                <TouchableOpacity style={[styles.primaryBtn, styles.greenBtn]} onPress={handleTest} disabled={testing}>
                  {testing ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <><Ionicons name="paper-plane" size={16} color="#FFF" /><Text style={styles.primaryBtnText}>Enviar Mensagem Teste</Text></>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#FF3B30', marginTop: 12 }]} onPress={handleDisconnect}>
                  <Ionicons name="close-circle" size={16} color="#FF3B30" />
                  <Text style={[styles.outlineBtnText, { color: '#FF3B30' }]}>Desconectar WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Help */}
          <View style={[styles.helpBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.helpTitle, { color: theme.text }]}>Como configurar?</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>1. Crie uma conta em wasenderapi.com</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>2. Copie o Personal Access Token em Settings</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>3. Cole a API Key acima e salve</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>4. Crie uma sessao (se necessario)</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>5. Clique em "Gerar QR Code"</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>6. Escaneie o QR Code com seu WhatsApp</Text>
            <Text style={[styles.helpStep, { color: theme.textSecondary }]}>7. Pronto! As notificacoes serao enviadas automaticamente</Text>
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 12, marginBottom: 16 },
  statusActive: {},
  statusInactive: {},
  statusText: { fontSize: 15, fontWeight: '600', flex: 1 },

  stepCard: { padding: 20, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  stepTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  stepDesc: { fontSize: 13, lineHeight: 20, marginBottom: 14 },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  greenBtn: { backgroundColor: '#25D366' },

  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },

  linkText: { textAlign: 'center', marginTop: 12, fontSize: 13, fontWeight: '600' },
  loadingText: { marginTop: 10, fontSize: 14 },

  qrContainer: { alignItems: 'center', paddingVertical: 16 },
  qrLabel: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  qrBox: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 },
  qrImage: { width: 240, height: 240 },
  qrHint: { marginTop: 14, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  qrActions: { flexDirection: 'row', gap: 10, marginTop: 16 },

  helpBox: { borderRadius: 12, padding: 16, borderWidth: 1, marginTop: 8 },
  helpTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  helpStep: { fontSize: 13, lineHeight: 22 },
});
