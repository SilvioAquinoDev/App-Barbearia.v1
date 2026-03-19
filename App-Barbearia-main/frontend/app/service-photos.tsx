import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, Platform, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../src/services/api';

export default function ServicePhotos() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const serviceId = params.serviceId;
  const serviceName = params.serviceName || 'Serviço';

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPhotos = useCallback(async () => {
    if (!serviceId) return;
    try {
      const res = await api.get(`/service-photos/${serviceId}`);
      setPhotos(res.data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serviceId]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'Precisamos de acesso à galeria para enviar fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      uploadPhoto(result.assets[0].base64);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'Precisamos de acesso à câmera para tirar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets[0]?.base64) {
      uploadPhoto(result.assets[0].base64);
    }
  };

  const uploadPhoto = async (base64Data: string) => {
    setUploading(true);
    try {
      await api.post('/service-photos/', {
        service_id: parseInt(serviceId as string),
        photo_data: `data:image/jpeg;base64,${base64Data}`,
        caption: null,
      });
      Alert.alert('Sucesso', 'Foto adicionada!');
      loadPhotos();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = (photo: any) => {
    const doDelete = async () => {
      try {
        await api.delete(`/service-photos/${photo.id}`);
        loadPhotos();
      } catch (e) {
        Alert.alert('Erro', 'Falha ao remover foto');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remover esta foto?')) doDelete();
    } else {
      Alert.alert('Confirmar', 'Remover esta foto?', [
        { text: 'Cancelar' },
        { text: 'Remover', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const showPhotoOptions = () => {
    if (Platform.OS === 'web') {
      pickImage();
      return;
    }
    Alert.alert('Adicionar Foto', 'Escolha a origem da foto', [
      { text: 'Câmera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Fotos</Text>
          <Text style={s.subtitle}>{serviceName}</Text>
        </View>
        <TouchableOpacity onPress={showPhotoOptions} style={s.addBtn} disabled={uploading} data-testid="add-photo-btn">
          {uploading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="camera" size={24} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPhotos(); }} />}
      >
        {photos.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="images-outline" size={56} color="#CCC" />
            <Text style={s.emptyText}>Nenhuma foto</Text>
            <Text style={s.emptySubtext}>Adicione fotos do seu trabalho para atrair clientes!</Text>
            <TouchableOpacity style={s.emptyActionBtn} onPress={showPhotoOptions}>
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={s.emptyActionText}>Adicionar Foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.grid}>
            {photos.map((photo: any) => (
              <View key={photo.id} style={s.photoCard}>
                <Image
                  source={{ uri: photo.photo_data }}
                  style={s.photo}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => deletePhoto(photo)}
                  data-testid={`delete-photo-${photo.id}`}
                >
                  <Ionicons name="trash" size={16} color="#FFF" />
                </TouchableOpacity>
                <Text style={s.photoDate}>
                  {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8E8E8' },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#333', marginLeft: 12 },
  subtitle: { fontSize: 13, color: '#666', marginLeft: 12 },
  addBtn: { padding: 8 },
  content: { padding: 12 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#BBB', marginTop: 4, textAlign: 'center' },
  emptyActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  emptyActionText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCard: { width: '48%', borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginBottom: 4 },
  photo: { width: '100%', height: 180, backgroundColor: '#E0E0E0' },
  deleteBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,59,48,0.85)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  photoDate: { fontSize: 12, color: '#999', padding: 8, textAlign: 'center' },
});
