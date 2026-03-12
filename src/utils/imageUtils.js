// Utilidades para manejar imágenes sin Firebase Storage
// Convierte archivo a base64 o permite URLs directas

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export const validateImageUrl = (url) => {
  // Validar si es una URL válida
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isBase64 = (str) => {
  if (!str) return false;
  return str.startsWith('data:image/');
};
