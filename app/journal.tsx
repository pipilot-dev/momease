// Journal / Self-Care Diary Screen
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Plus,
  Heart,
  Search,
  Sparkles,
  Trash2,
  Edit2,
  RefreshCw,
} from "lucide-react-native";

import { colors, gradients, shadows, radius, spacing } from "../lib/theme";
import { useJournalStore } from "../lib/stores/journal-store";
import {
  getRandomPrompt,
  getJournalStats,
  type JournalEntry,
  type JournalPrompt,
} from "../lib/mock-journal";
import { moodLabels, moodTags as baseMoodTags } from "../lib/mock-mood";

// Journal-specific tags
const journalTags = [
  "parenting",
  "work",
  "self-care",
  "growth",
  "gratitude",
  "reflection",
  "goals",
  "memories",
  "mindfulness",
  "partnership",
  "stress",
  "love",
  "perspective",
];

// Combined tags for selection
const allTags = Array.from(new Set([...baseMoodTags, ...journalTags])).sort();

export default function JournalScreen() {
  const router = useRouter();
  const {
    entries,
    isLoaded,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleFavorite,
    getFilteredEntries,
  } = useJournalStore();

  // State
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);

  // New entry form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedMood, setSelectedMood] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<JournalPrompt | null>(null);

  // Animation
  const fadeAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    if (!isLoaded) {
      loadEntries();
    }
  }, [isLoaded, loadEntries]);

  // Initialize fade animations
  useEffect(() => {
    const filteredEntries = getFilteredEntries(searchQuery, filterTag);
    fadeAnims.length = 0;
    filteredEntries.forEach((_, index) => {
      fadeAnims[index] = new Animated.Value(0);
    });

    // Staggered fade-in
    filteredEntries.forEach((_, index) => {
      Animated.timing(fadeAnims[index], {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    });
  }, [entries, searchQuery, filterTag]);

  const filteredEntries = useMemo(
    () => getFilteredEntries(searchQuery, filterTag),
    [entries, searchQuery, filterTag, getFilteredEntries]
  );

  const stats = useMemo(() => getJournalStats(entries), [entries]);

  // Calculate word count live
  const currentWordCount = useMemo(() => {
    if (!newContent.trim()) return 0;
    return newContent.trim().split(/\s+/).length;
  }, [newContent]);

  const handleOpenNewEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewTitle("");
    setNewContent("");
    setSelectedMood(undefined);
    setSelectedTags([]);
    setCurrentPrompt(getRandomPrompt());
    setIsEditMode(false);
    setShowNewEntryModal(true);
  };

  const handleRefreshPrompt = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentPrompt(getRandomPrompt());
  };

  const handleStartWriting = () => {
    if (currentPrompt) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setNewTitle("");
      setNewContent(`Prompt: ${currentPrompt.text}\n\n`);
      setSelectedMood(undefined);
      setSelectedTags([]);
      setIsEditMode(false);
      setShowNewEntryModal(true);
    }
  };

  const handleSaveEntry = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert("Missing Information", "Please provide both a title and content for your entry.");
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const wordCount = newContent.trim().split(/\s+/).length;
      const now = new Date().toISOString();

      if (isEditMode && selectedEntry) {
        // Update existing entry
        await updateEntry(selectedEntry.id, {
          title: newTitle.trim(),
          content: newContent.trim(),
          mood: selectedMood,
          tags: selectedTags,
          wordCount,
          updatedAt: now,
        });
      } else {
        // Create new entry
        const newEntry: JournalEntry = {
          id: `je-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          date: now,
          title: newTitle.trim(),
          content: newContent.trim(),
          mood: selectedMood,
          tags: selectedTags,
          prompt: currentPrompt?.text,
          isFavorite: false,
          wordCount,
          createdAt: now,
          updatedAt: now,
        };
        await addEntry(newEntry);
      }

      setShowNewEntryModal(false);
      setNewTitle("");
      setNewContent("");
      setSelectedMood(undefined);
      setSelectedTags([]);
      setCurrentPrompt(null);
    } catch (error) {
      Alert.alert("Error", "Failed to save your journal entry. Please try again.");
    }
  };

  const handleDiscardEntry = () => {
    if (newTitle.trim() || newContent.trim()) {
      Alert.alert(
        "Discard Entry?",
        "Are you sure you want to discard this entry? Your changes will be lost.",
        [
          { text: "Keep Writing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setShowNewEntryModal(false);
              setNewTitle("");
              setNewContent("");
              setSelectedMood(undefined);
              setSelectedTags([]);
              setCurrentPrompt(null);
            },
          },
        ]
      );
    } else {
      setShowNewEntryModal(false);
    }
  };

  const handleEntryPress = (entry: JournalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const handleEditEntry = () => {
    if (!selectedEntry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewTitle(selectedEntry.title);
    setNewContent(selectedEntry.content);
    setSelectedMood(selectedEntry.mood);
    setSelectedTags(selectedEntry.tags);
    setCurrentPrompt(null);
    setIsEditMode(true);
    setShowDetailModal(false);
    setShowNewEntryModal(true);
  };

  const handleDeleteEntry = () => {
    if (!selectedEntry) return;
    Alert.alert(
      "Delete Entry?",
      "Are you sure you want to delete this journal entry? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await deleteEntry(selectedEntry.id);
              setShowDetailModal(false);
              setSelectedEntry(null);
            } catch (error) {
              Alert.alert("Error", "Failed to delete entry. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (entryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await toggleFavorite(entryId);
    } catch (error) {
      Alert.alert("Error", "Failed to toggle favorite. Please try again.");
    }
  };

  const handleToggleTag = (tag: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient colors={gradients.violetDream} style={{ paddingTop: spacing.xl + 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.base,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.5)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingHorizontal: spacing.base }}>
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 24,
                color: colors.text.primary,
                textAlign: "center",
              }}
            >
              My Journal
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 14,
                color: colors.text.secondary,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              Your safe space to reflect
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpenNewEntry}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.primary[500],
              alignItems: "center",
              justifyContent: "center",
              ...shadows.soft,
            }}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderRadius: radius.card,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.primary[500],
              }}
            >
              {stats.totalEntries}
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 11,
                color: colors.text.secondary,
                marginTop: 2,
              }}
            >
              entries
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderRadius: radius.card,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.accent[500],
              }}
            >
              {stats.totalWords}
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 11,
                color: colors.text.secondary,
                marginTop: 2,
              }}
            >
              words
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderRadius: radius.card,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.secondary[500],
              }}
            >
              {stats.streakDays}
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 11,
                color: colors.text.secondary,
                marginTop: 2,
              }}
            >
              day streak
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(255, 255, 255, 0.6)",
              borderRadius: radius.card,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.xs,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.error,
              }}
            >
              {stats.favoriteCount}
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 11,
                color: colors.text.secondary,
                marginTop: 2,
              }}
            >
              favorites
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing["2xl"] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Prompt Card */}
        {currentPrompt && !showNewEntryModal && (
          <LinearGradient
            colors={gradients.goldenHour}
            style={{
              marginHorizontal: spacing.lg,
              marginTop: spacing.lg,
              borderRadius: radius.lg,
              padding: spacing.lg,
              ...shadows.soft,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
              <Sparkles size={20} color={colors.accent[500]} />
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 14,
                  color: colors.text.primary,
                  marginLeft: spacing.xs,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Today's Writing Prompt
              </Text>
            </View>

            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 17,
                color: colors.text.primary,
                lineHeight: 26,
                fontStyle: "italic",
                marginBottom: spacing.base,
              }}
            >
              "{currentPrompt.text}"
            </Text>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <TouchableOpacity
                onPress={handleRefreshPrompt}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  borderRadius: radius.card,
                  paddingVertical: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: spacing.xs,
                }}
              >
                <RefreshCw size={16} color={colors.text.secondary} />
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 14,
                    color: colors.text.secondary,
                  }}
                >
                  New Prompt
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleStartWriting}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary[500],
                  borderRadius: radius.card,
                  paddingVertical: spacing.sm,
                  alignItems: "center",
                  justifyContent: "center",
                  ...shadows.soft,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 14,
                    color: "#FFFFFF",
                  }}
                >
                  Start Writing
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

        {/* Filter Row */}
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            gap: spacing.md,
          }}
        >
          {/* Search Input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              ...shadows.soft,
            }}
          >
            <Search size={20} color={colors.text.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search entries..."
              placeholderTextColor={colors.text.muted}
              style={{
                flex: 1,
                marginLeft: spacing.sm,
                fontFamily: "Quicksand-Medium",
                fontSize: 15,
                color: colors.text.primary,
              }}
            />
          </View>

          {/* Filter Pills */}
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterTag(undefined);
              }}
              style={{
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.xs,
                borderRadius: radius.pill,
                backgroundColor: !filterTag ? colors.accent[500] : colors.surface,
                ...shadows.soft,
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: !filterTag ? "#FFFFFF" : colors.text.secondary,
                }}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilterTag(filterTag === "favorite" ? undefined : "favorite");
              }}
              style={{
                paddingHorizontal: spacing.base,
                paddingVertical: spacing.xs,
                borderRadius: radius.pill,
                backgroundColor: filterTag === "favorite" ? colors.error : colors.surface,
                ...shadows.soft,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Heart
                size={14}
                color={filterTag === "favorite" ? "#FFFFFF" : colors.text.secondary}
                fill={filterTag === "favorite" ? "#FFFFFF" : "transparent"}
              />
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: filterTag === "favorite" ? "#FFFFFF" : colors.text.secondary,
                }}
              >
                Favorites
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Journal Entries List */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.base }}>
          {filteredEntries.length === 0 ? (
            // Empty State
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: spacing["3xl"],
              }}
            >
              <Image
                source={{ uri: "https://api.a0.dev/illustrations/dreamy" }}
                style={{
                  width: 200,
                  height: 200,
                  marginBottom: spacing.lg,
                  borderRadius: radius.lg,
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 20,
                  color: colors.text.primary,
                  marginBottom: spacing.xs,
                }}
              >
                {searchQuery || filterTag ? "No entries found" : "Start your first entry"}
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 15,
                  color: colors.text.secondary,
                  textAlign: "center",
                  paddingHorizontal: spacing["2xl"],
                }}
              >
                {searchQuery || filterTag
                  ? "Try adjusting your filters"
                  : "Your thoughts and reflections are safe here"}
              </Text>
            </View>
          ) : (
            filteredEntries.map((entry, index) => {
              const fadeAnim = fadeAnims[index] || new Animated.Value(1);

              return (
                <Animated.View
                  key={entry.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                    marginBottom: spacing.base,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleEntryPress(entry)}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      ...shadows.soft,
                    }}
                  >
                    {/* Header Row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: spacing.sm,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                        <Text
                          style={{
                            fontFamily: "Quicksand-SemiBold",
                            fontSize: 13,
                            color: colors.text.muted,
                          }}
                        >
                          {formatDate(entry.date)}
                        </Text>
                        {entry.mood && (
                          <Text style={{ fontSize: 18 }}>{moodLabels[entry.mood].emoji}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(entry.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Heart
                          size={20}
                          color={entry.isFavorite ? colors.error : colors.text.muted}
                          fill={entry.isFavorite ? colors.error : "transparent"}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 17,
                        color: colors.text.primary,
                        marginBottom: spacing.xs,
                      }}
                      numberOfLines={1}
                    >
                      {entry.title}
                    </Text>

                    {/* Content Preview */}
                    <Text
                      style={{
                        fontFamily: "Quicksand-Medium",
                        fontSize: 14,
                        color: colors.text.secondary,
                        lineHeight: 20,
                        marginBottom: spacing.sm,
                      }}
                      numberOfLines={2}
                    >
                      {entry.content}
                    </Text>

                    {/* Tags Row */}
                    {entry.tags.length > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: spacing.xs,
                          marginBottom: spacing.xs,
                        }}
                      >
                        {entry.tags.slice(0, 3).map((tag) => (
                          <View
                            key={tag}
                            style={{
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 4,
                              borderRadius: radius.pill,
                              backgroundColor: colors.accent[50],
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Quicksand-SemiBold",
                                fontSize: 11,
                                color: colors.accent[500],
                              }}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                        {entry.tags.length > 3 && (
                          <View
                            style={{
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 4,
                              borderRadius: radius.pill,
                              backgroundColor: colors.accent[50],
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Quicksand-SemiBold",
                                fontSize: 11,
                                color: colors.accent[500],
                              }}
                            >
                              +{entry.tags.length - 3}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Footer */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text
                        style={{
                          fontFamily: "Quicksand-Medium",
                          fontSize: 12,
                          color: colors.text.muted,
                        }}
                      >
                        {entry.wordCount} words
                      </Text>
                      {entry.prompt && (
                        <>
                          <Text style={{ color: colors.text.muted, fontSize: 12 }}>•</Text>
                          <Text
                            style={{
                              fontFamily: "Quicksand-Medium",
                              fontSize: 12,
                              color: colors.text.muted,
                            }}
                            numberOfLines={1}
                          >
                            prompted
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Entry Modal */}
      <Modal
        visible={showNewEntryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleDiscardEntry}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: colors.bg }}
        >
          {/* Modal Header */}
          <View
            style={{
              paddingTop: spacing.xl + 24,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.base,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.accent[100],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity onPress={handleDiscardEntry}>
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 16,
                    color: colors.text.secondary,
                  }}
                >
                  Discard
                </Text>
              </TouchableOpacity>

              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 18,
                  color: colors.text.primary,
                }}
              >
                {isEditMode ? "Edit Entry" : "New Entry"}
              </Text>

              <TouchableOpacity onPress={handleSaveEntry}>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.primary[500],
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date Display */}
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 13,
                color: colors.text.muted,
                marginBottom: spacing.base,
              }}
            >
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>

            {/* Title Input */}
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Entry title..."
              placeholderTextColor={colors.text.muted}
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 24,
                color: colors.text.primary,
                marginBottom: spacing.base,
              }}
            />

            {/* Content Input */}
            <TextInput
              value={newContent}
              onChangeText={setNewContent}
              placeholder="Start writing..."
              placeholderTextColor={colors.text.muted}
              multiline
              textAlignVertical="top"
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 16,
                color: colors.text.primary,
                lineHeight: 24,
                minHeight: 200,
                marginBottom: spacing.lg,
              }}
            />

            {/* Word Count */}
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 13,
                color: colors.text.muted,
                marginBottom: spacing.lg,
              }}
            >
              {currentWordCount} words
            </Text>

            {/* Mood Selector */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 14,
                color: colors.text.primary,
                marginBottom: spacing.sm,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              How are you feeling? (Optional)
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginBottom: spacing.lg,
              }}
            >
              {([1, 2, 3, 4, 5] as const).map((mood) => (
                <TouchableOpacity
                  key={mood}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMood(mood === selectedMood ? undefined : mood);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: radius.card,
                    backgroundColor:
                      mood === selectedMood ? moodLabels[mood].color + "20" : colors.surface,
                    borderWidth: 2,
                    borderColor:
                      mood === selectedMood ? moodLabels[mood].color : "transparent",
                    alignItems: "center",
                    ...shadows.soft,
                  }}
                >
                  <Text style={{ fontSize: 28, marginBottom: 4 }}>
                    {moodLabels[mood].emoji}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 11,
                      color: mood === selectedMood ? moodLabels[mood].color : colors.text.muted,
                    }}
                  >
                    {moodLabels[mood].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tags Selector */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 14,
                color: colors.text.primary,
                marginBottom: spacing.sm,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Tags (Optional)
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.xs,
                marginBottom: spacing["2xl"],
              }}
            >
              {allTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => handleToggleTag(tag)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    borderRadius: radius.pill,
                    backgroundColor: selectedTags.includes(tag)
                      ? colors.accent[500]
                      : colors.surface,
                    borderWidth: 1,
                    borderColor: selectedTags.includes(tag)
                      ? colors.accent[500]
                      : colors.accent[200],
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 13,
                      color: selectedTags.includes(tag) ? "#FFFFFF" : colors.text.secondary,
                    }}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Save Button (Fixed at Bottom) */}
          <View
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.accent[100],
            }}
          >
            <TouchableOpacity
              onPress={handleSaveEntry}
              style={{
                borderRadius: radius.lg,
                paddingVertical: spacing.base,
                alignItems: "center",
                ...shadows.soft,
              }}
            >
              <LinearGradient
                colors={[colors.primary[400], colors.primary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: radius.lg,
                }}
              />
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                {isEditMode ? "Update Entry" : "Save Entry"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Entry Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Detail Header */}
          <View
            style={{
              paddingTop: spacing.xl + 24,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.base,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: colors.accent[100],
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDetailModal(false);
                }}
              >
                <ChevronLeft size={28} color={colors.text.primary} />
              </TouchableOpacity>

              <View style={{ flexDirection: "row", gap: spacing.base }}>
                <TouchableOpacity onPress={handleEditEntry}>
                  <Edit2 size={24} color={colors.accent[500]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteEntry}>
                  <Trash2 size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {selectedEntry && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["2xl"] }}
            >
              {/* Date & Mood */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: spacing.base,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 13,
                    color: colors.text.muted,
                  }}
                >
                  {formatFullDate(selectedEntry.date)}
                </Text>
                {selectedEntry.mood && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.xs,
                      backgroundColor: moodLabels[selectedEntry.mood].color + "20",
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: radius.pill,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {moodLabels[selectedEntry.mood].emoji}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 13,
                        color: moodLabels[selectedEntry.mood].color,
                      }}
                    >
                      {moodLabels[selectedEntry.mood].label}
                    </Text>
                  </View>
                )}
              </View>

              {/* Title */}
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 28,
                  color: colors.text.primary,
                  lineHeight: 36,
                  marginBottom: spacing.base,
                }}
              >
                {selectedEntry.title}
              </Text>

              {/* Tags */}
              {selectedEntry.tags.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: spacing.xs,
                    marginBottom: spacing.lg,
                  }}
                >
                  {selectedEntry.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs,
                        borderRadius: radius.pill,
                        backgroundColor: colors.accent[50],
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Quicksand-SemiBold",
                          fontSize: 13,
                          color: colors.accent[500],
                        }}
                      >
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Prompt (if used) */}
              {selectedEntry.prompt && (
                <View
                  style={{
                    backgroundColor: colors.accent[50],
                    borderLeftWidth: 4,
                    borderLeftColor: colors.accent[500],
                    padding: spacing.md,
                    borderRadius: radius.card,
                    marginBottom: spacing.lg,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: spacing.xs,
                    }}
                  >
                    <Sparkles size={16} color={colors.accent[500]} />
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 12,
                        color: colors.accent[500],
                        marginLeft: 4,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      Writing Prompt
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Medium",
                      fontSize: 14,
                      color: colors.text.secondary,
                      fontStyle: "italic",
                      lineHeight: 20,
                    }}
                  >
                    "{selectedEntry.prompt}"
                  </Text>
                </View>
              )}

              {/* Content */}
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 16,
                  color: colors.text.primary,
                  lineHeight: 26,
                  marginBottom: spacing.lg,
                }}
              >
                {selectedEntry.content}
              </Text>

              {/* Footer Info */}
              <View
                style={{
                  paddingTop: spacing.base,
                  borderTopWidth: 1,
                  borderTopColor: colors.accent[100],
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 13,
                    color: colors.text.muted,
                  }}
                >
                  {selectedEntry.wordCount} words
                  {selectedEntry.updatedAt !== selectedEntry.createdAt && " • Edited"}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}
