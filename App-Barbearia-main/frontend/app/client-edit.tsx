import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Alert, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import Button from '../src/components/Button';
import api from '../src/services/api';

export default function ClientEdit() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name: string; email: string; phone: string; birth_date: string }>();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: params.name || '',
    email: params.email || '',
    phone: params.phone || '',
    birth_date: params.birth_date || '',
  });

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Nome e obrigatorio');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/clients/${params.id}`, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        birth_date: form.birth_date.trim() || null,
      });
      Alert.alert('Sucesso', 'Cliente atualizado!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao atualizar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} data-testid="client-edit-back">
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Voltar</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text }]}>Editar Cliente</Text>

        <Text style={[styles.label, { color: theme.text }]}>Nome *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="Nome do cliente"
          placeholderTextColor={theme.textMuted}
          data-testid="client-edit-name"
        />

        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.email}
          onChangeText={(v) => setForm({ ...form, email: v })}
          placeholder="email@exemplo.com"
          placeholderTextColor={theme.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          data-testid="client-edit-email"
        />

        <Text style={[styles.label, { color: theme.text }]}>Telefone</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })}
          placeholder="(00) 00000-0000"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          data-testid="client-edit-phone"
        />

        <Text style={[styles.label, { color: theme.text }]}>Data de Nascimento</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.birth_date}
          onChangeText={(v) => setForm({ ...form, birth_date: v })}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={theme.textMuted}
          data-testid="client-edit-birthdate"
        />

        <View style={{ marginTop: 24 }}>
          <Button title={saving ? 'Salvando...' : 'Salvar Alteracoes'} onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
