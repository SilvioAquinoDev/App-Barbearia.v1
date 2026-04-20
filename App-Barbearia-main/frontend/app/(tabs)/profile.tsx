import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const { user, logout, checkAuth } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [showEditShop, setShowEditShop] = useState(false);
  const [shopForm, setShopForm] = useState({ name: '', phone: '', address: '' });
  const [savingShop, setSavingShop] = useState(false);

  useEffect(() => { loadBarbershop(); }, []);

  const loadBarbershop = async () => {
    try {
      const res = await api.get('/barbershop/mine');
      if (res.data) {
        setBarbershop(res.data);
        setShopForm({ name: res.data.name || '', phone: res.data.phone || '', address: res.data.address || '' });
      }
    } catch { }
  };

  const handleSaveShop = async () => {
    if (!shopForm.name.trim()) { Alert.alert('Erro', 'Nome e obrigatorio'); return; }
    setSavingShop(true);
    try {
      await api.put('/barbershop/', { name: shopForm.name.trim(), phone: shopForm.phone.trim() || null, address: shopForm.address.trim() || null });
      await loadBarbershop();
      setShowEditShop(false);
      Alert.alert('Sucesso', 'Dados da barbearia atualizados!');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao salvar');
    } finally { setSavingShop(false); }
  };

  const handleUploadLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissao', 'Precisamos de acesso a galeria.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (result.canceled || !result.assets[0]) return;

    try {
      const formData = new FormData();
      const asset = result.assets[0];

      // Para web, precisamos buscar o blob
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        // Determinar o tipo MIME correto
        let mimeType = 'image/jpeg';
        if (asset.uri.includes('.png')) mimeType = 'image/png';
        if (asset.uri.includes('.gif')) mimeType = 'image/gif';

        const file = new File([blob], 'logo.jpg', { type: mimeType });
        formData.append('file', file);
      } else {
        // Para mobile (iOS/Android)
        const fileType = asset.uri.split('.').pop() || 'jpg';
        const mimeType = fileType === 'jpg' || fileType === 'jpeg' ? 'image/jpeg' : 'image/png';

        formData.append('file', {
          uri: asset.uri,
          name: `logo.${fileType}`,
          type: mimeType,
        } as any);
      }

      // Log para debug
      console.log('Enviando arquivo:', formData);

      const response = await api.post('/barbershop/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // Importante: não transformar o FormData
        transformRequest: (data) => data,
      });

      console.log('Resposta do upload:', response.data);
      await loadBarbershop();
      Alert.alert('Sucesso', 'Logo atualizada!');
    } catch (error: any) {
      console.error('Erro detalhado do upload:', error);

      if (error.response) {
        console.log('Dados do erro:', error.response.data);
        console.log('Status:', error.response.status);
        Alert.alert('Erro', error.response.data?.detail || `Erro ${error.response.status}: Verifique o formato da imagem`);
      } else if (error.request) {
        console.log('Sem resposta do servidor');
        Alert.alert('Erro', 'Servidor não respondeu. Verifique sua conexão.');
      } else {
        Alert.alert('Erro', 'Falha ao enviar logo: ' + error.message);
      }
    }
  };


  /*const handleUploadLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissao', 'Precisamos de acesso a galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    try {
      const formData = new FormData();
      formData.append('file', { uri: result.assets[0].uri, name: 'logo.jpg', type: 'image/jpeg' } as any);
      await api.post('/barbershop/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadBarbershop();
      Alert.alert('Sucesso', 'Logo atualizada!');
    } catch { Alert.alert('Erro', 'Falha ao enviar logo'); }
  };

  const getLogoSource = () => {
    if (!barbershop?.logo_url) return null;
    if (barbershop.logo_url.startsWith('http')) return { uri: barbershop.logo_url };
    return { uri: `${api.defaults.baseURL || ''}${barbershop.logo_url}` };
  };*/

  const getLogoSource = () => {
    if (!barbershop?.logo_url) return null;

    // Se já for uma URL completa (http/https)
    if (barbershop.logo_url.startsWith('http')) {
      return { uri: barbershop.logo_url };
    }

    // Para URLs relativas, construir a URL completa
    // Remove a barra inicial se existir para não duplicar
    let logoPath = barbershop.logo_url;
    if (logoPath.startsWith('/')) {
      logoPath = logoPath.substring(1);
    }

    // Base URL da API (sem o /api no final)
    const baseURL = api.defaults.baseURL || 'http://localhost:8001';
    // Remove /api do baseURL se existir
    const apiBaseURL = baseURL.replace(/\/api$/, '');

    const fullUrl = `${apiBaseURL}/${logoPath}`;
    console.log('Logo URL:', fullUrl); // Para debug

    return { uri: fullUrl };
  };

  const handleLogout = () => {
    const doLogout = async () => {
      setLoading(true);
      try {
        await logout();
      } catch (e) {
        console.error('Logout error:', e);
      }
      setLoading(false);
      router.replace('/login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja sair?')) {
        doLogout();
      }
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const handlePromoteToBarber = async () => {
    if (user?.role === 'barber') {
      Alert.alert('Aviso', 'Você já é um barbeiro!');
      return;
    }

    Alert.alert(
      'Promover para Barbeiro',
      'Deseja se tornar um barbeiro? Isso permitirá acessar todas as funcionalidades de gerenciamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, promover',
          onPress: async () => {
            try {
              await api.post('/auth/promote-to-barber');
              await checkAuth(); // Refresh user data in context
              Alert.alert('Sucesso', 'Você agora é um barbeiro! Todas as funcionalidades de gerenciamento foram desbloqueadas.');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao promover usuário');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Só renderiza o Card da barbearia se existir dados */}
      {barbershop && (
        <Card style={[styles.profileCard, { backgroundColor: theme.card }]}>
          <View style={styles.shopHeader}>
            <TouchableOpacity onPress={handleUploadLogo} style={styles.shopLogoContainer} data-testid="profile-upload-logo">
              {getLogoSource() ? (
                <Image source={getLogoSource()!} style={styles.shopLogo} />
              ) : (
                <View style={[styles.shopLogoPlaceholder, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name="storefront" size={28} color={theme.primary} />
                </View>
              )}
              <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={10} color="#FFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.shopInfo}>
              <Text style={[styles.shopNameText, { color: theme.text }]}>{barbershop.name}</Text>
              {barbershop.phone && (
                <View style={styles.shopInfoItem}>
                  <Ionicons name="call-outline" size={16} color={theme.textMuted} />
                  <Text style={[styles.shopInfoValue, { color: theme.textSecondary }]}>{barbershop.phone}</Text>
                </View>
              )}
              {barbershop.address && (
                <View style={styles.shopInfoItem}>
                  <Ionicons name="location-outline" size={16} color={theme.textMuted} />
                  <Text style={[styles.shopInfoValue, { color: theme.textSecondary }]} numberOfLines={2}>{barbershop.address}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[styles.editShopBtn, { backgroundColor: theme.primary }]}
            onPress={() => setShowEditShop(true)}
            data-testid="edit-barbershop-btn"
          >
            <Ionicons name="create-outline" size={16} color="#FFF" />
            <Text style={styles.editShopBtnText}>Editar Dados</Text>
          </TouchableOpacity>
        </Card>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações</Text>

        <Card style={{ backgroundColor: theme.card }}>
          <View style={styles.headerUser}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
                <Ionicons name="person" size={48} color={theme.textMuted} />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
              <Text style={[styles.email, { color: theme.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
                {user?.email}
              </Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: theme.primary }]}>
              <Ionicons
                name={user?.role === 'barber' ? 'cut' : 'person'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.roleText}>
                {user?.role === 'barber' ? 'Barbeiro' : 'Cliente'}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ backgroundColor: theme.card }}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Meu Perfil', `Nome: ${user?.name}\nEmail: ${user?.email}\nRole: ${user?.role === 'barber' ? 'Barbeiro' : 'Cliente'}`)}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Meu Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Notificações', 'As notificações push estão ativas para novos agendamentos.')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Notificações</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Ajuda', 'Barbershop Manager v1.0.0')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Ajuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </Card>
      </View>

      {user?.role !== 'barber' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ações</Text>
          <Button
            title="Tornar-se Barbeiro"
            variant="success"
            onPress={handlePromoteToBarber}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Aparência</Text>
        <Card style={{ backgroundColor: theme.card }}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={isDark ? '#FFD700' : '#FF9500'} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Modo Escuro</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#DDD', true: '#4DA6FF' }}
              thumbColor={isDark ? '#FFFFFF' : '#F4F4F4'}
              data-testid="dark-mode-toggle"
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sobre</Text>
        <Card style={{ backgroundColor: theme.card }}>
          <Text style={[styles.aboutText, { color: theme.text }]}>
            Barbershop Manager v1.0.0
          </Text>
          <Text style={[styles.aboutSubtext, { color: theme.textSecondary }]}>
            Sistema completo de gerenciamento para barbearias
          </Text>
        </Card>
      </View>

      <Button
        title="Sair"
        variant="danger"
        onPress={handleLogout}
        loading={loading}
        style={styles.logoutButton}
      />

      {/* Edit Barbershop Modal */}
      <Modal visible={showEditShop} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditShop(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
            <TouchableOpacity onPress={() => setShowEditShop(false)}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Barbearia</Text>
            <TouchableOpacity onPress={handleSaveShop} disabled={savingShop}>
              <Text style={[styles.modalSave, { color: theme.primary }]}>{savingShop ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Nome *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={shopForm.name}
              onChangeText={(v) => setShopForm({ ...shopForm, name: v })}
              placeholder="Nome da barbearia"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Telefone / WhatsApp</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={shopForm.phone}
              onChangeText={(v) => setShopForm({ ...shopForm, phone: v })}
              placeholder="(00) 00000-0000"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Endereco</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={shopForm.address}
              onChangeText={(v) => setShopForm({ ...shopForm, address: v })}
              placeholder="Rua, numero, bairro, cidade"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    marginBottom: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    flexShrink: 1, // Permite que o texto encolha se necessário
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontWeight: '600',
    fontSize: 13,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
  },
  aboutText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  aboutSubtext: {
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  shopHeader: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  shopLogoContainer: {
    position: 'relative',
  },
  shopLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  shopLogoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  shopInfo: {
    alignItems: 'center',
    width: '100%',
  },
  shopNameText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  shopInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    width: '100%',
  },
  shopInfoValue: {
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'center',
  },
  editShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    alignSelf: 'center',
  },
  editShopBtnText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  textInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
});







/*import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import api from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const { user, logout, checkAuth } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [showEditShop, setShowEditShop] = useState(false);
  const [shopForm, setShopForm] = useState({ name: '', phone: '', address: '' });
  const [savingShop, setSavingShop] = useState(false);

  useEffect(() => { loadBarbershop(); }, []);

  const loadBarbershop = async () => {
    try {
      const res = await api.get('/barbershop/mine');
      if (res.data) {
        setBarbershop(res.data);
        setShopForm({ name: res.data.name || '', phone: res.data.phone || '', address: res.data.address || '' });
      }
    } catch {}
  };

  const handleSaveShop = async () => {
    if (!shopForm.name.trim()) { Alert.alert('Erro', 'Nome e obrigatorio'); return; }
    setSavingShop(true);
    try {
      await api.put('/barbershop/', { name: shopForm.name.trim(), phone: shopForm.phone.trim() || null, address: shopForm.address.trim() || null });
      await loadBarbershop();
      setShowEditShop(false);
      Alert.alert('Sucesso', 'Dados da barbearia atualizados!');
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.detail || 'Falha ao salvar');
    } finally { setSavingShop(false); }
  };

  const handleUploadLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissao', 'Precisamos de acesso a galeria.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    try {
      const formData = new FormData();
      formData.append('file', { uri: result.assets[0].uri, name: 'logo.jpg', type: 'image/jpeg' } as any);
      await api.post('/barbershop/logo', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadBarbershop();
      Alert.alert('Sucesso', 'Logo atualizada!');
    } catch { Alert.alert('Erro', 'Falha ao enviar logo'); }
  };

  const getLogoSource = () => {
    if (!barbershop?.logo_url) return null;
    if (barbershop.logo_url.startsWith('http')) return { uri: barbershop.logo_url };
    return { uri: `${api.defaults.baseURL || ''}${barbershop.logo_url}` };
  };

  const handleLogout = () => {
    const doLogout = async () => {
      setLoading(true);
      try {
        await logout();
      } catch (e) {
        console.error('Logout error:', e);
      }
      setLoading(false);
      router.replace('/login');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja sair?')) {
        doLogout();
      }
    } else {
      Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const handlePromoteToBarber = async () => {
    if (user?.role === 'barber') {
      Alert.alert('Aviso', 'Você já é um barbeiro!');
      return;
    }

    Alert.alert(
      'Promover para Barbeiro',
      'Deseja se tornar um barbeiro? Isso permitirá acessar todas as funcionalidades de gerenciamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim, promover',
          onPress: async () => {
            try {
              await api.post('/auth/promote-to-barber');
              await checkAuth(); // Refresh user data in context
              Alert.alert('Sucesso', 'Você agora é um barbeiro! Todas as funcionalidades de gerenciamento foram desbloqueadas.');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao promover usuário');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <Card style={[styles.profileCard, { backgroundColor: theme.card }]}>
        {user?.picture ? (
          <Image source={{ uri: user.picture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
            <Ionicons name="person" size={48} color={theme.textMuted} />
          </View>
        )}
        
        <Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
        
        <View style={[styles.roleBadge, { backgroundColor: theme.primary }]}>
          <Ionicons 
            name={user?.role === 'barber' ? 'cut' : 'person'} 
            size={16} 
            color="#FFF" 
          />
          <Text style={styles.roleText}>
            {user?.role === 'barber' ? 'Barbeiro' : 'Cliente'}
          </Text>
        </View>
      </Card>

      {/* Barbershop Info Section /}
      {user?.role === 'barber' && barbershop && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Minha Barbearia</Text>
          <Card style={{ backgroundColor: theme.card }}>
            <View style={styles.shopHeader}>
              <TouchableOpacity onPress={handleUploadLogo} style={styles.shopLogoContainer} data-testid="profile-upload-logo">
                {getLogoSource() ? (
                  <Image source={getLogoSource()!} style={styles.shopLogo} />
                ) : (
                  <View style={[styles.shopLogoPlaceholder, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name="storefront" size={28} color={theme.primary} />
                  </View>
                )}
                <View style={[styles.editBadge, { backgroundColor: theme.primary }]}>
                  <Ionicons name="camera" size={10} color="#FFF" />
                </View>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shopNameText, { color: theme.text }]}>{barbershop.name}</Text>
                {barbershop.phone && (
                  <View style={styles.shopInfoItem}>
                    <Ionicons name="call-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.shopInfoValue, { color: theme.textSecondary }]}>{barbershop.phone}</Text>
                  </View>
                )}
                {barbershop.address && (
                  <View style={styles.shopInfoItem}>
                    <Ionicons name="location-outline" size={14} color={theme.textMuted} />
                    <Text style={[styles.shopInfoValue, { color: theme.textSecondary }]} numberOfLines={2}>{barbershop.address}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.editShopBtn, { borderColor: theme.primary }]}
              onPress={() => setShowEditShop(true)}
              data-testid="edit-barbershop-btn"
            >
              <Ionicons name="create-outline" size={16} color={theme.primary} />
              <Text style={[styles.editShopBtnText, { color: theme.primary }]}>Editar Dados</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Informações</Text>
        
        <Card style={{ backgroundColor: theme.card }}>
          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Meu Perfil', `Nome: ${user?.name}\nEmail: ${user?.email}\nRole: ${user?.role === 'barber' ? 'Barbeiro' : 'Cliente'}`)}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Meu Perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Notificações', 'As notificações push estão ativas para novos agendamentos.')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Notificações</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.divider }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Ajuda', 'Barbershop Manager v1.0.0')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Ajuda</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </Card>
      </View>

      {user?.role === 'barber' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Gerenciamento</Text>
          <Card style={{ backgroundColor: theme.card }}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/promotions-manage')}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="pricetag-outline" size={24} color="#FF6B00" />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Promoções</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {user?.role === 'barber' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Integrações</Text>
          <Card style={{ backgroundColor: theme.card }}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/whatsapp-settings')}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
                <Text style={[styles.menuItemText, { color: theme.text }]}>WhatsApp Business</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/server-config')}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="server-outline" size={24} color={theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Configurar Servidor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {user?.role !== 'barber' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Acoes</Text>
          <Button
            title="Tornar-se Barbeiro"
            variant="success"
            onPress={handlePromoteToBarber}
          />
        </View>
      )}

      <View style={[styles.section]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Aparência</Text>
        <Card style={{ backgroundColor: theme.card }}>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={isDark ? '#FFD700' : '#FF9500'} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>Modo Escuro</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#DDD', true: '#4DA6FF' }}
              thumbColor={isDark ? '#FFFFFF' : '#F4F4F4'}
              data-testid="dark-mode-toggle"
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sobre</Text>
        <Card>
          <Text style={[styles.aboutText, { color: theme.text }]}>
            Barbershop Manager v1.0.0
          </Text>
          <Text style={[styles.aboutSubtext, { color: theme.textSecondary }]}>
            Sistema completo de gerenciamento para barbearias
          </Text>
        </Card>
      </View>

      <Button
        title="Sair"
        variant="danger"
        onPress={handleLogout}
        loading={loading}
        style={styles.logoutButton}
      />

      {/* Edit Barbershop Modal /}
      <Modal visible={showEditShop} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditShop(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
            <TouchableOpacity onPress={() => setShowEditShop(false)}>
              <Text style={[styles.modalCancel, { color: theme.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Barbearia</Text>
            <TouchableOpacity onPress={handleSaveShop} disabled={savingShop}>
              <Text style={[styles.modalSave, { color: theme.primary }]}>{savingShop ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Nome *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={shopForm.name}
              onChangeText={(v) => setShopForm({ ...shopForm, name: v })}
              placeholder="Nome da barbearia"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Telefone / WhatsApp</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={shopForm.phone}
              onChangeText={(v) => setShopForm({ ...shopForm, phone: v })}
              placeholder="(00) 00000-0000"
              placeholderTextColor={theme.textMuted}
              keyboardType="phone-pad"
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Endereco</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              value={shopForm.address}
              onChangeText={(v) => setShopForm({ ...shopForm, address: v })}
              placeholder="Rua, numero, bairro, cidade"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 16,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  aboutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  aboutSubtext: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    marginTop: 24,
    marginBottom: 32,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  shopLogoContainer: {
    position: 'relative',
  },
  shopLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  shopLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopNameText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  shopInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  shopInfoValue: {
    fontSize: 13,
    flex: 1,
  },
  editShopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  editShopBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  textInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
});*/
