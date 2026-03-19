# Munpa App — Inventario de Funcionalidades
> Versión 2.0.9 | Generado: 2026-03-14

---

## Resumen General

**Munpa** es una app de acompañamiento a la maternidad para iOS y Android construida con React Native + Expo. Tiene dos tipos de usuarios: **padres/madres** y **especialistas/vendedores**.

---

## 1. AUTENTICACIÓN

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Login con email/contraseña | `LoginScreen.tsx` | ✅ |
| Registro de cuenta nueva | `SignupScreen.tsx` | ✅ |
| Login con Google | `LoginScreen.tsx` + `AuthContext.tsx` | ✅ |
| Login con Apple | `LoginScreen.tsx` + `AuthContext.tsx` | ✅ |
| Recuperar contraseña | `ForgotPasswordScreen.tsx` | ✅ |
| Resetear contraseña | `ResetPasswordScreen.tsx` | ✅ |
| Cierre de sesión | `AuthContext.tsx` | ✅ |
| Persistencia de sesión (auto-login) | `AuthContext.tsx` + AsyncStorage | ✅ |
| Eliminación de cuenta | `AuthContext.tsx` | ✅ |

---

## 2. PERFIL DE USUARIO

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver perfil propio | `ProfileScreen.tsx` | ✅ |
| Editar nombre, email, foto | `ProfileScreen.tsx` | ✅ |
| Cambiar contraseña | `ProfileScreen.tsx` | ✅ |
| Subir foto de perfil | `profilePhotoService.ts` | ✅ |
| Ver tipo de usuario (padre / especialista) | `ViewModeContext.tsx` | ✅ |
| Cambiar modo de vista (padre ↔ especialista) | `ViewModeContext.tsx` | ✅ |

---

## 3. GESTIÓN DE HIJOS

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Crear perfil de hijo | `ChildrenDataScreen.tsx` | ✅ |
| Editar perfil de hijo | `ChildrenDataScreen.tsx` | ✅ |
| Listar todos los hijos | `ChildrenListScreen.tsx` | ✅ |
| Ver detalle de hijo | `ChildProfileScreen.tsx` | ✅ |
| Subir foto de hijo | `childrenPhotoService.ts` | ✅ |
| Compartir acceso a perfil de hijo | `ShareChildScreen.tsx` + `shareChildService.ts` | ✅ |
| Ver/gestionar invitaciones de hijo | `ChildInvitationsScreen.tsx` | ✅ |
| Aceptar invitación de acceso compartido | `AcceptInvitationScreen.tsx` | ✅ |
| Selección rápida de hijo activo (header) | `AppNavigator.tsx` (ChildrenHeaderTitle) | ✅ |
| Indicador visual bebé nacido vs no nacido (👶/🤰) | `AppNavigator.tsx` | ✅ |
| Deep link compartir hijo (`munpa://share-child/{id}`) | `useDeepLinking.ts` | ✅ |

---

## 4. SEGUIMIENTO DE SALUD

### 4.1 Crecimiento

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver gráficas de crecimiento (peso, talla) | `GrowthScreen.tsx` | ✅ |
| Registrar nuevas medidas | `GrowthScreen.tsx` | ✅ |

### 4.2 Vacunas

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver calendario de vacunación | `VaccineTrackerScreen.tsx` | ✅ |
| Marcar vacuna como aplicada | `VaccineTrackerScreen.tsx` | ✅ |
| Filtrar vacunas por mes | `VaccineTrackerScreen.tsx` | ✅ |

### 4.3 Medicamentos

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Registrar medicamento | `MedicationsScreen.tsx` | ✅ |
| Ver historial de medicamentos | `MedicationsScreen.tsx` | ✅ |
| Notificaciones de recordatorio de medicamento | `notificationService.ts` | ✅ |

### 4.4 Dentición

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Rastrear síntomas de dentición | `TeethingTrackerScreen.tsx` | ✅ |
| Guía de dentición | `TeethingGuideScreen.tsx` | ✅ |
| Servicio de dentición | `teething-service.ts` | ✅ |

---

## 5. SEGUIMIENTO DE SUEÑO

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Registrar sesión de sueño | `SleepTrackerScreen.tsx` | ✅ |
| Editar evento de sueño | `EditSleepEventScreen.tsx` | ✅ |
| Predicciones de siestas y hora de dormir (ML/TensorFlow) | `SleepTrackerScreen.tsx` | ✅ |
| Registrar pausas/interrupciones del sueño | `sleep.ts` (SleepPause) | ✅ |
| Registrar calidad, ubicación, temperatura, ruido | `sleep.ts` (SleepEntry) | ✅ |
| Ver estadísticas y patrones de sueño | `SleepTrackerScreen.tsx` | ✅ |
| Notificaciones inteligentes de sueño | `sleepNotificationScheduler.ts` | ✅ |
| Recordatorios basados en predicciones | `sleepTrackingNotification.ts` | ✅ |

---

## 6. ALIMENTACIÓN Y NUTRICIÓN

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Registro de alimentación | `FeedingScreen.tsx` | ✅ |
| Ver datos nutricionales | `nutritionService.ts` | ✅ |
| Ver recetas | `nutritionService.ts` + `RecipeCard.tsx` | ✅ |
| Detalle de receta | `RecipeDetailScreen.tsx` | ✅ |

---

## 7. HITOS Y DESARROLLO

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver hitos de desarrollo | `MilestonesScreen.tsx` | ✅ |
| Marcar hito como alcanzado | `MilestonesScreen.tsx` + `milestonesService.ts` | ✅ |
| Información de desarrollo infantil | `DevelopmentScreen.tsx` | ✅ |

---

## 8. RECOMENDACIONES

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver lista de recomendaciones | `RecommendationsScreen.tsx` | ✅ |
| Ver recomendaciones por categoría | `CategoryRecommendationsScreen.tsx` | ✅ |
| Ver detalle de recomendación | `RecommendationDetailScreen.tsx` | ✅ |
| Agregar nueva recomendación | `AddRecommendationScreen.tsx` | ✅ |
| Guardar en favoritos | `FavoritesScreen.tsx` | ✅ |
| Ver favoritos en mapa | `FavoritesMapScreen.tsx` | ✅ |
| Agregar a wishlist | `WishlistScreen.tsx` | ✅ |
| Analíticas de recomendaciones | `recommendationAnalyticsService.ts` | ✅ |
| Deep link recomendación (`munpa://recommendation/{id}`) | `useDeepLinking.ts` | ✅ |
| Deep link favoritos (`munpa://recommendations/favorites`) | `useDeepLinking.ts` | ✅ |

---

## 9. COMUNIDAD Y SOCIAL

### 9.1 Comunidades

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Listar comunidades | `CommunitiesScreen.tsx` | ✅ |
| Solicitar unirse a comunidad | `CommunityRequestsScreen.tsx` | ✅ |

### 9.2 Posts

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver posts de comunidad | `CommunityPostsScreen.tsx` | ✅ |
| Ver detalle de post | `PostDetailScreen.tsx` | ✅ |
| Crear post | `CreatePostScreen.tsx` | ✅ |
| Comentar en post | `CommentsScreen.tsx` | ✅ |
| Dar like a post | `LikeButton.tsx` | ✅ |
| Adjuntar listas a post | `AttachedLists.tsx` | ✅ |
| Deep link post (`munpa://post/{id}`) | `useDeepLinking.ts` | ✅ |

### 9.3 Eventos

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Crear evento con fecha, lugar, cupo | `CreateEventScreen.tsx` | ✅ |
| Ver detalle de evento | `EventDetailScreen.tsx` | ✅ |
| Confirmar asistencia a evento | `eventsService.ts` | ✅ |
| Lista de espera si evento lleno | `eventsService.ts` | ✅ |
| Check-in al evento | `eventsService.ts` | ✅ |
| QR code para check-in | (evento check-in) | ✅ |
| Recordatorios automáticos de evento | `notificationService.ts` | ✅ |

---

## 10. LISTAS

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Explorar listas | `ListsScreen.tsx` | ✅ |
| Ver detalle de lista con ítems | `ListDetailScreen.tsx` | ✅ |
| Comentar en ítem de lista | `ItemCommentsScreen.tsx` | ✅ |
| Calificación de ítems | `lists.ts` (ListItem rating) | ✅ |

---

## 11. ARTÍCULOS EDUCATIVOS

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver artículos | `ArticlesScreen.tsx` | ✅ |
| Ver detalle de artículo | `ArticleDetailScreen.tsx` | ✅ |
| Contenido educativo | `learning-service.ts` | ✅ |

---

## 12. MARKETPLACE

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver marketplace principal | `MunpaMarketScreen.tsx` | ✅ |
| Ver detalle de producto | `ProductDetailScreen.tsx` | ✅ |
| Crear/publicar producto (venta, donación, intercambio) | `CreateProductScreen.tsx` | ✅ |
| Ver mis publicaciones | `MyProductsScreen.tsx` | ✅ |
| Favoritos de marketplace | `MarketplaceFavoritesScreen.tsx` | ✅ |
| Mensajería entre comprador y vendedor | `MarketplaceMessagesScreen.tsx` | ✅ |
| Ver conversaciones de producto | `ProductConversationsScreen.tsx` | ✅ |
| Tipos: Nuevo, Como Nuevo, Buen Estado, Usado | `marketplaceService.ts` | ✅ |
| Fotos múltiples por producto | `marketplaceService.ts` | ✅ |
| Filtros de búsqueda | `marketplaceService.ts` (ProductFilters) | ✅ |
| Ubicación en mapa | `marketplaceService.ts` | ✅ |
| Deep link producto (`munpa://marketplace/product/{id}`) | `useDeepLinking.ts` | ✅ |
| Deep link favoritos marketplace | `useDeepLinking.ts` | ✅ |

---

## 13. CONSULTAS CON ESPECIALISTAS

### 13.1 Para padres

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Listar especialistas disponibles | `SpecialistsListScreen.tsx` | ✅ |
| Solicitar consulta (chat o video) | `ConsultationRequestScreen.tsx` | ✅ |
| Ver detalle de consulta | `ConsultationDetailScreen.tsx` | ✅ |
| Sala de videollamada | `ConsultationVideoScreen.tsx` | ✅ |
| Ver mis consultas | `MyConsultationsScreen.tsx` | ✅ |
| Pago con Stripe | `ConsultationPaymentModal.tsx` | ✅ |
| Cupones y descuentos | `consultationsService.ts` | ✅ |
| Flujo de estados: awaiting_payment → pending → accepted → in_progress → completed/cancelled | `consultationsService.ts` | ✅ |

### 13.2 Para especialistas

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Dashboard del especialista | `SpecialistDashboardScreen.tsx` | ✅ |
| Inicio especialista | `SpecialistHomeScreen.tsx` | ✅ |
| Gestionar horario/disponibilidad | `SpecialistScheduleScreen.tsx` | ✅ |
| Ver estadísticas de rendimiento | `SpecialistStatsScreen.tsx` | ✅ |
| Gestionar consultas | `SpecialistConsultationsScreen.tsx` | ✅ |
| Ver/editar perfil de especialista | `SpecialistProfileScreen.tsx` / `EditSpecialistProfileScreen.tsx` | ✅ |
| Subir documentos/licencias | `ManageDocumentsScreen.tsx` | ✅ |
| Gestionar cupones propios | `SpecialistCouponsScreen.tsx` | ✅ |
| Modal de completar consulta | `CompleteConsultationModal.tsx` | ✅ |
| Modal de gestionar consulta | `ManageConsultationModal.tsx` | ✅ |
| Modal de editar precios | `EditPricingModal.tsx` | ✅ |
| Menú específico de especialista | `SpecialistMenu.tsx` | ✅ |

---

## 14. FUNCIONES DE VENDEDOR

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Listar productos del vendedor | `VendorProductsScreen.tsx` | ✅ |
| Ver categorías de productos | `VendorCategoriesScreen.tsx` | ✅ |
| Crear producto como vendedor | `VendorCreateProductScreen.tsx` | ✅ |
| Gestionar descuentos | `VendorDiscountsScreen.tsx` | ✅ |
| Gestionar promociones | `VendorPromotionsScreen.tsx` | ✅ |
| Servicio de vendedor | `vendorService.ts` | ✅ |

---

## 15. DOULA VIRTUAL (IA)

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Chat con IA Doula | `DoulaChatScreen.tsx` | ✅ |
| Burbuja de chat flotante (overlay) | `DouliChatOverlay.tsx` | ✅ |
| Burbujas de mensaje | `DouliChatBubble.tsx` | ✅ |
| Hook de chat con IA | `useDouliChat.ts` | ✅ |
| Contexto de chat | `ChatContext.tsx` | ✅ |
| IDs únicos de conversación | `ChatContext.tsx` | ✅ |
| Base de conocimiento local (fallback) | `useDouliChat.ts` | ✅ |
| Servicio de doula | `doulaService.ts` | ✅ |

---

## 16. NOTIFICACIONES

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Ver todas las notificaciones | `NotificationsScreen.tsx` | ✅ |
| Push notifications | `notificationService.ts` | ✅ |
| Notificaciones de medicamento | `notificationService.ts` (medication_reminder) | ✅ |
| Notificaciones de sueño | `sleepNotificationScheduler.ts` | ✅ |
| Notificaciones de consultas | `notificationService.ts` | ✅ |
| Notificaciones de mensajes | `notificationService.ts` | ✅ |
| Notificaciones de actividad comunitaria | `notificationService.ts` | ✅ |
| Permisos en tiempo real | `notificationService.ts` | ✅ |

---

## 17. SERVICIOS DE LOCALIZACIÓN Y MAPAS

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Obtener ubicación del usuario | `useLocation.ts` | ✅ |
| Permisos de ubicación (siempre / en uso) | `app.config.js` | ✅ |
| Mapa de favoritos de recomendaciones | `FavoritesMapScreen.tsx` | ✅ |
| Mapa de productos en marketplace | `marketplaceService.ts` | ✅ |
| Google Maps integrado | `expo-maps` | ✅ |
| Modal de permiso de ubicación requerido | `RequiredLocationModal.tsx` | ✅ |

---

## 18. PAGOS

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Stripe payment integration | `@stripe/stripe-react-native` | ✅ |
| Wrapper de Stripe | `StripeProviderWrapper.tsx` | ✅ |
| Sección de pago en consultas | `ConsultationPaymentSection.tsx` | ✅ |
| Modal de pago de consulta | `ConsultationPaymentModal.tsx` | ✅ |

---

## 19. ANALÍTICAS Y TRACKING

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Firebase Analytics (vistas de pantalla) | `analyticsService.ts` | ✅ |
| Tracking de eventos personalizados | `analyticsService.ts` | ✅ |
| Propiedades de usuario (edad, género, hijos) | `analyticsService.ts` | ✅ |
| Analíticas de recomendaciones | `recommendationAnalyticsService.ts` | ✅ |
| Monitoreo de errores con Sentry | `sentryService.ts` | ✅ |
| Permisos ATT (iOS App Tracking Transparency) | `trackingService.ts` | ✅ |

---

## 20. SISTEMA Y CONFIGURACIÓN

| Funcionalidad | Pantalla / Archivo | Estado |
|---|---|---|
| Verificación de versión al iniciar | `useVersionCheck.ts` | ✅ |
| Pantalla de actualización forzada | `UpdateRequiredScreen.tsx` | ✅ |
| Splash screen personalizado | `CustomSplashScreen.tsx` | ✅ |
| Banner carousel en home | `BannerCarousel.tsx` + `bannerService.ts` | ✅ |
| Deep linking completo | `useDeepLinking.ts` | ✅ |
| Headers de dispositivo en API (timezone, OS, modelo) | `deviceInfoService.ts` | ✅ |
| Subida de imágenes | `imageUploadService.ts` | ✅ |
| Compartir contenido | `shareContentService.ts` | ✅ |
| Menú global (drawer) | `GlobalMenu.tsx` + `MenuContext.tsx` | ✅ |
| Carga de fuentes personalizadas | `useFonts.ts` | ✅ |
| Información de solicitud de servicios | `ServiceRequestScreen.tsx` | ✅ |

---

## 21. NAVEGACIÓN

| Tipo | Detalle |
|---|---|
| Stack Navigator (auth) | Login → Signup → ForgotPassword → ResetPassword |
| Bottom Tabs (autenticado) | Home / Comunidad / Crear / Shop / Perfil |
| Custom Tab Bar | Safe area, iconos, badge de notificaciones |
| Stacks anidados | Cada tab con sus propias sub-pantallas |
| Deep Linking | Esquema `munpa://` + HTTPS `munpa.online` |

---

## 22. DEEP LINKS SOPORTADOS

| URL | Destino |
|---|---|
| `munpa://share-child/{childId}` | Aceptar invitación de hijo |
| `munpa://post/{postId}` | Detalle de post |
| `munpa://recommendation/{id}` | Detalle de recomendación |
| `munpa://marketplace/product/{id}` | Detalle de producto |
| `munpa://marketplace/favorites` | Favoritos del marketplace |
| `munpa://recommendations/favorites` | Favoritos de recomendaciones |

---

## 23. PANTALLAS — LISTADO COMPLETO (74)

| # | Pantalla | Categoría |
|---|---|---|
| 1 | LoginScreen | Auth |
| 2 | SignupScreen | Auth |
| 3 | ForgotPasswordScreen | Auth |
| 4 | ResetPasswordScreen | Auth |
| 5 | HomeScreen | Principal |
| 6 | ProfileScreen | Perfil |
| 7 | NotificationsScreen | Sistema |
| 8 | ChildrenDataScreen | Hijo |
| 9 | ChildProfileScreen | Hijo |
| 10 | ChildrenListScreen | Hijo |
| 11 | ShareChildScreen | Hijo |
| 12 | ChildInvitationsScreen | Hijo |
| 13 | AcceptInvitationScreen | Hijo |
| 14 | GrowthScreen | Salud |
| 15 | MedicationsScreen | Salud |
| 16 | VaccineTrackerScreen | Salud |
| 17 | SleepTrackerScreen | Sueño |
| 18 | EditSleepEventScreen | Sueño |
| 19 | TeethingTrackerScreen | Salud |
| 20 | TeethingGuideScreen | Salud |
| 21 | FeedingScreen | Nutrición |
| 22 | RecipeDetailScreen | Nutrición |
| 23 | DevelopmentScreen | Desarrollo |
| 24 | MilestonesScreen | Desarrollo |
| 25 | ArticlesScreen | Contenido |
| 26 | ArticleDetailScreen | Contenido |
| 27 | RecommendationsScreen | Recomendaciones |
| 28 | CategoryRecommendationsScreen | Recomendaciones |
| 29 | RecommendationDetailScreen | Recomendaciones |
| 30 | AddRecommendationScreen | Recomendaciones |
| 31 | FavoritesScreen | Recomendaciones |
| 32 | FavoritesMapScreen | Recomendaciones |
| 33 | WishlistScreen | Recomendaciones |
| 34 | CommunitiesScreen | Comunidad |
| 35 | CommunityRequestsScreen | Comunidad |
| 36 | CommunityPostsScreen | Comunidad |
| 37 | CreatePostScreen | Comunidad |
| 38 | PostDetailScreen | Comunidad |
| 39 | CommentsScreen | Comunidad |
| 40 | ItemCommentsScreen | Comunidad |
| 41 | CreateEventScreen | Eventos |
| 42 | EventDetailScreen | Eventos |
| 43 | ListsScreen | Listas |
| 44 | ListDetailScreen | Listas |
| 45 | MunpaMarketScreen | Marketplace |
| 46 | ProductDetailScreen | Marketplace |
| 47 | CreateProductScreen | Marketplace |
| 48 | MyProductsScreen | Marketplace |
| 49 | MarketplaceFavoritesScreen | Marketplace |
| 50 | MarketplaceMessagesScreen | Marketplace |
| 51 | ProductConversationsScreen | Marketplace |
| 52 | SpecialistsListScreen | Consultas |
| 53 | ConsultationRequestScreen | Consultas |
| 54 | ConsultationDetailScreen | Consultas |
| 55 | ConsultationVideoScreen | Consultas |
| 56 | MyConsultationsScreen | Consultas |
| 57 | SpecialistDashboardScreen | Especialista |
| 58 | SpecialistHomeScreen | Especialista |
| 59 | SpecialistScheduleScreen | Especialista |
| 60 | SpecialistStatsScreen | Especialista |
| 61 | SpecialistConsultationsScreen | Especialista |
| 62 | SpecialistProfileScreen | Especialista |
| 63 | EditSpecialistProfileScreen | Especialista |
| 64 | ManageDocumentsScreen | Especialista |
| 65 | SpecialistCouponsScreen | Especialista |
| 66 | VendorProductsScreen | Vendedor |
| 67 | VendorCategoriesScreen | Vendedor |
| 68 | VendorCreateProductScreen | Vendedor |
| 69 | VendorDiscountsScreen | Vendedor |
| 70 | VendorPromotionsScreen | Vendedor |
| 71 | DoulaChatScreen | IA |
| 72 | ServiceRequestScreen | Servicios |
| 73 | UpdateRequiredScreen | Sistema |
| 74 | RecipeDetailScreen | Nutrición |

---

## 24. STACK TÉCNICO

| Tecnología | Versión | Uso |
|---|---|---|
| React Native | 0.81.5 | Framework base |
| Expo | ~54.0.0 | Build y herramientas |
| TypeScript | — | Tipado estático |
| React Navigation | ^7.x | Navegación |
| Firebase | ^23.x | Analytics |
| Stripe | ^0.39.0 | Pagos |
| TensorFlow.js | ^4.11.0 | ML para sueño |
| Sentry | ^7.6.0 | Error tracking |
| Axios | ^1.11.0 | API HTTP |
| Google Sign-In | ^16.0.0 | Auth social |
| Apple Auth | ^2.4.1 | Auth social |
| expo-maps | ~0.12.8 | Mapas |
| expo-location | ~19.0.7 | Ubicación |
| expo-notifications | ~0.32.12 | Push notifications |
| AsyncStorage | 2.2.0 | Persistencia local |

---

## 25. ESTADÍSTICAS DEL PROYECTO

| Métrica | Valor |
|---|---|
| Pantallas | 74 |
| Componentes | 25 |
| Servicios | 27 |
| Contextos | 4 |
| Custom Hooks | 5 |
| Archivos de tipos | 4 |
| Versión | 2.0.9 |
| Build iOS | 1.0.46 |
| Version Code Android | 10 |
| API base | `https://api.munpa.online` |

---

*Documento generado automáticamente revisando el código fuente del proyecto.*
