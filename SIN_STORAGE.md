# Sistema sin Firebase Storage

Este proyecto está configurado para funcionar **sin Firebase Storage**, ya que el plan gratuito de Firebase no lo incluye.

## Cómo Funciona

### Para Banners de Eventos

1. **Opción 1: URL Directa** (Recomendado)
   - Sube tu imagen a un servicio gratuito como:
     - [Imgur](https://imgur.com) - Gratis, sin registro necesario
     - [ImgBB](https://imgbb.com) - Gratis, permite URLs directas
     - [Cloudinary](https://cloudinary.com) - Tiene plan gratuito generoso
   - Copia la URL de la imagen
   - Pégala en el campo "Banner del Evento"

2. **Opción 2: Base64** (Para imágenes pequeñas)
   - Haz clic en "Subir imagen"
   - Selecciona una imagen (máximo 2MB)
   - Se convertirá automáticamente a base64
   - Se guardará directamente en Firestore

### Para Fotos de Perfil

- Las fotos se convierten automáticamente a base64
- Límite: 1MB por foto
- Se guardan directamente en Firestore

## Servicios Recomendados para Alojar Imágenes

### Imgur (Más fácil)
1. Ve a https://imgur.com
2. Arrastra tu imagen o haz clic en "New post"
3. Copia el link directo (termina en .jpg, .png, etc.)
4. Pégalo en el campo de URL

### ImgBB
1. Ve a https://imgbb.com
2. Haz clic en "Start uploading"
3. Selecciona tu imagen
4. Copia el "Direct link"
5. Pégalo en el campo de URL

### Cloudinary (Más profesional)
1. Crea cuenta gratuita en https://cloudinary.com
2. Sube tu imagen
3. Copia la URL generada
4. Pégalo en el campo de URL

## Ventajas de Usar URLs

- ✅ No ocupa espacio en Firestore
- ✅ Carga más rápida
- ✅ No hay límites de tamaño (depende del servicio)
- ✅ Funciona con el plan gratuito de Firebase

## Ventajas de Usar Base64

- ✅ Todo está en Firestore (más fácil de gestionar)
- ✅ No depende de servicios externos
- ✅ Funciona offline (una vez cargado)

## Recomendación

- **Banners de eventos**: Usa URLs de Imgur o ImgBB
- **Fotos de perfil**: Usa base64 (son imágenes pequeñas)

## Notas Importantes

- Las imágenes en base64 ocupan más espacio en Firestore
- Firestore tiene un límite de 1MB por documento
- Para imágenes grandes, siempre usa URLs externas
- Las URLs deben ser públicas y accesibles
