import React from 'react';
import { View, Text, StyleSheet, Image, Modal, TouchableOpacity, ImageBackground } from 'react-native';

const WelcomeNeon = ({ visible, onClose, userRole, userName }) => {
  
  // Lógica para diferenciar Admin vs Usuario
  const isAdmin = userRole === 'admin';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        {/* Fondo oscuro tipo pared (simulado con color o imagen si tienes una) */}
        <View style={styles.modalView}>
          
          {/* Título: BIENVENIDO (Estilo Azul Neon - Común para ambos) */}
          <Text style={[styles.neonTextBase, styles.neonBlue]}>
            {isAdmin ? '¡BIENVENIDO!' : '¡HOLA!'}
          </Text>

          {/* Subtítulo: CAMBIA SEGÚN ROL */}
          {isAdmin ? (
            // DISEÑO DE LA IMAGEN (ADMIN)
            <>
              <Text style={[styles.neonTextBase, styles.neonRed, styles.adminText]}>
                LEO ADMIN
              </Text>
              {/* Círculo Neon Rojo con Logo */}
              <View style={styles.iconContainerRed}>
                 {/* Reemplaza con tu icono de Spiderman */}
                 <Image 
                    source={{ uri: 'https://i.imgur.com/6Xy1Fk6.png' }} // Ejemplo Spiderman mask
                    style={styles.logoIcon}
                    resizeMode="contain"
                 />
              </View>
            </>
          ) : (
            // DISEÑO SORPRESA (USUARIO) - Estilo Verde Matrix/Cyberpunk
            <>
              <Text style={[styles.neonTextBase, styles.neonGreen, styles.userText]}>
                {userName ? userName.toUpperCase() : 'USUARIO'}
              </Text>
              {/* Círculo Neon Verde con Logo de Usuario */}
              <View style={styles.iconContainerGreen}>
                 {/* Icono genérico de usuario o app */}
                 <Image 
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/456/456212.png' }} 
                    style={styles.logoIcon}
                    resizeMode="contain"
                 />
              </View>
            </>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>CONTINUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ESTILOS SIN ROMPER TU CÓDIGO ACTUAL
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Fondo oscuro semitransparente
  },
  modalView: {
    margin: 20,
    backgroundColor: '#121212', // Color pared oscura
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#333',
    width: '85%',
  },
  // Tipografía base para el efecto Neon
  neonTextBase: {
    fontFamily: 'sans-serif-condensed', // O la fuente que uses
    fontStyle: 'italic',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  // EFECTO NEON AZUL (Como "¡BIENVENIDO!")
  neonBlue: {
    fontSize: 42,
    color: '#E0FFFF', // Blanco azulado
    textShadowColor: '#00BFFF', // Resplandor Azul
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  // EFECTO NEON ROJO (Como "LEO ADMIN")
  neonRed: {
    fontSize: 48,
    color: '#FFE0E0',
    textShadowColor: '#FF003C', // Resplandor Rojo
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 2,
  },
  // EFECTO NEON VERDE (Para el Usuario - Sorpresa)
  neonGreen: {
    fontSize: 38,
    color: '#E0FFE0',
    textShadowColor: '#00FF41', // Resplandor Matrix
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    letterSpacing: 1,
  },
  adminText: {
    transform: [{ rotate: '-2deg' }], // Leve inclinación como en la foto
  },
  userText: {
    transform: [{ rotate: '0deg' }],
  },
  // Contenedores de los iconos (El círculo brillante)
  iconContainerRed: {
    marginTop: 20,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF003C', // Borde Rojo
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF003C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20, // Resplandor del círculo
    elevation: 10,
  },
  iconContainerGreen: {
    marginTop: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#00FF41', // Borde Verde
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  logoIcon: {
    width: '70%',
    height: '70%',
    tintColor: '#FFF', // Hace que el icono sea blanco para brillar mejor
  },
  closeButton: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 30,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#AAA',
    fontSize: 12,
  }
});

export default WelcomeNeon;