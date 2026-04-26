import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import Button from '../src/components/Button';
import api from '../src/services/api';

export default function FirstAccessSetup() {
  const { theme } = useTheme();
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: '',
    birth_date: '',
  });

  const handleSave = async () => {
    if (!form.phone.trim()) {
      Alert.alert('Erro', 'Telefone e obrigatorio');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/update-profile', {
        phone: form.phone.trim(),
        birth_date: form.birth_date.trim() || null,
      });
      if (user) {
        setUser({ ...user, phone: form.phone.trim() });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="person-add" size={40} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Bem-vindo!</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Complete seu cadastro para aproveitar todos os recursos
          </Text>
        </View>

        <Text style={[styles.label, { color: theme.text }]}>Seu Telefone / WhatsApp *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })}
          placeholder="(00) 00000-0000"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          data-testid="first-access-phone"
        />

        <Text style={[styles.label, { color: theme.text }]}>Data de Nascimento</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.birth_date}
          onChangeText={(v) => setForm({ ...form, birth_date: v })}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
          data-testid="first-access-birthdate"
        />

        <View style={{ marginTop: 32 }}>
          <Button
            title={saving ? 'Salvando...' : 'Continuar'}
            onPress={handleSave}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 60, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
