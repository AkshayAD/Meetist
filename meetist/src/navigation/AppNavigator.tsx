import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, BottomTabParamList } from '../types';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import RecordingScreen from '../screens/RecordingScreenEnhanced';
import MeetingsScreen from '../screens/MeetingsScreen';
import MeetingDetailScreen from '../screens/MeetingDetailScreen';
import SettingsScreen from '../screens/SettingsScreenEnhanced';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MeetingsTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="MeetingsTab" 
        component={MeetingsScreen}
        options={{ title: 'Meetings' }}
      />
      <Tab.Screen 
        name="SettingsTab" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={BottomTabs}
          options={{ title: 'Meetist' }}
        />
        <Stack.Screen 
          name="Recording" 
          component={RecordingScreen}
          options={{ title: 'Recording' }}
        />
        <Stack.Screen 
          name="MeetingDetail" 
          component={MeetingDetailScreen}
          options={{ title: 'Meeting Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}