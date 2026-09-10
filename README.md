# Catálogo Siemens Energy — Imagen Perfecta Sie7e

Catálogo web interactivo de productos promocionales personalizado para **Siemens Energy**,
elaborado por **Imagen Perfecta Sie7e (IP7)**.

## Qué es

Sitio **estático** (HTML + CSS + JavaScript, sin framework ni paso de build).
Se publica tal cual: cualquier hosting de estáticos lo sirve sin configuración.

## Estructura

```
index.html                 Página única
assets/
  css/styles.css           Estilos
  js/products.js            Datos del catálogo (categorías y productos)
  js/main.js                Lógica (carrito, filtros, login, carrusel, tema)
  img/productos/            Fotos de producto ({id}.jpg y {id}-2.jpg)
  img/productos-adicionales/ Fotos del carrusel "Productos adicionales trabajados"
  img/brand/               Logos e íconos
  video/hero-bg.mp4        Video de fondo del hero
  pdf/                     Catálogos completos descargables
```

## Editar el catálogo

- **Productos y precios:** `assets/js/products.js` (arreglo `PRODUCTS`).
- **Orden de categorías:** arreglo `CATEGORIES` en el mismo archivo + las pills en `index.html`.
- **Fotos:** se colocan en `assets/img/productos/` con el nombre del `id` del producto.

## Acceso a precios

Los precios se ocultan hasta iniciar sesión con la clave única (definida en `assets/js/main.js`,
constantes `AUTH_USER` / `AUTH_PASS`). Es una barrera visual, no seguridad real.

## Despliegue

Cada push a la rama `main` publica automáticamente en Vercel.
