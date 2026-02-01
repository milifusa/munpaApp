import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Share,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import { articlesService } from '../services/api';
import analyticsService from '../services/analyticsService';
import BannerCarousel from '../components/BannerCarousel';

interface ArticleDetailScreenProps {
  route: {
    params: {
      articleId: string;
    };
  };
  navigation: any;
}

interface ArticleDetail {
  id: string;
  title: string;
  content?: string;
  htmlContent?: string;
  summary?: string;
  coverImageUrl?: string;
  imageUrl?: string;
  banner?: {
    imageUrl?: string;
    title?: string;
    description?: string;
    linkType?: string;
    link?: string;
    articleId?: string;
    articleCategoryId?: string;
    recommendationCategoryId?: string;
  };
  author?: string | { uid?: string; name?: string; displayName?: string };
  authorAvatar?: string;
  authorProfessional?: {
    id: string;
    name: string;
    headline?: string;
    photoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    website?: string;
    userId?: string;
  };
  category?: { id: string; name: string };
  categoryId: string;
  categoryName?: string | { id: string; name: string };
  keywords?: Array<string | { id: string; name: string; slug?: string }>;
  tags?: Array<string | { id: string; name: string; slug?: string }>;
  readingTimeMinutes?: number;
  readTime?: number;
  createdAt: string | { _seconds: number; _nanoseconds: number };
  updatedAt?: string | { _seconds: number; _nanoseconds: number };
  publishedAt?: string | { _seconds: number; _nanoseconds: number };
  shareUrl?: string;
  webUrl?: string;
}

const ArticleDetailScreen: React.FC<ArticleDetailScreenProps> = ({ route, navigation }) => {
  const { articleId } = route.params;
  const { width } = useWindowDimensions();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    loadArticle();
  }, []);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const response = await articlesService.getArticleDetail(articleId);
      let articleData = response.data?.article || response.article || response.data;
      
      // Normalizar los datos
      articleData = {
        ...articleData,
        imageUrl: articleData.coverImageUrl || articleData.imageUrl,
        content: articleData.htmlContent || articleData.content,
        categoryName: typeof articleData.category === 'object' 
          ? articleData.category?.name 
          : (articleData.categoryName || null),
        readTime: articleData.readingTimeMinutes || articleData.readTime,
        tags: (articleData.keywords || articleData.tags || []).map((tag: any) => 
          typeof tag === 'string' ? tag : tag.name || tag.slug || ''
        ).filter(Boolean),
      };
      
      console.log('📰 [ARTICLE DETAIL] Datos normalizados:', {
        id: articleData.id,
        title: articleData.title,
        categoryName: articleData.categoryName,
        author: articleData.author,
        tags: articleData.tags,
      });
      
      setArticle(articleData);
      
      analyticsService.logEvent('article_detail_viewed', {
        article_id: articleId,
        article_title: articleData?.title,
        category_name: articleData?.categoryName,
      });
    } catch (error) {
      console.error('Error cargando artículo:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = () => {
    if (!article?.categoryName) return null;
    if (typeof article.categoryName === 'string') return article.categoryName;
    if (typeof article.categoryName === 'object' && article.categoryName.name) {
      return article.categoryName.name;
    }
    return null;
  };

  const getAuthorName = () => {
    if (!article?.author) return null;
    if (typeof article.author === 'string') return article.author;
    return article.author.name || article.author.displayName || null;
  };

  const formatDate = (dateValue: string | { _seconds: number; _nanoseconds: number }) => {
    try {
      let date: Date;
      if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      } else {
        return '';
      }
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return '';
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = article?.shareUrl || article?.webUrl || `munpa://article/${article?.id}`;
      await Share.share({
        message: `${article?.title}\n\n${shareUrl}`,
        title: article?.title,
      });
      analyticsService.logEvent('article_shared', {
        article_id: articleId,
        article_title: article?.title,
        share_url: shareUrl,
      });
    } catch (error) {
      console.error('Error compartiendo:', error);
    }
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    analyticsService.logEvent('article_bookmarked', {
      article_id: articleId,
      bookmarked: !bookmarked,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Cargando artículo...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#CBD5E0" />
            <Text style={styles.errorText}>No se pudo cargar el artículo</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadArticle}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      <View style={styles.headerWrapper}>
        <SafeAreaView style={styles.headerSafeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Artículo</Text>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Ionicons name="share-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <SafeAreaView style={styles.bottomSafeArea}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{article.title}</Text>

          {/* Meta info */}
          <View style={styles.metaRow}>
            {getCategoryName() && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{getCategoryName()}</Text>
              </View>
            )}
            {article.readTime && (
              <Text style={styles.readTime}>{article.readTime} min de lectura</Text>
            )}
          </View>

          {/* Author */}
          {getAuthorName() && (
            <View style={styles.authorRow}>
              <Text style={styles.authorText}>
                Escrito por <Text style={styles.authorName}>{getAuthorName()}</Text>
              </Text>
              {article.createdAt && (
                <Text style={styles.dateText}> el {formatDate(article.createdAt)}</Text>
              )}
            </View>
          )}

          {/* Image */}
          {article.imageUrl && (
            <Image 
              source={{ uri: article.imageUrl }} 
              style={styles.mainImage} 
              resizeMode="cover"
            />
          )}

          {/* Content - Renderizar HTML */}
          <View style={styles.articleContent}>
            {article.content && (
              <RenderHTML
                contentWidth={width - 40}
                source={{ html: article.content }}
                tagsStyles={{
                  body: {
                    fontSize: 16,
                    lineHeight: 24,
                    color: '#2D3748',
                  },
                  p: {
                    marginBottom: 12,
                    lineHeight: 24,
                  },
                  h1: {
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#1A202C',
                    marginTop: 20,
                    marginBottom: 12,
                  },
                  h2: {
                    fontSize: 22,
                    fontWeight: 'bold',
                    color: '#1A202C',
                    marginTop: 18,
                    marginBottom: 10,
                  },
                  h3: {
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: '#1A202C',
                    marginTop: 16,
                    marginBottom: 8,
                  },
                  strong: {
                    fontWeight: 'bold',
                  },
                  b: {
                    fontWeight: 'bold',
                  },
                  ul: {
                    marginBottom: 12,
                  },
                  ol: {
                    marginBottom: 12,
                  },
                  li: {
                    marginBottom: 6,
                  },
                }}
              />
            )}
          </View>

          {/* Banner - Al final del contenido */}
          {article.banner?.imageUrl && (
            <View style={styles.bannerContainer}>
              <TouchableOpacity
                style={styles.bannerTouchable}
                onPress={() => {
                  // Manejar navegación del banner según su linkType
                  const banner = article.banner;
                  if (banner?.linkType === 'recommendation-category' && banner.recommendationCategoryId) {
                    // Navegar al tab de Recommendations y luego a la categoría
                    navigation.navigate('MainTabs', {
                      screen: 'Recommendations',
                      params: {
                        screen: 'CategoryRecommendations',
                        params: {
                          categoryId: banner.recommendationCategoryId,
                          categoryName: 'Recomendaciones',
                        },
                      },
                    });
                  } else if (banner?.linkType === 'article' && banner.articleId) {
                    navigation.push('ArticleDetail', {
                      articleId: banner.articleId,
                    });
                  } else if (banner?.link) {
                    // Abrir link externo si existe
                    console.log('Banner link:', banner.link);
                  }
                }}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: article.banner.imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Last Updated */}
          {article.updatedAt && (
            <Text style={styles.lastUpdated}>
              Última actualización: {formatDate(article.updatedAt)}
            </Text>
          )}

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {article.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Author Section */}
          {(getAuthorName() || article.authorProfessional) && (
            <View style={styles.authorSection}>
              <Text style={styles.authorSectionTitle}>Sobre el Autor</Text>
              <View style={styles.authorCard}>
                {/* Foto del autor */}
                <View style={styles.authorAvatar}>
                  {(article.authorProfessional?.photoUrl || article.authorAvatar) ? (
                    <Image 
                      source={{ uri: article.authorProfessional?.photoUrl || article.authorAvatar }} 
                      style={styles.avatarImage} 
                    />
                  ) : (
                    <Ionicons name="person" size={32} color="#A0AEC0" />
                  )}
                </View>
                
                {/* Nombre del autor */}
                <Text style={styles.authorCardName}>
                  {article.authorProfessional?.name || getAuthorName()}
                </Text>
                
                {/* Headline del profesional */}
                {article.authorProfessional?.headline && (
                  <Text style={styles.authorHeadline}>
                    {article.authorProfessional.headline}
                  </Text>
                )}
                
                {/* Información de contacto */}
                {article.authorProfessional && (
                  <View style={styles.authorContactContainer}>
                    {article.authorProfessional.contactEmail && (
                      <View style={styles.authorContactRow}>
                        <Ionicons name="mail-outline" size={16} color="#6B5CA5" />
                        <Text style={styles.authorContactText}>
                          {article.authorProfessional.contactEmail}
                        </Text>
                      </View>
                    )}
                    {article.authorProfessional.contactPhone && (
                      <View style={styles.authorContactRow}>
                        <Ionicons name="call-outline" size={16} color="#6B5CA5" />
                        <Text style={styles.authorContactText}>
                          {article.authorProfessional.contactPhone}
                        </Text>
                      </View>
                    )}
                    {article.authorProfessional.website && (
                      <View style={styles.authorContactRow}>
                        <Ionicons name="globe-outline" size={16} color="#6B5CA5" />
                        <Text style={styles.authorContactText}>
                          {article.authorProfessional.website}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>
              Munpa proporciona Consejos y Tips sobre Crianza
            </Text>
            <Text style={styles.disclaimerText}>
              Artículos · Descargo de Responsabilidad
            </Text>
            <Text style={styles.disclaimerContent}>
              "Las opiniones, pensamientos y puntos de vista expresados en este artículo/blog son únicamente los del autor y no necesariamente reflejan las opiniones de Munpa. Cualquier omisión, error o inexactitud es responsabilidad del autor. Munpa no asume ninguna responsabilidad por el contenido presentado. Siempre consulte a un profesional calificado para obtener consejos específicos relacionados con la crianza, salud o desarrollo infantil."
            </Text>
          </View>
          </View>
        </ScrollView>

        {/* Floating Bookmark Button */}
        <TouchableOpacity 
          style={styles.bookmarkButton} 
          onPress={handleBookmark}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={bookmarked ? 'bookmark' : 'bookmark-outline'} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
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
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#59C6C0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6B5CA5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2D3748',
    lineHeight: 34,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5CA5',
  },
  readTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  authorText: {
    fontSize: 13,
    color: '#718096',
  },
  authorName: {
    fontWeight: '600',
    color: '#2D3748',
  },
  dateText: {
    fontSize: 13,
    color: '#718096',
  },
  mainImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 20,
    marginHorizontal: 20,
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
  },
  bannerContainer: {
    marginVertical: 24,
    marginHorizontal: 20,
  },
  bannerTouchable: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: '#FFFFFF',
  },
  bannerImage: {
    width: '100%',
    height: 180,
  },
  articleContent: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  lastUpdated: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tag: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#6B5CA5',
    fontWeight: '500',
  },
  authorSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  authorSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
  },
  authorCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  authorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  authorCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 6,
    textAlign: 'center',
  },
  authorHeadline: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  authorContactContainer: {
    width: '100%',
    marginTop: 8,
    gap: 10,
  },
  authorContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  authorContactText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
  },
  disclaimer: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 80,
    marginHorizontal: 20,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
  },
  disclaimerContent: {
    fontSize: 12,
    lineHeight: 18,
    color: '#A0AEC0',
  },
  bookmarkButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#718096',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default ArticleDetailScreen;
