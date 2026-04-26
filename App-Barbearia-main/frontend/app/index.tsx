import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import Loading from '../src/components/Loading';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // First access: barber without barbershop -> setup
        if (user.role === 'barber' && !user.barbershop_id) {
          router.replace('/barbershop-setup');
        }
        // First access: user without phone -> setup profile
        else if (!user.phone) {
          router.replace('/first-access-setup');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <Loading text="Carregando..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
