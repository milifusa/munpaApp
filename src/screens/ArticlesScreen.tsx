import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { articlesService } from '../services/api';
import analyticsService from '../services/analyticsService';

interface Article {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  coverImageUrl?: string;
  imageUrl?: string;
  author?: string | { uid?: string; name?: string; displayName?: string };
  category?: { id: string; name: string };
  categoryId: string;
  categoryName?: string;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  publishedAt?: string | { _seconds: number; _nanoseconds: number };
}

interface ArticlesScreenProps {
  route: {
    params: {
      categoryId: string;
      categoryName?: string;
    };
  };
  navigation: any;
}

const ArticlesScreen: React.FC<ArticlesScreenProps> = ({ route, navigation }) => {
  const { categoryId, categoryName } = route.params;
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadArticles();
    analyticsService.logEvent('articles_category_viewed', {
      category_id: categoryId,
      category_name: categoryName,
    });
  }, []);

  const loadArticles = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const response = await articlesService.getArticlesByCategory(categoryId, pageNum, 20);
      const newArticles = response.data?.articles || response.articles || response.data || [];

      // Procesar artículos para normalizar los datos
      const processedArticles = newArticles.map((article: any) => ({
        ...article,
        imageUrl: article.coverImageUrl || article.imageUrl,
        description: article.summary || article.description,
        categoryName: article.category?.name || article.categoryName || categoryName,
      }));

      if (refresh || pageNum === 1) {
        setArticles(processedArticles);
      } else {
        setArticles((prev) => [...prev, ...processedArticles]);
      }

      setHasMore(newArticles.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error cargando artículos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleArticlePress = (article: Article) => {
    analyticsService.logEvent('article_opened', {
      article_id: article.id,
      article_title: article.title,
      category_id: categoryId,
    });
    navigation.navigate('ArticleDetail', { articleId: article.id });
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadArticles(page + 1);
    }
  };

  const getAuthorName = (author?: string | { uid?: string; name?: string; displayName?: string }) => {
    if (!author) return null;
    if (typeof author === 'string') return author;
    return author.name || author.displayName || null;
  };

  const renderArticle = ({ item }: { item: Article }) => {
    const articleImage = item.coverImageUrl || item.imageUrl;
    const articleDescription = item.summary || item.description;
    
    return (
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.8}
      >
        {articleImage ? (
          <Image source={{ uri: articleImage }} style={styles.articleImage} resizeMode="cover" />
        ) : (
          <View style={[styles.articleImage, styles.placeholderImage]}>
            <Ionicons name="document-text-outline" size={40} color="#CBD5E0" />
          </View>
        )}
        <View style={styles.articleContent}>
          {item.categoryName && (
            <Text style={styles.articleCategory}>{item.categoryName}</Text>
          )}
          <Text style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {articleDescription && (
            <Text style={styles.articleDescription} numberOfLines={3}>
              {articleDescription}
            </Text>
          )}
          {getAuthorName(item.author) && (
            <Text style={styles.articleAuthor}>By {getAuthorName(item.author)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#59C6C0" />
      </View>
    );
  };

  if (loading && page === 1) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
        <View style={styles.headerWrapper}>
          <SafeAreaView style={styles.headerSafeArea}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{categoryName || 'Artículos'}</Text>
              <View style={styles.headerPlaceholder} />
            </View>
          </SafeAreaView>
        </View>
        
        <SafeAreaView style={styles.bottomSafeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando artículos...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      <View style={styles.headerWrapper}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{categoryName || 'Artículos'}</Text>
            <View style={styles.headerPlaceholder} />
          </View>
        </SafeAreaView>
      </View>

      <SafeAreaView style={styles.bottomSafeArea}>
        <View style={styles.container}>
          <FlatList
            data={articles}
            renderItem={renderArticle}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            refreshing={refreshing}
            onRefresh={() => loadArticles(1, true)}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={60} color="#CBD5E0" />
                <Text style={styles.emptyText}>No hay artículos disponibles</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrapper: {
    backgroundColor: '#59C6C0',
  },
  headerSafeArea: {
    backgroundColor: '#59C6C0',
  },
  bottomSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#59C6C0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerPlaceholder: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#718096',
  },
  listContent: {
    padding: 16,
    backgroundColor: '#F7FAFC',
  },
  articleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E2E8F0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleContent: {
    padding: 16,
  },
  articleCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5CA5',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  articleDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginBottom: 8,
  },
  articleAuthor: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
});

export default ArticlesScreen;
