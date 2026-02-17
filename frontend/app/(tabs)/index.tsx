import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Dimensions, Modal, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from "react-native-chart-kit";
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Dashboard() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<'meal' | 'workout' | null>(null);
  const [details, setDetails] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('Guest');
  const [goals, setGoals] = useState({ calories: '2000', steps: '10000', water: '2.5' });
  const [healthScore, setHealthScore] = useState<{ score: number; label: string; color: string; feedback: string[] }>({
    score: 0,
    label: 'Loading...',
    color: '#6a11cb',
    feedback: []
  });
  const [activityHistory, setActivityHistory] = useState<{ labels: string[]; data: number[] }>({
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    data: [0, 0, 0, 0, 0, 0, 0]
  });

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        try {
          const storedName = await AsyncStorage.getItem('userName');
          if (storedName) {
            setUserName(storedName);
          } else {
            setUserName('Guest');
          }

          const storedCalories = await AsyncStorage.getItem('targetCalories');
          const storedSteps = await AsyncStorage.getItem('targetSteps');
          const storedWater = await AsyncStorage.getItem('targetWater');

          setGoals({
            calories: storedCalories || '2000',
            steps: storedSteps || '10000',
            water: storedWater || '2.5'
          });

          // Fetch health score
          await fetchHealthScore();
          // Fetch activity history
          await fetchActivityHistory();

        } catch (e) {
          console.log("Error loading name", e);
        }
      };
      loadUser();
    }, [])
  );

  const fetchHealthScore = async () => {
    try {
      const age = await AsyncStorage.getItem('userAge');
      const weight = await AsyncStorage.getItem('userWeight');
      const height = await AsyncStorage.getItem('userHeight');

      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_BASE_URL}/calculate_health_score`, {
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
        height: height ? parseFloat(height) : null,
        user_id: 'default_user'
      });

      setHealthScore({
        score: response.data.score,
        label: response.data.label,
        color: response.data.color,
        feedback: response.data.feedback
      });
    } catch (error) {
      console.error("Failed to fetch health score", error);
      setHealthScore({
        score: 0,
        label: 'Update Profile',
        color: '#999',
        feedback: ['Complete your profile to see your health score']
      });
    }
  };

  const fetchActivityHistory = async () => {
    try {
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_BASE_URL}/activity_history?user_id=default_user`);
      setActivityHistory({
        labels: response.data.labels,
        data: response.data.data
      });
    } catch (error) {
      console.error("Failed to fetch activity history", error);
    }
  };

  const handleAction = (type: 'meal' | 'workout') => {
    setActionType(type);
    setDetails('');
    setValue('');
    setModalVisible(true);
  };

  const submitActivity = async () => {
    if (!details || !value) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${process.env.EXPO_PUBLIC_API_BASE_URL}/log_activity`, {
        activity_type: actionType,
        details: details,
        value: parseFloat(value)
      });
      setModalVisible(false);
      Alert.alert("Success", response.data.message);

      // Refresh health score after logging activity
      await fetchHealthScore();
      await fetchActivityHistory();
    } catch (error) {
      Alert.alert("Error", "Failed to log activity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.username}>{userName}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle-outline" size={40} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Health Score Card */}
        <LinearGradient
          colors={[healthScore.color, '#2575fc']}
          style={styles.scoreCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View>
            <Text style={styles.scoreLabel}>Health Score</Text>
            <Text style={styles.scoreValue}>{healthScore.score}</Text>
            <Text style={styles.scoreSub}>{healthScore.label}</Text>
          </View>
          <View style={styles.scoreCircle}>
            <Ionicons name="heart" size={32} color="white" />
          </View>
        </LinearGradient>

        {/* Health Score Feedback */}
        {healthScore.feedback.length > 0 && (
          <View style={styles.feedbackContainer}>
            {healthScore.feedback.map((item, index) => (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name="information-circle" size={16} color="#4ECDC4" />
                <Text style={styles.feedbackText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Today's Goals */}
        <Text style={styles.sectionTitle}>Today's Goals</Text>
        <View style={styles.goalsContainer}>
          <View style={styles.goalCard}>
            <Ionicons name="flame" size={24} color="#FF6B6B" />
            <Text style={styles.goalValue}>{goals.calories}</Text>
            <Text style={styles.goalLabel}>Kcal</Text>
          </View>
          <View style={styles.goalCard}>
            <Ionicons name="footsteps" size={24} color="#4ECDC4" />
            <Text style={styles.goalValue}>{goals.steps}</Text>
            <Text style={styles.goalLabel}>Steps</Text>
          </View>
          <View style={styles.goalCard}>
            <Ionicons name="water" size={24} color="#45B7D1" />
            <Text style={styles.goalValue}>{goals.water}L</Text>
            <Text style={styles.goalLabel}>Water</Text>
          </View>
        </View>

        {/* Weekly Progress Chart */}
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: activityHistory.labels,
              datasets: [
                {
                  data: activityHistory.data
                }
              ]
            }}
            width={Dimensions.get("window").width - 40} // from react-native
            height={220}
            yAxisLabel=""
            yAxisSuffix="m"
            yAxisInterval={1} // optional, defaults to 1
            chartConfig={{
              backgroundColor: "#1c1b33",
              backgroundGradientFrom: "#1c1b33",
              backgroundGradientTo: "#1c1b33",
              decimalPlaces: 0, // optional, defaults to 2dp
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#ffa726"
              }
            }}
            bezier
            style={{
              borderRadius: 16,
              paddingRight: 40, // fix cutoff
            }}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('meal')}>
            <LinearGradient colors={['#FF512F', '#DD2476']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="nutrition" size={24} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.actionText}>Log Meal</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleAction('workout')}>
            <LinearGradient colors={['#11998e', '#38ef7d']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="barbell" size={24} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.actionText}>Start Workout</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/assistant')}>
            <LinearGradient colors={['#8E2DE2', '#4A00E0']} style={styles.actionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Ionicons name="chatbubbles" size={24} color="white" style={{ marginRight: 10 }} />
              <Text style={styles.actionText}>Ask Assistant</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Activity Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {actionType === 'meal' ? 'Log Meal' : 'Log Workout'}
              </Text>

              <Text style={styles.inputLabel}>
                {actionType === 'meal' ? 'What did you eat?' : 'What did you do?'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder={actionType === 'meal' ? "e.g. Grilled Chicken Salad" : "e.g. Running"}
                placeholderTextColor="#999"
                value={details}
                onChangeText={setDetails}
              />

              <Text style={styles.inputLabel}>
                {actionType === 'meal' ? 'Calories (kcal)' : 'Duration (mins)'}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={value}
                onChangeText={setValue}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.submitBtn]} onPress={submitActivity} disabled={loading}>
                  <Text style={styles.btnText}>{loading ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#a0a0a0',
    fontFamily: 'System', // Use default system font for now
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  profileButton: {
    padding: 5,
  },
  scoreCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#2575fc',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  scoreValue: {
    color: 'white',
    fontSize: 48,
    fontWeight: '800',
  },
  scoreSub: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 15,
    paddingLeft: 4,
  },
  goalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  goalCard: {
    backgroundColor: '#1c1b33',
    borderRadius: 20,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  goalValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  goalLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  actionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    height: 60, // Taller buttons
  },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center', // Center vertically
  },
  actionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: 30,
    alignItems: 'center',
    backgroundColor: '#1c1b33',
    borderRadius: 16,
    padding: 10,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1b33',
    width: '80%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    color: '#ccc',
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#0f0c29',
    color: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#333',
  },
  submitBtn: {
    backgroundColor: '#2575fc',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  feedbackContainer: {
    backgroundColor: '#1c1b33',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  feedbackText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
  },
});
