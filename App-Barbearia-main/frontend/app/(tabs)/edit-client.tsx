import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';

interface ClientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  total_appointments?: number;
  last_appointment?: string | null;
}

export default function EditClient() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState<ClientData>({
    id: '',
    name: '',
    email: '',
    phone: '',
    birth_date: null,
  });

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    try {
      if (params.client) {
        const client = JSON.parse(params.client as string);
        
        // Verificar se é um cliente registrado (tem ID)
        if (!client.id) {
          Alert.alert(
            'Aviso',
            'Este cliente não é um cliente registrado no sistema. Para editar, é necessário convertê-lo em um cliente registrado.',
            [
              { text: 'Voltar', onPress: () => router.replace('/clients') },
              { text: 'Converter e Editar', onPress: () => handleConvertToRegistered(client) }
            ]
          );
          return;
        }
        
        setFormData({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          birth_date: client.birth_date,
          total_appointments: client.total_appointments,
          last_appointment: client.last_appointment,
        });
      } else if (params.id) {
        const response = await api.get(`/clients/${params.id}`);
        setFormData(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do cliente');
      router.replace('/clients');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleConvertToRegistered = async (client: any) => {
    setLoading(true);
    try {
      // Criar um novo usuário registrado baseado nos dados do appointment
      const response = await api.post('/users/convert-client', {
        name: client.name,
        email: client.email,
        phone: client.phone,
        role: 'client',
      });
      
      // Após converter, carregar os dados do novo cliente
      setFormData({
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        birth_date: null,
      });
      
      Alert.alert('Sucesso', 'Cliente convertido com sucesso! Agora você pode editar os dados.');
    } catch (error) {
      console.error('Erro ao converter cliente:', error);
      Alert.alert('Erro', 'Não foi possível converter o cliente');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClientData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      // Formatar a data para YYYY-MM-DD (formato que o backend espera)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      setFormData(prev => ({ ...prev, birth_date: formattedDate }));
    }
  };

  const formatDateForDisplay = (dateStr: string | null) => {
    if (!dateStr) return '';
    // Converte de YYYY-MM-DD para DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatDateForPicker = (dateStr: string | null) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'O nome do cliente é obrigatório');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert('Erro', 'Email inválido');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
      };

      console.log('Enviando dados:', payload); // Para debug
      
      await api.put(`/clients/${formData.id}`, payload);
      
      Alert.alert(
        'Sucesso',
        'Cliente atualizado com sucesso!',
        [{ text: 'OK', onPress: () => router.replace('/clients') }] // Usando replace ao invés de back
      );
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      const message = error.response?.data?.detail || 'Erro ao salvar as alterações';
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  };

  // Função para voltar para a página de clientes
  const handleGoBack = () => {
    router.replace('/clients');
  };

  if (initialLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Carregando dados do cliente...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleGoBack} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Editar Cliente</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.form, { backgroundColor: theme.card }]}>
        {/* Campo Nome */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>
            Nome Completo <Text style={styles.required}>*</Text>
          </Text>
          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Digite o nome completo"
              placeholderTextColor={theme.textMuted}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
            />
          </View>
        </View>

        {/* Campo Email */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="exemplo@email.com"
              placeholderTextColor={theme.textMuted}
              value={formData.email || ''}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Campo Telefone */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Telefone</Text>
          <View style={[styles.inputContainer, { borderColor: theme.border }]}>
            <Ionicons name="call-outline" size={20} color={theme.textMuted} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="(00) 00000-0000"
              placeholderTextColor={theme.textMuted}
              value={formData.phone || ''}
              onChangeText={(text) => handleInputChange('phone', text)}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Campo Data de Nascimento */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Data de Nascimento</Text>
          <TouchableOpacity
            style={[styles.inputContainer, { borderColor: theme.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.textMuted} />
            <Text style={[styles.dateText, { color: formData.birth_date ? theme.text : theme.textMuted }]}>
              {formatDateForDisplay(formData.birth_date) || 'Selecionar data'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={formatDateForPicker(formData.birth_date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Informações adicionais (apenas leitura) */}
        {formData.total_appointments !== undefined && (
          <View style={[styles.infoSection, { borderTopColor: theme.divider }]}>
            <Text style={[styles.infoTitle, { color: theme.textSecondary }]}>
              Informações Adicionais
            </Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textMuted }]}>
                Total de Atendimentos:
              </Text>
              <Text style={[styles.infoValue, { color: theme.primary }]}>
                {formData.total_appointments}
              </Text>
            </View>
            {formData.last_appointment && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textMuted }]}>
                  Último Atendimento:
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {formData.last_appointment}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Botões de ação */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { borderColor: theme.border }]}
          onPress={handleGoBack}
          disabled={loading}
        >
          <Text style={[styles.buttonText, { color: theme.textSecondary }]}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={[styles.buttonText, styles.saveButtonText]}>Salvar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  form: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  infoSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
  },
});