import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getStoredApiUrl, setStoredApiUrl, updateApiBaseUrl } from '../src/services/api';
import axios from 'axios';

export default function ServerConfig() {
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadStoredUrl();
  }, []);

  const loadStoredUrl = async () => {
    const stored = await getStoredApiUrl();
    if (stored) setServerUrl(stored);
  };

  const testConnection = async () => {
    const url = serverUrl.trim();
    if (!url) {
      Alert.alert('Erro', 'Digite o endereço do servidor');
      return;
    }

    setTesting(true);
    setStatus('idle');

    try {
      const response = await axios.get(`${url}/api/health`, { timeout: 5000 });
      if (response.data?.status === 'healthy') {
        setStatus('success');
        await setStoredApiUrl(url);
        updateApiBaseUrl(url);
        Alert.alert(
          'Conectado!',
          'Conexão com o servidor estabelecida com sucesso.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        setStatus('error');
        Alert.alert('Erro', 'Servidor respondeu mas com status inesperado.');
      }
    } catch (error: any) {
      setStatus('error');
      const msg = error.code === 'ECONNABORTED'
        ? 'Tempo de conexão esgotado. Verifique o IP e se o servidor está rodando.'
        : error.message?.includes('Network Error')
          ? 'Erro de rede. Verifique se:\n\n1. O IP está correto\n2. O celular está na mesma rede Wi-Fi\n3. O servidor está rodando'
          : `Erro: ${error.message}`;
      Alert.alert('Falha na Conexão', msg);
    } finally {
      setTesting(false);
    }
  };

  const resetToDefault = async () => {
    await setStoredApiUrl(null);
    setServerUrl('');
    setStatus('idle');
    Alert.alert('Resetado', 'URL do servidor restaurada para o padrão.');
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webMessage}>
          <Ionicons name="desktop-outline" size={48} color="#999" />
          <Text style={styles.webText}>
            Esta configuração é apenas para o app mobile (Expo Go).
          </Text>
          <Text style={styles.webText}>
            Na web, a conexão é automática.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
            <Text style={styles.headerTitle}>Configurar Servidor</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#1A73E8" />
            <Text style={styles.infoText}>
              Para usar o app no celular via Expo Go, configure o IP do computador onde o servidor está rodando.
            </Text>
          </View>

          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Como encontrar o IP:</Text>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>No computador, abra o terminal/cmd</Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>
                Windows: digite "ipconfig"{'\n'}
                Mac/Linux: digite "ifconfig" ou "ip addr"
              </Text>
            </View>
            <View style={styles.step}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Procure o IPv4 da sua rede Wi-Fi (ex: 192.168.1.100)</Text>
            </View>
          </View>

          <Text style={styles.label}>Endereço do Servidor</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.1.100:8001"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              data-testid="server-url-input"
            />
            {status === 'success' && <Ionicons name="checkmark-circle" size={24} color="#34C759" />}
            {status === 'error' && <Ionicons name="close-circle" size={24} color="#FF3B30" />}
          </View>

          <TouchableOpacity
            style={[styles.testButton, testing && styles.testButtonDisabled]}
            onPress={testConnection}
            disabled={testing}
            data-testid="test-connection-btn"
          >
            {testing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="wifi" size={20} color="#FFF" />
                <Text style={styles.testButtonText}>Testar Conexão</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetToDefault}>
            <Ionicons name="refresh" size={18} color="#FF3B30" />
            <Text style={styles.resetText}>Restaurar Padrão</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  webMessage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  webText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 12 },
  backButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#1A73E8', borderRadius: 8 },
  backButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  headerBack: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingTop: 8 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#E8F0FE', padding: 16, borderRadius: 12, marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 22 },
  stepsCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  stepsTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  stepNumber: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A73E8',
    color: '#FFF', textAlign: 'center', lineHeight: 24, fontSize: 13, fontWeight: '700',
  },
  stepText: { flex: 1, fontSize: 14, color: '#555', lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF', borderRadius: 12, paddingRight: 12,
    borderWidth: 1, borderColor: '#DDD', marginBottom: 16,
  },
  input: { flex: 1, padding: 14, fontSize: 16, color: '#333' },
  testButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1A73E8', paddingVertical: 14, borderRadius: 12, marginBottom: 12,
  },
  testButtonDisabled: { opacity: 0.6 },
  testButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  resetButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12,
  },
  resetText: { color: '#FF3B30', fontSize: 14, fontWeight: '500' },
});
