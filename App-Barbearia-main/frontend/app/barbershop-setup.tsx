import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import Button from '../src/components/Button';
import api from '../src/services/api';

export default function BarbershopSetup() {
  const { theme } = useTheme();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
  });

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao necessaria', 'Precisamos de acesso a galeria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Nome da barbearia e obrigatorio');
      return;
    }
    setSaving(true);
    try {
      await api.post('/barbershop/', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });

      if (logoUri) {
        const formData = new FormData();
        formData.append('file', {
          uri: logoUri,
          name: 'logo.jpg',
          type: 'image/jpeg',
        } as any);
        await api.post('/barbershop/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      Alert.alert('Sucesso', 'Barbearia cadastrada com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao cadastrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Ionicons name="storefront" size={48} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Cadastre sua Barbearia</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Configure as informacoes do seu estabelecimento para comecar
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.logoPicker, { borderColor: theme.border, backgroundColor: theme.card }]}
          onPress={pickLogo}
          data-testid="barbershop-logo-picker"
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="camera" size={32} color={theme.textMuted} />
              <Text style={[styles.logoText, { color: theme.textMuted }]}>Logo da Barbearia</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.label, { color: theme.text }]}>Nome da Barbearia *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.name}
          onChangeText={(v) => setForm({ ...form, name: v })}
          placeholder="Ex: Barbearia do Joao"
          placeholderTextColor={theme.textMuted}
          data-testid="barbershop-name-input"
        />

        <Text style={[styles.label, { color: theme.text }]}>Telefone / WhatsApp</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.phone}
          onChangeText={(v) => setForm({ ...form, phone: v })}
          placeholder="(00) 00000-0000"
          placeholderTextColor={theme.textMuted}
          keyboardType="phone-pad"
          data-testid="barbershop-phone-input"
        />

        <Text style={[styles.label, { color: theme.text }]}>Endereco</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
          value={form.address}
          onChangeText={(v) => setForm({ ...form, address: v })}
          placeholder="Rua, numero, bairro, cidade"
          placeholderTextColor={theme.textMuted}
          multiline
          numberOfLines={3}
          data-testid="barbershop-address-input"
        />

        <View style={{ marginTop: 24 }}>
          <Button
            title={saving ? 'Salvando...' : 'Cadastrar Barbearia'}
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
  content: { padding: 24, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 32, marginTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  logoPicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: { alignItems: 'center', gap: 4 },
  logoText: { fontSize: 11, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
});
