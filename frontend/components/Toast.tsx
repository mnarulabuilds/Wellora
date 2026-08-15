import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'success' | 'error' | 'info'>('info');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const showToast = useCallback(
    (msg: string, toastType: 'success' | 'error' | 'info' = 'info') => {
      setMessage(msg);
      setType(toastType);
      setVisible(true);

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }, 3000);
    },
    [opacity, translateY]
  );

  const bgColor =
    type === 'success'
      ? theme.colors.success
      : type === 'error'
      ? theme.colors.error
      : theme.colors.primary;

  const iconName =
    type === 'success'
      ? 'checkmark-circle'
      : type === 'error'
      ? 'alert-circle'
      : 'information-circle';

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.container,
            { opacity, transform: [{ translateY }], backgroundColor: bgColor },
          ]}
        >
          <Ionicons name={iconName} size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.md,
    zIndex: 99999,
    elevation: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
