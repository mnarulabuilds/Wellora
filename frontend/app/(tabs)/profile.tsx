import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function ProfileScreen() {
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');

    // Goals state
    const [targetCalories, setTargetCalories] = useState('');
    const [targetSteps, setTargetSteps] = useState('');
    const [targetWater, setTargetWater] = useState('');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const storedName = await AsyncStorage.getItem('userName');
                if (storedName) setName(storedName);
                const storedAge = await AsyncStorage.getItem('userAge');
                if (storedAge) setAge(storedAge);
                const storedWeight = await AsyncStorage.getItem('userWeight');
                if (storedWeight) setWeight(storedWeight);
                const storedHeight = await AsyncStorage.getItem('userHeight');
                if (storedHeight) setHeight(storedHeight);

                // Load goals
                const storedCalories = await AsyncStorage.getItem('targetCalories');
                if (storedCalories) setTargetCalories(storedCalories);
                const storedSteps = await AsyncStorage.getItem('targetSteps');
                if (storedSteps) setTargetSteps(storedSteps);
                const storedWater = await AsyncStorage.getItem('targetWater');
                if (storedWater) setTargetWater(storedWater);
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        };
        loadProfile();
    }, []);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleSave = async () => {
        const nameVal = name.trim();
        const ageVal = age.trim();
        const weightVal = weight.trim();
        const heightVal = height.trim();
        const calVal = targetCalories.trim();
        const stepVal = targetSteps.trim();
        const waterVal = targetWater.trim();

        // Validation Logic
        if (!nameVal) {
            showAlert("Validation Error", "Please enter your name.");
            return;
        }

        const ageNum = parseInt(ageVal);
        if (!ageVal || isNaN(ageNum) || ageNum < 10 || ageNum > 100) {
            showAlert("Validation Error", "Please enter a valid age (10-100).");
            return;
        }

        const weightNum = parseFloat(weightVal);
        if (!weightVal || isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
            showAlert("Validation Error", "Please enter a valid weight (20-300 kg).");
            return;
        }

        const heightNum = parseFloat(heightVal);
        if (!heightVal || isNaN(heightNum) || heightNum < 50 || heightNum > 300) {
            showAlert("Validation Error", "Please enter a valid height (50-300 cm).");
            return;
        }

        // Validate Goals
        if (calVal && (isNaN(parseInt(calVal)) || parseInt(calVal) <= 0)) {
            showAlert("Validation Error", "Please enter valid target calories.");
            return;
        }
        if (stepVal && (isNaN(parseInt(stepVal)) || parseInt(stepVal) <= 0)) {
            showAlert("Validation Error", "Please enter valid target steps.");
            return;
        }
        if (waterVal && (isNaN(parseFloat(waterVal)) || parseFloat(waterVal) <= 0)) {
            showAlert("Validation Error", "Please enter valid target water amount.");
            return;
        }

        setLoading(true);
        try {
            await AsyncStorage.setItem('userName', nameVal);
            await AsyncStorage.setItem('userAge', ageVal);
            await AsyncStorage.setItem('userWeight', weightVal);
            await AsyncStorage.setItem('userHeight', heightVal);

            if (calVal) await AsyncStorage.setItem('targetCalories', calVal);
            if (stepVal) await AsyncStorage.setItem('targetSteps', stepVal);
            if (waterVal) await AsyncStorage.setItem('targetWater', waterVal);
            showAlert("Success", "Profile & Goals updated!");
        } catch (error) {
            console.error(error);
            showAlert("Error", "Server hanged up, it's not you, it's us!");
        } finally {
            setLoading(false);
            router.push("/");
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Your Profile</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Personal Info</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your Name"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="25"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={age}
                            onChangeText={setAge}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Weight (kg)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="70"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={weight}
                            onChangeText={setWeight}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Height (cm)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="175"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={height}
                            onChangeText={setHeight}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Daily Goals</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Target Calories (Kcal)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2000"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={targetCalories}
                            onChangeText={setTargetCalories}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Target Steps</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="10000"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={targetSteps}
                            onChangeText={setTargetSteps}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Target Water (L)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2.5"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={targetWater}
                            onChangeText={setTargetWater}
                        />
                    </View>
                </View>

                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    <LinearGradient
                        colors={['#4facfe', '#00f2fe']}
                        style={styles.button}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Update & Generate Report'}</Text>
                    </LinearGradient>
                </TouchableOpacity>

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
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1c1b33',
        color: 'white',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        fontSize: 16,
    },
    button: {
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    section: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4facfe',
        marginBottom: 16,
    },
});
