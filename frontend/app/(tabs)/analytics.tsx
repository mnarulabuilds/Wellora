import { StyleSheet, View, Text, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, PieChart, LineChart } from "react-native-chart-kit";
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [userAge, setUserAge] = useState<string>('');
    const [userWeight, setUserWeight] = useState<string>('');
    const [userHeight, setUserHeight] = useState<string>('');

    useFocusEffect(
        useCallback(() => {
            loadUserProfile();
        }, [])
    );

    const loadUserProfile = async () => {
        try {
            const age = await AsyncStorage.getItem('userAge');
            const weight = await AsyncStorage.getItem('userWeight');
            const height = await AsyncStorage.getItem('userHeight');
            if (age) setUserAge(age);
            if (weight) setUserWeight(weight);
            if (height) setUserHeight(height);
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    };

    const generateReport = async () => {
        if (!userAge || !userWeight || !userHeight) {
            showAlert("Missing Info", "Please update your profile first!");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${process.env.EXPO_PUBLIC_API_BASE_URL}/generate_report`, {
                age: parseInt(userAge),
                weight: parseFloat(userWeight),
                height: parseFloat(userHeight),
                activity_level: "light", // Default for now, could be dynamic
                dietary_preferences: [],
                health_goals: ["maintenance"]
            });
            setReportData(response.data);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to generate report.");
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const chartConfig = {
        backgroundGradientFrom: "#1c1b33",
        backgroundGradientTo: "#1c1b33",
        color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.6,
        useShadowColorFromDataset: false,
        decimalPlaces: 1,
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Health Analytics</Text>

                <View style={styles.card}>
                    <Text style={styles.description}>
                        Generate a comprehensive health report based on your profile data.
                    </Text>

                    <TouchableOpacity onPress={generateReport} disabled={loading}>
                        <LinearGradient
                            colors={['#FF416C', '#FF4B2B']}
                            style={styles.button}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Generating...' : 'Generate Report'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <ActivityIndicator size="large" color="#FF416C" style={{ marginTop: 20 }} />
                )}

                {reportData && (
                    <View style={styles.resultsContainer}>
                        {/* Key Metrics */}
                        <View style={styles.metricsRow}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>BMI</Text>
                                <Text style={styles.metricValue}>{reportData.bmi}</Text>
                                <Text style={styles.metricSub}>{reportData.bmi_category}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>Daily Cal</Text>
                                <Text style={styles.metricValue}>{reportData.daily_calories}</Text>
                                <Text style={styles.metricSub}>kcal/day</Text>
                            </View>
                        </View>

                        {/* BMI Chart (Bar Chart for visual representation) */}
                        <Text style={styles.chartTitle}>BMI Category</Text>
                        <View style={styles.chartContainer}>
                            <BarChart
                                data={{
                                    labels: ["Under", "Normal", "Over", "Obese", "You"],
                                    datasets: [
                                        {
                                            data: [18.5, 24.9, 29.9, 35, reportData.bmi]
                                        }
                                    ]
                                }}
                                width={screenWidth - 40}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix=""
                                chartConfig={{
                                    ...chartConfig,
                                    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                }}
                                verticalLabelRotation={0}
                                style={{ borderRadius: 16 }}
                            />
                        </View>

                        {/* Macro Breakdown (Pie Chart) - Mocked based on typical ratios */}
                        <Text style={styles.chartTitle}>Recommended Macros (g)</Text>
                        <View style={styles.chartContainer}>
                            <PieChart
                                data={[
                                    {
                                        name: "Protein",
                                        population: Math.round(reportData.daily_calories * reportData.charts.macros.data[0] / 4),
                                        color: "#FF6B6B",
                                        legendFontColor: "#fff",
                                        legendFontSize: 14
                                    },
                                    {
                                        name: "Carbs",
                                        population: Math.round(reportData.daily_calories * reportData.charts.macros.data[1] / 4),
                                        color: "#4ECDC4",
                                        legendFontColor: "#fff",
                                        legendFontSize: 14
                                    },
                                    {
                                        name: "Fats",
                                        population: Math.round(reportData.daily_calories * reportData.charts.macros.data[2] / 9),
                                        color: "#FFE66D",
                                        legendFontColor: "#fff",
                                        legendFontSize: 14
                                    }
                                ]}
                                width={screenWidth - 40}
                                height={220}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"15"}
                                center={[10, 0]}
                                absolute
                            />
                        </View>

                        {/* Weight Projection (Line Chart) */}
                        <Text style={styles.chartTitle}>Proj. Weight Change (12 Weeks)</Text>
                        <View style={styles.chartContainer}>
                            <LineChart
                                data={{
                                    labels: ["W1", "W4", "W8", "W12"],
                                    datasets: [
                                        {
                                            data: [
                                                0,
                                                reportData.charts.weight_projection.change[3],
                                                reportData.charts.weight_projection.change[7],
                                                reportData.charts.weight_projection.change[11]
                                            ]
                                        }
                                    ]
                                }}
                                width={screenWidth - 40}
                                height={220}
                                yAxisLabel=""
                                yAxisSuffix="kg"
                                chartConfig={{
                                    ...chartConfig,
                                    color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                                }}
                                bezier
                                style={{ borderRadius: 16 }}
                            />
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Recommendations</Text>
                            {reportData.recommendations.map((rec: string, index: number) => (
                                <View key={index} style={styles.recItem}>
                                    <Ionicons name="checkmark-circle" size={20} color="#4ECDC4" />
                                    <Text style={styles.recText}>{rec}</Text>
                                </View>
                            ))}
                        </View>

                    </View>
                )}
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
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 20,
    },
    card: {
        backgroundColor: '#1c1b33',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#2a2a40',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 15,
    },
    description: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 20,
        lineHeight: 24,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resultsContainer: {
        marginTop: 20,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricCard: {
        backgroundColor: '#2a2a40',
        borderRadius: 16,
        padding: 20,
        width: '48%',
        alignItems: 'center',
    },
    metricLabel: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 8,
    },
    metricValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    metricSub: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
    },
    chartTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 10,
    },
    chartContainer: {
        alignItems: 'center',
        marginVertical: 10,
        backgroundColor: '#1c1b33',
        borderRadius: 16,
        padding: 10,
        overflow: 'hidden', // Contain chart background
    },
    recItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    recText: {
        color: '#eee',
        fontSize: 15,
        marginLeft: 10,
        flex: 1,
    },
});
