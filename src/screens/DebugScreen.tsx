/**
 * Debug screen for development and troubleshooting
 * Provides insights into app health, performance, and diagnostics
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  ErrorService, 
  PerformanceService, 
  CacheService, 
  ConfigService,
  ValidationService 
} from '../services';
import useAppHealth from '../hooks/useAppHealth';

export default function DebugScreen() {
  const { healthStatus, metrics, getHealthReport, resetMetrics, refreshHealthStatus } = useAppHealth();
  const [activeTab, setActiveTab] = useState<'health' | 'performance' | 'errors' | 'cache' | 'config'>('health');

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all cached data, errors, and performance metrics. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await CacheService.clear();
            PerformanceService.clearMetrics();
            ErrorService.clearErrors();
            resetMetrics();
            Alert.alert('Success', 'All data cleared successfully');
          },
        },
      ]
    );
  };

  const shareHealthReport = async () => {
    try {
      const report = getHealthReport();
      await Share.share({
        message: `PatternPals Health Report\n\n${report}`,
        title: 'App Health Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share health report');
    }
  };

  const renderHealthTab = () => {
    if (!healthStatus) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading health status...</Text>
        </View>
      );
    }

    const getHealthColor = (status: string) => {
      switch (status) {
        case 'healthy': return '#10B981';
        case 'warning': return '#F59E0B';
        case 'critical': return '#EF4444';
        default: return '#6B7280';
      }
    };

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Health</Text>
          <View style={[styles.healthBadge, { backgroundColor: getHealthColor(healthStatus.overall) }]}>
            <Text style={styles.healthBadgeText}>{healthStatus.overall.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <Text style={styles.metric}>Average Response Time: {healthStatus.performance.averageResponseTime.toFixed(2)}ms</Text>
          <Text style={styles.metric}>Slow Operations: {healthStatus.performance.slowOperationsCount}</Text>
          <Text style={styles.metric}>Performance Optimal: {healthStatus.performance.isPerformanceOptimal ? '✅' : '❌'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Errors</Text>
          <Text style={styles.metric}>Recent Errors: {healthStatus.errors.recentErrorsCount}</Text>
          <Text style={styles.metric}>Critical Errors: {healthStatus.errors.hasCriticalErrors ? '⚠️' : '✅'}</Text>
          <Text style={styles.metric}>Last Error: {healthStatus.errors.lastErrorTime?.toLocaleString() || 'None'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache</Text>
          <Text style={styles.metric}>Hit Rate: {(healthStatus.cache.hitRate * 100).toFixed(1)}%</Text>
          <Text style={styles.metric}>Total Size: {(healthStatus.cache.totalSize / 1024).toFixed(2)} KB</Text>
          <Text style={styles.metric}>Expired Items: {healthStatus.cache.expiredItemsCount}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Metrics</Text>
          <Text style={styles.metric}>Uptime: {(metrics.uptime / 1000 / 60).toFixed(1)} minutes</Text>
          <Text style={styles.metric}>Screen Changes: {metrics.screenChanges}</Text>
          <Text style={styles.metric}>User Interactions: {metrics.userInteractions}</Text>
          <Text style={styles.metric}>Background Time: {(metrics.backgroundTime / 1000 / 60).toFixed(1)} minutes</Text>
        </View>
      </ScrollView>
    );
  };

  const renderPerformanceTab = () => {
    const stats = PerformanceService.getStats();
    const recentMetrics = PerformanceService.getRecentMetrics(10);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <Text style={styles.metric}>Total Metrics: {stats.totalMetrics}</Text>
          <Text style={styles.metric}>Average Duration: {stats.averageDuration.toFixed(2)}ms</Text>
          <Text style={styles.metric}>Operations by Type:</Text>
          {Object.entries(stats.operationsByType).map(([type, count]) => (
            <Text key={type} style={styles.subMetric}>  {type}: {count}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Slowest Operations</Text>
          {stats.slowestOperations.slice(0, 5).map((metric, index) => (
            <View key={metric.id} style={styles.metricRow}>
              <Text style={styles.metricName}>{index + 1}. {metric.name}</Text>
              <Text style={styles.metricValue}>{metric.duration?.toFixed(2)}ms</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Operations</Text>
          {recentMetrics.map((metric) => (
            <View key={metric.id} style={styles.metricRow}>
              <Text style={styles.metricName}>{metric.name}</Text>
              <Text style={styles.metricValue}>{metric.duration?.toFixed(2) || '—'}ms</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderErrorsTab = () => {
    const recentErrors = ErrorService.getRecentErrors(20);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Errors</Text>
          {recentErrors.length === 0 ? (
            <Text style={styles.metric}>No recent errors 🎉</Text>
          ) : (
            recentErrors.map((error) => (
              <View key={error.id} style={styles.errorItem}>
                <View style={styles.errorHeader}>
                  <Text style={[styles.errorType, { color: getSeverityColor(error.severity) }]}>
                    {error.type}
                  </Text>
                  <Text style={styles.errorTime}>
                    {error.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.errorMessage}>{error.message}</Text>
                <Text style={styles.errorUserMessage}>{error.userMessage}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  const renderCacheTab = () => {
    const [cacheStats, setCacheStats] = useState<any>(null);

    React.useEffect(() => {
      CacheService.getStats().then(setCacheStats);
    }, []);

    if (!cacheStats) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading cache stats...</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cache Statistics</Text>
          <Text style={styles.metric}>Total Items: {cacheStats.totalItems}</Text>
          <Text style={styles.metric}>Expired Items: {cacheStats.expiredItems}</Text>
          <Text style={styles.metric}>Total Size: {(cacheStats.totalSize / 1024).toFixed(2)} KB</Text>
          <Text style={styles.metric}>Oldest Item: {cacheStats.oldestItem?.toLocaleString() || 'N/A'}</Text>
          <Text style={styles.metric}>Newest Item: {cacheStats.newestItem?.toLocaleString() || 'N/A'}</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            Alert.alert(
              'Clear Cache',
              'Are you sure you want to clear all cached data?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: async () => {
                    await CacheService.clear();
                    setCacheStats(await CacheService.getStats());
                    Alert.alert('Success', 'Cache cleared successfully');
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.buttonText}>Clear Cache</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderConfigTab = () => {
    const config = ConfigService.getConfig();
    const environment = ConfigService.getEnvironmentConfig();

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment</Text>
          <Text style={styles.metric}>Development: {environment.isDevelopment ? '✅' : '❌'}</Text>
          <Text style={styles.metric}>Production: {environment.isProduction ? '✅' : '❌'}</Text>
          <Text style={styles.metric}>Debug Features: {environment.enableDebugFeatures ? '✅' : '❌'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Flags</Text>
          {Object.entries(config.features).map(([feature, enabled]) => (
            <Text key={feature} style={styles.metric}>
              {feature}: {enabled ? '✅' : '❌'}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          <Text style={styles.metric}>Timeout: {config.api.timeout}ms</Text>
          <Text style={styles.metric}>Retry Attempts: {config.api.retryAttempts}</Text>
          <Text style={styles.metric}>Retry Delay: {config.api.retryDelay}ms</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            const configExport = ConfigService.exportConfig();
            Share.share({
              message: `PatternPals Configuration\n\n${configExport}`,
              title: 'App Configuration',
            });
          }}
        >
          <Text style={styles.buttonText}>Export Configuration</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return '#10B981';
      case 'MEDIUM': return '#F59E0B';
      case 'HIGH': return '#EF4444';
      case 'CRITICAL': return '#7C2D12';
      default: return '#6B7280';
    }
  };

  const tabs = [
    { key: 'health', title: 'Health', icon: 'heart-outline' },
    { key: 'performance', title: 'Performance', icon: 'speedometer-outline' },
    { key: 'errors', title: 'Errors', icon: 'warning-outline' },
    { key: 'cache', title: 'Cache', icon: 'library-outline' },
    { key: 'config', title: 'Config', icon: 'settings-outline' },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug Console</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={refreshHealthStatus} style={styles.headerButton}>
            <Ionicons name="refresh-outline" size={24} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={shareHealthReport} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#6366F1" />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAllData} style={styles.headerButton}>
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.key ? '#6366F1' : '#6B7280'} 
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeTab === 'health' && renderHealthTab()}
      {activeTab === 'performance' && renderPerformanceTab()}
      {activeTab === 'errors' && renderErrorsTab()}
      {activeTab === 'cache' && renderCacheTab()}
      {activeTab === 'config' && renderConfigTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 12,
    padding: 8,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366F1',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#6366F1',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  healthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  healthBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  metric: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  subMetric: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    marginLeft: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricName: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  errorItem: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorType: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorMessage: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  errorUserMessage: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
