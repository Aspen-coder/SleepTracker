'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun, Star, Plus, BarChart3, Clock, Heart, TrendingUp, Calendar, Edit3, Target, Lightbulb, X, Settings, Trash2 } from 'lucide-react';

// Type definitions
interface SleepEntry {
  id: number;
  bedTime: string;
  wakeTime: string;
  feelingScore: number;
  date: string;
  sleepScore: number;
  duration: number;
  components: ScoreComponents;
  timestamp: string;
}

interface ScoreComponents {
  duration: number;
  circadian: number;
  consistency: number;
  recovery: number;
  subjective: number;
}

interface ScoreResult {
  overall: number;
  duration: number;
  bedtime: number;
  components: ScoreComponents;
}

interface Weights {
  duration: number;
  circadian: number;
  subjective: number;
  consistency: number;
  recovery: number;
}

interface OptimizationGoal {
  id: string;
  label: string;
  description: string;
}

const SleepTracker: React.FC = () => {
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState<boolean>(false);
  const [showOptimizer, setShowOptimizer] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<SleepEntry | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [currentEntry, setCurrentEntry] = useState({
    bedTime: '',
    wakeTime: '',
    feelingScore: 5,
    date: new Date().toISOString().split('T')[0]
  });

  const optimizationGoals: OptimizationGoal[] = [
    { id: 'duration', label: 'Time in Bed', description: 'Optimize sleep duration and efficiency' },
    { id: 'consistency', label: 'Sleep Schedule', description: 'Improve bedtime and wake time consistency' },
    { id: 'timing', label: 'Circadian Rhythm', description: 'Align sleep with natural body clock' },
    { id: 'quality', label: 'Sleep Quality', description: 'Reduce grogginess and improve morning energy' },
    { id: 'recovery', label: 'Recovery', description: 'Address sleep debt and recovery patterns' }
  ];

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('sleepEntries');
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        setSleepEntries(parsed);
      } catch (error) {
        console.error('Error loading sleep entries:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever entries change
  useEffect(() => {
    if (sleepEntries.length > 0) {
      localStorage.setItem('sleepEntries', JSON.stringify(sleepEntries));
    }
  }, [sleepEntries]);

  // Advanced sleep analysis functions
  const calculateSleepDebt = (entries: SleepEntry[]): number => {
    if (entries.length === 0) return 0;
    
    const last7Days = entries.slice(0, 7);
    const totalSleep = last7Days.reduce((sum, entry) => sum + entry.duration, 0);
    const optimalSleep = 8 * last7Days.length;
    return Math.max(0, optimalSleep - totalSleep);
  };

  const calculateStandardDeviation = (values: number[]): number => {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  };

  const calculateConsistencyScore = (entries: SleepEntry[]): number => {
    if (entries.length < 3) return 100;
    
    const last14Days = entries.slice(0, 14);
    
    // Bedtime consistency
    const bedtimes = last14Days.map(entry => {
      const [hours, minutes] = entry.bedTime.split(':').map(Number);
      let bedtimeHour = hours + minutes / 60;
      if (bedtimeHour < 12) bedtimeHour += 24; // Handle past midnight
      return bedtimeHour;
    });
    
    // Wake time consistency
    const waketimes = last14Days.map(entry => {
      const [hours, minutes] = entry.wakeTime.split(':').map(Number);
      return hours + minutes / 60;
    });
    
    const bedtimeStdDev = calculateStandardDeviation(bedtimes);
    const waketimeStdDev = calculateStandardDeviation(waketimes);
    
    const bedtimeConsistency = Math.max(0, 100 - (bedtimeStdDev * 30));
    const waketimeConsistency = Math.max(0, 100 - (waketimeStdDev * 30));
    
    return (bedtimeConsistency + waketimeConsistency) / 2;
  };

  const calculateCircadianScore = (bedTime: string, wakeTime: string): number => {
    const [bedHours, bedMinutes] = bedTime.split(':').map(Number);
    const [wakeHours, wakeMinutes] = wakeTime.split(':').map(Number);
    
    let bedtimeHour = bedHours + bedMinutes / 60;
    const waketimeHour = wakeHours + wakeMinutes / 60;
    
    if (bedtimeHour < 12 && waketimeHour > bedtimeHour + 12) {
      bedtimeHour += 24;
    }
    
    let bedtimeScore = 100;
    let waketimeScore = 100;
    
    // Bedtime scoring with smooth curves
    if (bedtimeHour >= 22 && bedtimeHour <= 23.5) {
      bedtimeScore = 100;
    } else if (bedtimeHour < 22) {
      bedtimeScore = Math.max(60, 100 - Math.pow(22 - bedtimeHour, 1.5) * 15);
    } else {
      bedtimeScore = Math.max(40, 100 - Math.pow(bedtimeHour - 23.5, 1.3) * 20);
    }
    
    // Wake time scoring
    if (waketimeHour >= 6 && waketimeHour <= 8) {
      waketimeScore = 100;
    } else if (waketimeHour < 6) {
      waketimeScore = Math.max(70, 100 - Math.pow(6 - waketimeHour, 1.2) * 15);
    } else {
      waketimeScore = Math.max(60, 100 - Math.pow(waketimeHour - 8, 1.1) * 12);
    }
    
    return (bedtimeScore + waketimeScore) / 2;
  };

  const calculateDurationScore = (duration: number, entries: SleepEntry[] = []): number => {
    let personalOptimal = 8;
    
    if (entries.length >= 7) {
      const recentEntries = entries.slice(0, 14);
      const highQualityEntries = recentEntries.filter(entry => entry.feelingScore >= 7);
      
      if (highQualityEntries.length >= 3) {
        personalOptimal = highQualityEntries.reduce((sum, entry) => sum + entry.duration, 0) / highQualityEntries.length;
      }
    }
    
    const deviation = Math.abs(duration - personalOptimal);
    
    if (deviation <= 0.5) return 100;
    if (deviation <= 1) return 90;
    if (deviation <= 1.5) return 75;
    if (deviation <= 2) return 60;
    if (deviation <= 2.5) return 45;
    return Math.max(20, 45 - (deviation - 2.5) * 10);
  };

  const calculateSleepTrend = (entries: SleepEntry[]): number => {
    if (entries.length < 3) return 0;
    
    const recent = entries.slice(0, Math.floor(entries.length / 2));
    const older = entries.slice(Math.floor(entries.length / 2));
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.sleepScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + entry.sleepScore, 0) / older.length;
    
    return (recentAvg - olderAvg) / 10;
  };

  const calculateRecoveryScore = (entries: SleepEntry[]): number => {
    if (entries.length < 2) return 100;
    
    const sleepDebt = calculateSleepDebt(entries);
    const recentTrend = calculateSleepTrend(entries.slice(0, 7));
    
    let recoveryScore = Math.max(0, 100 - (sleepDebt * 8));
    
    if (recentTrend > 0) {
      recoveryScore = Math.min(100, recoveryScore + recentTrend * 15);
    }
    
    return recoveryScore;
  };

  const calculateAdvancedSleepScore = (
    bedTime: string, 
    wakeTime: string, 
    feelingScore: number, 
    sleepDate: string,
    allEntries: SleepEntry[] = []
  ): ScoreResult => {
    const bedDateTime = new Date(`${sleepDate}T${bedTime}`);
    const wakeDateTime = new Date(`${sleepDate}T${wakeTime}`);
    
    if (wakeDateTime <= bedDateTime) {
      wakeDateTime.setDate(wakeDateTime.getDate() + 1);
    }
    
    const sleepDurationMs = wakeDateTime.getTime() - bedDateTime.getTime();
    const sleepHours = sleepDurationMs / (1000 * 60 * 60);
    
    // Core scoring components
    const durationScore = calculateDurationScore(sleepHours, allEntries);
    const circadianScore = calculateCircadianScore(bedTime, wakeTime);
    const consistencyScore = calculateConsistencyScore(allEntries);
    const recoveryScore = calculateRecoveryScore(allEntries);
    const subjectiveScore = (feelingScore / 10) * 100;
    
    // Dynamic weighting based on data availability
    let weights: Weights;
    if (allEntries.length < 3) {
      weights = {
        duration: 0.35,
        circadian: 0.25,
        subjective: 0.40,
        consistency: 0,
        recovery: 0
      };
    } else if (allEntries.length < 14) {
      weights = {
        duration: 0.30,
        circadian: 0.25,
        subjective: 0.30,
        consistency: 0.15,
        recovery: 0
      };
    } else {
      weights = {
        duration: 0.25,
        circadian: 0.20,
        subjective: 0.25,
        consistency: 0.15,
        recovery: 0.15
      };
    }
    
    const finalScore = Math.round(
      (durationScore * weights.duration) +
      (circadianScore * weights.circadian) +
      (subjectiveScore * weights.subjective) +
      (consistencyScore * weights.consistency) +
      (recoveryScore * weights.recovery)
    );
    
    return {
      overall: Math.max(0, Math.min(100, finalScore)),
      duration: sleepHours,
      bedtime: bedDateTime.getHours() + bedDateTime.getMinutes() / 60,
      components: {
        duration: Math.round(durationScore),
        circadian: Math.round(circadianScore),
        consistency: Math.round(consistencyScore),
        recovery: Math.round(recoveryScore),
        subjective: Math.round(subjectiveScore)
      }
    };
  };

  const generateOptimizationRecommendations = (): string[] => {
    const recommendations: string[] = [];
    
    if (sleepEntries.length < 7) {
      recommendations.push("📊 Track more sleep data to get personalized recommendations");
      return recommendations;
    }

    const recentEntries = sleepEntries.slice(0, 14);
    const avgScore = recentEntries.reduce((sum, entry) => sum + entry.sleepScore, 0) / recentEntries.length;
    const avgDuration = recentEntries.reduce((sum, entry) => sum + entry.duration, 0) / recentEntries.length;
    const avgFeeling = recentEntries.reduce((sum, entry) => sum + entry.feelingScore, 0) / recentEntries.length;
    const sleepDebt = calculateSleepDebt(sleepEntries);
    const consistencyScore = calculateConsistencyScore(sleepEntries);

    selectedGoals.forEach(goalId => {
      switch (goalId) {
        case 'duration':
          if (avgDuration < 7) {
            recommendations.push("⏰ Try going to bed 30-45 minutes earlier to increase sleep duration");
          } else if (avgDuration > 9.5) {
            recommendations.push("🌅 Consider waking up 15-30 minutes earlier - you might be oversleeping");
          }
          if (sleepDebt > 2) {
            recommendations.push(`💤 You have ${sleepDebt.toFixed(1)}h sleep debt - prioritize 8+ hours for the next few nights`);
          }
          break;

        case 'consistency':
          if (consistencyScore < 70) {
            recommendations.push("📅 Set a consistent bedtime within 30 minutes each night");
            recommendations.push("⏰ Use a wake-up alarm at the same time every day, including weekends");
          }
          break;

        case 'timing':
          const avgBedtime = recentEntries.reduce((sum, entry) => {
            const [hours, minutes] = entry.bedTime.split(':').map(Number);
            return sum + (hours + minutes / 60);
          }, 0) / recentEntries.length;
          
          if (avgBedtime > 24 || avgBedtime < 21) {
            recommendations.push("🌙 Try shifting bedtime to 10:00-11:30 PM for optimal circadian rhythm");
          }
          recommendations.push("☀️ Get sunlight exposure within 1 hour of waking up");
          recommendations.push("📱 Avoid screens 1 hour before your target bedtime");
          break;

        case 'quality':
          if (avgFeeling < 6) {
            recommendations.push("🌡️ Keep bedroom temperature between 65-68°F (18-20°C)");
            recommendations.push("🔇 Use blackout curtains and consider white noise for better sleep environment");
            recommendations.push("☕ Avoid caffeine after 2 PM to improve sleep quality");
          }
          break;

        case 'recovery':
          if (sleepDebt > 1) {
            recommendations.push("🛌 Prioritize 8+ hours of sleep to pay down sleep debt");
            recommendations.push("💤 Consider a 20-30 minute power nap if you're severely sleep deprived");
          }
          if (avgScore < avgFeeling * 10) {
            recommendations.push("🧘 Try relaxation techniques before bed (deep breathing, meditation)");
          }
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push("🎉 Great job! Your sleep patterns look healthy. Keep up the consistency!");
    }

    return recommendations;
  };

  const handleAddOrUpdateEntry = () => {
    if (!currentEntry.bedTime || !currentEntry.wakeTime || !currentEntry.date) return;

    const otherEntries = editingEntry 
      ? sleepEntries.filter(entry => entry.id !== editingEntry.id)
      : sleepEntries.filter(entry => entry.date !== currentEntry.date);

    const sleepScore = calculateAdvancedSleepScore(
      currentEntry.bedTime,
      currentEntry.wakeTime,
      currentEntry.feelingScore,
      currentEntry.date,
      otherEntries
    );

    const newEntry: SleepEntry = {
      id: editingEntry ? editingEntry.id : Date.now(),
      ...currentEntry,
      sleepScore: sleepScore.overall,
      duration: sleepScore.duration,
      components: sleepScore.components,
      timestamp: editingEntry ? editingEntry.timestamp : new Date().toISOString()
    };

    const updatedEntries = editingEntry 
      ? sleepEntries.map(entry => entry.id === editingEntry.id ? newEntry : entry)
      : [newEntry, ...otherEntries];

    const sortedEntries = updatedEntries.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setSleepEntries(sortedEntries);
    setCurrentEntry({
      bedTime: '',
      wakeTime: '',
      feelingScore: 5,
      date: new Date().toISOString().split('T')[0]
    });
    setShowAddEntry(false);
    setEditingEntry(null);
  };

  const handleEditEntry = (entry: SleepEntry) => {
    setCurrentEntry({
      bedTime: entry.bedTime,
      wakeTime: entry.wakeTime,
      feelingScore: entry.feelingScore,
      date: entry.date
    });
    setEditingEntry(entry);
    setShowAddEntry(true);
  };

  const handleDeleteEntry = (entryId: number) => {
    if (confirm('Are you sure you want to delete this sleep entry?')) {
      setSleepEntries(prev => prev.filter(entry => entry.id !== entryId));
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const averageScore = sleepEntries.length > 0
    ? Math.round(sleepEntries.reduce((sum, entry) => sum + entry.sleepScore, 0) / sleepEntries.length)
    : 0;

  const sleepDebt = calculateSleepDebt(sleepEntries);
  const consistencyScore = calculateConsistencyScore(sleepEntries);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute top-32 right-20 w-1 h-1 bg-blue-300 rounded-full opacity-40 animate-ping"></div>
        <div className="absolute bottom-40 left-1/4 w-1 h-1 bg-purple-300 rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-indigo-300 rounded-full opacity-30 animate-ping"></div>
        <div className="absolute bottom-20 right-10 w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-md">
        {/* Enhanced Header with Sleep Insights */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Moon className="w-8 h-8 text-indigo-400 mr-2" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Sleep Tracker Pro
            </h1>
          </div>
          
          {sleepEntries.length > 0 && (
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-5 h-5 text-yellow-400 mr-2" />
                  <span className="text-sm opacity-80">Sleep Score</span>
                </div>
                <div className={`text-3xl font-bold ${getScoreColor(averageScore)}`}>
                  {averageScore}
                  <span className="text-sm ml-2 opacity-70">{getScoreLabel(averageScore)}</span>
                </div>
              </div>
              
              {sleepEntries.length >= 7 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
                    <div className="text-xs opacity-60 mb-1">Sleep Debt</div>
                    <div className={`text-lg font-bold ${sleepDebt > 2 ? 'text-red-400' : sleepDebt > 1 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                      {sleepDebt.toFixed(1)}h
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 border border-white/20">
                    <div className="text-xs opacity-60 mb-1">Consistency</div>
                    <div className={`text-lg font-bold ${getScoreColor(consistencyScore)}`}>
                      {Math.round(consistencyScore)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Entry Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddEntry(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 rounded-2xl p-4 flex items-center justify-center border border-indigo-500/50 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Sleep Entry
          </button>
        </div>

        {/* Add/Edit Entry Modal */}
        {showAddEntry && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800/90 backdrop-blur-lg rounded-2xl p-6 w-full max-w-sm border border-white/20">
              <h2 className="text-xl font-bold mb-6 text-center flex items-center justify-center">
                <Moon className="w-5 h-5 mr-2 text-indigo-400" />
                {editingEntry ? 'Edit Sleep Entry' : 'Log Your Sleep'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm opacity-80 mb-2 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Sleep Date
                  </label>
                  <input
                    type="date"
                    value={currentEntry.date}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCurrentEntry(prev => ({...prev, date: e.target.value}))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-2 flex items-center">
                    <Moon className="w-4 h-4 mr-2" />
                    Bedtime
                  </label>
                  <input
                    type="time"
                    value={currentEntry.bedTime}
                    onChange={(e) => setCurrentEntry(prev => ({...prev, bedTime: e.target.value}))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-2 flex items-center">
                    <Sun className="w-4 h-4 mr-2" />
                    Wake Time
                  </label>
                  <input
                    type="time"
                    value={currentEntry.wakeTime}
                    onChange={(e) => setCurrentEntry(prev => ({...prev, wakeTime: e.target.value}))}
                    className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm opacity-80 mb-2 flex items-center">
                    <Heart className="w-4 h-4 mr-2" />
                    How did you feel? ({currentEntry.feelingScore}/10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={currentEntry.feelingScore}
                    onChange={(e) => setCurrentEntry(prev => ({...prev, feelingScore: parseInt(e.target.value)}))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs opacity-60 mt-1">
                    <span>Terrible</span>
                    <span>Amazing</span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddEntry(false);
                      setEditingEntry(null);
                      setCurrentEntry({
                        bedTime: '',
                        wakeTime: '',
                        feelingScore: 5,
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 border border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddOrUpdateEntry}
                    disabled={!currentEntry.bedTime || !currentEntry.wakeTime || !currentEntry.date}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl p-3"
                  >
                    {editingEntry ? 'Update' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sleep Entries */}
        <div className="space-y-4">
          {sleepEntries.length === 0 ? (
            <div className="text-center py-12 opacity-60">
              <Moon className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>No sleep entries yet.</p>
              <p className="text-sm">Add your first entry to start tracking!</p>
            </div>
          ) : (
            sleepEntries.map((entry) => (
              <div key={entry.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-sm opacity-80">
                    {formatDate(entry.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${getScoreColor(entry.sleepScore)}`}>
                      {entry.sleepScore}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                        title="Edit entry"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-red-400"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 opacity-60" />
                    <span className="opacity-80">{formatDuration(entry.duration)}</span>
                  </div>
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 mr-2 opacity-60" />
                    <span className="opacity-80">{entry.feelingScore}/10</span>
                  </div>
                  <div className="flex items-center">
                    <Moon className="w-4 h-4 mr-2 opacity-60" />
                    <span className="opacity-80">{entry.bedTime}</span>
                  </div>
                  <div className="flex items-center">
                    <Sun className="w-4 h-4 mr-2 opacity-60" />
                    <span className="opacity-80">{entry.wakeTime}</span>
                  </div>
                </div>

                {entry.components && sleepEntries.length >= 3 && (
                  <div className="mt-3 text-xs opacity-70">
                    <div className="grid grid-cols-2 gap-2">
                      <div>Duration: {entry.components.duration}</div>
                      <div>Timing: {entry.components.circadian}</div>
                      {sleepEntries.length >= 14 && (
                        <>
                          <div>Consistency: {entry.components.consistency}</div>
                          <div>Recovery: {entry.components.recovery}</div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-3 text-xs opacity-70">
                  Sleep Quality: {getScoreLabel(entry.sleepScore)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Optimize Sleep Button */}
        {sleepEntries.length >= 3 && (
          <div className="mt-8">
            <button
              onClick={() => setShowOptimizer(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 rounded-2xl p-4 flex items-center justify-center border border-purple-500/50 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Target className="w-5 h-5 mr-2" />
              Optimize My Sleep
            </button>
          </div>
        )}

        {/* Sleep Optimization Modal */}
        {showOptimizer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800/90 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md border border-white/20 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-400" />
                  Sleep Optimization
                </h2>
                <button
                  onClick={() => setShowOptimizer(false)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm opacity-80 mb-4">What would you like to improve?</p>
                  <div className="space-y-2">
                    {optimizationGoals.map(goal => (
                      <label key={goal.id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGoals.includes(goal.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGoals(prev => [...prev, goal.id]);
                            } else {
                              setSelectedGoals(prev => prev.filter(id => id !== goal.id));
                            }
                          }}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-sm">{goal.label}</div>
                          <div className="text-xs opacity-70">{goal.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedGoals.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-bold mb-4 text-center">💡 Your Personalized Recommendations</h3>
                    <div className="space-y-3">
                      {generateOptimizationRecommendations().map((rec, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3 text-sm">
                          {rec}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowOptimizer(false);
                      setSelectedGoals([]);
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 border border-white/20"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #6366f1, #8b5cf6);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default SleepTracker;