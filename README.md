# Reverse Proxy LAN (Node.js)

Este proyecto implementa un **reverse proxy** en Node.js configurable mediante un archivo `.env`.  
Sirve para exponer un servicio dentro de tu LAN en otra dirección/puerto (ej. para pruebas, compartir servicios, o centralizar accesos).

---

## 📦 Instalación

```bash
# Clona el repositorio
git clone https://github.com/mtnsosa/reverse-proxy-to-lan
cd lan-reverse-proxy

# Instala dependencias
npm install


#########Ejemplo de configuracion del archivo .env #####
# IP a donde vas a redirigir el tráfico
TARGET_URL=http://10.10.1.1:8000 #Este es un ejemplo.

# Configuración del proxy
LISTEN_PORT=8080             # Puerto donde escuchará el proxy
LISTEN_HOST=10.10.1.0    # Host local (ej. 0.0.0.0 para todas las interfaces)

# Opciones
CHANGE_ORIGIN=1              # Reescribe el header Host con el del destino
PRESERVE_HOST=0              # Mantiene el Host original del cliente (ignora CHANGE_ORIGIN)
ENABLE_CORS=1                # Habilita CORS (útil para frontends externos)

# TLS (opcional, si quieres que el proxy escuche en HTTPS)
TLS_CERT=                    # Ruta al certificado .pem
TLS_KEY=                     # Ruta a la clave privada .pem


##Correlo con node en la carpeta razi
node proxy